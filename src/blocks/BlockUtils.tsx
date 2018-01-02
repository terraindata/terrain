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

// tslint:disable:forin no-shadowed-variable strict-boolean-expressions restrict-plus-operands no-unused-expression no-console

import * as Immutable from 'immutable';
import * as _ from 'lodash';
const { Map, List } = Immutable;

import { Block, BlockConfig } from './types/Block';
import { Card, Cards } from './types/Card';

import { DisplayType } from './displays/Display';

// import { AllBackendsMap } from '../database/AllBackends';

export function getChildIds(_block: Block): IMMap<ID, boolean>
{
  let map = Map<ID, boolean>({});

  if (Immutable.Iterable.isIterable(_block))
  {
    const block = _block.toMap();
    if (block.get('id'))
    {
      map = map.set(block.get('id'), true);
    }
    block.map((value) => map = map.merge(getChildIds(value)));
  }

  return map;
}

export function forAllCards(
  block: Block | List<Block>,
  fn: (card: Card, keyPath: KeyPath) => void,
)
{
  forAllBlocks(
    block,
    (block: Block, keyPath: KeyPath) =>
    {
      if (block['_isCard'])
      {
        fn(block as any, keyPath);
      }
    },
  );
}

export function forAllBlocks(
  block: Block | List<Block>,
  fn: (block: Block, keyPath: KeyPath) => void,
  keyPath: KeyPath = List([]),
  stopAtFirstBlock?: boolean,
  excludeWrappedCards?: boolean,
)
{
  if (block)
  {
    if (block['_isBlock'])
    {
      fn(block as Block, keyPath);
    }
    if (
      Immutable.Iterable.isIterable(block)
      && (!stopAtFirstBlock || !block['_isBlock'] || !keyPath.size)
    )
    {
      (block.toMap() as any).map(
        (b, key) =>
        {
          if (!excludeWrappedCards || key !== 'cards')
          {
            forAllBlocks(
              b as Block,
              fn,
              keyPath.push(key),
              stopAtFirstBlock,
              excludeWrappedCards,
            );
          }
        },
      );
    }
  }
}

export function transformAlias(transformCard: Card): string
{
  if (typeof transformCard['input'] === 'string')
  {
    return transformCard['input'];
  }
  else
  {
    return 'transform' + transformCard.id.replace(/[^a-zA-Z0-9]/g, '');
  }
}

// This creates a new instance of a card / block
// Usage: BlockUtils.make(MySQLBlocks, 'sort')
export const make = (blocksConfig: { [type: string]: BlockConfig },
  blockType: string, extraConfig?: { [key: string]: any }, skipTemplate?: boolean) =>
{
  let block = blocksConfig[blockType];
  if (!block)
  {
    console.log(blocksConfig, blockType, extraConfig);
    throw new Error('Unable to find block type ' + blockType);
  }

  const { type } = block;

  block = _.extend({}, block); // shallow clone

  if (block.static.init)
  {
    block = _.extend({}, block, block.static.init(blocksConfig, extraConfig, skipTemplate));
  }

  if (extraConfig)
  {
    block = _.extend(block, extraConfig);
  }

  if (block.static)
  {
    delete block.static;
  }

  if (!block.id || !block.id.length)
  {
    block.id = 'block-' + Math.random();
  }

  let theBlock = blockTypeToBlockRecord[block.type](block);
  if (theBlock.static)
  {
    theBlock = theBlock.set('static', _.cloneDeep(theBlock.static));
  }
  if (skipTemplate !== true && theBlock.static.epilogueInit)
  {
    theBlock = theBlock.static.epilogueInit(theBlock);
  }
  return theBlock;
};

// private, maps a type (string) to the backing Immutable Record
// types are added when initBlocks is called
const blockTypeToBlockRecord: any = {};

// Given a plain JS object, construct the Record for it and its children
export const recordFromJS = (value: any, Blocks: { [type: string]: BlockConfig }) =>
{
  if (value && value.static && Immutable.Iterable.isIterable(value))
  {
    // already a block / record
    // change to a better way of checking if you can think of one
    return value;
  }

  if (Array.isArray(value) || typeof value === 'object')
  {
    if (Immutable.Iterable.isIterable(value))
    {
      value = value.map((v) => recordFromJS(v, Blocks));
    }
    else
    {
      value = _.reduce(value, (memo, v, key) =>
      {
        memo[key] = recordFromJS(v, Blocks);
        return memo;
      }, Array.isArray(value) ? [] : {});
    }

    const type = value.type || (typeof value.get === 'function' && value.get('type'));
    if (type && Blocks[type])
    {
      value = make(Blocks, type, value, true);
    }
    else
    {
      value = Immutable.fromJS(value);
    }
  }

  return value;
};

// Prepare cards/records for save, trimming static values
export const cardsForServer = (value: any) =>
{
  if (Immutable.Iterable.isIterable(value))
  {
    value = value.toJS();
  }

  if (value && value.static)
  {
    delete value.static;
    // because .static is deleted, we should reset other related fields
    if (value.keyDisplayType)
    {
      value.keyDisplayType = DisplayType.TEXT;
    }
  }

  if (Array.isArray(value))
  {
    value.map(cardsForServer);
  }
  else if (typeof value === 'object')
  {
    for (const i in value)
    {
      cardsForServer(value[i]);
    }
  }
  return value;
};

// returns preview for a given card
export function getPreview(card: Card): string
{
  if (!card)
  {
    return '';
  }

  if (!card.static)
  {
    if (typeof card === 'string' || typeof card === 'number')
    {
      return card + '';
    }

    try
    {
      return JSON.stringify(card);
    } catch (e)
    {
      return 'No preview';
    }
  }

  const { preview } = card.static;
  if (typeof preview === 'string')
  {
    return preview.replace(/\[[a-z\.]*\]/g, (str) =>
    {
      const pattern = str.substr(1, str.length - 2);
      const keys = pattern.split('.');
      if (keys.length === 1)
      {
        const value = card[keys[0]];
        if (value && value['_isCard'])
        {
          return getPreview(value);
        }
        return value; // add key of card so key: value is preview
      }
      if (keys[1] === 'length' || keys[1] === 'size')
      {
        return card[keys[0]].size;
      }
      return card[keys[0]].toArray().map(
        (v) =>
          getPreview(v[keys[1]]),
      ).join(', ');
    });
  }
  else if (typeof preview === 'function')
  {
    return preview(card);
  }
  return 'No preview';
}

// Must be called on the Blocks def for each language
// Used to add types to the Blocks and add them to the typeToRecord config
//  if you can think of a better way to do this, be my guest.
export function initBlocks(Blocks)
{
  _.map(
    Blocks as ({ [card: string]: any }),
    (v, i) =>
    {
      // Set the "type" field for all blocks equal to its key
      Blocks[i].type = i;
      // finally, add Blocks to the blockTypeToBlockRecord map
      blockTypeToBlockRecord[i] = Immutable.Record(Blocks[i]);
    },
  );
}

// given an existing list of cards and a new list to update to,
//  reconcile the two into a new list that maintains as many of the
//  card references from the current list as possible, while applying
//  the structure of the new list
export function reconcileCards(currentCards: Cards, newCards: Cards): Cards
{
  let currentCardIndex = 0;
  return newCards.map(
    (card, index) =>
    {
      // search for a card of the same type
      let tempIndex = currentCardIndex;
      while (
        tempIndex < currentCards.size &&
        currentCards.get(tempIndex).type !== card.type
      )
      {
        tempIndex++;
      }

      if (tempIndex !== currentCards.size)
      {
        // found a matching card, assign the id and meta fields, and update currentCardIndex
        const currentCard = currentCards.get(tempIndex) as Card;
        currentCardIndex = tempIndex + 1;
        return reconcileBlock(currentCard, card) as Card;

      }
      // else, no matching card found, move on
      return card;
    },
  ).toList();
}

export function reconcileBlock(currentBlock: Block, newBlock: Block): Block
{
  if (!currentBlock || currentBlock.type !== newBlock.type)
  {
    return newBlock;
  }

  let block = newBlock;

  block.static.metaFields && block.static.metaFields.map(
    (metaField) =>
      block = block.set(metaField, currentBlock[metaField]),
  );

  if (block['cards'])
  {
    block = block.set('cards',
      reconcileCards(currentBlock['cards'], block['cards']),
    );
  }

  forAllBlocks(
    block,
    (childBlock, keyPath) =>
    {
      const currentChildBlock = currentBlock.getIn(keyPath);
      if (keyPath.size && currentChildBlock)
      {
        block = block.setIn(keyPath, reconcileBlock(currentChildBlock, childBlock));
      }
    },
    List([]),
    true,
    true,
  );

  return block;
}

// export const findBlock =
//   (blocks: List<Block>, predicate: (block: Block) => boolean) =>
//   {
//     return blocks.reduce(
//       (memo, block) =>
//       {
//         if (memo)
//         {
//           return memo;
//         }

//         if (predicate(block))
//         {
//           return block;
//         }
//       });
//   };
