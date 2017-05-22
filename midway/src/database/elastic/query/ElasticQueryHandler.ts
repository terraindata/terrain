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

// import ElasticConfig from '../ElasticConfig';
// import ElasticCluster from '../client/ElasticCluster';
// import ElasticIndices from '../client/ElasticIndices';
import * as winston from 'winston';

import Query from '../../../app/query/Query';
import QueryHandler from '../../../app/query/QueryHandler';
import QueryResponse from '../../../app/query/QueryResponse';
import QueryError from '../../../error/QueryError';
import ElasticController from '../ElasticController';
import ElasticsearchScrollStream = require('elasticsearch-scroll-stream');
import {Readable} from 'stream';

/**
 * Implements the QueryHandler interface for ElasticSearch
 */
export default class ElasticQueryHandler extends QueryHandler
{
  private controller: ElasticController;
  private streamQueries: Map<number, Readable>;
  private nextStreamQueryID: number;
  private readonly STREAM_QUERY_MIN_ID = 12345;

  constructor(controller: ElasticController)
  {
    super();
    this.controller = controller;
    this.streamQueries = new Map<number, Readable>();
    this.nextStreamQueryID = this.STREAM_QUERY_MIN_ID;
  }

  public async handleQuery(request: Query): Promise<QueryResponse>
  {
    const type = request.type;
    const body = request.body;

    if (type === 'search')
    {
      if (request.streaming === true)
      {
        const qid = this.createStreamQuery(request);
        const path = '/database/1/stream/' + qid;
        const r: object = {url: path};
        return new QueryResponse(r);
      } else
      {
        // NB: streaming not yet implemented
        return new Promise<QueryResponse>((resolve, reject) =>
        {
          this.controller.getClient().search(body, this.makeQueryCallback(resolve, reject));
        });
      }
    }

    throw new Error('Query type "' + type + '" is not currently supported.');
  }

  // remove the Stream from the streamQueries map if it is available
  public consumeStream(streamID: number): Readable
  {
    const r = this.streamQueries.get(streamID);
    if (r === undefined)
    {
      throw new Error('StreamID: ' + streamID.toString() + ' is wrong.');
    }

    winston.debug('Delete StreamID ' + streamID.toString() + ' from the map.');
    this.streamQueries.delete(streamID);
    return r;
  }

  private createStreamQuery(request: Query): number
  {
    const client = this.controller.getClient();
    if (client['nodes'] === undefined)
    {
      const to: any = client;
      to['nodes'] = true;
    }
    const sq: Readable = new ElasticsearchScrollStream(client, request.body);
    if (this.nextStreamQueryID === Number.MAX_SAFE_INTEGER)
    {
      this.nextStreamQueryID = this.STREAM_QUERY_MIN_ID;
    }
    if (this.streamQueries.has(this.nextStreamQueryID))
    {
      throw new Error('No Available Streaming ID.');
    }
    const r = this.nextStreamQueryID;
    this.streamQueries.set(r, sq);
    this.nextStreamQueryID += 1;
    return r;
  }

  private makeQueryCallback(resolve: (any) => void, reject: (Error) => void)
  {
    return (error: Error, response: any) =>
    {
      if (error !== null && error !== undefined)
      {
        if (QueryError.isElasticQueryError(error))
        {
          const res: QueryResponse =
            new QueryResponse(
              null,
              QueryError.fromElasticQueryError(error).getMidwayErrors());
          resolve(res);
        }
        else
        {
          reject(error); // this will be handled by RouteError.RouteErrorHandler
        }
      }
      else
      {
        if (typeof response !== 'object')
        {
          winston.error('The response from the Elastic Search is not an object, ' + JSON.stringify(response));
          response = { response };
        }
        const res: QueryResponse = new QueryResponse(response);
        resolve(res);
      }
    };
  }
}
