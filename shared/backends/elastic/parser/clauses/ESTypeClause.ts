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

import { List } from 'immutable';
import BuilderStore from '../../../../../src/app/builder/data/BuilderStore';
import { DisplayType } from '../../../../blocks/displays/Display';
import ESClauseType from '../ESClauseType';
import ESStringClause from './ESStringClause';

/**
 * A clause which is a field name (column name)
 */
export default class ESTypeClause extends ESStringClause
{
  public constructor(type: string, settings: any)
  {
    super(type, settings, ESClauseType.ESTypeClause);
  }

  // TODO: add field validation here

  public getCard()
  {
    return this.seedCard({
      value: this.template || '',
      static: {
        preview: '[value]',
        display: {
          displayType: DisplayType.TEXT,
          key: 'value',
          getAutoTerms: (comp: React.Component<any, any>, schemaState): List<string> =>
          {
            const state = BuilderStore.getState();
            const cards = state.query.cards;
            const isIndexCard = (card) => card['type'] === 'eqlindex';
            const indexCard = cards.find(isIndexCard) ||
              (
                cards.get(0) && cards.get(0)['cards'].find(isIndexCard)
              );
            // TODO idea: have the selected index and type stored on the Query object

            if (indexCard)
            {
              const index = indexCard['value'];
              const indexId = state.db.name + '/' + index;
              return schemaState.tables.filter(
                (table) => table.databaseId === indexId,
              ).map(
                (table) => table.name,
                ).toList();
            }

            return emptyList;
          },
        },
        tql: (stringBlock) => stringBlock['value'],
      },
    });
  }
}

const emptyList = List([]);
