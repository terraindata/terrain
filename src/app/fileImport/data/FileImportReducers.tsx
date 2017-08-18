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

type Transform = FileImportTypes.Transform;
type Template = FileImportTypes.Template;
type ColumnTypesTree = FileImportTypes.ColumnTypesTree;

const FileImportReducers = {};

const applyTransform = (state: FileImportTypes.FileImportState, transform: Transform) =>
{
  const transformCol: number = state.columnNames.indexOf(transform.colName);

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
  else if (transform.name === 'duplicate')
  {
    const primaryKey: number = state.primaryKey > transformCol ? state.primaryKey + 1 : state.primaryKey;
    return state
      .set('primaryKey', primaryKey)
      .set('columnNames', state.columnNames
        .insert(transformCol + 1, transform.args.newName as string))
      .set('columnsToInclude', state.columnsToInclude.insert(transformCol + 1, true))
      .set('columnTypes', state.columnTypes.insert(transformCol + 1, state.columnTypes.get(transformCol)))
      .set('previewRows', List(state.previewRows.map((row: any, i) =>
        [].concat(...row.map((col, j) =>           // convoluted way of mapping an array and returning a larger array
          j === transformCol ? [col, col] : col,    // since one column needs to be added (same for split below)
        )),
      )));
  }
  else if (transform.name === 'split')
  {
    const primaryKey: number = state.primaryKey > transformCol ? state.primaryKey + 1 : state.primaryKey;
    return state
      .set('primaryKey', primaryKey)
      .set('columnNames', state.columnNames
        .set(transformCol, transform.args.newName[0])
        .insert(transformCol + 1, transform.args.newName[1]))
      .set('columnsToInclude', state.columnsToInclude.insert(transformCol + 1, true))
      .set('columnTypes', state.columnTypes.insert(transformCol + 1, FileImportTypes._ColumnTypesTree()))
      .set('previewRows', List(state.previewRows.map((row: any, i) =>
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
    const mergeCol: number = state.columnNames.indexOf(transform.args.mergeName);

    let primaryKey: number;
    if (state.primaryKey === transformCol || state.primaryKey === mergeCol)
    {
      primaryKey = mergeCol < transformCol ? transformCol - 1 : transformCol;
    }
    else
    {
      primaryKey = state.primaryKey < mergeCol ? state.primaryKey : state.primaryKey - 1;
    }

    return state
      .set('primaryKey', primaryKey)
      .set('columnNames', state.columnNames
        .set(transformCol, transform.args.newName as string)
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
      .set('serverId', action.payload.serverId)
      .set('serverName', action.payload.name)
      .set('dbName', '')
      .set('tableName', '')
  ;

FileImportReducers[ActionTypes.changeDbName] =
  (state, action) =>
    state
      .set('dbName', action.payload.dbName)
      .set('tableName', '')
  ;

FileImportReducers[ActionTypes.changeTableName] =
  (state, action) =>
    state
      .set('tableName', action.payload.tableName);

FileImportReducers[ActionTypes.changeCsvHeaderMissing] =
  (state, action) =>
    state
      .set('csvHeaderMissing', action.payload.csvHeaderMissing)
  ;

FileImportReducers[ActionTypes.changeUploadInProgress] =
  (state, action) =>
    state
      .set('uploadInProgress', action.payload.uploading)
  ;

FileImportReducers[ActionTypes.changeElasticUpdate] =
  (state, action) =>
    state
      .set('elasticUpdate', !state.elasticUpdate)
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

FileImportReducers[ActionTypes.setColumnName] =
  (state, action) =>
    state
      .setIn(['columnNames', action.payload.columnId], action.payload.newName)
  ;

FileImportReducers[ActionTypes.setColumnType] =
  (state, action) =>
  {
    const keyPath = ['columnTypes', action.payload.columnId];
    for (let i = 0; i < action.payload.recursionDepth; i++)
    {
      keyPath.push('innerType');
    }
    keyPath.push('type');

    if (action.payload.type === 'array')
    {
      const keyPathAdd = keyPath.slice();
      keyPathAdd[keyPathAdd.length - 1] = 'innerType'; // add new 'innerType' at the same level as highest 'type'
      return state.setIn(keyPath, action.payload.type)
        .setIn(keyPathAdd, FileImportTypes._ColumnTypesTree());
    }
    return state.setIn(keyPath, action.payload.type);
  };

FileImportReducers[ActionTypes.addTransform] =
  (state, action) =>
    state.set('transforms', state.transforms.push(action.payload.transform))
  ;

FileImportReducers[ActionTypes.updatePreviewRows] =
  (state, action) =>
    applyTransform(state, action.payload.transform)
  ;

FileImportReducers[ActionTypes.chooseFile] =
  (state, action) =>
    state
      .set('filetype', action.payload.filetype)
      .set('primaryKey', -1)
      .set('previewRows', action.payload.preview)
      .set('columnsCount', action.payload.originalNames.size)
      .set('originalNames', action.payload.originalNames)
      .set('columnNames', action.payload.originalNames)
      .set('columnsToInclude', List(action.payload.originalNames.map(() => true)))
      .set('columnTypes', List(action.payload.originalNames.map(() => FileImportTypes._ColumnTypesTree())))
      .set('transforms', List([]))
  ;

FileImportReducers[ActionTypes.uploadFile] =
  (state, action) =>
  {
    Ajax.importFile(
      state.file,
      state.filetype,
      state.dbName,
      state.tableName,
      state.serverId,
      state.originalNames,
      Map<string, object>(state.columnNames.map((colName, colId) =>
        state.columnsToInclude.get(colId) &&                          // backend requires type as string
        [colName, state.columnTypes.get(colId).toJS()],
      )),
      state.primaryKey === -1 ? '' : state.columnNames.get(state.primaryKey),
      state.transforms,
      state.elasticUpdate,
      state.csvHeaderMissing,
      () =>
      {
        alert('success');
        action.payload.changeUploadInProgress(false);
      },
      (err: string) =>
      {
        alert('Error uploading file: ' + JSON.parse(err).errors[0].detail);
        action.payload.changeUploadInProgress(false);
      },
    );

    return state.set('uploadInProgress', true);
  };

FileImportReducers[ActionTypes.saveTemplate] =
  (state, action) =>
  {
    Ajax.saveTemplate(state.dbName,
      state.tableName,
      state.serverId,
      state.originalNames,
      Map<string, ColumnTypesTree>(state.columnNames.map((colName, colId) =>
        state.columnsToInclude.get(colId) &&
        [colName, state.columnTypes.get(colId).toJS()],
      )),
      state.primaryKey === -1 ? '' : state.columnNames.get(state.primaryKey),
      state.transforms,
      action.payload.templateName,
      () =>
      {
        alert('successfully saved template');
        action.payload.fetchTemplates();
      },
      (err: string) =>
      {
        alert('Error saving template: ' + JSON.parse(err).errors[0].detail);
      },
    );
    return state;
  };

FileImportReducers[ActionTypes.fetchTemplates] =
  (state, action) =>
  {
    Ajax.fetchTemplates(
      state.serverId,
      state.dbName,
      state.tableName,

      (templatesArr) =>
      {
        const templates: List<Template> = List<Template>(templatesArr.map((template) =>
          FileImportTypes._Template({
            templateId: template['id'],
            templateName: template['name'],
            originalNames: template['originalNames'],
            columnTypes: template['columnTypes'],
            transformations: template['transformations'],
            csvHeaderMissing: template['csvHeaderMissing'],
            primaryKey: template['primaryKey'],
          }),
        ));
        console.log('fetched templates: ', templates);
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
    const template: Template = state.templates.get(action.payload.templateId);
    template.transformations.map((transform) =>
    {
      state = applyTransform(state, transform);
    });
    const { columnNames, previewRows } = state;
    return state
      .set('primaryKey', columnNames.indexOf(template.primaryKey))
      .set('columnNames', columnNames)
      .set('originalNames', List(template.originalNames))
      .set('transforms', List<Transform>(template.transformations))
      .set('columnTypes', List(columnNames.map((colName) =>
        template.columnTypes[colName] ?
          FileImportTypes._ColumnTypesTree(template.columnTypes[colName])
          :
          FileImportTypes._ColumnTypesTree(),
      )))
      .set('columnsToInclude', List(columnNames.map((colName) => !!template.columnTypes[colName])))
      .set('previewRows', previewRows);
  };

FileImportReducers[ActionTypes.saveFile] =
  (state, action) =>
    state.set('file', action.payload.file)
      .set('filetype', action.payload.filetype)
  ;

export default FileImportReducers;
