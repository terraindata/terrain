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
import GraphLib = require('graphlib');
import * as Immutable from 'immutable';
import { Readable } from 'stream';

import * as Tasty from '../../tasty/Tasty';
import * as App from '../App';
import TransformationEngineTransform from '../io/streams/TransformationEngineTransform';
import { MidwayLogger } from '../log/MidwayLogger';

import { TransformationEngine } from '../../../../shared/transformations/TransformationEngine';
import DatabaseController from '../../database/DatabaseController';
import ElasticDB from '../../database/elastic/tasty/ElasticDB';
import DatabaseRegistry from '../../databaseRegistry/DatabaseRegistry';
import { getMergeJoinStream, getSinkStream, getSourceStream, IndexInfo } from './SourceSinkStream';
import { destringifySavedTemplate, recordToConfig, TemplateConfig, templateForSave, TemplateInDatabase } from './TemplateConfig';

import { _SinkConfig, _SourceConfig, SinkConfig as SinkRecord, SourceConfig as SourceRecord } from 'shared/etl/immutable/EndpointRecords';
import { _ETLTemplate, ETLTemplate } from 'shared/etl/immutable/TemplateRecords';
import { TemplateBase } from 'shared/etl/types/ETLTypes';
import LogStream from '../io/streams/LogStream';
import ProgressStream from '../io/streams/ProgressStream';

export default class Templates
{
  private templateTable: Tasty.Table;

  public initialize()
  {
    this.templateTable = App.TBLS.templates;
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

  public async validateTemplateExists(templateId: number):
    Promise<{ valid: boolean, message: string }>
  {
    let valid = true;
    const messages: string[] = [];
    if (templateId == null || typeof templateId !== 'number')
    {
      valid = false;
      messages.push(`id is missing or invalid type: ${templateId}`);
    }
    else
    {
      const searchForTemplates = await this.get(templateId);
      if (searchForTemplates.length === 0)
      {
        valid = false;
        messages.push(`no template with the specified id exists`);
      }
    }
    return { valid, message: `${messages}` };
  }

  public async validateTemplate(template: TemplateConfig, requireExistingId?: boolean):
    Promise<{ valid: boolean, message: string }>
  {
    const { sources, sinks } = template;
    let valid = true;
    const messages: string[] = [];
    if (requireExistingId === true)
    {
      const res = await this.validateTemplateExists(template.id);
      if (!res.valid)
      {
        valid = false;
        messages.push(res.message);
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

  public async delete(templateId: number)
  {
    return new Promise<void>(async (resolve, reject) =>
    {
      const { valid, message } = await this.validateTemplateExists(templateId);
      if (!valid)
      {
        return reject(message);
      }
      await App.DB.delete(this.templateTable, { id: templateId });
      resolve();
    });
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
      const currDateTime: Date = new Date(Date.now());
      const newTemplate: TemplateConfig = {
        archived: false,
        createdAt: currDateTime,
        lastModified: currDateTime,
        templateName: template.templateName,
        process: template.process,
        sources: template.sources,
        sinks: template.sinks,
        settings: template.settings,
        meta: template.meta,
        uiData: template.uiData,
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
      const currDateTime: Date = new Date(Date.now());
      const newTemplate: TemplateConfig = {
        archived: template.archived,
        createdAt: template.createdAt,
        lastModified: currDateTime,
        id: template.id,
        templateName: template.templateName,
        process: template.process,
        sources: template.sources,
        sinks: template.sinks,
        settings: template.settings,
        meta: template.meta,
        uiData: template.uiData,
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

  public async executeETL(
    fields?: {
      template?: string,
      templateId?: string | number,
      overrideSources?: string,
      overrideSinks?: string,
    },
    files?: Readable[],
  ): Promise<{ outputStream: Readable, logStream: Readable }>
  {
    if (fields.template !== undefined)
    {
      const template = JSON.parse(fields.template);
      return this.execute(template, files);
    }
    else if (fields.templateId !== undefined)
    {
      const templateId = Number(fields.templateId);
      if (fields.overrideSources !== undefined || fields.overrideSinks !== undefined)
      {
        return this.executeByOverride(templateId, files, fields.overrideSources, fields.overrideSinks);
      }
      else
      {
        return this.executeById(templateId, files);
      }
    }
    else
    {
      throw new Error('Missing template or template ID parameter.');
    }
  }

  public async executeById(id: number, files?: Readable[]): Promise<{ outputStream: Readable, logStream: Readable }>
  {
    const ts: TemplateConfig[] = await this.get(id);
    if (ts.length < 1)
    {
      throw new Error(`Template ID ${String(id)} not found.`);
    }
    const template = ts[0];
    return this.execute(template, files);
  }

  public async executeByOverride(
    id: number,
    files?: Readable[],
    overrideSources?: string,
    overrideSinks?: string): Promise<{ outputStream: Readable, logStream: Readable }>
  {
    let template: ETLTemplate = null;

    try
    {
      let sources: Immutable.Map<string, SourceRecord>;
      let sinks: Immutable.Map<string, SinkRecord>;

      if (overrideSources !== undefined)
      {
        const parsed = JSON.parse(overrideSources);
        sources = Immutable.Map<string, SourceRecord>(parsed).map((source, key) => _SourceConfig(source, true)).toMap();
      }
      if (overrideSinks !== undefined)
      {
        const parsed = JSON.parse(overrideSinks);
        sinks = Immutable.Map<string, SinkRecord>(parsed).map((sink, key) => _SinkConfig(sink, true)).toMap();
      }

      const ts: TemplateConfig[] = await this.get(id);
      if (ts.length < 1)
      {
        throw new Error(`Template ID ${String(id)} not found.`);
      }
      const templateObj = ts[0];

      template = _ETLTemplate(templateObj as TemplateBase, true);
      template = template.applyOverrides(sources, sinks);
    }
    catch (e)
    {
      throw new Error(`Failed to create execution template: ${String(e)}`);
    }

    return this.execute(recordToConfig(template), files);
  }

  public async execute(template: TemplateConfig, files?: Readable[]): Promise<{ outputStream: Readable, logStream: Readable }>
  {
    MidwayLogger.info('Executing template', template.templateName);
    MidwayLogger.debug(JSON.stringify(template, null, 2));

    const numSources = Object.keys(template.sources).length;
    const numSinks = Object.keys(template.sinks).length;
    const numEdges = Object.keys(template.process.edges).length;
    // TODO: multi-source export
    if (numSinks > 1 || template.sinks._default === undefined)
    {
      throw new Error('Only single sinks are supported.');
    }

    MidwayLogger.info('Beginning ETL pipeline...');

    // construct a "process DAG"
    let defaultSink;
    const dag: any = new GraphLib.Graph({ directed: true });
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

    const processTransforms = (engine: string | object) =>
    {
      if (typeof engine === 'object')
      {
        return JSON.stringify(engine);
      }
      else
      {
        return engine;
      }
    };

    Object.keys(template.process.edges).map(
      (e) =>
      {
        if (template.process.edges[e].from >= 0 && template.process.edges[e].to >= 0)
        {
          dag.setEdge(
            template.process.edges[e].from,
            template.process.edges[e].to,
            processTransforms(template.process.edges[e].transformations),
          );
        }
      },
    );

    MidwayLogger.info('Finished constructing ETL pipeline graph...');

    if (defaultSink === undefined)
    {
      throw new Error('Default sink not found.');
    }

    MidwayLogger.info('Beginning execution of ETL pipeline graph...');
    const nodes: any[] = GraphLib.alg.topsort(dag);
    const streamMap = await this.executeGraph(template, dag, nodes, files);

    const outputStream = streamMap[defaultSink][defaultSink];
    const logStream = streamMap['log'];

    outputStream.on('end', () =>
    {
      logStream.info(`Finished executing ETL job for template ${template.templateName}`);
      // push execution summary / progress to the log stream when done
      if (outputStream instanceof ProgressStream)
      {
        logStream.info(outputStream.progress());
      }
      logStream.push(null);
    });

    return {
      outputStream,
      logStream,
    };
  }

  private async executeGraph(template: TemplateConfig, dag: any, nodes: any[], files?: Readable[], streamMap?: object): Promise<object>
  {
    // if there are no nodes to process, we are done
    if (nodes.length === 0)
    {
      return Promise.resolve(streamMap as object);
    }

    // initialize a streamMap which is just a DAG of "pending" streams; we could potentially
    // use the "process dag" to store this information...
    if (streamMap === undefined)
    {
      streamMap = {
        log: new LogStream(template.settings.abortThreshold),
      };
      nodes.forEach((n) =>
      {
        (streamMap as object)[n] = {};
      });
    }

    const logStream = streamMap['log'];

    try
    {
      const nodeId = nodes.shift();
      const node = dag.node(nodeId);

      switch (node.type)
      {
        case 'Source':
          {
            const source = template.sources[node.endpoint];
            logStream.info(`Processing source: ${JSON.stringify(source, null, 2)}`);
            const sourceStream = await getSourceStream(node.endpoint, source, files);

            // apply transformations to all of the outgoing edges of the "Source" node and store
            // the resulting streams in the streamMap
            const outEdges: any[] = dag.outEdges(nodeId);
            for (const e of outEdges)
            {
              const transformationEngine: TransformationEngine = TransformationEngine.load(dag.edge(e));
              const transformStream = new TransformationEngineTransform(transformationEngine);
              streamMap[nodeId][e.w] = sourceStream.pipe(transformStream);

              // log all errors to the log stream
              streamMap['log'].addStreams(
                transformStream,
                sourceStream,
                streamMap[nodeId][e.w],
              );
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
            logStream.info(`Processing sink: ${JSON.stringify(sink, null, 2)}`);
            const sinkStream = await getSinkStream(sink, transformationEngine);
            streamMap[nodeId][nodeId] = streamMap[e.v][nodeId].pipe(sinkStream);

            // log all errors to the log stream
            streamMap['log'].addStreams(
              sinkStream,
              streamMap[e.v][nodeId],
              streamMap[nodeId][nodeId],
            );
            return this.executeGraph(template, dag, nodes, files, streamMap);
          }

        case 'MergeJoin':
          {
            logStream.info(`Processing merge-join node: ${JSON.stringify(node, null, 2)}`);
            const dbName: string = template.sinks._default['options']['serverId'];
            if (dbName === undefined)
            {
              throw new Error('Cannot find a valid database sink to use for merge-joins.');
            }

            const inEdges: any[] = dag.inEdges(nodeId);

            const done = new EventEmitter();
            let numPending = inEdges.length;
            const tempIndices: IndexInfo[] = [];
            for (const e of inEdges)
            {
              const inputStream = streamMap[e.v][nodeId];

              // create temporary indices for all of the incoming edges to a merge join node
              const tempIndex = 'temp_' + String(dag.node(e.v).endpoint) + '_' + String(e.v) + '_' + String(e.w);
              const tempSink = JSON.parse(JSON.stringify(template.sinks._default));
              tempSink['options']['database'] = tempIndex;
              // and insert incoming streams into the temporary index
              const transformationEngine: TransformationEngine = TransformationEngine.load(dag.edge(e));

              tempIndices.push({
                index: tempIndex,
                type: tempSink['options']['table'],
              });

              const tempSinkStream = await getSinkStream(tempSink, transformationEngine, { isMerge: true });
              inputStream.pipe(tempSinkStream);

              const deleteIndex = (index) =>
              {
                return async (e) =>
                {
                  MidwayLogger.error(e);
                  await elasticDB.deleteIndex(index);
                  logStream.info(`Deleted temporary indices: ${JSON.stringify(index)}`);
                };
              };

              inputStream.on('error', deleteIndex(tempIndex));
              tempSinkStream.on('error', deleteIndex(tempIndex));

              // wait for the stream to be completely written out to the sink by attaching the
              // "finish" event handler; when all the incoming streams have finished, throw a "done"
              // event to proceed...
              tempSinkStream.on('finish', () =>
              {
                if (--numPending === 0)
                {
                  done.emit('done');
                }
              });

              streamMap['log'].addStreams(
                tempSinkStream,
                inputStream,
              );
            }

            // listen for the done event on the EventEmitter
            // nb: we use a promise here so as to not block the thread, and not have to write the
            // following code in an event-passing style
            await new Promise((resolve, reject) => done.on('done', resolve).on('error', reject));

            logStream.info(`Finished creating temporary indices: ${JSON.stringify(tempIndices)}`);

            // we refresh all temporary elastic indexes to make them ready for search
            const controller: DatabaseController | undefined = DatabaseRegistry.getByName(dbName);
            if (controller === undefined)
            {
              throw new Error('Controller not found for database: ' + dbName);
            }
            const elasticDB: ElasticDB = controller.getTasty().getDB() as ElasticDB;
            const indices = tempIndices.map((i) => i['index']);

            logStream.info('Finished refreshing temporary indices; now ready for searching / sorting ...');

            try
            {
              // pipe the merge stream to all outgoing edges
              const outEdges: any[] = dag.outEdges(nodeId);
              numPending = outEdges.length;
              for (const e of outEdges)
              {
                const transformationEngine: TransformationEngine = TransformationEngine.load(dag.edge(e));
                const transformStream = new TransformationEngineTransform(transformationEngine);
                const mergeJoinStream = await getMergeJoinStream(dbName, tempIndices, node.options);
                streamMap[nodeId][e.w] = mergeJoinStream.pipe(transformStream);
                streamMap[nodeId][e.w].on('end', async () =>
                {
                  if (--numPending === 0)
                  {
                    // delete the temporary indices once the merge stream has been piped
                    // out to all outgoing edges
                    await elasticDB.deleteIndex(indices);
                    logStream.info(`Deleted temporary indices: ${JSON.stringify(indices)}`);
                  }
                });

                // log all errors to the log stream
                streamMap['log'].addStreams(
                  transformStream,
                  mergeJoinStream,
                  streamMap[nodeId][e.w],
                );
              }
            }
            catch (e)
            {
              MidwayLogger.error(e);
              await elasticDB.deleteIndex(indices);
              logStream.info(`Deleted temporary indices: ${JSON.stringify(indices)}`);
            }

            return this.executeGraph(template, dag, nodes, files, streamMap);
          }

        default:
          throw new Error('Unknown node in process graph');
      }
    }
    catch (e)
    {
      logStream.error(`Failed to execute ETL pipeline: ${String(e)}`);
      throw e;
    }
  }
}
