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
import SchemaActions from 'schema/data/SchemaActions';
import * as FileImportTypes from './../FileImportTypes';
import ActionTypes from './FileImportActionTypes';
import { FileImportStore } from './FileImportStore';

type Transform = FileImportTypes.Transform;
type Template = FileImportTypes.Template;
type ColumnTypesTree = FileImportTypes.ColumnTypesTree;

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

    setServerDbTable:
    (serverId: number, name: string, dbName: string, tableName: string) =>
      $(ActionTypes.setServerDbTable, { serverId, name, dbName, tableName }),

    fetchTypesFromQuery:
    (serverId: number, query: object) =>
      $(ActionTypes.fetchTypesFromQuery, { serverId, query, setColumnTypes: FileImportActions.setColumnTypes }),

    setColumnTypes:
    (newColumnTypes) =>
      $(ActionTypes.setColumnTypes, { newColumnTypes }),

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
    (filetype: string, filesize: number, preview: List<List<string>>, originalNames: List<string>, columnTypes?: List<ColumnTypesTree>) =>
      $(ActionTypes.chooseFile, {
        filetype,
        filesize,
        preview,
        originalNames,
        columnTypes,
      }),

    importFile:
    (handleFileImportSuccess) =>
      $(ActionTypes.importFile, {
        setErrorMsg: FileImportActions.setErrorMsg,
        changeUploadInProgress: FileImportActions.changeUploadInProgress,
        fetchSchema: SchemaActions.fetch,
        handleFileImportSuccess,
      }),

    exportFile:
    (query: string, serverId: number, dbName: string, rank: boolean, objectKey: string, downloadFilename: string,
      handleFileExportSuccess, handleFileExportError) =>
      $(ActionTypes.exportFile, {
        query,
        serverId,
        dbName,
        rank,
        objectKey,
        downloadFilename,
        handleFileExportSuccess,
        handleFileExportError,
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

    setColumnTypeIndex:
    (columnId: number, index: string) =>
      $(ActionTypes.setColumnTypeIndex, { columnId, index }),

    setColumnTypeAnalyzer:
    (columnId: number, analyzer: string) =>
      $(ActionTypes.setColumnTypeAnalyzer, { columnId, analyzer }),

    fetchColumnAnalyzers:
    () =>
      $(ActionTypes.fetchColumnAnalyzers, { setAnalyzers: FileImportActions.setAnalyzers }),

    setAnalyzers:
    (analyzers) =>
      $(ActionTypes.setAnalyzers, { analyzers }),

    updatePreviewColumns:
    (transform: Transform) =>
      $(ActionTypes.updatePreviewColumns, { transform }),

    saveTemplate: // if the database, server, and table haven't been selected in the file import process, they need to be given here
    (templateName: string, exporting: boolean, handleTemplateSaveSuccess, serverId?: number, dbName?: string, tableName?: string) =>
      $(ActionTypes.saveTemplate, {
        templateName,
        exporting,
        setErrorMsg: FileImportActions.setErrorMsg,
        fetchTemplates: FileImportActions.fetchTemplates,
        handleTemplateSaveSuccess,
        serverId,
        dbName,
        tableName,
      }),

    updateTemplate:
    (templateId: number, exporting: boolean, handleUpdateTemplateSuccess, handleUpdateTemplateError, templateName: string) =>
      $(ActionTypes.updateTemplate, {
        templateId,
        exporting,
        fetchTemplates: FileImportActions.fetchTemplates,
        handleUpdateTemplateSuccess,
        handleUpdateTemplateError,
        templateName,
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
    (templateId: number, exporting: boolean, handleDeleteTemplateSuccess, handleDeleteTemplateError, templateName: string) =>
    {
      $(ActionTypes.deleteTemplate, {
        templateId,
        exporting,
        fetchTemplates: FileImportActions.fetchTemplates,
        handleDeleteTemplateSuccess,
        handleDeleteTemplateError,
        templateName,
      });
    },

    saveFile:
    (file: File, filetype: string) =>
      $(ActionTypes.saveFile, { file, filetype }),

    changeUploadInProgress:
    (uploading: boolean) =>
      $(ActionTypes.changeUploadInProgress, { uploading }),

    changeElasticUpdate:
    (elasticUpdate: boolean) =>
      $(ActionTypes.changeElasticUpdate, { elasticUpdate }),

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
    (exportFiletype: string) =>
      $(ActionTypes.setExportFiletype, { exportFiletype }),

    toggleExportRank:
    (exportRank: boolean) =>
      $(ActionTypes.toggleExportRank, { exportRank }),

    setTypeObjectKey:
    (typeObjectKey: string) =>
      $(ActionTypes.setTypeObjectKey, { typeObjectKey }),
  };

export default FileImportActions;
