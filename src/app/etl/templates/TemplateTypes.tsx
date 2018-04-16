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
import { _ETLProcess, ETLEdge, ETLNode, ETLProcess } from 'etl/templates/ETLProcess';
import { _TemplateField, TemplateField } from 'etl/templates/FieldTypes';
import { SinkOptionsType, Sinks, SourceOptionsType, Sources } from 'shared/etl/types/EndpointTypes';
import { Languages, NodeTypes, TemplateBase, TemplateObject } from 'shared/etl/types/ETLTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';

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
  public lastModified: string = null;
  public createdAt: string = null;
  public archived = false;
  public templateName = '';
  public process = _ETLProcess();
  public sources = Map<string, SourceConfig>();
  public sinks = Map<string, SinkConfig>();

  // Returns true if and only if there is 1 sink and it is a database
  public isImport(): boolean
  {
    if (this.getSinks().size === 1)
    {
      const sink = this.getSinks().first();
      if (sink.type === Sinks.Database)
      {
        return true;
      }
    }
    return false;
  }

  public getSources()
  {
    return this.sources;
  }

  public getSinks()
  {
    return this.sinks;
  }

  public getSource(key): SourceConfig
  {
    return this.sources.get(key);
  }

  public getSink(key): SinkConfig
  {
    return this.sinks.get(key);
  }

  public getSourceName(key)
  {
    const source = this.sources.get(key);
    const type = (source != null && source.type != null) ? source.type : '';
    return `${source != null ? source.name : ''} (${type})`;
  }

  public getSinkName(key)
  {
    const sink = this.sinks.get(key);
    const type = (sink != null && sink.type != null) ? sink.type : '';
    return `${sink.name} (${type})`;
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

  public getEdge(id: number)
  {
    return this.process.edges.get(id);
  }

  public getEdges(): Immutable.Map<number, ETLEdge>
  {
    return this.process.edges;
  }

  public getLastEdgeId(): number
  {
    const defaultSink = this.getDefaultSinkNodeId();
    const edges = this.findEdges((edge) => edge.to === defaultSink);
    return edges.size > 0 ? edges.first() : -1;
  }

  public getDefaultSinkNodeId(): number
  {
    return this.process.nodes.findKey(
      (node) => node.type === NodeTypes.Sink && node.endpoint === '_default',
    );
  }

  public getEdgeLanguage(edgeId: number): Languages
  {
    try
    {
      const edge = this.getEdge(edgeId);
      const toNode = this.getNode(edge.to);
      if (toNode.type === NodeTypes.Sink)
      {
        const sink = this.getSink(toNode.endpoint);
        if (sink.type === Sinks.Database)
        {
          return (sink.options as SinkOptionsType<Sinks.Database>).language;
        }
      }
      return Languages.JavaScript;
    }
    catch (e)
    {
      return Languages.JavaScript;
    }
  }

  public getDefaultSource(): SourceConfig
  {
    return this.getSource('_default');
  }

  public getDefaultSink(): SinkConfig
  {
    return this.getSink('_default');
  }

  public getMergeableNodes(): List<number>
  {
    return this.findNodes((node) => node.type !== NodeTypes.Sink);
  }

  public findEdges(matcher: (e: ETLEdge) => boolean, edges = this.process.edges): List<number>
  {
    return edges.filter(matcher).keySeq().toList();
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

// todo, please do this more efficiently
export function copyTemplate(template: ETLTemplate): ETLTemplate
{
  const files = getSourceFiles(template);
  const objTemplate = templateForBackend(template);
  const objTemplateCopy = JSON.parse(JSON.stringify(objTemplate));
  const copiedTemplate = _ETLTemplate(objTemplateCopy, true);
  return restoreSourceFiles(copiedTemplate, files);
}

export function getSourceFiles(template: ETLTemplate): { [k: string]: File }
{
  const files = {};
  template.sources.forEach((source, key) =>
  {
    if (source.type === Sources.Upload)
    {
      const file = (source.options as SourceOptionsType<Sources.Upload>).file;
      if (file != null)
      {
        files[key] = file;
      }
    }
  });
  return files;
}

export function restoreSourceFiles(template: ETLTemplate, files: { [k: string]: File }): ETLTemplate
{
  return template.update('sources', (sources) =>
    sources.map((source, key) =>
    {
      if (source.type === Sources.Upload)
      {
        const options = source.options as SourceOptionsType<Sources.Upload>;
        return source.set('options', _.extend({}, options, { file: files[key] }));
      }
      else
      {
        return source;
      }
    }).toMap(),
  );
}

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
      let options = _.get(obj, ['sources', key, 'options'], {});
      options = _.extend({}, options);
      options['file'] = null;
      _.set(obj, ['sources', key, 'options'], options);
    }
  });
  return obj;
}
