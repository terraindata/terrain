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

import TastyColumn from './TastyColumn';
import TastyNode from './TastyNode';
import TastyNodeTypes from './TastyNodeTypes';
import TastyTable from './TastyTable';

export class TastyQuery
{
  public table: TastyTable;
  public command: TastyNode;
  public aliases: Array<{ name: string, node: TastyNode }>;
  public filters: TastyNode[];
  public sorts: Array<{ node: TastyNode, order: string }>;
  public selected: TastyColumn[];
  public inserts: object[];
  public upserts: object[];
  public numTaken: number;
  public numSkipped: number;

  constructor(table: TastyTable)
  {
    this.table = table;
    this.aliases = [];
    this.filters = [];
    this.sorts = [];
    this.selected = [];
    this.inserts = [];
    this.upserts = [];
    this.numTaken = 0;
    this.numSkipped = 0;

    this.command = new TastyNode('select', null);
  }

  public toString(): string
  {
    return JSON.stringify(this, null, 1);
  }

  public select(columns: TastyColumn[]): TastyQuery
  {
    this.selected = columns;
    return this;
  }

  public insert(value: object | object[]): TastyQuery
  {
    this.command = new TastyNode('insert', null);
    if (value instanceof Array)
    {
      this.inserts = this.inserts.concat(value);
    }
    else
    {
      this.inserts.push(value);
    }

    return this;
  }

  public upsert(value: object | object[]): TastyQuery
  {
    this.command = new TastyNode('upsert', null);
    if (value instanceof Array)
    {
      this.upserts = this.upserts.concat(value);
    }
    else
    {
      this.upserts.push(value);
    }

    return this;
  }

  public delete(): TastyQuery
  {
    this.command = new TastyNode('delete', null);
    return this;
  }

  public filter(node: TastyNode): TastyQuery
  {
    this.filters.push(node);
    return this;
  }

  public sort(node: TastyNode, order: string): TastyQuery
  {
    if (order === 'ascending')
    {
      order = 'asc';
    }
    else if (order === 'descending')
    {
      order = 'desc';
    }

    if (order !== 'asc' && order !== 'desc')
    {
      throw new Error('Unknown order "' + order + '".');
    }

    this.sorts.push({ node, order });
    return this;
  }

  public as(name: string, node: TastyNode): TastyQuery
  {
    this.aliases.push({ name, node });
    return this;
  }

  public isSelectingAll(): boolean
  {
    return (this.command.tastyType === TastyNodeTypes.select) &&
      (this.selected.length === 0) &&
      (this.aliases.length === 0);
  }

  public take(num: number): TastyQuery
  {
    this.numTaken = num;
    return this;
  }

  public skip(num: number): TastyQuery
  {
    this.numSkipped = num;
    return this;
  }

  private isTastyNode(node: TastyNode): boolean
  {
    return node instanceof TastyNode;
  }

  private ensureTastyNode(node: TastyNode): void
  {
    if (!this.isTastyNode(node))
    {
      throw new Error('node argument is not a TastyNode.');
    }
  }
}

export default TastyQuery;
