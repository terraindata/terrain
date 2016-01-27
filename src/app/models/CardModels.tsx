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

import Util from '../util/Util.tsx';

var assign = (instance: any, obj: any, properties: string[]) =>
{
  // could have been passed a bogus object
  obj = obj || {};
  
  properties.map((property) => {
    instance[property] = obj[property] || instance[property];
  });
}

export module CardModels
{
  export enum Operator {
    EQ,
    GE,
    GT,
    LE,
    LT,
    IN,
    NE
  }
  
  export enum Direction {
    ASC,
    DESC
  }
  
  export enum Combinator {
    AND,
    OR
  }
  
  export class Comparison
  {
    first: string = "";
    second: string = "";
    operator: Operator = Operator.EQ;
    
    constructor(obj?: any)
    {
      assign(this, obj, ['first', 'second', 'operator']);
    }
  }
  
  export class Join
  {
    group: string = "";
    comparison: Comparison = new Comparison();
    
    constructor(obj?: any)
    {
      assign(this, obj, ['group']);
      
      if(obj && obj.comparison)
      {
        this.comparison = new Comparison(obj.comparison);
      }
    }
  }
  
  export class Sort
  {
    property: Property = "";
    direction: Direction = Direction.ASC;
  }
  
  export class Filter
  {
    combinator: Combinator = Combinator.AND;
    comparison: Comparison = new Comparison();
  }
  
  
  export class Card
  {
    type: string = "";
    id: number;
    
    constructor(type: string, obj?: any)
    {
      this.type = type;
      
      if(obj && obj['id'])
      {
        this.id = obj['id'];
      }
      else
      {
        this.id = Util.randInt(0, 4815162342);
      }
    }
  }
  
  export class FromCard extends Card
  {
    group: string = "";
    joins: Join[] = [];
    
    constructor(obj?: any)
    {
      super('from', obj);
      
      assign(this, obj, ['group']);
      
      if(obj && obj.joins && obj.joins.length)
      {
        this.joins = obj.joins.map((join) => new Join(join));
      }
    }
  }
  
  export class SelectCard extends Card
  {
    properties: string[] = [""];
    
    constructor(obj?: any)
    {
      super('select', obj);
      
      assign(this, obj, ['properties']);
    }
  }
  
  export class SortCard extends Card
  {
    sort: Sort = new Sort();
    
    constructor(obj?: any)
    {
      super('sort', obj);
      
      assign(this, obj, ['sort']);
    }
  }
  
  export class FilterCard extends Card
  {
    filters: Filter[] = [new Filter()];
    
    constructor(obj?: any)
    {
      super('filter', obj);
    }
  }
}
