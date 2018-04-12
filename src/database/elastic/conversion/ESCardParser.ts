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

// tslint:disable:restrict-plus-operands strict-boolean-expressions no-console

import ESClauseType from '../../../../shared/database/elastic/parser/ESClauseType';
import ESInterpreter, { ESInterpreterDefaultConfig } from '../../../../shared/database/elastic/parser/ESInterpreter';
import ESJSONParser from '../../../../shared/database/elastic/parser/ESJSONParser';
import ESJSONType from '../../../../shared/database/elastic/parser/ESJSONType';
import ESParser from '../../../../shared/database/elastic/parser/ESParser';
import ESParserError from '../../../../shared/database/elastic/parser/ESParserError';
import ESPropertyInfo from '../../../../shared/database/elastic/parser/ESPropertyInfo';
import ESValueInfo from '../../../../shared/database/elastic/parser/ESValueInfo';

import { forAllCards } from '../../../blocks/BlockUtils';
import * as BlockUtils from '../../../blocks/BlockUtils';
import { Block } from '../../../blocks/types/Block';

import { toInputMap } from '../../../blocks/types/Input';

import { default as GetCardVisitor, KEY_DISPLAY, STATIC_KEY_DISPLAY } from 'builder/getCard/GetCardVisitor';
import * as Immutable from 'immutable';
import ESStructureClause from '../../../../shared/database/elastic/parser/clauses/ESStructureClause';
import { DisplayType } from '../../../blocks/displays/Display';
import { Card } from '../../../blocks/types/Card';

import { List } from 'immutable';
import * as _ from 'lodash';
import Util from 'util/Util';
import ESArrayClause from '../../../../shared/database/elastic/parser/clauses/ESArrayClause';
import ElasticBlocks from '../blocks/ElasticBlocks';

import * as TerrainLog from 'loglevel';
import ESWildcardStructureClause from '../../../../shared/database/elastic/parser/clauses/ESWildcardStructureClause';

export default class ESCardParser extends ESParser
{
  public static parseAndUpdateCards(cards: List<Card>, query): List<Card>
  {
    if (cards.size === 0)
    {
      return cards;
    }
    const rootCard = cards.get(0);
    // assert this is the root card
    if (rootCard['type'] !== 'eqlbody')
    {
      return Immutable.List([]);
    }

    // update the cards
    const updatedRootCard = ESCardParser.updateCardBeforeParsing(rootCard);
    // parsing
    const parsedCard = new ESCardParser(updatedRootCard);
    // interpreting
    let inputs = query && query.inputs;
    if (inputs === null)
    {
      inputs = Immutable.List([]);
    }
    const params: { [name: string]: any; } = toInputMap(inputs);
    const cardInterpreter = new ESInterpreter(parsedCard, params);
    // update filter card
    const newRootCard = ESCardParser.updateCardAfterParsing(updatedRootCard, parsedCard);
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

  private static updateCardErrors(element: ESValueInfo, rootCard)
  {
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
    return rootCard;
  }

  private static getStaticKeyDisplay(key: string)
  {
    const display = _.extend({}, _.cloneDeep(STATIC_KEY_DISPLAY), { label: key });
    // if the key is too long, we have to increase the size
    if (key.length * (display.style.fontSize as number) > display.style.width)
    {
      display.style.width = key.length * (display.style.fontSize as number);
    }
    return display;
  }

  private static labelCardKey(rootCard, card, cardPath)
  {
    const display = card.static.display;
    if (Array.isArray(display))
    {
      display.map((d, i) =>
      {
        if (d.key === 'key')
        {
          if (d.displayType !== DisplayType.LABEL)
          {
            display[i] = ESCardParser.getStaticKeyDisplay(card.key);
          }
        }
      });
    } else
    {
      if (display.key === 'key')
      {
        if (display.displayType !== DisplayType.LABEL)
        {
          card.static.display = ESCardParser.getStaticKeyDisplay(card.key);
        }
      } else
      {
        if (display.displayType === DisplayType.FLEX)
        {
          display.flex.map((d, i) =>
          {
            if (d.key === 'key')
            {
              if (d.displayType !== DisplayType.LABEL)
              {
                display.flex[i] = ESCardParser.getStaticKeyDisplay(card.key);
              }
            }
          });
        }
      }
    }
    return rootCard.setIn(cardPath.push('keyDisplayType'), DisplayType.LABEL);
  }

  private static updateRootCardKey(element: ESValueInfo, rootCard: Block)
  {
    // label the root card
    if ((rootCard as Card).keyDisplayType !== DisplayType.LABEL)
    {
      rootCard = ESCardParser.labelCardKey(rootCard, rootCard, element.cardPath);
    }

    // label children
    return this.updateCardKey(element, rootCard);
  }

  private static updateCardKey(element: ESValueInfo, rootCard)
  {
    if (element.clause instanceof ESStructureClause &&
      (element.clause instanceof ESWildcardStructureClause) === false)
    {
      const card = element.card;
      card.cards.map((childCard, i) =>
      {
        if (childCard._isCard === true)
        {
          if (childCard.keyDisplayType !== DisplayType.LABEL)
          {
            rootCard = ESCardParser.labelCardKey(rootCard, childCard, element.cardPath.push('cards', i));
          }
        }
      });
    }
    return rootCard;
  }

  private static updateCardAfterParsing(rootCard, parsedCard: ESCardParser)
  {
    const valueInfo = parsedCard.getValueInfo();
    if (valueInfo)
    {
      valueInfo.recursivelyVisit((element: ESValueInfo) =>
      {
        const card = element.card;
        if (!card)
        {
          return true;
        }
        rootCard = ESCardParser.updateCardErrors(element, rootCard);
        rootCard = ESCardParser.updateRootCardKey(element, rootCard);
        return true;
      });
    }
    return rootCard;
  }

  public isMutated: boolean;

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

    this.isMutated = false;
  }

  public accumulateError(error: ESParserError): void
  {
    this.errors.push(error);
  }

  public linkCard(cardValueInfo: ESValueInfo)
  {
    let cards;
    let newValue;
    switch (cardValueInfo.jsonType)
    {
      case ESJSONType.array:
        cards = [];
        newValue = [];
        cardValueInfo.forEachElement((element: ESValueInfo) =>
        {
          cards.push(element.card);
          newValue.push(element.value);
        });
        cardValueInfo.card = cardValueInfo.card.set('cards', List(cards));
        cardValueInfo.value = newValue;
        return;
      case ESJSONType.object:
        cards = [];
        newValue = {};
        cardValueInfo.forEachProperty((element: ESPropertyInfo) =>
        {
          cards.push(element.propertyValue.card);
          newValue[element.propertyName.value] = element.propertyValue.value;
        });
        cardValueInfo.card = cardValueInfo.card.set('cards', List(cards));
        cardValueInfo.value = newValue;
        break;
      default:
        return;
    }
  }

  // generate a new root card from the valueInfo
  public updateCard(): Card
  {
    this.valueInfo.recursivelyVisit((element) => true, this.linkCard);
    return this.valueInfo.card;
  }

  // delete the children object or array element
  // NOTE: the deleted array element will be replaced with undefined
  public deleteChild(parent: ESValueInfo, index: string | number)
  {
    if (typeof index === 'string')
    {
      if (parent.objectChildren[index] !== undefined)
      {
        delete parent.objectChildren[index];
        this.isMutated = true;
      }
    } else
    {
      if (parent.arrayChildren[index] !== undefined)
      {
        delete parent.arrayChildren[index];
        this.isMutated = true;
      }
    }
  }

  public updateChild(parent: ESValueInfo, index: string | number, newChild: ESValueInfo | ESPropertyInfo)
  {
    this.deleteChild(parent, index);
    this.addChild(parent, index, newChild);
  }

  public addChild(parent: ESValueInfo, index: string | number, newChild: ESValueInfo | ESPropertyInfo)
  {
    if (typeof index === 'string')
    {
      if (parent.objectChildren[index] === undefined)
      {
        if (newChild instanceof ESPropertyInfo)
        {
          parent.addObjectChild(index, newChild);
          this.isMutated = true;
        } else if (newChild instanceof ESValueInfo)
        {
          // we have to create a ESPropertyInfo
          const childName = new ESJSONParser(JSON.stringify(index)).getValueInfo();
          childName.card = newChild.card;
          childName.clause = ESInterpreterDefaultConfig.getClause('string');
          const propertyInfo = new ESPropertyInfo(childName, newChild);
          parent.addObjectChild(index, propertyInfo);
          this.isMutated = true;
        }
      }
    } else
    {
      if (parent.arrayChildren[index] === undefined)
      {
        parent.addArrayChild(newChild as ESValueInfo, index);
        this.isMutated = true;
      }
    }
  }

  /**
   *
   * @param template: the template of creating a card
   * @param {ESValueInfo} valueInfo: where we start to search/create the card
   */
  public createCardIfNotExist(template, valueInfo = this.getValueInfo())
  {
    TerrainLog.debug('CardParser: search/create ' + JSON.stringify(template) + ' from ' + JSON.stringify(valueInfo.value));
    switch (valueInfo.jsonType)
    {
      case ESJSONType.object:
        if (typeof template !== 'object')
        {
          return null;
        }
        for (const k of Object.keys(template))
        {
          const q = k.split(':');
          if (q.length !== 2)
          {
            return null;
          }
          const cardKey = q[0];
          const cardType = GetCardVisitor.getCardType(q[1]);
          // now try to search { "index:cardType": {}}
          const newVal = valueInfo.objectChildren[cardKey];
          if (newVal)
          {
            // if both the key and
            if (newVal.propertyValue.card.type === cardType)
            {
              // keep searching
              const nextLevel = this.createCardIfNotExist(template[k], newVal.propertyValue);
            }
          } else
          {
            // create the card
            const cardTemplate = { [k]: template[k] };
            TerrainLog.debug('CardParser: Create Child Card with template ' + JSON.stringify(cardTemplate));
            const newCard = BlockUtils.make(ElasticBlocks, cardType, { key: cardKey, template: template[k] });
            const newCardParser = new ESCardParser(newCard);
            if (newCardParser.hasError())
            {
              return null;
            }
            this.addChild(valueInfo, cardKey, newCardParser.getValueInfo());
            // install the new card to the valueInfo
          }
        }
        return;
      case ESJSONType.array:
        console.assert(Array.isArray(template));
        for (const t of template)
        {
          let searchingTemplate;
          let searchKey;
          if (typeof t === 'string')
          {
            searchingTemplate = t;
          } else
          {
            console.assert(typeof t === 'object');
            if (Object.keys(t).length === 0)
            {
              continue;
            }
            searchKey = Object.keys(t)[0];
            searchingTemplate = { [searchKey]: true };
          }
          const hitChild = this.searchCard([searchingTemplate], valueInfo);
          if (hitChild === null)
          {
            // create the card
            const cardTemplate = t;
            TerrainLog.debug('CardParser: Create Array Card with template ' + JSON.stringify(cardTemplate));
            const cardType = GetCardVisitor.getCardType((valueInfo.clause as ESArrayClause).elementID);
            const newCard = BlockUtils.make(ElasticBlocks, cardType, { key: valueInfo.arrayChildren.length, template: cardTemplate });
            const newCardParser = new ESCardParser(newCard);
            if (newCardParser.hasError())
            {
              return null;
            }
            this.addChild(valueInfo, valueInfo.arrayChildren.length, newCardParser.getValueInfo());
          } else
          {
            // keep searching
            if (typeof t === 'object')
            {
              this.createCardIfNotExist(t[searchKey], hitChild);
            }
          }
        }
        return;

      default:
        return;
    }
  }

  public searchCard(pattern, valueInfo = this.getValueInfo(), returnLastMatched: boolean = false, returnAll: boolean = false)
  {
    TerrainLog.debug('search ' + JSON.stringify(pattern) + ' from ' + JSON.stringify(valueInfo.value));
    switch (valueInfo.jsonType)
    {
      case ESJSONType.object:
        if (typeof pattern !== 'object')
        {
          return null;
        }
        if (Object.keys(pattern).length !== 1)
        {
          return null;
        }
        const k = Object.keys(pattern)[0];
        const q = k.split(':');
        if (q.length !== 2)
        {
          return null;
        }
        // now try to search { "index:cardType": {}}
        const cardKey = q[0];
        const cardTypeName = GetCardVisitor.getCardType(q[1]);
        const newVal = valueInfo.objectChildren[cardKey];
        if (newVal)
        {
          if (newVal.propertyValue.card.type === cardTypeName)
          {
            if (pattern[k] === true)
            {
              if (returnAll === false)
              {
                return newVal.propertyValue;
              } else
              {
                return [newVal.propertyValue];
              }
            }
            // keep searching
            const nextLevel = this.searchCard(pattern[k], newVal.propertyValue, returnLastMatched, returnAll);
            if (nextLevel === null && returnLastMatched === true)
            {
              if (returnAll === false)
              {
                return newVal.propertyValue;
              } else
              {
                return [newVal.propertyValue];
              }
            }
            return nextLevel;
          } else
          {
            TerrainLog.debug('SearchCard: cardkey ' + cardKey + ' is found, but type is ' + newVal.propertyValue.card.type);
            return null;
          }
        } else
        {
          return null;
        }
      case ESJSONType.array:
        let hits = [];
        for (const element of valueInfo.arrayChildren)
        {
          const v = this.searchCard(pattern[0], element, returnLastMatched, returnAll);
          if (v != null)
          {
            if (returnAll === false)
            {
              return v;
            } else
            {
              hits = hits.concat(v);
            }
          }
        }
        if (hits.length > 0)
        {
          return hits;
        }
        return null;
      default:
        if (typeof pattern === 'object' || Array.isArray(pattern))
        {
          return null;
        }
        if (valueInfo.card.value === pattern)
        {
          if (returnAll === false)
          {
            return valueInfo;
          } else
          {
            return [valueInfo];
          }
        }
        return null;
    }
  }

  public parseCard(block: Block, blockPath: KeyPath): ESValueInfo
  {
    if (block.static.toValueInfo !== undefined)
    {
      return block.static.toValueInfo(block, blockPath);
    }
    if (block.static.clause === undefined)
    {
      // must be a custom card, ignore it now
      if (block.key === 'geo_distance')
      {
        const valueInfo = new ESValueInfo();
        valueInfo.card = block;
        valueInfo.card.cards = List([]);
        valueInfo.clause = block.static.clause;
        valueInfo.cardPath = blockPath;
        const { distance, distanceUnit, distanceType, locationValue, mapInputValue, field } = valueInfo.card;
        valueInfo.value = {
          distance: String(distance) + distanceUnit,
          distance_type: distanceType,
          [field]: locationValue,
        };
        return valueInfo;
      }
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
        return this.parseESMapClause(block, blockPath);
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
        return this.parseESWildcardStructureClause(block, blockPath);
      default:
        return this.parseESClause(block, blockPath);
    }
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

  private parseESWildcardClause(block, blockPath)
  {
    const valueInfo = new ESValueInfo();
    valueInfo.card = block;
    valueInfo.clause = block.static.clause;
    valueInfo.cardPath = blockPath;
    const theValue = {};
    valueInfo.jsonType = ESJSONType.object;
    valueInfo.value = theValue;
    const childrenCard = blockPath.push('cards');
    block['cards'].map(
      (card, key) =>
      {
        const keyName = card['key'];
        const childName = new ESJSONParser(JSON.stringify(keyName)).getValueInfo();
        childName.card = card;
        childName.cardPath = childrenCard.push(key);

        if (block.static.clause.structure.hasOwnProperty(childName))
        {
          childName.clause = ESInterpreterDefaultConfig.getClause('string');
        } else
        {
          childName.clause = ESInterpreterDefaultConfig.getClause(block.static.clause.nameType);
        }
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

  private parseESMapClause(block, blockPath)
  {
    const valueInfo = new ESValueInfo();
    valueInfo.card = block;
    valueInfo.clause = block.static.clause;
    valueInfo.cardPath = blockPath;
    const theValue = {};
    valueInfo.jsonType = ESJSONType.object;
    valueInfo.value = theValue;
    const childrenCard = blockPath.push('cards');
    block['cards'].map(
      (card, key) =>
      {
        const keyName = card['key'];
        const childName = new ESJSONParser(JSON.stringify(keyName)).getValueInfo();
        childName.card = card;
        childName.cardPath = childrenCard.push(key);
        childName.clause = ESInterpreterDefaultConfig.getClause(block.static.clause.nameType);
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

  private parseESWildcardStructureClause(block, blockPath)
  {
    const valueInfo = new ESValueInfo();
    valueInfo.card = block;
    valueInfo.clause = block.static.clause;
    valueInfo.cardPath = blockPath;
    const theValue = {};
    valueInfo.jsonType = ESJSONType.object;
    valueInfo.value = theValue;
    const childrenCard = blockPath.push('cards');
    block['cards'].map(
      (card, key) =>
      {
        const keyName = card['key'];
        const childName = new ESJSONParser(JSON.stringify(keyName)).getValueInfo();
        childName.card = card;
        childName.cardPath = childrenCard.push(key);
        childName.clause = ESInterpreterDefaultConfig.getClause('string');
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

  private parseESStructureClause(block, blockPath)
  {
    const valueInfo = new ESValueInfo();
    valueInfo.card = block;
    valueInfo.clause = block.static.clause;
    valueInfo.cardPath = blockPath;
    const theValue = {};
    valueInfo.jsonType = ESJSONType.object;
    valueInfo.value = theValue;
    const childrenCard = blockPath.push('cards');
    block['cards'].map(
      (card, key) =>
      {
        const keyName = card['key'];
        const childName = new ESJSONParser(JSON.stringify(keyName)).getValueInfo();
        childName.card = card;
        childName.cardPath = childrenCard.push(key);
        childName.clause = ESInterpreterDefaultConfig.getClause('string');
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
    if (block['value'] === null)
    {
      value = 'null';
    } else if (block['value'] === '')
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
