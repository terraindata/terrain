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
import Util from './../../util/Util';
import ActionTypes from './FileImportActionTypes';
import Actions from './FileImportActions';
import Ajax from './../../util/Ajax';
import FileImportTypes from './../FileImportTypes';
const { List, Map } = Immutable;

const FileImportReducers = {}

FileImportReducers[ActionTypes.changeServer] =
  (state, action) =>
    state
      .set('connectionId', action.payload.connectionId)
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
    state
      .set('columnTypes', state.columnTypes.set(action.payload.id, action.payload.typeIndex))
  ;

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

FileImportReducers[ActionTypes.setPreviewTransform] =
  (state, action) =>
  {
    return state
      .set('previewTransform', action.payload.transform);
  };

FileImportReducers[ActionTypes.clearPreviewTransform] =
  (state, action) =>
    state
      .set('previewTransform', { name: '', args: { colName: '', text: '' } })
  ;

FileImportReducers[ActionTypes.updatePreviewRows] =
  (state, action) =>
  {
    // const transformCol = state.columnNames.indexOf(action.payload.transform.args.colName);
    // state.previewRows.map((row, i) =>
    // {
    //   row.map((item, j) =>
    //   {
    //     if (j === transformCol)
    //     {
    //       Actions.updatePreviewRows(i, j, this.stringTransform(item));
    //       if (action.payload.transform.name === 'append');
    //       {
    //
    //       }
    //     }
    //   });
    // });
    //
    // return state.update('previewRows', (rows) =>
    //   rows[][transformCol] + action.payload.transform.args.text
    // )

    console.log('reducer: ' + action.payload.transform.name + ', ' + action.payload.transform.args.colName + ', ' +
      action.payload.transform.args.text);

    const transformName = action.payload.transform.name;
    if (transformName === 'append')
    {
      const appendCol = state.columnNames.indexOf(action.payload.transform.args.colName);

      const newPreviewRows = [];
      state.previewRows.map((row, i) =>
      {
        const newRow = [];
        row.map((value, j) =>
        {
          j === appendCol ? newRow.push(value + action.payload.transform.args.text) : newRow.push(value);
        });
        newPreviewRows.push(newRow);
      });
      return state
        .set('previewRows', List(newPreviewRows))
    }
    else if (transformName === 'prepend')
    {
      const prependCol = state.columnNames.indexOf(action.payload.transform.args.colName);

      const newPreviewRows = [];
      state.previewRows.map((row, i) =>
      {
        const newRow = [];
        row.map((value, j) =>
        {
          j === prependCol ? newRow.push(action.payload.transform.args.text + value) : newRow.push(value);
        });
        newPreviewRows.push(newRow);
      });
      return state
        .set('previewRows', List(newPreviewRows))
    }
    else if (transformName === 'split')
    {
      const splitCol = state.columnNames.indexOf(action.payload.transform.args.oldName);
      return state
        .set('previewRows', )
        .set('columnNames', state.columnNames
          .set(splitCol, action.payload.transform.newName[0])
          .insert(splitCol, action.payload.transform.newName[1]))
        .set('columnsToInclude', state.columnsToInclude.insert(splitCol, true))
        .set('columnTypes', state.columnTypes.insert(splitCol, 'string'))
    }
    else if (transformName === 'merge')
    {
      const mergeCol1 = state.columnNames.indexOf(action.payload.transform.args.oldName[0]);
      const mergeCol2 = state.columnNames.indexOf(action.payload.transform.args.oldName[1]);
      return state
        .set('previewRows', )
        .set('columnNames', state.columnNames
          .delete(mergeCol2)
          .set(mergeCol1, action.payload.transform.args.newName))
        .set('columnsToInclude', state.columnsToInclude.delete(mergeCol2))
        .set('columnTypes', state.columnTypes.delete(mergeCol2))
    }
  };

// FileImportReducers[ActionTypes.updatePreviewRows] =
//   (state, action) =>
//     state
//       .setIn(['previewRows', action.paylod.rowId, action.payload.colId] , action.payload.value)
//   ;

// FileImportReducers[ActionTypes.setCurPreviewRows] =
//   (state, action) =>
//     state
//       .set('curPreviewRows', action.payload.curPreviewRows)
//   ;

// FileImportReducers[ActionTypes.setCurTransform] =
//   (state, action) =>
//   {
//     console.log('current transform: ', state.curTransform);
//     console.log('adding transform: ', action.payload.transform);
//     if (state.curTransform.name) {
//       if (action.payload.transform.name === 'rename' && state.curTransform.args.oldName !== action.payload.transform.args.oldName) {
//         Actions.addCurTransform();
//       }
//       else if (state.curTransform.name !== action.payload.transform.name) {
//         Actions.addCurTransform();
//       }
//     }
//     return state.set('curTransform', action.payload.transform);
//   }

FileImportReducers[ActionTypes.chooseFile] =
  (state, action) =>
  {
    const columnNames = [];
    const columnsToInclude = [];
    const columnTypes = [];
    let colsCount = 0;

    if (action.payload.filetype === 'csv' && !state.hasCsvHeader)
    {
      console.log('headerless csv');
      action.payload.preview.get(0).map((value, i) =>
      {
        columnNames.push('column' + i);
        columnsToInclude.push(true);
        columnTypes.push(0);
        colsCount++;
      });
    }
    else
    {
      console.log('csv with header/json');
      _.map(action.payload.preview.get(0), (value, key) =>
      {
        columnNames.push(key);
        columnsToInclude.push(true);
        columnTypes.push(0);
        colsCount++;
      });
    }

    // console.log(columnNames, columnsToInclude, columnTypes);

    return state
      .set('file', action.payload.file)
      .set('filetype', action.payload.filetype)
      .set('primaryKey', '')
      .set('previewRows', action.payload.preview)
      .set('curPreviewRows', action.payload.preview)
      .set('columnsCount', colsCount)
      .set('oldNames', List(columnNames))
      .set('columnNames', List(columnNames))
      .set('columnsToInclude', List(columnsToInclude))
      .set('columnTypes', List(columnTypes));
  };

FileImportReducers[ActionTypes.uploadFile] =
  (state, action) =>
  {
    // const isCsv = state.filetype === 'csv';
    // const columnTypes = [];
    // state.columnTypes.forEach((value, key) =>
    // {
    //   switch (value)
    //   {
    //     case 0:
    //       isCsv ? columnTypes.push('string') : columnTypes.push([key, 'string']);
    //       break;
    //     case 1:
    //       isCsv ? columnTypes.push('number') : columnTypes.push([key, 'number']);
    //       break;
    //     case 2:
    //       isCsv ? columnTypes.push('boolean') : columnTypes.push([key, 'boolean']);
    //       break;
    //     case 3:
    //       isCsv ? columnTypes.push('date') : columnTypes.push([key, 'date']);
    //       break;
    //   }
    // });
    // const cTypes = isCsv ? List<string>(columnTypes) : Map<string, string>(columnTypes);
    // const cNames = isCsv ? state.columnNames.toList() : state.columnNames;
    // const cToInclude = isCsv ? state.columnsToInclude.toList() : state.columnsToInclude;

    const cToIncludeMap = [];
    const cTypesMap = [];
    state.columnNames.forEach((value, key) =>
    {
      cToIncludeMap.push([value, state.columnsToInclude.get(key)]);
      cTypesMap.push([value, state.columnTypes.get(key)]);
      // const typeName = FileImportTypes.ELASTIC_TYPES[value];
      // columnTypes.push(isCsv ? typeName : [key, typeName]);
    });

    // const cTypes = isCsv ? List<string>(columnTypes) : Map<string, string>(columnTypes);
    // const cNames = isCsv ? state.columnNames.toList() : state.columnNames;
    // const cToInclude = isCsv ? state.columnsToInclude.toList() : state.columnsToInclude;

    Ajax.importFile(
      state.file,
      state.filetype,
      state.dbText,
      state.tableText,
      state.connectionId,
      state.oldNames,
      Map<string, boolean>(cToIncludeMap),
      Map<string, string>(cTypesMap),
      state.primaryKey,
      state.transforms,
      () =>
      {
        alert("success");
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
