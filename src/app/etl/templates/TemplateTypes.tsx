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

// tslint:disable:max-classes-per-file strict-boolean-expressions no-shadowed-variable
import * as Immutable from 'immutable';
import * as _ from 'lodash';
import memoizeOne from 'memoize-one';
const { List, Map } = Immutable;
import { instanceFnDecorator, makeConstructor, makeExtendedConstructor, recordForSave, WithIRecord } from 'src/app/Classes';

import { _SinkConfig, _SourceConfig, SinkConfig, SourceConfig } from 'etl/EndpointTypes';
import { _ETLProcess, ETLEdge, ETLProcess, ETLNode } from 'etl/templates/ETLProcess';
import { _TemplateField, TemplateField } from 'etl/templates/FieldTypes';
import { Sinks, Sources } from 'shared/etl/types/EndpointTypes';
import { Languages, NodeTypes, TemplateBase, TemplateObject } from 'shared/etl/types/ETLTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import { TemplateProxy } from './TemplateProxy';

export type SourcesMap = Immutable.Map<string, SourceConfig>;
export type SinksMap = Immutable.Map<string, SinkConfig>;

interface ETLTemplateI extends TemplateBase
{
  sources: SourcesMap;
  sinks: SinksMap;
  process: ETLProcess;
}

class ETLTemplateC implements ETLTemplateI
{
  public id = -1;
  public archived = false;
  public templateName = '';
  public process = _ETLProcess();
  public sources = Map<string, SourceConfig>();
  public sinks = Map<string, SinkConfig>();

  public proxy(mutator?: (template: ETLTemplate) => void)
  {
    return new TemplateProxy(this as any, mutator);
  }

  public getSources()
  {
    return this.sources;
  }

  public getSinks()
  {
    return this.sinks;
  }

  public getSourceName(key)
  {
    const source = this.sources.get(key);
    const type = (source != null && source.type != null) ? source.type : '';
    return `${key} (${type})`;
  }

  public getSinkName(key)
  {
    const sink = this.sinks.get(key);
    const type = (sink != null && sink.type != null) ? sink.type : '';
    return `${key} (${type})`;
  }

  public getNodeName(id: number)
  {
    return `Merge Node ${id}`;
  }

  public getTransformationEngine(edge: number)
  {
    return this.process.edges.getIn([edge, 'transformations']);
  }

  public getNode(id: number)
  {
    return this.process.nodes.get(id);
  }

  public getEdges(): Immutable.Map<number, ETLEdge>
  {
    return this.process.edges;
  }

  public getLastEdgeId(): number
  {
    const edges = this.findEdges((edge) => edge.to === this.getDefaultSink());
    return edges.size > 0 ? edges.first() : -1;
  }

  public getDefaultSink(): number
  {
    return this.process.nodes.findKey(
      (node) => node.type === NodeTypes.Sink && node.endpoint === '_default',
    );
  }

  public getMergeableNodes(): List<number>
  {
    return this.findNodes((node) => node.type !== NodeTypes.Sink);
  }

  public findEdges(matcher: (e: ETLEdge) => boolean): List<number>
  {
    return this.process.edges.filter(matcher).keySeq().toList();
  }

  public findNodes(matcher: (n: ETLNode) => boolean): List<number>
  {
    return this.process.nodes.filter(matcher).keySeq().toList();
  }
}

export type ETLTemplate = WithIRecord<ETLTemplateC>;
export const _ETLTemplate = makeExtendedConstructor(ETLTemplateC, true, {
  sources: (sources) =>
  {
    return Map<string, SourceConfig>(sources)
      .map((obj, key) => _SourceConfig(obj, true))
      .toMap();
  },
  sinks: (sinks) =>
  {
    return Map<string, SinkConfig>(sinks)
      .map((obj, key) => _SinkConfig(obj, true))
      .toMap();
  },
  process: _ETLProcess,
});

export function templateForBackend(template: ETLTemplate): TemplateBase
{
  const obj: TemplateObject = (template as any).toObject(); // shallow js object

  obj.sources = recordForSave(obj.sources);
  obj.sinks = recordForSave(obj.sinks);

  obj.process = obj.process.update('edges', (edges) => edges.map((edge, key) =>
  {
    return edge.set('transformations', JSON.stringify(edge.transformations.toJSON()));
  }).toMap());

  obj.process = recordForSave(obj.process);

  _.forOwn(obj.sources, (source, key) =>
  {
    if (source.type === Sources.Upload)
    {
      _.set(obj, ['sources', key, 'options', 'file'], null);
    }
  });
  return obj;
}
