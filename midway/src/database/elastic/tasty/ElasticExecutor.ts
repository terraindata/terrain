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

import * as Elastic from 'elasticsearch';
import TastyExecutor from '../../../tasty/TastyExecutor';
import TastySchema from '../../../tasty/TastySchema';
import TastyTable from '../../../tasty/TastyTable';
import { makePromiseCallback } from '../../../tasty/Utils';
import ElasticClient from '../client/ElasticClient';
import ElasticQuery from './ElasticQuery';

export default class ElasticExecutor implements TastyExecutor
{
  private client: ElasticClient;

  constructor(client: ElasticClient)
  {
    this.client = client;
  }

  public async schema(): Promise<TastySchema>
  {
    const result = await new Promise((resolve, reject) =>
    {
      this.client.indices.getMapping(
        {},
        makePromiseCallback(resolve, reject));
    });

    return TastySchema.fromElasticTree(result);
  }

  /**
   * Returns the entire ES response object.
   */
  public async fullQuery(queries: Elastic.SearchParams[]): Promise<object>
  {
    if (queries.length === 0)
    {
      return [];
    }

    for (let i = 0; ; ++i)
    {
      const result = new Promise<object>((resolve, reject) =>
      {
        this.client.search(
          queries[i],
          makePromiseCallback(resolve, reject));
      });

      if (i === queries.length - 1)
      {
        return result;
      }

      await result;
    }
  }

  public async query(query: ElasticQuery)
  {
    let result: any;
    switch (query.op)
    {
      case 'select':
        result = await this.fullQuery(query.params as Elastic.SearchParams[]);
        return result.hits.hits;
      case 'upsert':
        const table: TastyTable = new TastyTable(query.table, query.primaryKeys, query.fields, query.index);
        result = await this.upsertObjects(table, query.params);
        return result.map((r) =>
        {
          return { id: r['_id'] };
        });
      default:
        throw new Error('Unknown query command ' + JSON.stringify(query));
    }
  }

  public async destroy()
  {
    // do nothing
  }

  public storeProcedure(procedure)
  {
    return new Promise(
      (resolve, reject) =>
      {
        this.client.putScript(
          procedure,
          makePromiseCallback(resolve, reject));
      });
  }

  /**
   * Upserts the given objects, based on primary key ('id' in elastic).
   */
  public async upsertObjects(table: TastyTable, elements: object[])
  {
    if (elements.length > 2)
    {
      return this.bulkUpsert(table, elements);
    }

    const promises: Array<Promise<any>> = [];
    for (const element of elements)
    {
      promises.push(
        new Promise((resolve, reject) =>
        {
          const query = {
            body: element,
            index: table.getDatabaseName(),
            type: table.getTableName(),
          };

          this.client.index(
            query,
            makePromiseCallback(resolve, reject));
        }),
      );
    }
    return Promise.all(promises);
  }

  /*
   * Deletes the given objects based on their primary key
   */
  public async deleteIndex(indexName)
  {
    return new Promise((resolve, reject) =>
    {
      const params = {
        index: indexName,
      };

      this.client.indices.delete(
        params,
        makePromiseCallback(resolve, reject));
    });
  }

  /*
   * Deletes the given objects based on their primary key
   */
  public async deleteObjects(table: TastyTable, elements: object[])
  {
    const promises: Array<Promise<any>> = [];
    for (const element of elements)
    {
      promises.push(
        new Promise((resolve, reject) =>
        {
          const primaryKeys = table.getPrimaryKeys();
          const params =
            {
              id: primaryKeys[0],
              index: table.getDatabaseName(),
              type: table.getTableName(),
            };

          this.client.delete(
            params,
            makePromiseCallback(resolve, reject));
        }));
    }
    return Promise.all(promises);
  }

  private async bulkUpsert(table: TastyTable, elements: object[]): Promise<any>
  {
    const body: any[] = [];
    for (const element of elements)
    {
      const command =
        {
          index: {
            _index: table.getDatabaseName(),
            _type: table.getTableName(),
          },
        };

      body.push(command);
      body.push(element);
    }

    return new Promise((resolve, reject) =>
    {
      this.client.bulk(
        {
          body,
        },
        makePromiseCallback(resolve, reject));
    });
  }
}
