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
import * as _ from 'lodash';
import TerrainStore from 'store/TerrainStore';
import Ajax from './../../util/Ajax';
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
      .set('isDirty', true)
      .setIn(['previewColumns', transformCol], List(state.previewColumns.get(transformCol).map((item) =>
        transform.name === 'append' ? item + transform.args.text : transform.args.text + item,
      )));
  }
  else if (transform.name === 'duplicate')
  {
    const primaryKeys = state.primaryKeys.map((pkey) => pkey > transformCol ? pkey + 1 : pkey);
    return state
      .set('isDirty', true)
      .set('primaryKeys', primaryKeys)
      .set('columnsToInclude', state.columnsToInclude.insert(transformCol + 1, true))
      .set('columnTypes', state.columnTypes.insert(transformCol + 1, state.columnTypes.get(transformCol)))
      .set('columnNames', state.columnNames.insert(transformCol + 1, transform.args.newName as string))
      .set('previewColumns', state.previewColumns.insert(transformCol + 1, state.previewColumns.get(transformCol)));
  }
  else if (transform.name === 'split')
  {
    const primaryKeys = state.primaryKeys.map((pkey) => pkey > transformCol ? pkey + 1 : pkey);
    return state
      .set('isDirty', true)
      .set('primaryKeys', primaryKeys)
      .set('columnsToInclude', state.columnsToInclude.insert(transformCol + 1, true))
      .set('columnTypes', state.columnTypes.insert(transformCol + 1, FileImportTypes._ColumnTypesTree()))
      .set('columnNames', state.columnNames
        .set(transformCol, transform.args.newName[0])
        .insert(transformCol + 1, transform.args.newName[1]))
      .set('previewColumns', state.previewColumns
        .insert(transformCol + 1, List(state.previewColumns.get(transformCol).map((item) =>
          item.substring(item.indexOf(transform.args.text) + transform.args.text.length),
        )))
        .set(transformCol, List(state.previewColumns.get(transformCol).map((item) =>
          item.substring(0, item.indexOf(transform.args.text)),
        ))),
    );
  }
  else if (transform.name === 'merge')
  {
    const mergeCol: number = state.columnNames.indexOf(transform.args.mergeName);

    const primaryKeys = state.primaryKeys.map((pkey) =>
    {
      if (pkey === transformCol || pkey === mergeCol)
      {
        return mergeCol < transformCol ? transformCol - 1 : transformCol;
      }
      else
      {
        return pkey < mergeCol ? pkey : pkey - 1;
      }
    });

    return state
      .set('isDirty', true)
      .set('primaryKeys', primaryKeys)
      .set('columnsToInclude', state.columnsToInclude.delete(mergeCol))
      .set('columnTypes', state.columnTypes.delete(mergeCol))
      .set('columnNames', state.columnNames
        .set(transformCol, transform.args.newName as string)
        .delete(mergeCol))
      .set('previewColumns', state.previewColumns
        .set(transformCol, List(state.previewColumns.get(transformCol).map((item, index) =>
          item + transform.args.text + state.previewColumns.get(mergeCol).get(index),
        )))
        .delete(mergeCol),
    );
  }
  return state;
};

const addPreviewColumn = (state: FileImportTypes.FileImportState, columnName: string) =>
{
  const { originalNames, columnNames, columnTypes, columnsToInclude, previewColumns } = state;
  return state
    .set('isDirty', true)
    .set('originalNames', originalNames.push(columnName))
    .set('columnNames', columnNames.push(columnName))
    .set('columnTypes', columnTypes.push(FileImportTypes._ColumnTypesTree()))
    .set('columnsToInclude', columnsToInclude.push(true))
    .set('previewColumns', previewColumns.map((row) => row.concat('')));
};

FileImportReducers[ActionTypes.setErrorMsg] =
  (state, action) =>
    state
      .set('errorMsg', action.payload.err)
  ;

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

FileImportReducers[ActionTypes.setServerDbTable] =
  (state, action) =>
    state
      .set('serverId', action.payload.serverId)
      .set('serverName', action.payload.name)
      .set('dbName', action.payload.dbName)
      .set('tableName', action.payload.tableName);

FileImportReducers[ActionTypes.changeHasCsvHeader] =
  (state, action) =>
    state
      .set('hasCsvHeader', action.payload.hasCsvHeader)
  ;

FileImportReducers[ActionTypes.changeIsNewlineSeparatedJSON] =
  (state, action) =>
    state
      .set('isNewlineSeparatedJSON', action.payload.isNewlineSeparatedJSON)
  ;

FileImportReducers[ActionTypes.changeUploadInProgress] =
  (state, action) =>
    state
      .set('uploadInProgress', action.payload.uploading)
  ;

FileImportReducers[ActionTypes.changeElasticUpdate] =
  (state, action) =>
    state
      .set('elasticUpdate', action.payload.elasticUpdate)
  ;

FileImportReducers[ActionTypes.togglePreviewColumn] =
  (state, action) =>
    state
      .set('isDirty', true)
      .set('requireJSONHaveAllFields', action.payload.requireJSONHaveAllFields)
  ;

FileImportReducers[ActionTypes.setExportFiletype] =
  (state, action) =>
    state
      .set('filetype', action.payload.exportFiletype)
  ;

FileImportReducers[ActionTypes.toggleExportRank] =
  (state, action) =>
    state
      .set('isDirty', true)
      .set('exportRank', action.payload.exportRank)
  ;

FileImportReducers[ActionTypes.setTypeObjectKey] =
  (state, action) =>
    state
      .set('isDirty', true)
      .set('objectKey', action.payload.setTypeObjectKey)
  ;

FileImportReducers[ActionTypes.changePrimaryKey] =
  (state, action) =>
  {
    const index = state.primaryKeys.indexOf(action.payload.columnId);
    return index > -1 ?
      state
        .set('isDirty', true)
        .set('primaryKeys', state.primaryKeys.delete(index))
      :
      state
        .set('isDirty', true)
        .set('primaryKeys', state.primaryKeys.push(action.payload.columnId));
  };

FileImportReducers[ActionTypes.changePrimaryKeyDelimiter] =
  (state, action) =>
    state
      .set('isDirty', true)
      .set('primaryKeyDelimiter', action.payload.delim)
  ;

FileImportReducers[ActionTypes.setColumnToInclude] =
  (state, action) =>
    state
      .set('isDirty', true)
      .updateIn(['columnsToInclude', action.payload.columnId], (isColIncluded: boolean) => !isColIncluded)
  ;

FileImportReducers[ActionTypes.setColumnName] =
  (state, action) =>
    state
      .set('isDirty', true)
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
      return state
        .set('isDirty', true)
        .setIn(keyPath, action.payload.type)
        .setIn(keyPathAdd, FileImportTypes._ColumnTypesTree());
    }
    return state
      .set('isDirty', true)
      .setIn(keyPath, action.payload.type);
  };

FileImportReducers[ActionTypes.addTransform] =
  (state, action) =>
    state
      .set('isDirty', true)
      .set('transforms', state.transforms.push(action.payload.transform))
  ;

FileImportReducers[ActionTypes.updatePreviewColumns] =
  (state, action) =>
    applyTransform(state, action.payload.transform)
  ;

FileImportReducers[ActionTypes.chooseFile] =
  (state, action) =>
  {
    const columnTypes = action.payload.columnTypes !== undefined ? action.payload.columnTypes :
      List(action.payload.originalNames.map(() => FileImportTypes._ColumnTypesTree()));
    return state
      .set('filetype', action.payload.filetype)
      .set('filesize', action.payload.filesize)
      .set('primaryKeys', List([]))
      .set('primaryKeyDelimiter', '-')
      .set('previewColumns', action.payload.preview)
      .set('originalNames', action.payload.originalNames)
      .set('columnNames', action.payload.originalNames)
      .set('columnsToInclude', List(action.payload.originalNames.map(() => true)))
      .set('columnTypes', columnTypes)
      .set('transforms', List([]))
      .set('serverId', -1)
      .set('serverName', '')
      .set('dbName', '')
      .set('tableName', '');
  };

FileImportReducers[ActionTypes.importFile] =
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
        state.columnsToInclude.get(colId) &&
        [colName, state.columnTypes.get(colId).toJS()],
      )),
      state.primaryKeys.map((pkey) => state.columnNames.get(pkey)),
      state.transforms,
      state.elasticUpdate,
      state.hasCsvHeader,
      state.isNewlineSeparatedJSON,
      state.requireJSONHaveAllFields,
      state.primaryKeyDelimiter,
      () =>
      {
        action.payload.handleFileImportSuccess();
        action.payload.changeUploadInProgress(false);
        TerrainStore.dispatch(action.payload.fetchSchema());
      },
      (err: string) =>
      {
        action.payload.setErrorMsg('Error uploading file: ' + JSON.parse(err).errors[0].detail);
        action.payload.changeUploadInProgress(false);
      },
    );
    return state.set('uploadInProgress', true);
  };

FileImportReducers[ActionTypes.exportFile] =
  (state, action) =>
  {
    Ajax.exportFile(
      state.filetype,
      action.payload.dbName,
      action.payload.serverId,
      Map<string, object>(state.columnNames.map((colName, colId) =>
        state.columnsToInclude.get(colId) &&
        [colName, state.columnTypes.get(colId).toJS()],
      )),
      state.transforms,
      action.payload.query,
      action.payload.rank,
      action.payload.objectKey,
      action.payload.downloadFilename,
      (resp: any) =>
      {
        action.payload.handleFileExportSuccess();
      },
      (err: string) =>
      {
        action.payload.handleFileExportError(err);
      },
    );
    return state;
  };

FileImportReducers[ActionTypes.setTemplates] =
  (state, action) =>
    state.set('templates', action.payload.templates)
  ;

FileImportReducers[ActionTypes.saveTemplate] =
  (state, action) =>
  {
    const { serverId, dbName, tableName } = action.payload;
    Ajax.saveTemplate(
      dbName !== undefined ? dbName : state.dbName,
      tableName !== undefined ? tableName : state.tableName,
      serverId !== undefined ? serverId : state.serverId,
      state.originalNames,
      Map<string, ColumnTypesTree>(state.columnNames.map((colName, colId) =>
        state.columnsToInclude.get(colId) &&
        [colName, state.columnTypes.get(colId).toJS()],
      )),
      state.primaryKeys.map((pkey) => state.columnNames.get(pkey)),
      state.transforms,
      action.payload.templateName,
      action.payload.exporting,
      state.primaryKeyDelimiter,
      () =>
      {
        action.payload.handleTemplateSaveSuccess();
        action.payload.fetchTemplates(action.payload.exporting);
      },
      (err: string) =>
      {
        action.payload.setErrorMsg('Error saving template: ' + err);
      },
    );
    return state.set('isDirty', false);
  };

FileImportReducers[ActionTypes.updateTemplate] =
  (state, action) =>
  {
    Ajax.updateTemplate(state.originalNames,
      Map<string, ColumnTypesTree>(state.columnNames.map((colName, colId) =>
        state.columnsToInclude.get(colId) &&
        [colName, state.columnTypes.get(colId).toJS()],
      )),
      state.primaryKeys.map((pkey) => state.columnNames.get(pkey)),
      state.transforms,
      action.payload.exporting,
      state.primaryKeyDelimiter,
      action.payload.templateId,
      () =>
      {
        action.payload.handleUpdateTemplateSuccess(action.payload.templateName);
        action.payload.fetchTemplates(action.payload.exporting);
      },
      (err: string) =>
      {
        action.payload.handleUpdateTemplateError(err);
      },
    );
    return state.set('isDirty', false);
  };

FileImportReducers[ActionTypes.deleteTemplate] =
  (state, action) =>
  {
    Ajax.deleteTemplate(
      action.payload.templateId,
      action.payload.exporting,
      () =>
      {
        action.payload.handleDeleteTemplateSuccess(action.payload.templateName);
        action.payload.fetchTemplates(action.payload.exporting);
      },
      (err: string) =>
      {
        action.payload.handleDeleteTemplateError(err);
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
      action.payload.exporting,
      (templatesArr) =>
      {
        const templates: List<Template> = List<Template>(templatesArr.map((template) =>
          FileImportTypes._Template({
            export: template['export'],
            templateId: template['id'],
            templateName: template['name'],
            originalNames: List<string>(template['originalNames']),
            columnTypes: template['columnTypes'],
            transformations: template['transformations'],
            primaryKeys: template['primaryKeys'],
            primaryKeyDelimiter: template['primaryKeyDelimiter'],
          }),
        ));
        action.payload.setTemplates(templates);
      },
    );
    return state;
  };

FileImportReducers[ActionTypes.applyTemplate] =
  (state, action) =>
  {
    action.payload.newColumns.forEach((colName) =>
    {
      state = addPreviewColumn(state, colName);
    });
    const index = state.templates.findKey((temp) => temp.templateId === action.payload.templateId);
    const template: Template = state.templates.get(index);
    template.transformations.map((transform) =>
    {
      state = applyTransform(state, transform);
    });
    const { columnNames, previewColumns } = state;
    return state
      .set('originalNames', List(template.originalNames))
      .set('primaryKeys', List(template.primaryKeys.map((pkey) => columnNames.indexOf(pkey))))
      .set('columnNames', columnNames)
      .set('transforms', List<Transform>(template.transformations))
      .set('columnTypes', List(columnNames.map((colName) =>
        template.columnTypes[colName] ?
          FileImportTypes._ColumnTypesTree(template.columnTypes[colName])
          :
          FileImportTypes._ColumnTypesTree(),
      )))
      .set('columnsToInclude', List(columnNames.map((colName) => !!template.columnTypes[colName])))
      .set('previewColumns', previewColumns)
      .set('primaryKeyDelimiter', template.primaryKeyDelimiter)
      .set('isDirty', false);
  };

FileImportReducers[ActionTypes.addPreviewColumn] =
  (state, action) =>
    addPreviewColumn(state, action.payload.columnName)
  ;

FileImportReducers[ActionTypes.saveFile] =
  (state, action) =>
    state.set('file', action.payload.file)
      .set('filetype', action.payload.filetype)
      .set('isDirty', false)
  ;

export default FileImportReducers;
