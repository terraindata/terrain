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
import Ajax from './../../util/Ajax';
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
      .set('hasCsvHeader', !state.hasCsvHeader);
;

FileImportReducers[ActionTypes.changePrimaryKey] =
  (state, action) =>
    state
      .set('primaryKey', state.columnNames.get(action.payload.id));
;

FileImportReducers[ActionTypes.setColumnsToInclude] =
  (state, action) =>
    state
      .set('columnsToInclude', state.columnsToInclude.set(action.payload.id, !state.columnsToInclude.get(action.payload.id)))
  ;

FileImportReducers[ActionTypes.setColumnNames] =
  (state, action) =>
    state
      .set('columnNames', state.columnNames.set(action.payload.id, action.payload.columnName))
  ;

FileImportReducers[ActionTypes.setColumnTypes] =
  (state, action) =>
    state
      .set('columnTypes', state.columnTypes.set(action.payload.id, action.payload.typeIndex))
  ;

FileImportReducers[ActionTypes.chooseFile] =
  (state, action) =>
  {
    const columnsToInclude = [];
    const columnNames = [];
    const columnTypes = [];
    let colsCount = 0;

    if (state.filetype === 'csv' && !state.hasCsvHeader)
    {
      console.log('headerless csv');
      for (let i = 0; i < action.payload.preview[0].length; i++)
      {
        columnsToInclude.push(['column' + i, true]);
        columnNames.push(['column' + i, '']);
        columnTypes.push(['column' + i, -1]);
        colsCount++;
      }
    }
    else
    {
      console.log('csv with header/json');
      for (const property in action.payload.preview[0])
      {
        if (action.payload.preview[0].hasOwnProperty(property))
        {
          columnsToInclude.push([property, true]);
          columnNames.push([property, '']);
          columnTypes.push([property, -1]);
          colsCount++;
        }
      }
    }

    return state
      .set('file', action.payload.file)
      .set('filetype', action.payload.filetype)
      .set('primaryKey', '')
      .set('previewRows', action.payload.preview)
      .set('columnsCount', colsCount)
      .set('columnsToInclude', Map(columnsToInclude))
      .set('columnNames', Map(columnNames))
      .set('columnTypes', Map(columnTypes));
  }

FileImportReducers[ActionTypes.uploadFile] =
  (state) =>
  {
    const isCsv = state.filetype === 'csv';
    const columnTypes = [];
    state.columnTypes.forEach((value, key) =>
    {
      switch (value)
      {
        case -1:
          alert('You must select a type for each column');
          return state;
        case 0:
          isCsv ? columnTypes.push('text') : columnTypes.push([key, 'text']);
          break;
        case 1:
          isCsv ? columnTypes.push('number') : columnTypes.push([key, 'number']);
          break;
        case 2:
          isCsv ? columnTypes.push('date') : columnTypes.push([key, 'date']);
          break;
      }
    });
    const cTypes = isCsv ? List<string>(columnTypes) : Map<string, string>(columnTypes);

    Ajax.importFile(
      state.file,
      state.filetype,
      state.dbText,
      state.tableText,
      state.connectionId,
      state.columnNames,
      state.columnsToInclude,
      cTypes,
      state.primaryKey,
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
