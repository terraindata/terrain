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

import TastyDB from '../../../tasty/TastyDB';
import TastyQuery from '../../../tasty/TastyQuery';
import TastySchema from '../../../tasty/TastySchema';
import TastyTable from '../../../tasty/TastyTable';
import { makePromiseCallback } from '../../../tasty/Utils';
import ElasticClient from '../client/ElasticClient';
import ElasticGenerator from './ElasticGenerator';
import ElasticQuery from './ElasticQuery';

export class ElasticDB implements TastyDB
{
  private client: ElasticClient;

  constructor(client: ElasticClient)
  {
    this.client = client;
  }

  public generate(query: TastyQuery)
  {
    return [new ElasticGenerator(query).esQuery];
  }

  public generateString(query: TastyQuery)
  {
    return JSON.stringify(this.generate(query));
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
  public async query(queries: Elastic.SearchParams[]): Promise<object>
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

  public async execute(queries: ElasticQuery[])
  {
    let results: object[] = [];
    for (const query of queries)
    {
      let result: any;
      switch (query.op)
      {
        case 'select':
          result = await this.query(query.params as Elastic.SearchParams[]);
          results = results.concat(result.hits.hits);
          break;
        case 'upsert':
          const table: TastyTable = new TastyTable(query.table, query.primaryKeys, query.fields, query.index);
          result = await this.upsert(table, query.params);
          results = results.concat(result);
          break;
        default:
          throw new Error('Unknown query command ' + JSON.stringify(query));
      }
    }

    return results;
  }

  public async destroy()
  {
    // do nothing
  }

  public async storeProcedure(procedure)
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
  public async upsert(table: TastyTable, elements: object[])
  {
    const upserted = await this.upsertObjects(table, elements);
    const primaryKeys = table.getPrimaryKeys();
    const results = new Array(upserted.length);
    for (let i = 0; i < upserted.length; i++)
    {
      results[i] = elements[i];
      if (upserted[i]['_id'] !== undefined)
      {
        if ((primaryKeys.length === 1) &&
          (elements[i][primaryKeys[0]] === undefined))
        {
          results[i][primaryKeys[0]] = upserted[i]['_id'];
        }
      }
    }

    return results;
  }

  /**-----------------------------------------------------------------------
   * Updates the given objects, based on primary key ('id' in elastic).
   */
  public async update(table: TastyTable, elements: object[])
  {
    const updated = await this.updateObjects(table, elements);
    const primaryKeys = table.getPrimaryKeys();
    const results = new Array(updated.length);
    for (let i = 0; i < updated.length; i++)
    {
      results[i] = elements[i];
      if (updated[i]['_id'] !== undefined)
      {
        if ((primaryKeys.length === 1) &&
          (elements[i][primaryKeys[0]] === undefined))
        {
          results[i][primaryKeys[0]] = updated[i]['_id'];
        }
      }
    }

    return results;
  }

  /*
   * Creates the given index
   */
  public async createIndex(indexName)
  {
    return new Promise((resolve, reject) =>
    {
      const params = {
        index: indexName,
      };

      this.client.indices.create(
        params,
        makePromiseCallback(resolve, reject));
    });
  }

  /*
   * Deletes the given index
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

  public async putMapping(table: TastyTable): Promise<object>
  {
    const schema: TastySchema = await this.schema();
    if (schema.databaseNames().indexOf(table.getDatabaseName()) === -1)
    {
      await this.createIndex(table.getDatabaseName());
    }

    const payload: object = table.getMapping();
    return new Promise((resolve, reject) =>
    {
      this.client.indices.putMapping(
        {
          index: table.getDatabaseName(),
          type: table.getTableName(),
          body: payload,
        },
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
    return Promise.all(promises);
  }

  /*
   * Refreshes the given index
   */
  public async refresh(indexName: string)
  {
    return new Promise((resolve, reject) =>
    {
      const params = {
        index: indexName,
      };

      this.client.indices.refresh(
        params,
        makePromiseCallback(resolve, reject));
    });
  }

  private async upsertObjects(table: TastyTable, elements: object[])
  {
    if (elements.length > 2)
    {
      await this.bulkUpsert(table, elements);
      return elements;
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

          const compositePrimaryKey = this.makeID(table, element);
          if (compositePrimaryKey !== '')
          {
            query['id'] = compositePrimaryKey;
          }

          this.client.index(
            query as any,
            makePromiseCallback(resolve, reject));
        }),
      );
    }
    return Promise.all(promises);
  }

  private async updateObjects(table: TastyTable, elements: object[])
  {
    if (elements.length > 2)
    {
      await this.bulkUpdate(table, elements);
      return elements;
    }

    const promises: Array<Promise<any>> = [];
    for (const element of elements)
    {
      promises.push(
        new Promise((resolve, reject) =>
        {
          const query = {
            body: {
              doc: element,
              doc_as_upsert: true,
            },
            index: table.getDatabaseName(),
            type: table.getTableName(),
          };

          const compositePrimaryKey = this.makeID(table, element);
          if (compositePrimaryKey !== '')
          {
            query['id'] = compositePrimaryKey;
          }

          this.client.update(
            query as any,
            makePromiseCallback(resolve, reject));
        }),
      );
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

      const compositePrimaryKey = this.makeID(table, element);
      if (compositePrimaryKey !== '')
      {
        command.index['_id'] = compositePrimaryKey;
      }

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

  private async bulkUpdate(table: TastyTable, elements: object[]): Promise<any>
  {
    const body: any[] = [];
    for (const element of elements)
    {
      const command =
        {
          update: {
            _index: table.getDatabaseName(),
            _type: table.getTableName(),
          },
        };

      const compositePrimaryKey = this.makeID(table, element);
      if (compositePrimaryKey !== '')
      {
        command.update['_id'] = compositePrimaryKey;
      }

      body.push(command);
      body.push({
        doc: element,
        doc_as_upsert: true,
      });
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
    return table.getPrimaryKeys().map(
      (key: string) =>
      {
        return element[key];
      }).join(table.getPrimaryKeyDelimiter());
  }
}

export default ElasticDB;
