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

import { List, Map } from 'immutable';

import TerrainStore from 'src/app/store/TerrainStore';

import ETLHelpers from './ETLHelpers';

import ETLRouteUtil from 'etl/ETLRouteUtil';
import { createFieldMap } from 'etl/templates/SyncUtil';
import { FieldMap } from 'etl/templates/TemplateEditorTypes';
import { WalkthroughState } from 'etl/walkthrough/ETLWalkthroughTypes';
import { _FileConfig, _SinkConfig, _SourceConfig, SinkConfig, SourceConfig } from 'shared/etl/immutable/EndpointRecords';
import { TemplateProxy } from 'shared/etl/immutable/TemplateProxy';
import { _ETLTemplate, ETLTemplate } from 'shared/etl/immutable/TemplateRecords';
import { Sinks, Sources } from 'shared/etl/types/EndpointTypes';
import { FileTypes } from 'shared/etl/types/ETLTypes';

import DocumentsHelpers from './DocumentsHelpers';

class Initializers extends ETLHelpers
{
  public loadExistingTemplate(templateId: number)
  {
    const makePromise = () => this._getTemplate(templateId)
      .then((template: ETLTemplate) =>
      {
        this.editorAct({
          actionType: 'resetState',
        });
        const edge = template.getLastEdgeId();
        this.editorAct({ // todo find the last edge
          actionType: 'setCurrentEdge',
          edge,
        });
        this.editorAct({
          actionType: 'setTemplate',
          template,
          history: 'clear',
        });
        this.editorAct({
          actionType: 'rebuildFieldMap',
        });
        this.editorAct({
          actionType: 'setIsDirty',
          isDirty: false,
        });
        DocumentsHelpers.fetchSources(template.getSources().keySeq().toList());
        ETLRouteUtil.gotoEditTemplate(template.id);
      })
      .catch(this._editorErrorHandler('Error while loading template', true));
    this._blockOn('Loading Template', makePromise);
  }

  /*
   *  Takes the current editor in the template and replaces its transformations with
   *  the specified template's transformations.
   */
  public initFromApplyTemplate(appliedId: number): void
  {
    const currentTemplate = this._template;
    const typeText = currentTemplate.isImport() ? 'import' : 'export';
    const errorHandler = this._editorErrorHandler('Cannot Apply Template', true);
    if (currentTemplate.getSources().size !== 1)
    {
      return errorHandler(`Current template is not a single source ${typeText}`);
    }
    else if (currentTemplate.getSinks().size !== 1)
    {
      return errorHandler(`Current template is not a single sink ${typeText}`);
    }
    else if (currentTemplate.getEdges().size !== 1)
    {
      return errorHandler(`Current template has ${currentTemplate.getEdges().size} edges, but expected 1`);
    }
    const makePromise = () => this._getTemplate(appliedId).then((otherTemplate) =>
    {
      const otherType = otherTemplate.isImport() ? 'import' : 'export';
      if (otherTemplate.getSources().size !== 1)
      {
        return errorHandler(`Selected template is not a single source ${otherType}`);
      }
      else if (otherTemplate.getSinks().size !== 1)
      {
        return errorHandler(`Selected template is not a single sink ${otherType}`);
      }
      const edgeToApply = otherTemplate.getEdges().first();
      if (edgeToApply === undefined || edgeToApply.transformations == null)
      {
        return errorHandler(`Selected template does not have valid transformations to apply`);
      }
      const currentEdge = currentTemplate.getEdges().first();
      this._try((proxy) =>
      {
        proxy.setEdgeTransformations(currentEdge.id, edgeToApply.transformations);
      }).catch(errorHandler);
    }).catch(errorHandler);
    this._blockOn('Apply Template', makePromise);
  }

  public initNewFromAlgorithm(algorithmId: number)
  {
    const source = _SourceConfig({
      type: Sources.Algorithm,
      fileConfig: _FileConfig({
        fileType: FileTypes.Json,
      }),
      options: {
        algorithmId,
      },
    });
    const makePromise = () => DocumentsHelpers.fetchDocuments(source)
      .then(this.createInitialTemplateFn(source))
      .catch(this._editorErrorHandler('Could Not Create Template', true));
    this._blockOn('Initializing', makePromise);
  }

  public initNewFromWalkthrough(walkthrough: WalkthroughState = this._walkthrough)
  {
    const source = walkthrough.source;
    const sink = walkthrough.sink;
    const file = walkthrough.getFile();
    const makePromise = () => DocumentsHelpers.fetchDocuments(source)
      .then(this.createInitialTemplateFn(source, sink))
      .catch(this._editorErrorHandler('Could Not Create Template', true));
    this._blockOn('Initializing', makePromise);
  }

  private createInitialTemplateFn(
    source?: SourceConfig,
    sink?: SinkConfig,
  ): (hits: List<object>) => void
  {
    return async (hits) =>
    {
      await this._logUpdate('Calculating Template From Documents');
      const { template, sourceKey, fieldMap, initialEdge } = await this.createInitialTemplate(hits, source, sink);
      if (initialEdge === -1)
      {
        throw new Error('Failed to create initial edge');
      }
      this.editorAct({
        actionType: 'setCurrentEdge',
        edge: initialEdge,
      });
      this.editorAct({
        actionType: 'setInMergeDocuments',
        key: sourceKey,
        documents: hits,
      });
      this.editorAct({
        actionType: 'setTemplate',
        template,
        history: 'clear',
      });
      this.editorAct({
        actionType: 'setFieldMap',
        fieldMap,
      });
      DocumentsHelpers.computeDocuments();
    };
  }

  private createInitialTemplate(documents: List<object>, source?: SourceConfig, sink?: SinkConfig):
    Promise<InitialTemplateInfo>
  {
    return new Promise<InitialTemplateInfo>(async (resolve, reject) =>
    {
      if (documents == null || documents.size === 0)
      {
        return resolve({
          template: _ETLTemplate(),
          sourceKey: '',
          fieldMap: Map(),
          errors: ['No documents provided for initial Template construction'],
          initialEdge: 0,
        });
      }

      let template = _ETLTemplate({
        id: -1,
        templateName: name,
      });
      const sourceToAdd = source !== undefined ? source : _SourceConfig({ type: Sources.Upload });
      const sinkToAdd = sink !== undefined ? sink : _SinkConfig({ type: Sinks.Download });
      // default source and sink is upload and download
      const proxy = new TemplateProxy(() => template, (t) => template = t);

      const sourceIds = proxy.addSource(sourceToAdd);
      const sinkIds = proxy.addSink(sinkToAdd);
      const initialEdge = proxy.addEdge(sourceIds.nodeId, sinkIds.nodeId);
      const errors = proxy.createInitialEdgeEngine(initialEdge, documents);
      await this._logUpdate('Finishing Up');
      const fieldMap = createFieldMap(template.getTransformationEngine(initialEdge));
      return resolve({
        template,
        sourceKey: sourceIds.sourceKey,
        fieldMap,
        initialEdge,
        errors,
      });
    });
  }
}

interface InitialTemplateInfo
{
  template: ETLTemplate;
  sourceKey: string;
  fieldMap: FieldMap;
  initialEdge: number;
  errors: string[];
}
export default new Initializers(TerrainStore);
