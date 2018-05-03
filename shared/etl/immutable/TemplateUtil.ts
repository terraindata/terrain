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
// tslint:disable:max-classes-per-file

import * as Immutable from 'immutable';
import * as _ from 'lodash';
const { List, Map } = Immutable;

import { FileConfig, SinkConfig, SourceConfig } from 'shared/etl/immutable/EndpointRecords';
import { ETLTemplate, SinksMap, SourcesMap } from 'shared/etl/immutable/TemplateRecords';
import { ElasticMapping } from 'shared/etl/mapping/ElasticMapping';
import { SchedulableSinks, SchedulableSources, SinkOptionsType, Sinks, Sources } from 'shared/etl/types/EndpointTypes';
import { FieldTypes, Languages } from 'shared/etl/types/ETLTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import TransformationNodeType from 'shared/transformations/TransformationNodeType';
import EngineUtil from 'shared/transformations/util/EngineUtil';
import { KeyPath as EnginePath, WayPoint } from 'shared/util/KeyPath';

import
{
  _ETLEdge,
  _ETLNode,
  _ETLProcess,
  _MergeJoinOptions,
  ETLEdge,
  ETLNode,
  ETLProcess,
  MergeJoinOptions,
} from 'shared/etl/immutable/ETLProcessRecords';
import { FileTypes, NodeTypes } from 'shared/etl/types/ETLTypes';

// There's a circular dependency between this class and ETLTemplate
export default class TemplateUtil
{
  /*
   *  Warning: Potentially Expensive Operation
   *  1: Ensure integrity for each transformation engine
   *  2: All sources & sinks are valid
   *  3: There exists a default sink
   *  4: All sink & source nodes point to a valid endpoint
   *  5: All endpoints have an associated node
   */
  public static verifyIntegrity(template: ETLTemplate): string[]
  {
    let errors = [];
    try
    {
      template.getEdges().forEach((edge: ETLEdge, key) =>
      {
        const engineErrors = EngineUtil.verifyIntegrity(edge.transformations);
        if (engineErrors.length > 0)
        {
          errors = errors.concat(engineErrors);
          errors.push(`Engine ${key} malformed`);
        }
      });
      template.getSources().forEach((source: SourceConfig, key) =>
      {
        if (source == null)
        {
          errors.push(`Source for key ${key} is undefined or null`);
        }
        else if (typeof source.verifyIntegrity !== 'function')
        {
          errors.push(`Source for key ${key} is not a source record`);
        }
        else if (!source.verifyIntegrity())
        {
          errors.push(`Source "${source.name}" failed integrity check`);
        }
        else
        {
          const nodes = template.findNodes((n) => n.type === NodeTypes.Source && n.endpoint === key);
          if (nodes.size !== 1)
          {
            errors.push(`Source "${source.name}" should have 1 associated node, but there were ${nodes.size}`);
          }
        }
      });
      template.getSinks().forEach((sink: SourceConfig, key) =>
      {
        if (sink == null)
        {
          errors.push(`Sink for key ${key} is undefined or null`);
        }
        else if (typeof sink.verifyIntegrity !== 'function')
        {
          errors.push(`Sink for key ${key} is not a sink record`);
        }
        else if (!sink.verifyIntegrity())
        {
          errors.push(`Sink "${sink.name}"" failed integrity check`);
        }
        else
        {
          const nodes = template.findNodes((n) => n.type === NodeTypes.Sink && n.endpoint === key);
          if (nodes.size !== 1)
          {
            errors.push(`Sink "${sink.name}"" should have 1 associated node, but there were ${nodes.size}`);
          }
        }
      });
      template.process.nodes.forEach((node: ETLNode, id) =>
      {
        if (node.type === NodeTypes.Sink)
        {
          if (template.getSink(node.endpoint) === undefined)
          {
            errors.push(`Sink for Node ${id} of key ${node.endpoint} does not exist`);
          }
        }
        else if (node.type === NodeTypes.Source)
        {
          if (template.getSource(node.endpoint) === undefined)
          {
            errors.push(`Source for Node ${id} of key ${node.endpoint} does not exist`);
          }
        }
      });
      if (template.getDefaultSink() === undefined)
      {
        errors.push(`Could not find default sink`);
      }
    }
    catch (e)
    {
      errors.push(`Error while trying to verify template integrity: ${String(e)}`);
    }
    return errors;
  }

  /*
   *  Ensure
   *  1: If the template has upload sources, the files exist
   *  2: If the template has a database sink, the mapping is valid
   *  3: General integrity check
   */
  public static verifyExecutable(template: ETLTemplate): string[]
  {
    let errors = [];
    try
    {
      const templateErrors = TemplateUtil.verifyIntegrity(template);
      if (templateErrors.length !== 0)
      {
        errors = errors.concat(templateErrors);
      }
      const invalidSource = template.getSources()
        .find((source) => source.type === Sources.Upload && (source.options as any).file == null);
      if (invalidSource !== undefined)
      {
        errors.push(`Source ${invalidSource.name} is an Upload Source, but it is missing a file`);
      }
      const invalidSink = template.getSinks().filter((sink) => sink.type === Sinks.Database)
        .find((sink, key) =>
        {
          const options = sink.options as SinkOptionsType<Sinks.Database>;
          switch (options.language)
          {
            case Languages.Elastic:
              const node = template.findNodes((n) => n.type === NodeTypes.Sink && n.endpoint === key).first();
              const edge = template.findEdges((e) => e.to === node).first();
              const mapping = new ElasticMapping(template.getEdge(edge).transformations);
              if (mapping.getErrors().length > 0)
              {
                errors = errors.concat(mapping.getErrors());
              }
              break;
            default:
              break;
          }
          return false;
        });
      if (invalidSink !== undefined)
      {
        errors.push(`Sink ${invalidSink.name} has a mapping error`);
      }
    }
    catch (e)
    {
      errors.push(`Error while trying to determine if template is executable: ${String(e)}`);
    }
    return errors;
  }

  /*
   *  Ensure
   *  1: template can be executed
   *  2: The sources and sinks are compatible with being run from a schedule
   *  3: General integrity check
   */
  public static canSchedule(template: ETLTemplate): boolean
  {
    const invalidSources = template.getSources().find((v) => SchedulableSources.indexOf(v.type) === -1);
    if (invalidSources !== undefined)
    {
      return false;
    }
    const invalidSinks = template.getSinks().find((v) => SchedulableSinks.indexOf(v.type) === -1);
    if (invalidSinks !== undefined)
    {
      return false;
    }
    if (!(TemplateUtil.verifyExecutable(template).length === 0))
    {
      return false;
    }
    return true;
  }
}
