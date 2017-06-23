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

import * as Immutable from 'immutable';
import * as _ from 'underscore';
import CommonElastic from '../syntax/CommonElastic';

import BlockUtils from '../../../blocks/BlockUtils';
import { Block, TQLRecursiveObjectFn } from '../../../blocks/types/Block';
import { Card } from '../../../blocks/types/Card';
import { Input, InputType } from '../../../blocks/types/Input';
import Query from '../../../items/types/Query';
import ElasticBlocks from '../blocks/ElasticBlocks';

const join = (j, index) => (index === 0 ? '' : j);
const addTabs = (str) => ' ' + str.replace(/\n/g, '\n ');
const removeBlanks = (str) => str.replace(/\n[ \t]*\n/g, '\n');
type PatternFn = (obj: any, index?: number, isLast?: boolean) => string;

export interface Options
{
  allFields?: boolean; // amend the final Select card to include all possible fields.
  limit?: number;
  count?: boolean;
  transformAliases?: boolean; // if true, scan the top Select for Transforms, and add an alias row using the transform's ID
  replaceInputs?: boolean; // replaces occurences of inputs with their values
}

export interface ElasticObjectInterface
{
  index?: string;
  type?: string;
  body?: {
    _source: object;
  };

  [key: string]: any;
}

class CardsToElastic
{
  static toElastic(query: Query, options: Options = {}): string
  {
    const elasticObj: ElasticObjectInterface = {};

    query.cards.map(
      (card: Card) =>
      {
        _.extend(elasticObj, CardsToElastic.blockToElastic(card, options));
      },
    );

    if (options.allFields === true)
    {
      if (elasticObj.body && elasticObj.body._source)
      {
        elasticObj.body._source = [];
      }
    }

    return JSON.stringify(elasticObj, null, 2);

    // let q: string = query.tql;

    // return q;
  }

  static blockToElastic(block: Block, options: Options = {}): string | object | number | boolean
  {
    if (typeof block !== 'object')
    {
      return block;
    }
    
    if (block && block.static.tql)
    {
      const tql = block.static.tql as TQLRecursiveObjectFn;
      return tql(block, CardsToElastic.blockToElastic, options);
    }
    return { notYet: 'not yet done' };
  }
}

export default CardsToElastic;
