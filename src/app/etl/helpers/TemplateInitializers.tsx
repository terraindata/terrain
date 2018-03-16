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
import TerrainStore from 'src/app/store/TerrainStore';
import Util from 'util/Util';

import ETLHelpers from './ETLHelpers';

import { _FileConfig, _SinkConfig, _SourceConfig, FileConfig, SinkConfig, SourceConfig } from 'etl/EndpointTypes';
import { ETLActions } from 'etl/ETLRedux';
import ETLRouteUtil from 'etl/ETLRouteUtil';
import TemplateEditor from 'etl/templates/components/TemplateEditor';
import { _ETLEdge, _ETLNode, _ETLProcess, ETLEdge, ETLNode, ETLProcess, MergeJoinOptions } from 'etl/templates/ETLProcess';
import { _TemplateField, TemplateField } from 'etl/templates/FieldTypes';
import { createTreeFromEngine } from 'etl/templates/SyncUtil';
import { TemplateEditorActions } from 'etl/templates/TemplateEditorRedux';
import { _ETLTemplate, _TemplateEditorState, ETLTemplate, TemplateEditorState } from 'etl/templates/TemplateTypes';
import { FieldMap } from 'etl/templates/TemplateTypes';
import { _WalkthroughState, WalkthroughState } from 'etl/walkthrough/ETLWalkthroughTypes';
import { Sinks, Sources } from 'shared/etl/types/EndpointTypes';
import { FileTypes, NodeTypes } from 'shared/etl/types/ETLTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import { createMergedEngine } from 'shared/transformations/util/EngineUtil';

import DocumentsHelpers from './DocumentsHelpers';

class Initializers extends ETLHelpers
{
  // TODO for easy testing. get rid of this before release
  public initFromDebug()
  {
    // const documents = List([
    //   {
    //     rf1: 'hi',
    //     rf2: 'yo',
    //     arr: [1, 2, 3],
    //     nestedField: {
    //       nested1: 1,
    //       nested2: true,
    //     },
    //     arrObj: [
    //       { foo: 'hi' },
    //       { foo: 5 },
    //     ],
    //   },
    // ]);

    // const document2 = {
    //   rf1: 'hi',
    //   rf2: 'yo',
    // }

    // const debug = (oldMapping) => {
    //   const e = this.templateEditor.getCurrentEngine();
    //   const mapping = new ElasticMapping(e);
    //   console.log(ElasticMapping.compareMapping(mapping.getMapping(), oldMapping));
    // };

    // const FT = new FieldTypes();
    // FT.getFullTypeFromDocument(document2).then((value) =>
    // {
    //   FT.getESMappingFromDocument(value).then((mapping) =>
    //   {
    //     debug(mapping);
    //   });
    // });
    // const onLoad = this.createInitialTemplateFn();
    // onLoad(documents);
  }

  public loadExistingTemplate(templateId: number)
  {
    this.getTemplate(templateId)
      .then((template: ETLTemplate) =>
      {
        this.editorAct({
          actionType: 'resetState',
        });
        this.editorAct({
          actionType: 'setTemplate',
          template,
        });
        this.editorAct({ // todo find the last edge
          actionType: 'setCurrentEdge',
          edge: 0,
          rebuild: true,
        });
        this.editorAct({
          actionType: 'setIsDirty',
          isDirty: false,
        });

        template.sources.map((source, key) =>
        {
          DocumentsHelpers.fetchDocuments(source, key);
        });
        ETLRouteUtil.gotoEditTemplate(template.id);
      })
      .catch((response) =>
      {
        // TODO
      });
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
    DocumentsHelpers.fetchDocuments(source, '_default')
      .then(this.createInitialTemplateFn(source));
  }

  public initNewFromWalkthrough(walkthrough: WalkthroughState = this.walkthrough)
  {
    const source = walkthrough.source;
    const sink = walkthrough.sink;
    const file = walkthrough.getFile();
    DocumentsHelpers.fetchDocuments(source, '_default')
      .then(this.createInitialTemplateFn(source, sink));
  }

  private createInitialTemplateFn(
    source?: SourceConfig,
    sink?: SinkConfig,
  ): (hits: List<object>) => void
  {
    return (hits) =>
    {
      const { template, fieldMap, initialEdge } = createInitialTemplate(hits, source, sink);
      if (initialEdge !== -1)
      {
        this.editorAct({
          actionType: 'setCurrentEdge',
          edge: initialEdge,
        });
      }
      else
      {
        // TODO error
      }
      this.editorAct({
        actionType: 'setTemplate',
        template,
      });
      this.editorAct({
        actionType: 'setFieldMap',
        fieldMap,
      });
    };
  }
}
export default new Initializers(TerrainStore);

function createInitialTemplate(documents: List<object>, source?: SourceConfig, sink?: SinkConfig):
  {
    template: ETLTemplate,
    fieldMap: FieldMap,
    initialEdge: number,
    warnings: string[],
    softWarnings: string[],
  }
{
  if (documents == null || documents.size === 0)
  {
    return {
      template: _ETLTemplate(),
      fieldMap: Map(),
      warnings: ['No documents provided for initial Template construction'],
      softWarnings: [],
      initialEdge: 0,
    };
  }
  const { engine, warnings, softWarnings } = createMergedEngine(documents);

  const fieldMap = createTreeFromEngine(engine);

  let template = _ETLTemplate({
    id: -1,
    templateName: name,
  });
  const sourceToAdd = source !== undefined ? source : _SourceConfig({ type: Sources.Upload });
  const sinkToAdd = sink !== undefined ? sink : _SinkConfig({ type: Sinks.Download });
  // default source and sink is upload and download

  const proxy = template.process.proxy();
  const defaultSink = _ETLNode({
    type: NodeTypes.Sink,
    endpoint: '_default',
  });
  const defaultSource = _ETLNode({
    type: NodeTypes.Source,
    endpoint: '_default',
  });
  const sourceId = proxy.addNode(defaultSource);
  const sinkId = proxy.addNode(defaultSink);
  const defaultEdge = _ETLEdge({
    from: sourceId,
    to: sinkId,
    transformations: engine,
  });
  const initialEdge = proxy.addEdge(defaultEdge);

  template = template.set('process', proxy.getProcess());
  template = template.setIn(['sources', '_default'], sourceToAdd);
  template = template.setIn(['sinks', '_default'], sinkToAdd);

  return {
    template,
    fieldMap,
    warnings,
    softWarnings,
    initialEdge,
  };
}
