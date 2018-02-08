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

import { BuilderState } from 'builder/data/BuilderState';
import { SchemaState } from 'schema/SchemaTypes';
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
    'date',
  ];

export const ElasticBlockHelpers = {
  getColumnType(schemaState: SchemaState, builderState: BuilderState, column: string): string
  {
    const serverName = builderState.db.name;
    const index = getIndex('', builderState);
    const type = getType('', builderState);

    const key = serverName + '/' + String(index) + '.' + String(type) + '.c.' + column;
    if (schemaState.columns instanceof Map)
    {
      const col = schemaState.columns.get(key);
      if (col === undefined)
      {
        return undefined;
      }
      return col.get('datatype');
    }
    else
    {
      const col = schemaState.columns[key];
      if (col === undefined)
      {
        return undefined;
      }
      return col.datatype;
    }
  },

  autocompleteMatches(schemaState, builderState, matchType: AutocompleteMatchType): List<string>
  {
    // 1. Need to get current index

    const cards = builderState.query.cards;
    const index = getIndex('', builderState);
    const server = builderState.db.name;

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
      const indexId = `${builderState.db.name}/${index}`;

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
      const type = getType('', builderState);

      // 3. If Transform, return columns matching server/index/type that can be transformed
      if (matchType === AutocompleteMatchType.Transform)
      {
        if (type !== null)
        {
          const typeId = `${builderState.db.name}/${index}.${type}`;
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
        const typeId = `${builderState.db.name}/${index}.${type}`;

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

export function findCardType(name: string, builderState: BuilderState): List<Block>
{
  let theCards = List([]);
  forAllCards(builderState.query.cards, (card) =>
  {
    if (card.type === name)
    {
      theCards = theCards.push(card);
    }
  });
  return theCards;
}

export function getIndex(notSetIndex: string = null, builderState: BuilderState): string | List<string> | null
{
  const cards = findCardType('elasticFilter', builderState);
  if (cards.size === 0)
  {
    return notSetIndex;
  }
  else if (cards.size === 1)
  {
    const c = cards.get(0);
    if (c['currentIndex'] === '')
    {
      return notSetIndex;
    }
    return c['currentIndex'];
  }
  // multiple filter cards, return all possible indexes
  let indexes = List([]);
  cards.forEach((c) =>
  {
    if (c['currentIndex'] !== '')
    {
      indexes = indexes.push(c['currentIndex']);
    }
  });
  // If no indexes, return not set. If one, return as string. Otherwise return list
  return (indexes.size === 0) ? notSetIndex : (indexes.size === 1) ? indexes.get(0) : indexes;
}

export function getType(notSetType: string = null, builderState: BuilderState): string | List<string> | null
{
  const cards = findCardType('elasticFilter', builderState);
  if (cards.size === 0)
  {
    return notSetType;
  }
  else if (cards.size === 1)
  {
    const c = cards.get(0);
    if (c['currentType'] === '')
    {
      return notSetType;
    }
    return c['currentType'];
  }
  // multiple filter cards, return all possible indexes
  let types = List([]);
  cards.forEach((c) =>
  {
    if (c['currentType'] !== '')
    {
      types = types.push(c['currentType']);
    }
  });
  // If no types, return not set. If one, return as string. Otherwise return list
  return (types.size === 0) ? notSetType : (types.size === 1) ? types.get(0) : types;
}

export default ElasticBlockHelpers;
