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

// Copyright 2018 Terrain Data, Inc.
// tslint:disable:max-classes-per-file import-spacing

import * as Immutable from 'immutable';
const { List, Map } = Immutable;
import * as Radium from 'radium';
import * as React from 'react';
import { withRouter } from 'react-router';

import { Algorithm, LibraryState } from 'library/LibraryTypes';
import { MidwayError } from 'shared/error/MidwayError';
import TerrainStore from 'src/app/store/TerrainStore';
import Util from 'util/Util';

import ETLAjax from 'etl/ETLAjax';
import { ETLActions } from 'etl/ETLRedux';
import ETLRouteUtil from 'etl/ETLRouteUtil';
import TemplateEditor from 'etl/templates/components/TemplateEditor';
import { fetchDocumentsFromAlgorithm, fetchDocumentsFromFile } from 'etl/templates/DocumentRetrievalUtil';
import { _TemplateField, TemplateField } from 'etl/templates/FieldTypes';
import { createTreeFromEngine } from 'etl/templates/SyncUtil';
import { TemplateEditorActions } from 'etl/templates/TemplateEditorRedux';
import
{
  _TemplateEditorState,
  DefaultDocumentLimit,
  EditorDisplayState,
  FetchStatus,
  FieldMap,
  TemplateEditorState,
} from 'etl/templates/TemplateEditorTypes';
import { _FileConfig, _SinkConfig, _SourceConfig, FileConfig, SinkConfig, SourceConfig } from 'shared/etl/immutable/EndpointRecords';
import
{
  _ETLEdge, _ETLNode, _ETLProcess,
  _MergeJoinOptions, ETLEdge, ETLNode, ETLProcess, MergeJoinOptions,
} from 'shared/etl/immutable/ETLProcessRecords';
import { ETLTemplate } from 'shared/etl/immutable/TemplateRecords';
import { Sinks, SourceOptionsType, Sources } from 'shared/etl/types/EndpointTypes';
import { FileTypes, NodeTypes } from 'shared/etl/types/ETLTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import ETLHelpers from './ETLHelpers';

import Ajax from 'util/Ajax';

class DocumentsHelpers extends ETLHelpers
{
  public mergeDocuments(nodeId: number, joinOptions: MergeJoinOptions): List<object>
  {
    const template = this._template;
    const { leftId, rightId, leftJoinKey, rightJoinKey, outputKey } = joinOptions;

    const inboundEdges = template.findEdges((edge) => edge.to === nodeId);
    const leftEdge = inboundEdges.find((id) => template.getEdge(id).from === leftId);
    const rightEdge = inboundEdges.find((id) => template.getEdge(id).from === rightId);

    const leftDocuments = this.getDocumentsForNode(leftId);
    const rightDocuments = this.getDocumentsForNode(rightId);

    const leftTE = template.getTransformationEngine(leftEdge);
    const rightTE = template.getTransformationEngine(rightEdge);

    const mergeDocuments: List<object> = leftDocuments.map((document: object) =>
    {
      const leftDocument = leftTE.transform(document);
      const innerDocs = rightDocuments.slice(0, rightDocuments.size > 3 ? 3 : rightDocuments.size)
        .map((innerDoc) => rightTE.transform(innerDoc)).toArray();
      leftDocument[outputKey] = innerDocs;
      return leftDocument;
    }).toList();

    return mergeDocuments;
  }

  public getDocumentsForNode(nodeId: number)
  {
    const template = this._template;
    const node = template.getNode(nodeId);
    switch (node.type)
    {
      case NodeTypes.Source: {
        return this._templateEditor.getSourceDocuments(node.endpoint);
      }
      case NodeTypes.Sink: {
        throw new Error(`Cannot Get Documents For a Sink`);
      }
      case NodeTypes.MergeJoin: {
        return this.mergeDocuments(nodeId, node.options as MergeJoinOptions);
      }
      default: {
        this._logError(`Unrecognized or unsupported node type: ${node.type}`);
      }
    }
  }

  public computeDocuments()
  {
    try
    {
      const template = this._template;
      const currentEdge = this._templateEditor.getCurrentEdgeId();
      const edge = template.getEdge(currentEdge);

      if (edge !== undefined)
      {
        const documents = this.getDocumentsForNode(edge.from);
        this.editorAct({
          actionType: 'setDisplayState',
          state: {
            documents,
          },
        });
      }
    }
    catch (e)
    {
      this._logError(e);
    }
  }

  // fetches documents for provided source keys
  public fetchSources(keys: List<string>)
  {
    const sources = this._templateEditor.template.getSources();
    keys.forEach((key) =>
    {
      const source = sources.get(key);
      this.fetchDocuments(source, key).catch(this._logError);
    });
  }

  public fetchDocuments(
    source: SourceConfig,
    key?: string,
  ): Promise<List<object>>
  {
    return new Promise<List<object>>((resolve, reject) =>
    {
      const onFetchLoad = (documents: List<object>) =>
      {
        if (key !== undefined)
        {
          this.onLoadDocuments(documents, key);
        }
        resolve(documents);
      };
      const catchError = (ev) =>
      {
        if (key !== undefined)
        {
          this.onFetchDocumentsError(ev, key);
        }
        reject(ev);
      };
      try
      {
        if (key !== undefined)
        {
          this.updateStateBeforeFetch(key);
        }
        switch (source.type)
        {
          case Sources.Upload: {
            const file = source.options['file'];
            if (file == null)
            {
              return catchError('File not provided');
            }
            const config = source.fileConfig;
            fetchDocumentsFromFile(file, config, DefaultDocumentLimit)
              .then(onFetchLoad)
              .catch(catchError);
            break;
          }
          case Sources.Mysql:
          case Sources.Postgresql:
          case Sources.Algorithm:
          case Sources.Fs:
          case Sources.Http:
          case Sources.Sftp:
            ETLAjax.fetchPreview(source, DefaultDocumentLimit)
              .then(onFetchLoad)
              .catch(catchError);
            break;
          default: {
            return catchError(`Failed to retrieve documents. Unsupported source type: ${source.type}`);
          }
        }
      }
      catch (e)
      {
        return catchError(e);
      }
    });
  }

  protected onLoadDocuments(documents: List<object>, key: string)
  {
    this.editorAct({
      actionType: 'setInMergeDocuments',
      key,
      documents,
    });
    this.editorAct({
      actionType: 'updateDisplayState',
      updaters: {
        fetchStatuses: (statuses) => statuses.set(key, FetchStatus.Loaded),
      },
    });
    this.updateStateAfterFetch();
  }

  protected onFetchDocumentsError(ev: string | MidwayError, key: string)
  {
    this.editorAct({
      actionType: 'updateDisplayState',
      updaters: {
        fetchStatuses: (statuses) => statuses.set(key, FetchStatus.Error),
      },
    });
    // tslint:disable-next-line
    console.error(`error fetching ${this._template.getSourceName(key)}: ${ev}`);
    this.updateStateAfterFetch();
  }

  private updateStateAfterFetch()
  {
    this.editorAct({
      actionType: 'changeLoadingDocuments',
      increment: false,
    });
    if (this._templateEditor.loadingDocuments <= 0)
    {
      this.computeDocuments();
    }
  }

  private updateStateBeforeFetch(key: string)
  {
    this.editorAct({
      actionType: 'updateDisplayState',
      updaters: {
        fetchStatuses: (statuses) => statuses.set(key, FetchStatus.Loading),
      },
    });
    this.editorAct({
      actionType: 'changeLoadingDocuments',
      increment: true,
    });
  }
}
export default new DocumentsHelpers(TerrainStore);
