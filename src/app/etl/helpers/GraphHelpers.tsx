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
import
{
  _ETLEdge, _ETLNode, _ETLProcess,
  _MergeJoinOptions, ETLEdge, ETLNode, ETLProcess, MergeJoinOptions,
} from 'etl/templates/ETLProcess';
import { EngineProxy, FieldProxy } from 'etl/templates/FieldProxy';
import { _TemplateField, TemplateField } from 'etl/templates/FieldTypes';
import { createTreeFromEngine } from 'etl/templates/SyncUtil';
import { TemplateEditorActions } from 'etl/templates/TemplateEditorRedux';
import { SinksMap, SourcesMap } from 'etl/templates/TemplateTypes';
import { Sinks, Sources } from 'shared/etl/types/EndpointTypes';
import { FileTypes, NodeTypes } from 'shared/etl/types/ETLTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import { createEngineFromDocuments, mergeJoinEngines } from 'shared/transformations/util/EngineUtil';
import DocumentsHelpers from './DocumentsHelpers';

class GraphHelpers extends ETLHelpers
{
  // does the same thing as _try except its specialized for the currently edited transformation engine
  // returns a promise whose type specifies which fields are dirty and need to be rebuilt
  public mutateEngine(tryFn: (proxy: EngineProxy) => void): Promise<boolean>
  {
    return new Promise<boolean>((resolve, reject) =>
    {
      const currentEdge = this._templateEditor.getCurrentEdgeId();

      let structuralChanges = false;
      const handleRequestRebuild = (id?: number) =>
      {
        if (id === undefined)
        {
          structuralChanges = true;
        }
      };

      this._try((templateProxy) =>
      {
        const engine = templateProxy.value().getTransformationEngine(currentEdge);
        tryFn(new EngineProxy(engine, handleRequestRebuild));
      }).then(() =>
      {
        resolve(structuralChanges);
      }).catch(reject);
    });
  }

  public createMergeJoin(
    leftId: number,
    rightId: number,
    leftJoinKey: string,
    rightJoinKey: string,
    outputKey: string,
  )
  {
    // 1: create a merge node
    // 2: split the left edge using the merge node
    // 3: connect the right edge to the merge node

    this._try((proxy) =>
    {
      const leftEdgeId = proxy.value().findEdges((edge) => edge.from === leftId).first();
      const rightEdgeId = proxy.value().findEdges((edge) => edge.from === rightId).first();
      const destinationNodeId = proxy.value().getEdge(leftEdgeId).to;

      const mergeNodeId = proxy.addMerge(leftId, rightId, leftJoinKey, rightJoinKey, outputKey);
      proxy.setEdgeTo(leftEdgeId, mergeNodeId);
      proxy.setEdgeTo(rightEdgeId, mergeNodeId);

      const newEdgeId = proxy.addEdge(mergeNodeId, destinationNodeId);
      const newEngine = mergeJoinEngines(
        proxy.value().getTransformationEngine(leftEdgeId),
        proxy.value().getTransformationEngine(rightEdgeId),
        outputKey,
      );
      proxy.setEdgeTransformations(newEdgeId, newEngine);
    }).catch(this._logError);
  }

  public createEngineForEdge(edgeId: number)
  {
    const template = this._template;
    const edge = template.getEdge(edgeId);
    const fromNode = template.getNode(edge.from);
    if (fromNode.type === NodeTypes.Source)
    {
      const source = template.getSources().get(fromNode.endpoint);
      DocumentsHelpers.fetchDocuments(source, fromNode.endpoint).then((documents) =>
      {
        const { engine, warnings, softWarnings } = createEngineFromDocuments(documents);
        this._try((proxy) =>
        {
          proxy.setEdgeTransformations(edgeId, engine);
        }).catch(this._logError);
      }).catch(this._logError);
    }
  }

  public updateSources(newSources: SourcesMap)
  {
    const { newKeys, deletedKeys, differentKeys } =
      getChangedKeys(this._template.getSources(), newSources);

    let newEdges = List([]);

    this._try((proxy) =>
    {
      newKeys.forEach((key) =>
      {
        const sourceId = proxy.addSource(key, newSources.get(key));
        const edgeId = proxy.addEdge(sourceId, -1);
        newEdges = newEdges.push(edgeId);
      });
      differentKeys.forEach((key) =>
      {
        proxy.setSource(key, newSources.get(key));
      });
      deletedKeys.forEach((key) =>
      {
        proxy.deleteSource(key);
      });
    }).then(() =>
    {
      deletedKeys.forEach((key) =>
      {
        this.editorAct({
          actionType: 'deleteInMergeDocuments',
          key,
        });
      });
      newEdges.forEach((edgeId) =>
      {
        this.createEngineForEdge(edgeId);
      });
      DocumentsHelpers.fetchSources(differentKeys);
    }).catch(this._logError);
  }

  public updateSinks(newSinks: SinksMap)
  {
    const { newKeys, deletedKeys, differentKeys } =
      getChangedKeys(this._template.getSinks(), newSinks);

    this._try((proxy) =>
    {
      newKeys.forEach((key) =>
      {
        proxy.addSink(key, newSinks.get(key));
      });
      differentKeys.forEach((key) =>
      {
        proxy.setSink(key, newSinks.get(key));
      });
      deletedKeys.forEach((key) =>
      {
        proxy.deleteSink(key);
      });
    }).catch(this._logError);
  }

  public switchEdge(edgeId: number)
  {
    this.editorAct({
      actionType: 'setCurrentEdge',
      edge: edgeId,
    });
    this.editorAct({
      actionType: 'rebuildFieldMap',
    });
    DocumentsHelpers.computeDocuments();
  }
}

function getChangedKeys(original: Immutable.Map<string, any>, next: Immutable.Map<string, any>):
  {
    differentKeys: List<string>;
    deletedKeys: List<string>;
    newKeys: List<string>;
  }
{
  const differentKeys = [];
  const deletedKeys = [];
  const newKeys = [];
  original.forEach((value, key) =>
  {
    if (next.has(key))
    {
      if (original.get(key) !== next.get(key))
      {
        differentKeys.push(key);
      }
    }
    else
    {
      deletedKeys.push(key);
    }
  });
  next.forEach((value, key) =>
  {
    if (!original.has(key))
    {
      newKeys.push(key);
    }
  });
  return {
    differentKeys: List(differentKeys),
    deletedKeys: List(deletedKeys),
    newKeys: List(newKeys),
  };
}

export default new GraphHelpers(TerrainStore);
