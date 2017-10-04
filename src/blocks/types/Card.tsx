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

// tslint:disable:strict-boolean-expressions

import * as _ from 'lodash';
import { Display } from '../displays/Display';
import { allBlocksMetaFields, Block, BlockConfig, TQLFn, verifyBlockConfigKeys } from './Block';

export type InitFn = (blockSpec: { [type: string]: BlockConfig }, extraConfig?: { [key: string]: any }, skipTemplate?: boolean) => {
  [k: string]: any;
};

export interface Card extends IRecord<Card>
{
  id: string;
  type: string;
  _isCard: boolean;
  _isBlock: boolean;
  closed: boolean;
  tuning?: boolean; // whether the card is in the tuning section
  // whether a card in tuning column is collapsed (needs to be sep. from closed)
  tuningClosed?: boolean; // whether a card in tuning column is collapsed (needs to be sep. from closed)

  // the following fields are excluded from the server save
  static: {
    language: string;
    colors: string[];
    title: string;
    display: Display | Display[];
    isAggregate: boolean;

    // the format string used for generating tql
    // - insert the value of a card member by prepending the field's name with $, e.g. "$expression" or "$filters"
    // - arrays/Lists are joined with "," by default
    // - to join List with something else, specify a tqlGlue
    // - to map a value to another string, write the field name in all caps. the value will be passed into "[FieldName]TQL" map in CommonSQL
    //    e.g. "$DIRECTION" will look up "DirectionTQL" in CommonSQL and pass the value into it
    // - topTql is the tql to use if this card is at the top level of a query
    tql: TQLFn;
    tqlGlue?: string;
    topTql?: string;

    anythingAccepts?: boolean;

    // returns an object with default values for a new card
    //  receives the appropriate block spec as an argument, to avoid
    //  a circular dependency
    init?: InitFn;

    // given a card, return the "terms" it generates for autocomplete
    // TODO schemaState type is : SchemaTypes.SchemaState
    getChildTerms?: (card: Card, schemaState) => List<string>;
    getNeighborTerms?: (card: Card, schemaState) => List<string>;
    getParentTerms?: (card: Card, schemaState) => List<string>;
    // returns terms for its parent and its neighbors (but not its parent's neighbors)

    preview: string | ((c: Card) => string);
    // The BlockUtils.getPreview function constructs
    // a preview from a card object based on this string.
    // It replaces anything within [] with the value for that key.
    // If an array of objects, you can specify: [arrayKey.objectKey]
    // and it will map through and join the values with ", ";

    // TODO bring back manualEntry
    // manualEntry: IManualEntry;
    description?: string;

    // a list of which fields on this card are just metadata, e.g. 'closed'
    metaFields: string[];
  };
}

// Every Card definition must follow this interface
export interface CardConfig
{
  [field: string]: any;

  static: {
    language: string;
    colors: string[];
    title: string;
    preview: string | ((c: Card) => string);
    display: Display | Display[];
    isAggregate?: boolean;
    // manualEntry: IManualEntry;
    tql: TQLFn;
    tqlGlue?: string;
    topTql?: string | ((block: Block) => string);
    accepts?: List<string>;
    anythingAccepts?: boolean; // if any card accepts this card

    getChildTerms?: (card: Card, schemaState) => List<string>;
    getNeighborTerms?: (card: Card, schemaState) => List<string>;
    getParentTerms?: (card: Card, schemaState) => List<string>;

    description?: string;

    metaFields?: string[];

    init?: InitFn;
  };
}

export const allCardsMetaFields = allBlocksMetaFields.concat(['closed', 'tuning', 'tuningClosed']);

// helper function to populate random card fields
export const _card = (config: CardConfig) =>
{
  verifyBlockConfigKeys(config);

  config = _.extend(config, {
    id: '',
    _isCard: true,
    _isBlock: true,
    closed: false,
    tuning: false,
    tuningClosed: false,
  });

  if (config.static.metaFields)
  {
    config.static.metaFields = config.static.metaFields.concat(allCardsMetaFields);
  }
  else
  {
    config.static.metaFields = allCardsMetaFields;
  }

  return config;
};

export type Cards = List<Card>;
export type CardString = string | Card;

export default Card;
