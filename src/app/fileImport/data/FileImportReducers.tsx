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
    const primaryKeys = state.primaryKeys.map((pkey) => pkey > transformCol ? pkey + 1 : pkey);
    return state
      .set('primaryKeys', primaryKeys)
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
    const primaryKeys = state.primaryKeys.map((pkey) => pkey > transformCol ? pkey + 1 : pkey);
    return state
      .set('primaryKeys', primaryKeys)
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
      .set('primaryKeys', primaryKeys)
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

FileImportReducers[ActionTypes.changeServerDbTable] =
  (state, action) =>
    state
      .set('serverId', action.payload.serverId)
      .set('dbName', action.payload.dbName)
      .set('tableName', action.payload.tableName);

FileImportReducers[ActionTypes.changeHasCsvHeader] =
  (state, action) =>
    state
      .set('hasCsvHeader', action.payload.hasCsvHeader)
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
  {
    const index = state.primaryKeys.indexOf(action.payload.columnId);
    return index > -1 ?
      state.set('primaryKeys', state.primaryKeys.delete(index))
      :
      state.set('primaryKeys', state.primaryKeys.push(action.payload.columnId));
  };

FileImportReducers[ActionTypes.changePrimaryKeyDelimiter] =
  (state, action) =>
    state
      .set('primaryKeyDelimiter', action.payload.delim)
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
      .set('primaryKeys', List([]))
      .set('primaryKeyDelimiter', '-')
      .set('previewRows', action.payload.preview)
      .set('originalNames', action.payload.originalNames)
      .set('columnNames', action.payload.originalNames)
      .set('columnsToInclude', List(action.payload.originalNames.map(() => true)))
      .set('columnTypes', List(action.payload.originalNames.map(() => FileImportTypes._ColumnTypesTree())))
      .set('transforms', List([]))
      .set('serverId', -1)
      .set('serverName', '')
      .set('dbName', '')
      .set('tableName', '')
  ;

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
      state.primaryKeyDelimiter,
      () =>
      {
        alert('success');
        action.payload.changeUploadInProgress(false);
        action.payload.fetchSchema();
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
      state.dbName,
      state.serverId,
      Map<string, object>(state.columnNames.map((colName, colId) =>
        state.columnsToInclude.get(colId) &&
        [colName, state.columnTypes.get(colId).toJS()],
      )),
      state.transforms,
      action.payload.query,
      action.payload.rank,
      action.payload.downloadFilename,
      (resp: any) =>
      {
        alert('success');
      },
      (err: string) =>
      {
        alert('Error exporting file: ' + err);
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
    Ajax.saveTemplate(state.dbName,
      state.tableName,
      state.serverId,
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
        alert('successfully saved template');
        action.payload.fetchTemplates(action.payload.exporting);
      },
      (err: string) =>
      {
        action.payload.setErrorMsg('Error saving template: ' + err);
      },
    );
    return state;
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
        alert('successfully updated template');
        action.payload.fetchTemplates(action.payload.exporting);
      },
      (err: string) =>
      {
        alert('Error updating template: ' + err);
      },
    );
    return state;
  };

FileImportReducers[ActionTypes.deleteTemplate] =
  (state, action) =>
  {
    Ajax.deleteTemplate(action.payload.templateId,
      () =>
      {
        alert('successfully deleted template');
        action.payload.fetchTemplates(action.payload.exporting);
      },
      (err: string) =>
      {
        alert('Error deleting template: ' + err);
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
            templateId: template['id'],
            templateName: template['name'],
            originalNames: template['originalNames'],
            columnTypes: template['columnTypes'],
            transformations: template['transformations'],
            hasCsvHeader: template['csvHeaderMissing'],
            primaryKeys: template['primaryKeys'],
            primaryKeyDelimiter: template['primaryKeyDelimiter'],
            export: template['export'],
          }),
        ));
        console.log('fetched templates: ', templates);
        action.payload.setTemplates(templates);
      },
    );
    return state;
  };

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
      .set('originalNames', List(template.originalNames))
      .set('primaryKeys', List(template.primaryKeys.map((pkey) => columnNames.indexOf(pkey))))
      .set('transforms', List<FileImportTypes.Transform>(template.transformations))
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
      .set('previewRows', previewRows)
      .set('primaryKeyDelimiter', template.primaryKeyDelimiter);
  };

FileImportReducers[ActionTypes.saveFile] =
  (state, action) =>
    state.set('file', action.payload.file)
      .set('filetype', action.payload.filetype)
  ;

export default FileImportReducers;
