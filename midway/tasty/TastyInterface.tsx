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

import MySQLExecutor from './MySQLExecutor';
import MySQLGenerator from './MySQLGenerator';

import TastyNode from './TastyNode';
import TastyQuery from './TastyQuery';
import TastyTable from './TastyTable';
import { makePromiseCallback } from './Utils';

export default class TastyInterface
{
  private executor: MySQLExecutor;
  private generator: MySQLGenerator;

  public constructor(backend: TastyBackend, config?: object)
  {
    this.executor = new MySQLExecutor(config);
  }

  /**
   * Run a query.
   *
   * @param {TastyQuery | string} query The Tasty Query to run.
   * @returns {Promise<object[]>} Returns a promise that would return a list of objects.
   *
   * @memberOf TastyInterface
   */
  public async run(query: TastyQuery | string): Promise<object[]>
  {
    if (typeof query === 'string')
    {
      return await this.executor.query(query);
    } else
    {
      const queryString = MySQLGenerator.generate(query);
      return await this.executor.query(queryString);
    }
  }

  /**
   * select: Retrieve an object from the table.
   *
   * @param {TastyTable} table A Tasty Table
   * @param {object| object[]) obj An object or an array of objects populated with their primary key fields.
   *
   *            If obj is not defined or null or {}, all of the objects in the table are retrieved.
   *
   *            If a singleton object is specified with its primary key field(s) populated, then all
   *            of the fields of that object are retrieved.
   *
   *            If an array of objects with their primary key field(s) populated are specified, then all
   *            all of those objects with all of their fields are retrieved and returned.
   *
   * @returns {Promise<object[]>}
   *
   * @memberOf TastyInterface
   */
  public async select(table: TastyTable, obj: object | object[]): Promise<object[]>
  {
    const query = new TastyQuery(table);
    let node: TastyNode = null;
    if (obj === null || obj === undefined || obj === {})
    {
      query.select([]);
    } else if (obj instanceof Array)
    {
      obj.map((o) =>
      {
        if (node === null)
        {
          node = this.filterPrimaryKeys(table, o);
        } else
        {
          node = node.or(this.filterPrimaryKeys(table, o));
        }
      });
      query.filter(node);
    } else
    {
      node = this.filterPrimaryKeys(table, obj);
      query.filter(node);
    }
    const queryString = MySQLGenerator.generate(query);
    return await this.executor.query(queryString);
  }

  /**
   * Update or insert an object or a list of objects.
   *
   * @param {TastyTable} table The table to upsert the object in.
   * @param {(object | object[])} obj An object or a list of objects to upsert.
   * @returns
   *
   * @memberOf TastyInterface
   */
  public async upsert(table: TastyTable, obj: object | object[]): Promise<object[]>
  {
    const query = new TastyQuery(table);
    if (obj instanceof Array)
    {
      const promises = [];
      obj.map(
        (o) =>
        {
          promises.push(this.upsert(table, o));
        });
      return await Promise.all(promises);
    } else
    {
      query.upsert(obj);
    }
    const queryString = MySQLGenerator.generate(query);
    return await this.executor.query(queryString);
  }

  /**
   * Delete an object or a list of objects based on their primary keys.
   *
   * @param {TastyTable} table The table to delete an object from.
   * @param {(object | object[])} obj  An object or a list of objects to delete.
   * @returns {Promise<object[]>}
   *
   * @memberOf TastyInterface
   */
  public async delete(table: TastyTable, obj: object | object[]): Promise<object[]>
  {
    const query = new TastyQuery(table);
    if (obj === null || obj === undefined || obj === {})
    {
      query.delete();
    } else if (obj instanceof Array)
    {
      const promises = [];
      obj.map(
        (o) =>
        {
          promises.push(this.upsert(table, o));
        });
      return await Promise.all(promises);
    } else
    {
      const node: TastyNode = this.filterPrimaryKeys(table, obj);
      query.filter(node);
      query.delete();
    }
    const queryString = MySQLGenerator.generate(query);
    return await this.executor.query(queryString);
  }

  private filterPrimaryKeys(table: TastyTable, obj: object): TastyNode
  {
    let node: TastyNode = null;
    table.primaryKeys.map((key) =>
    {
      if (node === null)
      {
        node = table[key].equals(obj[key]);
      } else
      {
        if (obj.hasOwnProperty(key))
        {
          node = node.and(table[key].equals(obj[key]));
        }
      }
    });
    return node;
  }
}
