/*
University of Illinois/NCSA Open Source License 

Copyright (c) 2018 Terrain Data, Inc. and the authors. All rights reserved.

Developed by: Terrain Data, Inc. and
              the individuals who committed the code in this file.
              https://github.com/terraindata/terrain
                  
Permission is hereby granted, free of charge, to any person 
obtaining a copy of this software and associated documentation files 
(the "Software"), to deal with the Software without restriction, 
including without limitation the rights to use, copy, modify, merge,
publish, distribute, sublicense, and/or sell copies of the Software, 
and to permit persons to whom the Software is furnished to do so, 
subject to the following conditions:

* Redistributions of source code must retain the above copyright notice, 
  this list of conditions and the following disclaimers.

* Redistributions in binary form must reproduce the above copyright 
  notice, this list of conditions and the following disclaimers in the 
  documentation and/or other materials provided with the distribution.

* Neither the names of Terrain Data, Inc., Terrain, nor the names of its 
  contributors may be used to endorse or promote products derived from
  this Software without specific prior written permission.

This license supersedes any copyright notice, license, or related statement
following this comment block.  All files in this repository are provided
under the same license, regardless of whether a corresponding comment block
appears in them.  This license also applies retroactively to any previous
state of the repository, including different branches and commits, which
were made public on or after December 8th, 2018.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS 
OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
CONTRIBUTORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS WITH
THE SOFTWARE.
*/

// Copyright 2017 Terrain Data, Inc.
import * as Immutable from 'immutable';
import * as _ from 'underscore';
import * as FileImportTypes from './../FileImportTypes';
import Ajax from './../../util/Ajax';
import Util from './../../util/Util';
import ActionTypes from './FileImportActionTypes';
const { List, Map } = Immutable;

const FileImportReducers = {};

const recSetType = (columnType, count, recursionId, typeIndex) =>
{
  count < recursionId ? recSetType(columnType.innerType, count + 1, recursionId, typeIndex) : columnType.type = typeIndex;
  return columnType;
};

const recAddType = (columnType) =>
{
  columnType.innerType ? recAddType(columnType.innerType) : columnType.innerType = { type: 0 };
  return columnType;
};

const recDeleteType = (columnType, count, recursionId) =>
{
  count < recursionId - 1 && columnType.innerType ? recDeleteType(columnType.innerType, count + 1, recursionId) : delete columnType.innerType;
  return columnType;
};

const recToString = (columnType) =>
{
  columnType.type = FileImportTypes.ELASTIC_TYPES[columnType.type];
  if (columnType.innerType)
  {
    recToString(columnType.innerType)
  }
  return columnType;
};

FileImportReducers[ActionTypes.changeServer] =
  (state, action) =>
    state
      .set('connectionId', action.payload.connectionId)
      .set('serverText', action.payload.name)
  ;

FileImportReducers[ActionTypes.changeDbText] =
  (state, action) =>
    state
      .set('dbText', action.payload.dbText);

FileImportReducers[ActionTypes.changeTableText] =
  (state, action) =>
    state
      .set('tableText', action.payload.tableText);

FileImportReducers[ActionTypes.changeHasCsvHeader] =
  (state, action) =>
    state
      .set('hasCsvHeader', !state.hasCsvHeader)
  ;

FileImportReducers[ActionTypes.changePrimaryKey] =
  (state, action) =>
    state
      .set('primaryKey', action.payload.columnId)
  ;

FileImportReducers[ActionTypes.setColumnToInclude] =
  (state, action) =>
    state
      .updateIn(['columnsToInclude', action.payload.columnId], (isColIncluded: boolean) => !isColIncluded)
  ;

FileImportReducers[ActionTypes.setColumnType] =
  (state, action) =>
  {
    const columnTypes = state.columnTypes.toArray();
    columnTypes[action.payload.columnId] = recSetType(columnTypes[action.payload.columnId], 0, action.payload.recursionId, action.payload.typeIndex);

    if (FileImportTypes.ELASTIC_TYPES[action.payload.typeIndex] === 'array')
    {
      columnTypes[action.payload.columnId] = recAddType(columnTypes[action.payload.columnId]);
    }

    return state.set('columnTypes', List(columnTypes));
  };

FileImportReducers[ActionTypes.deleteColumnType] =
  (state, action) =>
  {
    if (state.columnTypes.get(action.payload.columnId))
    {
      const columnTypes = state.columnTypes.toArray();
      columnTypes[action.payload.columnId] = recDeleteType(columnTypes[action.payload.columnId], 0, action.payload.recursionId);
      return state.set('columnTypes', List(columnTypes));
    }
    return state;
  };

FileImportReducers[ActionTypes.setColumnName] =
  (state, action) =>
    state
      .setIn(['columnNames', action.payload.columnId], action.payload.columnName)
  ;

FileImportReducers[ActionTypes.addTransform] =
  (state, action) =>
    state
      .set('transforms', state.transforms.push(action.payload.transform))
  ;

FileImportReducers[ActionTypes.updatePreviewRows] =
  (state, action) =>
  {
    const transformCol = state.columnNames.indexOf(action.payload.transform.args.transformCol);
    if (action.payload.transform.name === 'append' || action.payload.transform.name === 'prepend')
    {
      return state
        .set('previewRows', List(state.previewRows.map((row, i) =>
          row.map((col, j) =>
          {
            if (j === transformCol)
            {
              return action.payload.transform.name === 'append' ? col + action.payload.transform.args.text : action.payload.transform.args.text + col;
            }
            return col;
          })
        ))
        )
    }
    else if (action.payload.transform.name === 'split')
    {
      // TODO: adding new columns effect on colToMergeId
      const primaryKey = state.primaryKey > transformCol ? state.primaryKey + 1 : state.primaryKey;
      return state
        .set('primaryKey', primaryKey)
        .set('columnNames', state.columnNames
          .set(transformCol, action.payload.transform.args.splitNames[0])
          .insert(transformCol + 1, action.payload.transform.args.splitNames[1]))
        .set('columnsToInclude', state.columnsToInclude.insert(transformCol + 1, true))
        .set('columnTypes', state.columnTypes.insert(transformCol + 1, { type: 0 }))
        .set('previewRows', List(state.previewRows.map((row, i) =>
          [].concat(...row.map((col, j) =>
          {
            if (j === transformCol)
            {
              const index = col.indexOf(action.payload.transform.args.text);
              if (index === -1)
              {
                return [col, ''];
              }
              return [col.substring(0, index), col.substring(index + action.payload.transform.args.text.length)];
            }
            return col;
          }
          )
          ))
        ))
    }
    else if (action.payload.transform.name === 'merge')
    {
      const mergeCol = action.payload.transform.args.colToMergeId;
      console.log(mergeCol);

      let primaryKey = '';
      if (state.primaryKey === transformCol || state.primaryKey === mergeCol)
      {
        primaryKey = mergeCol < transformCol ? transformCol - 1 : transformCol;
      }
      else
      {
        primaryKey = state.primaryKey < transformCol ? state.primaryKey : state.primaryKey - 1;
      }

      return state
        .set('primaryKey', primaryKey)
        .set('columnNames', state.columnNames
          .set(transformCol, action.payload.transform.args.mergeNewName)
          .delete(mergeCol))
        .set('columnsToInclude', state.columnsToInclude.delete(mergeCol))
        .set('columnTypes', state.columnTypes.delete(mergeCol))
        .set('previewRows', List(state.previewRows.map((row, i) =>
          row.map((col, j) =>
          {
            return j === transformCol ? col + action.payload.transform.args.text + row[mergeCol] : col;
          }).filter((col, j) =>
            j !== mergeCol
            )
        ))
        )
    }
    return state;
  };

FileImportReducers[ActionTypes.chooseFile] =
  (state, action) =>
  {
    const columnNames = [];
    const columnsToInclude = [];
    const columnTypes = [];
    let colsCount = 0;

    _.map(action.payload.preview.get(0), (value, key) =>
    {
      columnNames.push(action.payload.oldNames.get(key));
      columnsToInclude.push(true);
      columnTypes.push({ type: 0 });
      colsCount++;
    });

    return state
      .set('file', action.payload.file)
      .set('filetype', action.payload.filetype)
      .set('primaryKey', -1)
      .set('previewRows', action.payload.preview)
      .set('columnsCount', colsCount)
      .set('oldNames', List(columnNames))
      .set('columnNames', List(columnNames))
      .set('columnsToInclude', List(columnsToInclude))
      .set('columnTypes', List(columnTypes))
      .set('transforms', List([]))
  };

FileImportReducers[ActionTypes.uploadFile] =
  (state, action) =>
  {
    Ajax.importFile(
      state.file,
      state.filetype,
      state.dbText,
      state.tableText,
      state.connectionId,
      state.oldNames,
      Map<string, object>(state.columnNames.map((colName, colId) =>
        state.columnsToInclude.get(colId) && [colName, recToString(JSON.parse(JSON.stringify(state.columnTypes.get(colId))))]
      )),
      state.columnNames.get(state.primaryKey),
      state.transforms,
      () =>
      {
        alert('success');
      },
      (err: string) =>
      {
        alert('Error uploading file: ' + JSON.parse(err).errors[0].detail);
      },
      state.hasCsvHeader,
    );
    return state;
  };

FileImportReducers[ActionTypes.saveTemplate] =
  (state, action) =>
  {
    Ajax.saveTemplate(state.dbText,
      state.tableText,
      state.connectionId,
      state.oldNames,
      Map<string, object>(state.columnNames.map((colName, colId) =>
        state.columnsToInclude.get(colId) && [colName, recToString(JSON.parse(JSON.stringify(state.columnTypes.get(colId))))]
      )),
      state.columnNames.get(state.primaryKey),
      state.transforms,
      action.payload.templateText,
      () =>
      {
        alert('successfully saved template');
      },
      (err: string) =>
      {
        alert('Error saving template: ' + JSON.parse(err).errors[0].detail);
      },
      state.hasCsvHeader,
    );
    return state;
  };

FileImportReducers[ActionTypes.getTemplates] =
  (state, action) =>
  {
    Ajax.getTemplates(
      state.dbText,
      state.tableText,
      state.connectionId,

      (templatesArr) =>
      {
        const templates: Immutable.List<object> = Immutable.List<object>(templatesArr);
        action.payload.setTemplates(templates);
      }
    );
    return state;
  };

FileImportReducers[ActionTypes.setTemplates] =
  (state, action) =>
    state.set('templates', action.payload.templates)
  ;

export default FileImportReducers;
