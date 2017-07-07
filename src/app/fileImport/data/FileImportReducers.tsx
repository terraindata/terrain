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
  count < recursionId ? recSetType(columnType.columnType, count + 1, recursionId, typeIndex) : columnType.type = typeIndex;
  return columnType;
};

const recAddType = (columnType) =>
{
  columnType.columnType ? recAddType(columnType.columnType) : columnType.columnType = { type: 0 };
  return columnType;
};

const recDeleteType = (columnType, count, recursionId) =>
{
  count < recursionId - 1 && columnType.columnType ? recDeleteType(columnType.columnType, count + 1, recursionId) : delete columnType.columnType;
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
      .set('primaryKey', state.columnNames.get(action.payload.id))
  ;

FileImportReducers[ActionTypes.setColumnToInclude] =
  (state, action) =>
    state
      .updateIn(['columnsToInclude', action.payload.id], (isColIncluded: boolean) => !isColIncluded)
  ;

FileImportReducers[ActionTypes.setColumnType] =
  (state, action) =>
  {
    // console.log(action.payload.recursionId + ', ' + action.payload.typeIndex);

    const columnTypes = state.columnTypes.toArray();
    columnTypes[action.payload.columnId] = recSetType(columnTypes[action.payload.columnId], 0, action.payload.recursionId, action.payload.typeIndex);

    if (action.payload.typeIndex === 4)
    {
      columnTypes[action.payload.columnId] = recAddType(columnTypes[action.payload.columnId]);
    }

    return state.set('columnTypes', List(columnTypes));
  };

FileImportReducers[ActionTypes.deleteColumnType] =
  (state, action) =>
  {
    const columnTypes = state.columnTypes.toArray();
    columnTypes[action.payload.columnId] = recDeleteType(columnTypes[action.payload.columnId], 0, action.payload.recursionId);
    return state.set('columnTypes', List(columnTypes));
  };

FileImportReducers[ActionTypes.setColumnName] =
  (state, action) =>
  {
    if (state.columnNames.get(action.payload.id) === state.primaryKey)
    {
      return state
        .set('columnNames', state.columnNames.set(action.payload.id, action.payload.columnName))
        .set('primaryKey', action.payload.columnName);
    }
    return state
      .set('columnNames', state.columnNames.set(action.payload.id, action.payload.columnName));
  };

FileImportReducers[ActionTypes.addTransform] =
  (state, action) =>
    state
      .set('transforms', state.transforms.push(action.payload.transform))
  ;

FileImportReducers[ActionTypes.updatePreviewRows] =
  (state, action) =>
  {
    // console.log('reducer: ' + action.payload.transform.name + ', ' + action.payload.transform.args.colName + ', ' +
    //   action.payload.transform.args.text + ', ' + action.payload.transform.args.newNames);

    const transformCol = state.columnNames.indexOf(action.payload.transform.args.transformCol);
    if (action.payload.transform.name === 'append' || action.payload.transform.name === 'prepend')
    {
      return state
        .set('previewRows', List(state.previewRows.map((row, i) =>
          row.map((col, j) =>
          {
            if (j === transformCol && action.payload.transform.name === 'append')
            {
              return col + action.payload.transform.args.text;
            }
            else if (j === transformCol && action.payload.transform.name === 'prepend')
            {
              return action.payload.transform.args.text + col;
            }
            else
            {
              return col;
            }
          }))
        )
        )
    }
    else if (action.payload.transform.name === 'split')
    {
      const newPreviewRows = [];
      state.previewRows.map((row, i) =>
      {
        const newRow = [];
        row.map((value, j) =>
        {
          if (j === transformCol)
          {
            newRow.push(value.split(action.payload.transform.args.text)[0]);
            newRow.push(value.split(action.payload.transform.args.text).slice(1).join(action.payload.transform.args.text));
          }
          else
          {
            newRow.push(value);
          }
        });
        newPreviewRows.push(newRow);
      });

      return state
        .set('previewRows', List(newPreviewRows))
        .set('columnNames', state.columnNames
          .set(transformCol, action.payload.transform.args.splitNames[0])
          .insert(transformCol + 1, action.payload.transform.args.splitNames[1]))
        .set('columnsToInclude', state.columnsToInclude.insert(transformCol + 1, true))
        .set('columnTypes', state.columnTypes.insert(transformCol + 1, { type: 0 }))
    }
    else if (action.payload.transform.name === 'merge')
    {
      const mergeCol = state.columnNames.indexOf(action.payload.transform.args.mergeNames[0]);

      const newPreviewRows = [];
      state.previewRows.map((row, i) =>
      {
        const newRow = [];
        row.map((col, j) =>
        {
          j === transformCol ? newRow.push(col + action.payload.transform.args.text + row[mergeCol]) : newRow.push(col)
        });
        newRow.splice(mergeCol, 1);
        newPreviewRows.push(newRow);
      });

      return state
        .set('previewRows', newPreviewRows)
        .set('columnNames', state.columnNames
          .set(transformCol, action.payload.transform.args.mergeNames[1])
          .delete(mergeCol))
        .set('columnsToInclude', state.columnsToInclude.delete(mergeCol))
        .set('columnTypes', state.columnTypes.delete(mergeCol))
    }
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

    // console.log(columnNames, columnsToInclude, columnTypes);

    return state
      .set('file', action.payload.file)
      .set('filetype', action.payload.filetype)
      .set('primaryKey', '')
      .set('previewRows', action.payload.preview)
      .set('columnsCount', colsCount)
      .set('oldNames', List(columnNames))
      .set('columnNames', List(columnNames))
      .set('columnsToInclude', List(columnsToInclude))
      .set('columnTypes', List(columnTypes))
  };

FileImportReducers[ActionTypes.uploadFile] =
  (state, action) =>
  {
    const cToIncludeMap = [];
    const cTypesMap = [];
    state.columnNames.forEach((value, key) =>
    {
      cToIncludeMap.push([value, state.columnsToInclude.get(key)]);
      cTypesMap.push([value, state.columnTypes.get(key)]);
    });

    Ajax.importFile(
      state.file,
      state.filetype,
      state.dbText,
      state.tableText,
      state.connectionId,
      state.oldNames,
      Map<string, boolean>(cToIncludeMap),
      Map<string, object>(cTypesMap),
      state.primaryKey,
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

export default FileImportReducers;
