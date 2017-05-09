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

  /**
   * ES specific extension -- gets the health of the ES cluster
   */
  public async health(): Promise<any>
  {
    return new Promise((resolve, reject) =>
    {
      this.client.cluster.health(
        {},
        makePromiseCallback(resolve, reject));
    });
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
  public async fullQuery(queryObject: Elastic.SearchParams): Promise<any>
  {
    return new Promise((resolve, reject) =>
    {
      this.client.search(
        queryObject,
        makePromiseCallback(resolve, reject));
    });
  }

  /**
   * returns only the query hits
   */
  public async query(queryObject: Elastic.SearchParams)
  {
    const result = await this.fullQuery(queryObject);
    return result.hits.hits;
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

    const promises = [];

    for (const element of elements)
    {
      promises.push(
        new Promise((resolve, reject) =>
        {
          const query = {
            body: element,
            id: this.makeID(table, element),
            index: table.getDatabaseName(),
            type: table.getTableName(),
          };

          this.client.index(
            query,
            makePromiseCallback(resolve, reject));
        }),
      );
    }
    await Promise.all(promises);
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
  public async deleteDocumentsByID(table: TastyTable, elements: object[])
  {
    const promises = [];
    for (const element of elements)
    {
      promises.push(
        new Promise((resolve, reject) =>
        {
          const params =
            {
              id: this.makeID(table, element),
              index: table.getDatabaseName(),
              type: table.getTableName(),
            };

          this.client.delete(
            params,
            makePromiseCallback(resolve, reject));
        }));
    }
    await Promise.all(promises);
  }

  public async executeElasticTastyQuery(query: ElasticQuery)
  {
    switch (query.op)
    {
      case 'select':
        return await this.executeElasticTastySelectQuery(query);
      default:
        throw new Error('Unknown query command ' + query);
    }
  }

  private async executeElasticTastySelectQuery(query: ElasticQuery)
  {
    return await this.query(query.param as Elastic.SearchParams);
  }

  private async bulkUpsert(table: TastyTable, elements: object[]): Promise<any>
  {
    const body = [];
    for (let i = 0; i < elements.length; ++i)
    {
      const element = elements[i];
      const command =
        {
          index: {
            _id: this.makeID(table, element),
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

  private makeID(table: TastyTable, element: object): string
  {
    return table.getPrimaryKeys(element).map(
      (key: string) =>
      {
        return element[key];
      }).join('-');
  }
}
