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

import ESClauseType from '../../../../shared/database/elastic/parser/ESClauseType';
import ESInterpreter from '../../../../shared/database/elastic/parser/ESInterpreter';
import ESJSONParser from '../../../../shared/database/elastic/parser/ESJSONParser';
import ESJSONType from '../../../../shared/database/elastic/parser/ESJSONType';
import ESParser from '../../../../shared/database/elastic/parser/ESParser';
import ESParserError from '../../../../shared/database/elastic/parser/ESParserError';
import ESPropertyInfo from '../../../../shared/database/elastic/parser/ESPropertyInfo';
import ESValueInfo from '../../../../shared/database/elastic/parser/ESValueInfo';

import { forAllCards } from '../../../blocks/BlockUtils';
import { Block } from '../../../blocks/types/Block';

import { BuilderStore } from 'builder/data/BuilderStore';

import { toInputMap } from '../../../blocks/types/Input';

import * as Immutable from 'immutable';
import { Card } from '../../../blocks/types/Card';

export default class ESCardParser extends ESParser
{
  public static parseAndUpdateCards(cards: List<Card>): List<Card>
  {
    if (cards.size === 0)
    {
      return cards;
    }
    const rootCard = cards.get(0);
    // assert this is the root card
    if (rootCard['type'] !== 'eqlbody')
    {
      return cards;
    }

    // update the cards
    const updatedRootCard = ESCardParser.updateCardBeforeParsing(rootCard);
    // parsing
    const parsedCard = new ESCardParser(rootCard);
    // interpreting
    const state = BuilderStore.getState();
    let inputs = state.query && state.query.inputs;
    if (inputs === null)
    {
      inputs = Immutable.List([]);
    }
    const params: { [name: string]: any; } = toInputMap(inputs);
    const cardInterpreter = new ESInterpreter(parsedCard, params);
    // update filter card
    const newRootCard = ESCardParser.updateCardErrors(updatedRootCard, parsedCard);
    if (newRootCard === rootCard)
    {
      return cards;
    } else
    {
      return Immutable.List([newRootCard]);
    }
  }

  private static updateCardBeforeParsing(rootCard)
  {
    forAllCards(rootCard, (card: Block, keyPath) =>
    {
      // clear the errors
      if (card.errors && card.errors.size > 0)
      {
        rootCard = rootCard.setIn(keyPath.push('errors'), Immutable.List([]));
      }
      if (card.static.updateCards)
      {
        rootCard = rootCard.setIn(keyPath, card.static.updateCards(rootCard, card, keyPath));
      }
    });
    return rootCard;
  }

  private static updateCardErrors(rootCard, parsedCard: ESCardParser)
  {
    parsedCard.getValueInfo().recursivelyVisit((element: ESValueInfo) =>
    {
      const card: Block = element.card;
      if (!card)
      {
        return true;
      }
      if (element.errors.length > 0)
      {
        const errorsKeyPath = element.cardPath.push('errors');
        let cardErrors = rootCard.getIn(errorsKeyPath);
        for (const e of element.errors)
        {
          cardErrors = cardErrors.push(e.message);
        }
        rootCard = rootCard.setIn(errorsKeyPath, cardErrors);
      }
      return true;
    });
    return rootCard;
  }

  public constructor(rootCard: Block, cardPath: KeyPath = Immutable.List([]))
  {
    super();
    if (!rootCard)
    {
      // empty
      this.accumulateErrorOnValueInfo(null, 'There is no cards.');
    }

    // root card is a ESStructural clause
    try
    {
      this.valueInfo = this.parseCard(rootCard, cardPath);
      this.value = this.valueInfo.value;
    } catch (e)
    {
      this.accumulateErrorOnValueInfo(null, 'Failed to parse cards, message: ' + String(e.message));
    }
  }

  public accumulateError(error: ESParserError): void
  {
    this.errors.push(error);
  }

  private accumulateErrorOnValueInfo(valueInfo: ESValueInfo, message: string, isWarning: boolean = false): void
  {
    this.errors.push(new ESParserError(
      null, valueInfo, message, isWarning),
    );
  }

  private accumulateErrorsOnParser(errors: ESParserError[]): void
  {
    for (const e of errors)
    {
      this.errors.push(e);
    }
  }
  private parseCard(block: Block, blockPath: KeyPath): ESValueInfo
  {
    if (block.static.toValueInfo !== undefined)
    {
      return block.static.toValueInfo(block, blockPath);
    }
    if (block.static.clause === undefined)
    {
      // must be a custom card, ignore it now
      return null;
    }
    switch (block.static.clause.clauseType)
    {
      case ESClauseType.ESAnyClause:
        return this.parseESAnyClause(block, blockPath);
      case ESClauseType.ESArrayClause:
        return this.parseESArrayClause(block, blockPath);
      case ESClauseType.ESBaseClause:
        return this.parseCardValue(block, blockPath);
      case ESClauseType.ESBooleanClause:
        return this.parseCardValue(block, blockPath);
      case ESClauseType.ESEnumClause:
        return this.parseCardValue(block, blockPath);
      case ESClauseType.ESFieldClause:
        return this.parseCardValue(block, blockPath);
      case ESClauseType.ESIndexClause:
        return this.parseCardValue(block, blockPath);
      case ESClauseType.ESMapClause:
        return this.parseESStructureClause(block, blockPath);
      case ESClauseType.ESNullClause:
        return this.parseCardValue(block, blockPath);
      case ESClauseType.ESNumberClause:
        return this.parseCardValue(block, blockPath);
      case ESClauseType.ESObjectClause:
        return this.parseESStructureClause(block, blockPath);
      case ESClauseType.ESPropertyClause:
        return this.parseCardValue(block, blockPath);
      case ESClauseType.ESReferenceClause:
        return this.parseESReferenceClause(block, blockPath);
      case ESClauseType.ESStringClause:
        return this.parseCardValue(block, blockPath);
      case ESClauseType.ESStructureClause:
        return this.parseESStructureClause(block, blockPath);
      case ESClauseType.ESTypeClause:
        return this.parseCardValue(block, blockPath);
      case ESClauseType.ESScriptClause:
        return this.parseESStructureClause(block, blockPath);
      case ESClauseType.ESWildcardStructureClause:
        return this.parseESStructureClause(block, blockPath);
      default:
        return this.parseESClause(block, blockPath);
    }
  }

  private parseESClause(block, blockPath)
  {
    const valueInfo = new ESValueInfo();
    valueInfo.card = block;
    valueInfo.clause = block.static.clause;
    valueInfo.cardPath = blockPath;
    this.accumulateErrorOnValueInfo(valueInfo, String('The card ' + String(block.static.title) + ' has ESClause '));
    return valueInfo;
  }

  private parseESReferenceClause(block, blockPath)
  {
    const valueInfo = new ESValueInfo();
    valueInfo.card = block;
    valueInfo.clause = block.static.clause;
    valueInfo.cardPath = blockPath;
    this.accumulateErrorOnValueInfo(valueInfo, String('The card ' + String(block.static.title) + ' has ESReferenceClause '));
    return valueInfo;
  }

  private parseESAnyClause(block, blockPath)
  {
    const valueInfo = new ESValueInfo();
    valueInfo.card = block;
    valueInfo.clause = block.static.clause;
    valueInfo.cardPath = blockPath;
    this.accumulateErrorOnValueInfo(valueInfo, String('The card ' + String(block.static.title) + ' has ESAnyClause '));
    return valueInfo;
  }

  private parseESArrayClause(block, blockPath)
  {
    const valueInfo = new ESValueInfo();
    valueInfo.card = block;
    valueInfo.clause = block.static.clause;
    valueInfo.cardPath = blockPath;
    const theValue = [];
    valueInfo.card = block;
    valueInfo.jsonType = ESJSONType.array;
    valueInfo.value = theValue;
    block.static.valueInfo = valueInfo;
    const childrenCard = blockPath.push('cards');
    block['cards'].map(
      (card, key) =>
      {
        const elementValueInfo = this.parseCard(card, childrenCard.push(key));
        valueInfo.addArrayChild(elementValueInfo);
        theValue.push(elementValueInfo.value);
      });
    return valueInfo;
  }

  private parseESStructureClause(block, blockPath)
  {
    const valueInfo = new ESValueInfo();
    valueInfo.card = block;
    valueInfo.clause = block.static.clause;
    valueInfo.cardPath = blockPath;
    const theValue = {};
    valueInfo.jsonType = ESJSONType.object;
    valueInfo.value = theValue;
    block.static.valueInfo = valueInfo;
    const childrenCard = blockPath.push('cards');
    block['cards'].map(
      (card, key) =>
      {
        const keyName = card['key'];
        const childName = new ESJSONParser(JSON.stringify(keyName)).getValueInfo();
        childName.card = card;
        childName.cardPath = childrenCard.push(key);
        const childValue = this.parseCard(card, childrenCard.push(key));
        if (childValue !== null)
        {
          const propertyInfo = new ESPropertyInfo(childName, childValue);
          valueInfo.addObjectChild(keyName, propertyInfo);
          theValue[keyName] = childValue.value;
        } else
        {
          // console.log('card ' + keyName + ' has value null');
        }
      },
    );
    return valueInfo;
  }

  private parseCardValue(block, blockPath)
  {
    let value;
    const singleType = block.static.singleType;
    const typeName = block.static.typeName;
    if (block['value'] === '')
    {
      // the input is empty
      value = '""';
    } else if (typeof block['value'] === 'string' && block['value'][0] === '@')
    {
      // the input is a parameter
      value = block['value'];
    } else if (singleType === false)
    {
      // the input is encoded as a string, but its value type can be other JSON types
      value = block['value'];
    } else
    {
      // the input is encoded as its type
      if (typeName === 'string')
      {
        value = JSON.stringify(block['value']);
      } else
      {
        // now, the card value is not guaranteed encoded as string, it may be encoded at its declared type.
        if (typeName === typeof block['value'])
        {
          value = JSON.stringify(block['value']);
        } else if (typeof block['value'] === 'string')
        {
          value = block['value'];
        } else
        {
          // something goes wrong
          value = JSON.stringify(block['value']);
        }
      }
    }
    const parser = new ESJSONParser(value, true);
    let valueInfo = parser.getValueInfo();
    if (valueInfo)
    {
      valueInfo.card = block;
      valueInfo.clause = block.static.clause;
      valueInfo.cardPath = blockPath;
    } else
    {
      valueInfo = new ESValueInfo();
      valueInfo.card = block;
      valueInfo.clause = block.static.clause;
      valueInfo.cardPath = blockPath;
      if (parser.hasError())
      {
        for (const e of parser.getErrors())
        {
          e.valueInfo = valueInfo;
          valueInfo.attachError(e);
        }
      } else
      {
        this.accumulateErrorOnValueInfo(valueInfo, String('The card value ' + block.value + ' is not recognizable.'));
      }
    }

    if (valueInfo.hasError())
    {
      this.accumulateErrorsOnParser(valueInfo.errors);
    }

    return valueInfo;
  }
}
