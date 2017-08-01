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

export const ElasticBlockHelpers = {
  fieldsInScope(schemaState): List<string>
  {
    // 1. Need to get current index

    const state = BuilderStore.getState();
    const cards = state.query.cards;
    const isIndexCard = (card) => card['type'] === 'eqlindex';
    const server = BuilderStore.getState().db.name;

    let indexCard = cards.find(isIndexCard);
    if (indexCard === undefined)
    {
      indexCard = cards.get(0);
      if (indexCard !== undefined)
      {
        indexCard = indexCard['cards'].find(isIndexCard);
      }
    }

    if (indexCard !== undefined)
    {
      const index = indexCard['value'];
      const indexId = state.db.name + '/' + String(index);

      // 2. Need to get current type

      const isTypeCard = (card) => card['type'] === 'eqltype';

      let typeCard = cards.find(isTypeCard);
      if (typeCard === undefined)
      {
        typeCard = cards.get(1);
        if (typeCard !== undefined)
        {
          typeCard = typeCard['cards'].find(isTypeCard);
        }
      }

      if (typeCard !== undefined)
      {
        const type = typeCard['value'];
        const typeId = state.db.name + '/' + String(index) + '.' + String(type);

        // 3. Return columns matching this (server+)index+type

        return schemaState.columns.filter(
          (column) => column.serverId === String(server) &&
            column.databaseId === String(indexId) &&
            column.tableId === String(typeId),
        ).map(
          (column) => column.name,
        ).toList();
      }
    }

    return List([]);
  },

  typesInScope(schemaState): List<string>
  {
    const state = BuilderStore.getState();
    const cards = state.query.cards;
    const isIndexCard = (card) => card['type'] === 'eqlindex';

    let indexCard = cards.find(isIndexCard);
    if (indexCard === undefined)
    {
      indexCard = cards.get(0);
      if (indexCard !== undefined)
      {
        indexCard = indexCard['cards'].find(isIndexCard);
      }
    }

    // TODO idea: have the selected index and type stored on the Query object

    if (indexCard !== undefined)
    {
      const index = indexCard['value'];
      const indexId = state.db.name + '/' + String(index);
      return schemaState.tables.filter(
        (table) => table.databaseId === indexId,
      ).map(
        (table) => table.name,
      ).toList();
    }

    return List([]);
  },
};

export default ElasticBlockHelpers;
