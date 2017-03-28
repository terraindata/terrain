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

import TastyTable from "./TastyTable";
import TastyNode from "./TastyNode";

export default class TastyQuery
{
    table: TastyTable;
    aliases: any;
    filters: any;
    sorts: any;
    selected: any;
    numTaken: number;
    numSkipped: number;

    constructor(table)
    {
        this.table = table;
        this.aliases = [];
        this.filters = [];
        this.sorts = [];
        this.selected = null;
        this.numTaken = 0;
        this.numSkipped = 0;

        // this.root = new TastyNode('select', null,
        //     [
        //         new TastyNode('reference', tableName, []),
        //     ]);
    }

    toString(): string
    {
        return JSON.stringify(this, null, 1);
    }

    select(columns): TastyQuery
    {
        this.selected = columns;
        return this;
    }

    filter(node): TastyQuery
    {
        this.filters.push(node);
        return this;
    }

    sort(node, order): TastyQuery
    {
        if (order == 'ascending')
            order = 'asc';
        else if (order == 'descending')
            order = 'desc';

        if (order != 'asc' && order != 'desc')
            throw new Error('Unknown order "' + order + '".');

        this.sorts.push({node: node, order: order});
        return this;
    }

    as(name, node): TastyQuery
    {
        this.aliases.push({name: name, node: node});
        return this;
    }

    isSelectingAll(): boolean
    {
        return this.selected == null && this.aliases.length == 0;
    }

    take(num: number): TastyQuery
    {
        this.numTaken = num;
        return this;
    }

    skip(num: number): TastyQuery
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
            throw Error('node argument is not a TastyNode.');
    }
}
