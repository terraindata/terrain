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

import { Query } from '../../../items/types/Query';
import Options from '../../types/CardsToCodeOptions';

import ESConverter from '../../../../shared/database/elastic/formatter/ESConverter';
import ESParameterFiller from '../../../../shared/database/elastic/parser/EQLParameterFiller';
import ESInterpreter from '../../../../shared/database/elastic/parser/ESInterpreter';
import ESJSONParser from '../../../../shared/database/elastic/parser/ESJSONParser';
import ESValueInfo from '../../../../shared/database/elastic/parser/ESValueInfo';
import { Input, isInput, toInputMap } from '../../../blocks/types/Input';

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
  else if (Array.isArray(obj))
  {
    let str = '[';
    for (let i = 0; i < obj.length; i++)
    {
      str += stringifyWithParameters(obj[i], inputs);
      if (i < obj.length - 1)
      {
        str += ',';
      }
    }
    str += ']';
    return str;
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

export interface ESQueryObject
{
  index?: string;
  type?: string;
  body?: {
    _source: object;
  };

  [key: string]: any;
}

export function ESParseTreeToCode(parser: ESJSONParser, options?: Options, inputs?: List<Input>): string
{
  if (options && options.replaceInputs)
  {
    const valueInfo: ESValueInfo = parser.getValueInfo();
    const params = toInputMap(inputs);
    const result = ESParameterFiller.generate(valueInfo, params);
    return ESConverter.formatES(new ESJSONParser(result));
  }
  else
  {
    return ESConverter.formatES(parser);
  }
}

export function ESQueryToCode(queryObject: ESQueryObject, options?: Options, inputs?: List<Input>): string
{
  if (options && options.allFields === true)
  {
    if (queryObject.body && queryObject.body._source)
    {
      queryObject.body._source = [];
    }
  }

  const text: string = stringifyWithParameters(queryObject, inputs);
  const parser: ESJSONParser = new ESJSONParser(text, true);
  return ESParseTreeToCode(parser, options);
}

export function ParseElasticQuery(query: Query)
{
  const parser = new ESJSONParser(query.tql, true);
  const params = toInputMap(query.inputs);
  return new ESInterpreter(parser, params);
}

export function ElasticParseTreeToQuery(query: Query, options: Options): string
{
  return ESParseTreeToCode(query.parseTree.parser as ESJSONParser, options, query.inputs);
}
