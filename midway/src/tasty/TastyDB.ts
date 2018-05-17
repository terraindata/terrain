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

import TastyQuery from './TastyQuery';
import TastySchema from './TastySchema';
import TastyTable from './TastyTable';

abstract class TastyDB
{
  /**
   * makes a database specific query from a TastyQuery
   *
   * @abstract
   * @param {TastyQuery} query
   * @returns {*}
   *
   * @memberof TastyDB
   */
  public abstract generate(query: TastyQuery): any;

  /**
   * makes the generated query into a string
   *
   * @abstract
   * @param {TastyQuery} query
   * @returns {string}
   *
   * @memberof TastyDB
   */
  public abstract generateString(query: TastyQuery): string;

  /**
   * execute a database specific query
   *
   * @abstract
   * @param {*} queries
   * @returns {Promise<object[]>}
   *
   * @memberof TastyDB
   */
  public async abstract execute(queries: any[]): Promise<object[]>;

  /**
   * update or insert an array of objects in a TastyTable
   *
   * @abstract
   * @param {TastyTable} table
   * @param {object[]} elements
   * @returns {Promise<object[]>}
   *
   * @memberof TastyDB
   */
  public async abstract upsert(table: TastyTable, elements: object[]): Promise<object[]>;

  /**
   * update an array of objects in a TastyTable
   *
   * @abstract
   * @param {TastyTable} table
   * @param {object[]} elements
   * @returns {Promise<object[]>}
   *
   * @memberof TastyDB
   */
  public async abstract update(table: TastyTable, elements: object[]): Promise<object[]>;

  /**
   * returns schema information for a database
   *
   * @abstract
   * @returns {Promise<TastySchema>}
   *
   * @memberof TastyDB
   */
  public async abstract schema(): Promise<TastySchema>;

  /**
   * destroy an instance of tasty db
   *
   * @abstract
   * @returns {Promise<void>}
   *
   * @memberof TastyDB
   */
  public async abstract destroy(): Promise<void>;

  /**
   * insert mapping of column name to data type
   *
   * @abstract
   * @returns {Promise<void>}
   *
   * @memberof TastyDB
   */
  public async abstract putMapping(table: TastyTable): Promise<object>;
}

export default TastyDB;
