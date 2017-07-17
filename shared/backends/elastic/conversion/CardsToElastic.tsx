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

// tslint:disable:restrict-plus-operands strict-boolean-expressions

import * as Immutable from 'immutable';
import * as _ from 'underscore';
import * as CommonElastic from '../syntax/CommonElastic';

import * as BlockUtils from '../../../blocks/BlockUtils';
import { Block, TQLRecursiveObjectFn } from '../../../blocks/types/Block';
import { Card } from '../../../blocks/types/Card';
import { Input, InputPrefix, InputType } from '../../../blocks/types/Input';
import Query from '../../../items/types/Query';
import ElasticBlocks from '../blocks/ElasticBlocks';

import ESParameterFiller from '../parser/EQLParameterFiller';
import ESParser from '../parser/ESJSONParser';
import ESParserError from '../parser/ESParserError';
import ESValueInfo from '../parser/ESValueInfo';
import ESConverter from './formatter/ESConverter';

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

export function isInput(name: string, inputs: Immutable.List<Input>)
{
  return inputs && name.charAt(0) === InputPrefix &&
    (inputs.findIndex((input: Input) => (name.substring(1) === input.key)) > -1);
}

export function toInputMap(inputs: Immutable.List<Input>): object
{
  const inputMap: object = {};
  inputs.map((input: Input) =>
  {
    inputMap[input.key] = JSON.parse(input.value);
  });
  return inputMap;
}

export function stringifyWithParameters(
  obj: object | number | boolean | string | null,
  inputs?: Immutable.List<Input>): string | null
{
  if (typeof obj === 'number' || typeof obj === 'boolean' || obj === null)
  {
    return '' + obj;
  }
  else if (typeof obj === 'string')
  {
    if (isInput(obj, inputs))
    {
      return obj;
    }
    return '"' + obj + '"';
  }
  else if (typeof obj === 'object')
  {
    let str = '{';
    const keys = Object.keys(obj);
    for (let i = 0; i < keys.length; i++)
    {
      str += '"' + keys[i] + '": ';
      str += stringifyWithParameters(obj[keys[i]], inputs);
      if (i < keys.length - 1)
      {
        str += ',';
      }
    }
    str += '}';
    return str;
  }
  else
  {
    return '';
  }
}

class CardsToElastic
{
  public static toElastic(query: Query, options: Options = {}): string
  {
    const elasticObj: ElasticObjectInterface = {};

    query.cards.map(
      (card: Card) =>
      {
        const val = CardsToElastic.blockToElastic(card, options);
        const key = card['key'];

        if (key)
        {
          elasticObj[key] = val;
        }
        else if (typeof val === 'object' && !Array.isArray(val))
        {
          _.extend(elasticObj, val);
        }
      },
    );

    if (options.allFields === true)
    {
      if (elasticObj.body && elasticObj.body._source)
      {
        elasticObj.body._source = [];
      }
    }

    const text: string = stringifyWithParameters(elasticObj, query.inputs);
    const parser: ESParser = new ESParser(text, true);
    if (options.replaceInputs)
    {
      const valueInfo: ESValueInfo = parser.getValueInfo();
      const params = toInputMap(query.inputs);
      const result = ESParameterFiller.generate(valueInfo, params);
      return ESConverter.formatES(new ESParser(result));
    }
    else
    {
      // TODO: pipe this through the formatter once it can handle parameters
      // return ESConverter.formatES(new ESParser(text));
      return text;
    }
  }

  public static blockToElastic(block: Block, options: Options = {}): string | object | number | boolean
  {
    if (typeof block !== 'object')
    {
      return block;
    }

    if (block && block.static.tql)
    {
      if (typeof block['value'] === 'string' && block['value'].charAt(0) === InputPrefix)
      {
        return block['value'];
      }
      const tql = block.static.tql as TQLRecursiveObjectFn;
      return tql(block, CardsToElastic.blockToElastic, options);
    }
    return { notYet: 'not yet done' };
  }
}

export default CardsToElastic;
