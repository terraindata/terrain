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

import TastyNodeTypes from './TastyNodeTypes';

export class TastyNode
{
  public static make(value): TastyNode
  {
    if (value instanceof TastyNode)
    {
      return value;
    }

    if (value === null)
    {
      return new TastyNode('null', value);
    }

    if (value instanceof Date)
    {
      return new TastyNode('date', value);
    }

    const valueType = typeof value;
    if (valueType === 'number')
    {
      return new TastyNode('number', value);
    }
    if (valueType === 'string')
    {
      return new TastyNode('string', value);
    }
    if (valueType === 'boolean')
    {
      return new TastyNode('boolean', value);
    }

    throw new Error('Trying to make a TastyNode from an unsupported value type: ' + valueType);
  }

  public type: string;
  public value: any;

  constructor(type: string, value: any)
  {
    if (!(type in TastyNodeTypes))
    {
      throw new Error('Type "' + type + '" is not a known TastyNodeType.');
    }
    this.type = type;
    this.value = value;
  }

  public equals(rhs): TastyNode
  {
    return this.buildAsLHS('==', rhs);
  }

  public eq(rhs): TastyNode
  {
    return this.equals(rhs);
  }

  public doesNotEqual(rhs): TastyNode
  {
    return this.buildAsLHS('!=', rhs);
  }

  public neq(rhs): TastyNode
  {
    return this.doesNotEqual(rhs);
  }

  public greaterThan(rhs): TastyNode
  {
    return this.buildAsLHS('>', rhs);
  }

  public gt(rhs): TastyNode
  {
    return this.greaterThan(rhs);
  }

  public greaterThanOrEqualTo(rhs): TastyNode
  {
    return this.buildAsLHS('>=', rhs);
  }

  public gte(rhs): TastyNode
  {
    return this.greaterThanOrEqualTo(rhs);
  }

  public lessThan(rhs): TastyNode
  {
    return this.buildAsLHS('<', rhs);
  }

  public lt(rhs): TastyNode
  {
    return this.lessThan(rhs);
  }

  public lessThanOrEqualTo(rhs): TastyNode
  {
    return this.buildAsLHS('<=', rhs);
  }

  public lte(rhs): TastyNode
  {
    return this.lessThanOrEqualTo(rhs);
  }

  public and(rhs): TastyNode
  {
    return this.buildAsLHS('&&', rhs);
  }

  public or(rhs): TastyNode
  {
    return this.buildAsLHS('||', rhs);
  }

  public not(): TastyNode
  {
    return new TastyNode('!', [this]);
  }

  // tslint:disable-next-line:no-unused-variable
  private toString(): string
  {
    return JSON.stringify(this, null, 2);
  }

  public get tastyType(): number
  {
    return TastyNodeTypes[this.type];
  }

  public get numChildren(): number
  {
    return Array.isArray(this.value) ? this.value.length : 0;
  }

  public get lhs()
  {
    return this.getChild(0);
  }

  public get rhs()
  {
    return this.getChild(1);
  }

  private getChild(index: number)
  {
    if (this.numChildren <= index || index < 0)
    {
      throw new Error('Accessing child index out of bounds.');
    }
    return this.value[index];
  }

  private buildAsLHS(type: string, rhs): TastyNode
  {
    return new TastyNode(type, [this, TastyNode.make(rhs)]);
  }
}

export default TastyNode;
