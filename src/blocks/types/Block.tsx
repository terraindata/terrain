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

// tslint:disable:strict-boolean-expressions max-line-length

import * as _ from 'lodash';

import * as Immutable from 'immutable';
import ESValueInfo from '../../../shared/database/elastic/parser/ESValueInfo';

export type TQLTranslationFn = ((block: Block, tqlConfig: object) => string | object | number | boolean);
export type TQLRecursiveObjectFn = ((block: Block, tqlTranslationFn: TQLTranslationFn, tqlConfig: object) => string | object | number | boolean);
export type TQLStringFn = string | ((block: Block) => string);
export type TQLFn = TQLStringFn | TQLRecursiveObjectFn;

// A Block is a card or a distinct piece / group of card pieces
export interface Block extends IRecord<Block>
{
  id: string;
  type: string;
  _isBlock: boolean;

  // fields not saved on server
  static: {
    language: string;
    tql: TQLFn;
    tqlGlue?: string;
    topTql?: string;
    toValueInfo?: (block: Block, blockPath: KeyPath) => ESValueInfo;
    updateCards?: (rootBlock: Block, block: Block, blockPath: KeyPath) => Block;
    updateView?: (rootBlock: Block, block: Block, blockPath: KeyPath) => Block;
    accepts?: List<string>;

    // remove this block if it contains a card and the card is removed
    //  will not remove field if it is the last in its parents' list
    removeOnCardRemove?: boolean;

    metaFields: string[];

    [field: string]: any;
  };

  [field: string]: any;
}

export interface BlockConfig
{
  static: {
    language: string;
    tql: TQLFn;
    toValueInfo?: (block: Block, blockPath: KeyPath) => ESValueInfo;
    updateCards?: (rootBlock: Block, block: Block, blockPath: KeyPath) => Block;
    updateView?: (rootBlock: Block, block: Block, blockPath: KeyPath) => Block;
    tqlGlue?: string;
    accepts?: List<string>;
    removeOnCardRemove?: boolean;
    metaFields?: string[];
    [field: string]: any;
  };

  [field: string]: any;
}

export const allBlocksMetaFields = ['id'];

const RESERVED_WORDS = ['type', 'size', 'length', 'set', 'setIn', 'get', 'getIn', 'map'];
export const verifyBlockConfigKeys = (config: object) =>
{
  RESERVED_WORDS.map(
    (word) =>
    {
      if (config[word])
      {
        throw new Error('Creating card: ' + word + ' is a reserved word. ' + JSON.stringify(config));
      }
    },
  );
};

// helper function to populate common fields for an Block
export const _block = (config: BlockConfig): Block =>
{
  verifyBlockConfigKeys(config);

  const blockConfig: Block = _.extend({
    id: '',
    type: '',
    _isBlock: true,
  }, config);

  if (blockConfig.static.metaFields)
  {
    blockConfig.static.metaFields = blockConfig.static.metaFields.concat(allBlocksMetaFields);
  }
  else
  {
    blockConfig.static.metaFields = allBlocksMetaFields;
  }

  return blockConfig;
};

export default Block;
