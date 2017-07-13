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

// tslint:disable:restrict-plus-operands no-console

import * as Immutable from 'immutable';
import * as _ from 'underscore';
import Ajax from './../../util/Ajax';
import Util from './../../util/Util';
import * as FileImportTypes from './../FileImportTypes';
import ActionTypes from './FileImportActionTypes';
const { List, Map } = Immutable;

const FileImportReducers = {};

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

FileImportReducers[ActionTypes.setColumnName] =
  (state, action) =>
    state
      .setIn(['columnNames', action.payload.id], action.payload.columnName)
  ;

FileImportReducers[ActionTypes.setColumnType] =
  (state, action) =>
    state
      .setIn(['columnTypes', action.payload.id], action.payload.typeIndex)
  ;

FileImportReducers[ActionTypes.chooseFile] =
  (state, action) =>
  {
    const columnsToInclude = [];
    const columnNames = [];
    const columnTypes = [];
    let colsCount = 0;

    if (action.payload.filetype === 'csv' && !state.hasCsvHeader)
    {
      console.log('headerless csv');
      action.payload.preview[0].map((value, i) =>
      {
        columnsToInclude.push(['column' + i, true]);
        columnNames.push(['column' + i, 'column' + i]);
        columnTypes.push(['column' + i, 0]);
        colsCount++;
      });
    }
    else
    {
      console.log('csv with header/json');
      _.map(action.payload.preview[0], (value, key) =>
      {
        columnsToInclude.push([key, true]);
        columnNames.push([key, key]);
        columnTypes.push([key, 0]);
        colsCount++;
      });
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
  };

FileImportReducers[ActionTypes.uploadFile] =
  (state) =>
  {
    const isCsv = state.filetype === 'csv';
    const columnTypes = [];
    state.columnTypes.forEach((value, key) =>
    {
      const typeName = FileImportTypes.ELASTIC_TYPES[value];
      columnTypes.push(isCsv ? typeName : [key, typeName]);
    });

    const cTypes = isCsv ? List<string>(columnTypes) : Map<string, string>(columnTypes);
    const cNames = isCsv ? state.columnNames.toList() : state.columnNames;
    const cToInclude = isCsv ? state.columnsToInclude.toList() : state.columnsToInclude;

    Ajax.importFile(
      state.file,
      state.filetype,
      state.dbText,
      state.tableText,
      state.connectionId,
      cNames,
      cToInclude,
      cTypes,
      state.primaryKey,
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
