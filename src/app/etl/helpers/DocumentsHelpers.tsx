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

import ETLHelpers from './ETLHelpers';

import { _FileConfig, _SinkConfig, _SourceConfig, FileConfig, SinkConfig, SourceConfig } from 'etl/EndpointTypes';
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
  ETLTemplate,
  FieldMap,
  TemplateEditorState,
} from 'etl/templates/TemplateTypes';
import { _WalkthroughState, WalkthroughState } from 'etl/walkthrough/ETLWalkthroughTypes';
import { Sinks, SourceOptionsType, Sources } from 'shared/etl/types/EndpointTypes';
import { FileTypes } from 'shared/etl/types/ETLTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';

import Ajax from 'util/Ajax';

class DocumentsHelpers extends ETLHelpers
{

  public computeMergedDocuments()
  {
    const mergeDocuments = this._templateEditor.uiState.mergeDocuments;
    // placeholder TODO
    const merged = mergeDocuments.get('_default', List([]));

    this.editorAct({
      actionType: 'setDisplayState',
      state: {
        documents: merged,
      },
    });
  }

  // fetches documents for provided source keys
  public fetchSources(keys: List<string>)
  {
    const sources = this._templateEditor.template.sources;
    keys.forEach((key) =>
    {
      const source = sources.get(key);
      this.fetchDocuments(source, key).catch(this._logRejection);
    });
  }

  public fetchDocuments(
    source: SourceConfig,
    key: string,
  ): Promise<List<object>>
  {
    return new Promise<List<object>>((resolve, reject) =>
    {
      const onFetchLoad = (documents: List<object>) =>
      {
        this.onLoadDocuments(documents, key);
        resolve(documents);
      };
      const catchError = (ev) =>
      {
        this.onFetchDocumentsError(ev, key);
      };

      try
      {
        this.updateStateBeforeFetch();
        switch (source.type)
        {
          case Sources.Algorithm: {
            const options: SourceOptionsType<Sources.Algorithm> = source.options as any;
            const algorithmId = options.algorithmId;
            const onLoadAlgorithm = (algorithm: Algorithm) =>
            {
              if (algorithm == null)
              {
                return catchError('Could not find algorithm');
              }
              fetchDocumentsFromAlgorithm(algorithm, DefaultDocumentLimit)
                .then(onFetchLoad)
                .catch(catchError);
            };
            Ajax.getAlgorithm(algorithmId, onLoadAlgorithm);
            break;
          }
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
          default: {
            return catchError('Failed to retrieve documents. Unknown source type');
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
    this.updateStateAfterFetch();
  }

  protected onFetchDocumentsError(ev: string | MidwayError, key: string)
  {
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
      this.computeMergedDocuments();
    }
  }

  private updateStateBeforeFetch()
  {
    this.editorAct({
      actionType: 'changeLoadingDocuments',
      increment: true,
    });
  }
}
export default new DocumentsHelpers(TerrainStore);
