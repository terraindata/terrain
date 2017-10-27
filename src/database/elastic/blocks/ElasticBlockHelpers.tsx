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

import * as Immutable from 'immutable';
const { Map, List } = Immutable;
import { BuilderStore } from '../../../app/builder/data/BuilderStore';

import { forAllCards } from '../../../blocks/BlockUtils';
import { Block } from '../../../blocks/types/Block';

export const enum AutocompleteMatchType
{
  Index = 1,
  Type = 2,
  Field = 3,
  Transform = 4,
}

export const TransformableTypes =
  [
    'long',
    'double',
    'short',
    'byte',
    'integer',
    'half_float',
    'float',
  ];

export const ElasticBlockHelpers = {
  autocompleteMatches(schemaState, matchType: AutocompleteMatchType): List<string>
  {
    // 1. Need to get current index

    const state = BuilderStore.getState();
    const cards = state.query.cards;
    const index = getIndex();
    const server = BuilderStore.getState().db.name;

    if (matchType === AutocompleteMatchType.Index)
    {
      return schemaState.databases.toList().filter(
        (db) => db.serverId === server,
      ).map(
        (db) => db.name,
      ).toList();
    }

    const metaFields = ['_index', '_type', '_uid', '_id',
      '_source', '_size',
      '_all', '_field_names',
      '_parent', '_routing',
      '_meta'];

    if (index !== null)
    {
      const indexId = state.db.name + '/' + String(index);

      if (matchType === AutocompleteMatchType.Type)
      {
        return schemaState.tables.filter(
          (table) => table.databaseId === indexId,
        ).map(
          (table) => table.name,
        ).toList();
      }

      // else we are in the Field or Transform case...

      // 2. Need to get current type
      const type = getType();

      // 3. If Transform, return columns matching server/index/type that can be transformed
      if (matchType === AutocompleteMatchType.Transform)
      {
        if (type !== null)
        {
          const typeId = state.db.name + '/' + String(index) + '.' + String(type);
          const transformableFields = schemaState.columns.filter(
            (column) => column.serverId === String(server) &&
              column.databaseId === String(indexId) &&
              column.tableId === String(typeId) &&
              TransformableTypes.indexOf(column.datatype) !== -1,
          ).map(
            (column) => column.name,
          ).toList().concat(List(['_score', '_size']));
          return transformableFields;
        }
        return List(['_score', '_size']);
      }

      if (type !== null)
      {
        const typeId = state.db.name + '/' + String(index) + '.' + String(type);

        // 4. Return all columns matching this (server+)index+type

        return schemaState.columns.filter(
          (column) => column.serverId === String(server) &&
            column.databaseId === String(indexId) &&
            column.tableId === String(typeId),
        ).map(
          (column) => column.name,
        ).toList().concat(List(metaFields));
      }
    }

    return List(metaFields);
  },
};

export function findCardType(name: string): Block | null
{
  const state = BuilderStore.getState();
  let theCard = null;
  forAllCards(state.query.cards, (card) =>
  {
    if (card.type === name)
    {
      theCard = card;
    }
  });
  return theCard;
}

export function getIndex(notSetIndex: string = null): string | null
{
  const c = findCardType('elasticFilter');
  if (c === null)
  {
    return notSetIndex;
  } else
  {
    if (c['currentIndex'] === '')
    {
      return notSetIndex;
    }
    return c['currentIndex'];
  }
}

export function getType(notSetType: string = null): string | null
{
  const c = findCardType('elasticFilter');
  if (c === null)
  {
    return notSetType;
  } else
  {
    if (c['currentType'] === '')
    {
      return notSetType;
    }
    return c['currentType'];
  }
}

export default ElasticBlockHelpers;
