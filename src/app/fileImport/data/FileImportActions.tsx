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
import { SchemaActions } from '../../schema/data/SchemaStore';
import * as FileImportTypes from './../FileImportTypes';
import ActionTypes from './FileImportActionTypes';
import { FileImportStore } from './FileImportStore';

type Transform = FileImportTypes.Transform;
type Template = FileImportTypes.Template;

const $ = (type: string, payload: any) => FileImportStore.dispatch({ type, payload });

const FileImportActions =
  {
    changeServer:
    (serverId: number, name: string) =>
      $(ActionTypes.changeServer, { serverId, name }),

    changeDbName:
    (dbName: string) =>
      $(ActionTypes.changeDbName, { dbName }),

    changeTableName:
    (tableName: string) =>
      $(ActionTypes.changeTableName, { tableName }),

    changeHasCsvHeader:
    (hasCsvHeader: boolean) =>
      $(ActionTypes.changeHasCsvHeader, { hasCsvHeader }),

    changeIsNewlineSeparatedJSON:
    (isNewlineSeparatedJSON: boolean) =>
      $(ActionTypes.changeIsNewlineSeparatedJSON, { isNewlineSeparatedJSON }),

    changePrimaryKey:
    (columnId: number) =>
      $(ActionTypes.changePrimaryKey, { columnId }),

    changePrimaryKeyDelimiter:
    (delim: string) =>
      $(ActionTypes.changePrimaryKeyDelimiter, { delim }),

    chooseFile:
    (filetype: string, preview: List<List<string>>, originalNames: List<string>) =>
      $(ActionTypes.chooseFile, {
        filetype,
        preview,
        originalNames,
      }),

    importFile:
    () =>
      $(ActionTypes.importFile, {
        setErrorMsg: FileImportActions.setErrorMsg,
        changeUploadInProgress: FileImportActions.changeUploadInProgress,
        fetchSchema: SchemaActions.fetch,
      }),

    exportFile:
    (query: string, serverId: number, dbName: string, rank: boolean, downloadFilename: string) =>
      $(ActionTypes.exportFile, {
        query,
        serverId,
        dbName,
        rank,
        downloadFilename,
      }),

    addTransform:
    (transform: Transform) =>
      $(ActionTypes.addTransform, { transform }),

    setColumnToInclude:
    (columnId: number) =>
      $(ActionTypes.setColumnToInclude, { columnId }),

    setColumnName:
    (columnId: number, newName: string) =>
      $(ActionTypes.setColumnName, { columnId, newName }),

    setColumnType:
    (columnId: number, recursionDepth: number, type: string) =>
      $(ActionTypes.setColumnType, { columnId, recursionDepth, type }),

    updatePreviewRows:
    (transform: Transform) =>
      $(ActionTypes.updatePreviewRows, { transform }),

    saveTemplate:
    (templateName: string, exporting: boolean) =>
      $(ActionTypes.saveTemplate, {
        templateName,
        exporting,
        setErrorMsg: FileImportActions.setErrorMsg,
        fetchTemplates: FileImportActions.fetchTemplates,
      }),

    updateTemplate:
    (templateId: number, exporting: boolean) =>
      $(ActionTypes.updateTemplate, {
        templateId,
        exporting,
        fetchTemplates: FileImportActions.fetchTemplates,
      }),

    fetchTemplates:
    (exporting: boolean) =>
      $(ActionTypes.fetchTemplates, {
        exporting,
        setTemplates: FileImportActions.setTemplates,
      }),

    setTemplates:
    (templates: List<Template>) =>
      $(ActionTypes.setTemplates, { templates }),

    applyTemplate:
    (templateId: number, newColumns: List<string>) =>
      $(ActionTypes.applyTemplate, {
        templateId,
        newColumns,
      }),

    deleteTemplate:
    (templateId: number, exporting: boolean) =>
      $(ActionTypes.deleteTemplate, {
        templateId,
        exporting,
        fetchTemplates: FileImportActions.fetchTemplates,
      }),

    saveFile:
    (file: File, filetype: string) =>
      $(ActionTypes.saveFile, { file, filetype }),

    changeUploadInProgress:
    (uploading: boolean) =>
      $(ActionTypes.changeUploadInProgress, { uploading }),

    changeElasticUpdate:
    () =>
      $(ActionTypes.changeElasticUpdate, {}),

    addPreviewColumn:
    (columnName: string) =>
      $(ActionTypes.addPreviewColumn, { columnName }),

    togglePreviewColumn:
    (requireJSONHaveAllFields: boolean) =>
      $(ActionTypes.togglePreviewColumn, { requireJSONHaveAllFields }),

    setErrorMsg:
    (err: string) =>
      $(ActionTypes.setErrorMsg, { err }),

    setExportFiletype:
    (type: string) =>
      $(ActionTypes.setExportFiletype, { type }),
  };

export default FileImportActions;
