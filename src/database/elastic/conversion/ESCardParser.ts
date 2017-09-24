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

import {Query} from '../../../items/types/Query';
import Options from '../../types/CardsToCodeOptions';

import ESInterpreter from '../../../../shared/database/elastic/parser/ESInterpreter';
import ESJSONParser from '../../../../shared/database/elastic/parser/ESJSONParser';

import ESValueInfo from '../../../../shared/database/elastic/parser/ESValueInfo';
import ESClauseType from '../../../../shared/database/elastic/parser/ESClauseType';
import {Block} from '../../../blocks/types/Block';
import ESJSONType from '../../../../shared/database/elastic/parser/ESJSONType';
import ESPropertyInfo from '../../../../shared/database/elastic/parser/ESPropertyInfo';
export default class ESCardParser
{
  public static parseQuery(query: Query, options: Options = {}) : ESInterpreter
  {
    const rootCard = query.cards.get(0);
    if (!rootCard)
    {
      return null;
    }

    // root card is a ESStructural clause
    const rootValueInfo = ESCardParser.parseCard(rootCard, options);
    const theInterpreter = new ESInterpreter(rootValueInfo);
    return theInterpreter;
  }

  public static parseCard(block: Block, options): ESValueInfo
  {
    if (block.static.toValueInfo !== undefined)
    {
      return block.static.toValueInfo(block, options);
    }
    if (block.static.clause === undefined)
    {
      // this should not be happened
      console.log('Card ' + block.stati.title + ' has undefined clause');
      return null;
    }
    console.log('parseCard ' + block.static.title + ' clause ' + block.static.clause.type);
    switch (block.static.clause.clauseType)
    {
      case ESClauseType.ESAnyClause:
        return ESCardParser.parseESAnyClause(block, options);
      case ESClauseType.ESArrayClause:
        return ESCardParser.parseESArrayClause(block, options);
      case ESClauseType.ESBaseClause:
        return ESCardParser.parserSingleValue(block, options);
      case ESClauseType.ESBooleanClause:
        return ESCardParser.parserSingleValue(block, options);
      case ESClauseType.ESEnumClause:
        return ESCardParser.parserSingleValue(block, options);
      case ESClauseType.ESFieldClause:
        return ESCardParser.parserSingleValue(block, options);
      case ESClauseType.ESIndexClause:
        return ESCardParser.parserSingleValue(block, options);
      case ESClauseType.ESMapClause:
        return ESCardParser.parseESStructureClause(block, options);
      case ESClauseType.ESNullClause:
        return ESCardParser.parserSingleValue(block, options);
      case ESClauseType.ESNumberClause:
        return ESCardParser.parserSingleValue(block, options);
      case ESClauseType.ESObjectClause:
        return ESCardParser.parseESStructureClause(block, options);
      case ESClauseType.ESPropertyClause:
        return ESCardParser.parserSingleValue(block, options);
      case ESClauseType.ESReferenceClause:
        return ESCardParser.parseESReferenceClause(block, options);
      case ESClauseType.ESStringClause:
        return ESCardParser.parserSingleValue(block, options);
      case ESClauseType.ESStructureClause:
        return ESCardParser.parseESStructureClause(block, options);
      case ESClauseType.ESTypeClause:
        return ESCardParser.parserSingleValue(block, options);
      case ESClauseType.ESScriptClause:
        return ESCardParser.parseESStructureClause(block, options);
      case ESClauseType.ESWildcardStructureClause:
        return ESCardParser.parseESStructureClause(block, options);
      default:
        return ESCardParser.parseESClause(block, options);
    }
  }

  public static parseESClause(block, options)
  {
    console.log('Error: Unknown card ' + block.static.title + ' clause ' + block.static.clause.type);
    return null;
  }

  public static parseESReferenceClause(block, options)
  {
    console.log('Error: Unknown card ' + block.static.title + ' clause ' + block.static.clause.type);
    return null;
  }

  public static parseESAnyClause(block, options)
  {
    console.log('Error: Unknown card ' + block.static.title + ' clause ' + block.static.clause.type);
    return null;
  }

  public static parseESArrayClause(block, options)
  {
    const valueInfo = new ESValueInfo();
    valueInfo.card = block;
    const theValue = [];
    valueInfo.card = block;
    valueInfo.jsonType = ESJSONType.array;
    valueInfo.value = theValue;
    block.static.valueInfo = valueInfo;
    block['cards'].map(
      (card) =>
      {
        const elementValueInfo = ESCardParser.parseCard(card, options);
        valueInfo.addArrayChild(elementValueInfo);
        theValue.push(elementValueInfo.value);
      });
    console.log('Parse an array card ' + block.static.title + ' clause ' + block.static.clause.type);
    console.log('Value: ' + JSON.stringify(valueInfo.value));
    return valueInfo;
  }

  public static parseESStructureClause(block, options)
  {
    const valueInfo = new ESValueInfo();
    valueInfo.card = block;
    const theValue = {};
    valueInfo.card = block;
    valueInfo.jsonType = ESJSONType.object;
    valueInfo.value = theValue;
    block.static.valueInfo = valueInfo;
    block['cards'].map(
      (card) =>
      {
        const keyName = card['key'];
        const childName = new ESJSONParser(JSON.stringify(keyName)).getValueInfo();
        const childValue = ESCardParser.parseCard(card, options);
        const propertyInfo = new ESPropertyInfo(childName, childValue);
        valueInfo.addObjectChild(keyName, propertyInfo);
        theValue[keyName] = childValue.value;
      }
    );
    console.log('Parse a structure card ' + block.static.title + ' clause ' + block.static.clause.type);
    console.log('Value: ' + JSON.stringify(valueInfo.value));
    return valueInfo;
  }

  public static parserSingleValue(block, options)
  {
    let value;
    const singleType = block.static.singleType;
    const typeName = block.static.typeName;
    console.log('Card ' + block.static.title + ' singleType ' + singleType + ' typeName' + typeName);
    if (block['value'] === '')
    {
      // the input is empty
      console.log('Card ' + block.static.title + ' input is empty');
      value = '""';
    } else if (typeof  block['value'] === 'string' && block['value'][0] === '@')
    {
      // the input is a parameter
      console.log('Card ' + block.static.title + ' input is a parameter');
      value = block['value'];
    } else if (singleType === false)
    {
      console.log('Card ' + block.static.title + ' input type ' + typeof block['value']);
      // the input is encoded as a string, but its value type can be other types
      value = block['value'];
    } else
    {
      console.log('Card ' + block.static.title + ' input type ' + typeof block['value']);
      // the input is encoded as its type
      if (typeName === 'string')
      {
        value = JSON.stringify(block['value']);
      } else
      {
        if (typeName === typeof block['value'])
        {
          value = JSON.stringify(block['value']);
        } else if (typeof block['value'] == 'string')
        {
          value = block['value'];
        } else
        {
          console.log('Error: asked type ' + typeName + ' value type ' + typeof block['value']);
          value = JSON.stringify(block['value']);
        }
      }
    }
    const parser = new ESJSONParser(value, true);
    const valueInfo = parser.getValueInfo();
    if (valueInfo)
    {
      valueInfo.card = block;
      console.log('Parse a value card ' + block.static.title + ' clause ' + block.static.clause.type);
      console.log('Value: ' + JSON.stringify(valueInfo.value));
      return valueInfo;
    } else
    {
      return null;
    }
  }
}
