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

import TastyColumn from './TastyColumn';
import TastyTableState from './TastyTableState';

export default class TastyTable
{
  // tslint:disable:variable-name
  private ___tastyTableState___: TastyTableState;

  constructor(name: string, primaryKeys: string[], columns: string[],
    database?: string, columnMapping?: object, primaryKeyDelimiter?: string)
  {
    this.___tastyTableState___ = new TastyTableState(
      this, name, primaryKeys, columns, database, columnMapping, primaryKeyDelimiter);
    this.___tastyTableState___.init();

    this.___tastyTableState___.columns.forEach(
      (value: TastyColumn, key: string) =>
      {
        this[key] = value;
      });
  }

  public getTableName(): string
  {
    return this.___tastyTableState___.tableName;
  }

  public getDatabaseName(): string
  {
    return this.___tastyTableState___.databaseName;
  }

  public getPrimaryKeys(): string[]
  {
    return this.___tastyTableState___.primaryKeys;
  }

  public getColumns(): Map<string, TastyColumn>
  {
    return this.___tastyTableState___.columns;
  }

  /**
   * Returns a sorted list of all column names
   * @returns {string[]}
   */
  public getColumnNames(): string[]
  {
    return this.___tastyTableState___.columnNames;
  }

  public getMapping(): object
  {
    return this.___tastyTableState___.columnMapping;
  }

  public getPrimaryKeyDelimiter(): string
  {
    return this.___tastyTableState___.primaryKeyDelimiter;
  }

  public toString(): string
  {
    return JSON.stringify(this, null, 2);
  }
}
