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

// tslint:disable:no-shadowed-variable

import { EventEmitter } from 'events';
import * as fs from 'fs';
import GraphLib = require('graphlib');
import * as _ from 'lodash';
import * as request from 'request';
import { Readable, Transform } from 'stream';
import * as winston from 'winston';

import * as Tasty from '../../tasty/Tasty';
import * as App from '../App';
import CredentialConfig from '../credentials/CredentialConfig';
import Credentials from '../credentials/Credentials';
import TransformationEngineTransform from '../io/streams/TransformationEngineTransform';
import UserConfig from '../users/UserConfig';
import { versions } from '../versions/VersionRouter';

import { TransformationEngine } from '../../../../shared/transformations/TransformationEngine';
import { getMergeJoinStream, getSinkStream, getSourceStream } from './SourceSinkStream';
import { destringifySavedTemplate, TemplateConfig, templateForSave, TemplateInDatabase } from './TemplateConfig';

export default class Templates
{
  private templateTable: Tasty.Table;

  constructor()
  {
    this.templateTable = new Tasty.Table(
      'templates',
      ['id'],
      [
        'archived',
        'templateName',
        'process',
        'sources',
        'sinks',
      ],
    );
  }

  public async get(id?: number): Promise<TemplateConfig[]>
  {
    return new Promise<TemplateConfig[]>(async (resolve, reject) =>
    {
      const params = id !== undefined ? { id } : undefined;
      const rawTemplates = await App.DB.select(this.templateTable, [], params);
      const templates = rawTemplates.map((value, index) =>
        destringifySavedTemplate(value as TemplateInDatabase));
      resolve(templates);
    });
  }

  public async validateTemplate(template: TemplateConfig, requireExistingId?: boolean):
    Promise<{ valid: boolean, message: string }>
  {
    const { sources, sinks } = template;
    let valid = true;
    const messages: string[] = [];
    if (requireExistingId === true)
    {
      if (template.id == null || typeof template.id !== 'number')
      {
        valid = false;
        messages.push(`id is missing or invalid type: ${template.id}`);
      }
      else
      {
        const searchForTemplates = await this.get(template.id);
        if (searchForTemplates.length === 0)
        {
          valid = false;
          messages.push(`no template with the specified id exists`);
        }
      }
    }
    if (sources == null || typeof sources !== 'object')
    {
      valid = false;
      messages.push(`sources is missing or invalid type: ${sources}`);
    }
    else if (sinks == null || typeof sources !== 'object')
    {
      valid = false;
      messages.push(`sinks is missing or invalid type: ${sinks}`);
    }
    return { valid, message: `${messages}` };
  }

  public async create(template: TemplateConfig): Promise<TemplateConfig[]>
  {
    return new Promise<TemplateConfig[]>(async (resolve, reject) =>
    {
      const { valid, message } = await this.validateTemplate(template);
      if (!valid)
      {
        return reject(message);
      }
      const newTemplate: TemplateConfig = {
        archived: false,
        templateName: template.templateName,
        process: template.process,
        sources: template.sources,
        sinks: template.sinks,
      };
      resolve(await this.upsert(newTemplate));
    });
  }

  public async update(template: TemplateConfig): Promise<TemplateConfig[]>
  {
    return new Promise<TemplateConfig[]>(async (resolve, reject) =>
    {
      const { valid, message } = await this.validateTemplate(template, true);
      if (!valid)
      {
        return reject(message);
      }
      const newTemplate: TemplateConfig = {
        archived: template.archived,
        id: template.id,
        templateName: template.templateName,
        process: template.process,
        sources: template.sources,
        sinks: template.sinks,
      };
      resolve(await this.upsert(newTemplate));
    });
  }

  public async upsert(newTemplate: TemplateConfig): Promise<TemplateConfig[]>
  {
    return new Promise<TemplateConfig[]>(async (resolve, reject) =>
    {
      let toUpsert;
      try
      {
        toUpsert = templateForSave(newTemplate);
      }
      catch (e)
      {
        return reject(`Failed to prepare template for save: ${String(e)}`);
      }
      const rawTemplates = await App.DB.upsert(this.templateTable, toUpsert) as TemplateInDatabase[];
      try
      {
        const templates = rawTemplates.map((value, index) =>
          destringifySavedTemplate(value as TemplateInDatabase));
        resolve(templates);
      }
      catch (e)
      {
        return reject(`Failed to destringify saved templates: ${String(e)}`);
      }
    });
  }

  public async execute(id: number, files?: Readable[]): Promise<Readable>
  {
    const ts: TemplateConfig[] = await this.get(id);
    if (ts.length < 1)
    {
      throw new Error(`Template ID ${String(id)} not found.`);
    }
    const template = ts[0];
    winston.info('Executing template', template.templateName);

    const numSources = Object.keys(template.sources).length;
    const numSinks = Object.keys(template.sinks).length;
    const numEdges = Object.keys(template.process.edges).length;

    // TODO: multi-source import and exports
    if (numSinks > 1 || template.sinks._default === undefined)
    {
      throw new Error('Only single sinks are supported.');
    }

    winston.info('Beginning ETL pipline...');

    // construct a "process" graph
    let defaultSink;
    const dag: any = new GraphLib.Graph({ isDirected: true });
    Object.keys(template.process.nodes).map(
      (n) =>
      {
        const node = template.process.nodes[n];
        if (node.type === 'Sink' && node.endpoint === '_default')
        {
          defaultSink = n;
        }
        dag.setNode(n, node);
      },
    );

    Object.keys(template.process.edges).map(
      (e) => dag.setEdge(
        template.process.edges[e].from,
        template.process.edges[e].to,
        template.process.edges[e].transformations,
      ),
    );

    if (defaultSink === undefined)
    {
      throw new Error('Default sink not found.');
    }

    const nodes: any[] = GraphLib.alg.topsort(dag);
    console.log(JSON.stringify(template, null, 2));

    const streamMap = await this.executeGraph(template, dag, nodes, files);
    return streamMap[defaultSink][defaultSink];
  }

  private async executeGraph(template: TemplateConfig, dag: any, nodes: any[], files?: Readable[], streamMap?: object): Promise<object>
  {
    if (nodes.length === 0)
    {
      return Promise.resolve(streamMap as object);
    }

    if (streamMap === undefined)
    {
      streamMap = {};
      nodes.forEach((n) =>
      {
        (streamMap as object)[n] = {};
      });
    }

    const nodeId = nodes.shift();
    const node = dag.node(nodeId);

    switch (node.type)
    {
      case 'Source':
      {
        const source = template.sources[node.endpoint];
        const sourceStream = await getSourceStream(source, files);

        const outEdges: any[] = dag.outEdges(nodeId);
        for (const e of outEdges)
        {
          const transformationEngine: TransformationEngine = TransformationEngine.load(dag.edge(e));
          const transformStream = new TransformationEngineTransform([], transformationEngine);
          streamMap[nodeId][e.v] = sourceStream.pipe(transformStream);
        }
        return this.executeGraph(template, dag, nodes, files, streamMap);
      }

      case 'Sink':
      {
        const inEdges: any[] = dag.inEdges(nodeId);
        if (inEdges.length > 1)
        {
          throw new Error('Sinks can only have one incoming edge.');
        }

        const e = inEdges[0];
        const transformationEngine: TransformationEngine = TransformationEngine.load(dag.edge(e));
        const sink = template.sinks[node.endpoint];
        const sinkStream = await getSinkStream(sink, transformationEngine);
        streamMap[nodeId][nodeId] = streamMap[nodeId][nodeId].pipe(sinkStream);
        return this.executeGraph(template, dag, nodes, files, streamMap);
      }

      case 'MergeJoin':
      {
        const inEdges: any[] = dag.inEdges(nodeId);

        const done = new EventEmitter();
        let numPending = inEdges.length;
        const tempIndices: string[] = [];
        for (const e of inEdges)
        {
          const inputStream = streamMap[nodeId][e.v];

          const tempIndex = 'temp_' + e.v + '_' + e.w;
          const tempSink = _.clone(template.sinks._default);
          tempSink['options']['database'] = tempIndex;
          tempIndices.push(tempIndex);

          const transformationEngine: TransformationEngine = TransformationEngine.load(dag.edge(e));
          const tempSinkStream = await getSinkStream(tempSink, transformationEngine);

          const outputStream = inputStream.pipe(tempSinkStream);
          outputStream.on('finish', () =>
          {
            if (--numPending === 0)
            {
              done.emit('done');
            }
          });
        }

        // wait for all the streams to finish
        await new Promise((resolve, reject) =>
        {
          done.on('done', resolve);
          done.on('error', reject);
        });

        // create merge join stream
        const outEdges: any[] = dag.outEdges(nodeId);
        for (const e of outEdges)
        {
          const mergeJoinStream = await getMergeJoinStream();
          streamMap[nodeId][e.v] = mergeJoinStream;
        }
        return this.executeGraph(template, dag, nodes, files, streamMap);
      }

      default:
        throw new Error('Unknown node in process graph');
    }

  }
}
