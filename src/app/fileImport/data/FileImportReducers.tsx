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

// tslint:disable:restrict-plus-operands no-console strict-boolean-expressions

import * as Immutable from 'immutable';
import * as _ from 'underscore';
import Ajax from './../../util/Ajax';
import Util from './../../util/Util';
import * as FileImportTypes from './../FileImportTypes';
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
  count < recursionId - 1 && columnType.innerType ?
    recDeleteType(columnType.innerType, count + 1, recursionId)
    :
    delete columnType.innerType;
  return columnType;
};

const recToString = (columnType) =>
{
  columnType.type = FileImportTypes.ELASTIC_TYPES[columnType.type];
  if (columnType.innerType)
  {
    recToString(columnType.innerType);
  }
  return columnType;
};

const recToNumber = (columnType) =>
{
  columnType.type = FileImportTypes.ELASTIC_TYPES.indexOf(columnType.type);
  if (columnType.innerType)
  {
    recToNumber(columnType.innerType);
  }
  return columnType;
};

const applyTransform = (state, transform) =>
{
  const transformCol = state.columnNames.indexOf(transform.colName);

  if (transform.name === 'rename')
  {
    return state.setIn(['columnNames', state.columnNames.indexOf(transform.colName)], transform.args.newName);
  }
  else if (transform.name === 'append' || transform.name === 'prepend')
  {
    return state
      .set('previewRows', List(state.previewRows.map((row, i) =>
        row.map((col, j) =>
        {
          if (j === transformCol)
          {
            return transform.name === 'append' ? col + transform.args.text : transform.args.text + col;
          }
          return col;
        }),
      )),
    );
  }
  else if (transform.name === 'split')
  {
    const primaryKey = state.primaryKey > transformCol ? state.primaryKey + 1 : state.primaryKey;
    return state
      .set('primaryKey', primaryKey)
      .set('columnNames', state.columnNames
        .set(transformCol, transform.args.newName[0])
        .insert(transformCol + 1, transform.args.newName[1]))
      .set('columnsToInclude', state.columnsToInclude.insert(transformCol + 1, true))
      .set('columnTypes', state.columnTypes.insert(transformCol + 1, { type: 0 }))
      .set('previewRows', List(state.previewRows.map((row, i) =>
        [].concat(...row.map((col, j) =>
        {
          if (j === transformCol)
          {
            const index = col.indexOf(transform.args.text);
            if (index === -1)
            {
              return [col, ''];
            }
            return [col.substring(0, index), col.substring(index + transform.args.text.length)];
          }
          return col;
        },
        )),
      )));
  }
  else if (transform.name === 'merge')
  {
    const mergeCol = state.columnNames.indexOf(transform.args.mergeName);
    console.log('mergeCol: ', mergeCol);
    console.log(state.columnNames.delete(mergeCol));
    console.log(state.columnTypes);
    console.log(state.columnsToInclude);

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
        .set(transformCol, transform.args.newName)
        .delete(mergeCol))
      .set('columnsToInclude', state.columnsToInclude.delete(mergeCol))
      .set('columnTypes', state.columnTypes.delete(mergeCol))
      .set('previewRows', List(state.previewRows.map((row, i) =>
        row.map((col, j) =>
        {
          return j === transformCol ? col + transform.args.text + row[mergeCol] : col;
        }).filter((col, j) =>
          j !== mergeCol,
        ),
      )));
  }
  return state;
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
    columnTypes[action.payload.columnId] = recSetType(columnTypes[action.payload.columnId], 0,
      action.payload.recursionId, action.payload.typeIndex);

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
      columnTypes[action.payload.columnId] = recDeleteType(columnTypes[action.payload.columnId], 0,
        action.payload.recursionId);
      return state.set('columnTypes', List(columnTypes));
    }
    return state;
  };

FileImportReducers[ActionTypes.setColumnName] =
  (state, action) =>
  {
    if (state.renameTransform.colName && state.renameTransform.args.newName !== action.payload.colName)
    {
      console.log('adding rename transform: ', state.renameTransform.colName + ', ' + state.renameTransform.args.newName);
      return state
        .set('transforms', state.transforms.push(JSON.parse(JSON.stringify(state.renameTransform))))
        .update('renameTransform', (renameTransform) =>
        {
          renameTransform.colName = action.payload.colName;
          renameTransform.args.newName = action.payload.newName;
          return renameTransform;
        })
        .setIn(['columnNames', action.payload.columnId], action.payload.newName);
    }

    console.log('setting rename transform: ', state.renameTransform.colName + ' to ' + action.payload.newName);
    if (!state.renameTransform.colName)
    {
      return state
        .update('renameTransform', (renameTransform) =>
        {
          renameTransform.colName = action.payload.colName;
          renameTransform.args.newName = action.payload.newName;
          return renameTransform;
        })
        .setIn(['columnNames', action.payload.columnId], action.payload.newName);
    }
    return state
      .update('renameTransform', (renameTransform) =>
      {
        renameTransform.args.newName = action.payload.newName;
        return renameTransform;
      })
      .setIn(['columnNames', action.payload.columnId], action.payload.newName);
  };

FileImportReducers[ActionTypes.addTransform] =
  (state, action) =>
  {
    console.log('add transform: ', action.payload.transform);

    if (state.renameTransform.colName)
    {
      console.log('add Rename: ', state.renameTransform.colName);
      return state
        .set('transforms', state.transforms.push(JSON.parse(JSON.stringify(state.renameTransform))).push(action.payload.transform))
        .set('renameTransform', { name: 'rename', colName: '', args: { newName: '' } });
    }
    return state.set('transforms', state.transforms.push(action.payload.transform));
  };

FileImportReducers[ActionTypes.updatePreviewRows] =
  (state, action) =>
  {
    return applyTransform(state, action.payload.transform);
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
      .set('renameTransform', { name: 'rename', colName: '', args: { newName: '' } });
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
        state.columnsToInclude.get(colId) &&
        [colName, recToString(JSON.parse(JSON.stringify(state.columnTypes.get(colId))))],
      )),
      state.columnNames.get(state.primaryKey),
      state.renameTransform.colName ? state.transforms.push(state.renameTransform) : state.transforms,
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

    if (state.renameTransform.colName)
    {
      return state
        .set('transforms', state.transforms.push(JSON.parse(JSON.stringify(state.renameTransform))))
        .set('renameTransform', { name: 'rename', colName: '', args: { newName: '' } });
    }
    return state;
  };

FileImportReducers[ActionTypes.saveTemplate] =
  (state, action) =>
  {
    Ajax.saveTemplate(state.dbText,
      state.tableText,
      state.connectionId,
      state.oldNames,
      Map<string, FileImportTypes.ColumnType>(state.columnNames.map((colName, colId) =>
        state.columnsToInclude.get(colId) && [colName, recToString(JSON.parse(JSON.stringify(state.columnTypes.get(colId))))],
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
      state.connectionId,
      state.dbText,
      state.tableText,

      (templatesArr) =>
      {
        const templates: Immutable.List<FileImportTypes.Template> = Immutable.List<FileImportTypes.Template>(templatesArr);
        action.payload.setTemplates(templates);
      },
    );
    return state;
  };

FileImportReducers[ActionTypes.setTemplates] =
  (state, action) =>
    state.set('templates', action.payload.templates)
  ;

FileImportReducers[ActionTypes.loadTemplate] =
  (state, action) =>
  {
    console.log(state.templates);
    const template = state.templates.get(action.payload.templateId);
    template.transformations.map((transform, i) =>
    {
      state = applyTransform(state, transform);
    });
    const { primaryKey, columnNames, columnTypes, columnsToInclude, previewRows } = state;

    const colTypes = [];
    const colsToInclude = [];
    columnNames.map((colName, i) =>
    {
      const colType = template.columnTypes[colName];
      console.log('colType: ', colType);
      if (colType)
      {
        colTypes.push(recToNumber(colType));
        colsToInclude.push(true);
      }
      else
      {
        colTypes.push({ type: 0 });
        colsToInclude.push(false);
      }
    });
    return state
      .set('oldNames', List(template.originalNames))
      .set('primaryKey', _.map(template.columnTypes, (colType, colName) => colName).indexOf(template.primaryKey))
      .set('transforms', List<FileImportTypes.Transform>(template.transformations))
      .set('hasCsvHeader', template.hasCsvHeader)
      .set('columnNames', columnNames)
      .set('columnTypes', List(colTypes))
      .set('columnsToInclude', List(colsToInclude))
      .set('previewRows', previewRows);
  };

export default FileImportReducers;
