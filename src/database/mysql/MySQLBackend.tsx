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

// tslint:disable:member-ordering member-access no-var-requires strict-boolean-expressions

import * as Immutable from 'immutable';
import { make } from '../../blocks/BlockUtils';
import { Query } from '../../items/types/Query';
import { Backend, cardsDeckToList } from '../types/Backend';
import MySQLBlocks from './blocks/MySQLBlocks';
import MySQLCardsDeck from './blocks/MySQLCardsDeck';
import CardsToSQL from './conversion/CardsToSQL';
import SQLToCards from './conversion/SQLToCards';
const syntaxConfig = require('../../../shared/database/mysql/syntax/SQLSyntaxConfig.json');

export class MySQLBackend implements Backend
{
  public static loadingQuery(query: Query, queryReady: (query: Query) => void): Query
  {
    // legacy mysql model
    if (!query.cardsAndCodeInSync)
    {
      if (query.tql)
      {
        query = SQLToCards(
          query,
          queryReady,
        );
      }
      else
      {
        // blank
        query = query
          .set('cardsAndCodeInSync', true);
      }
    }
    return query;
  }
  type = 'mysql';
  name = 'MySQL';

  blocks = MySQLBlocks;
  creatingType = MySQLBlocks.creating.type;
  inputType = MySQLBlocks.input.type;
  getRootCards = () =>
  {
    return Immutable.List([make(MySQLBlocks, 'sfw')]);
  }
  topLevelCards = Immutable.List<string>([MySQLBlocks.sfw.type]);

  // Ordering of the cards deck
  cardsDeck = MySQLCardsDeck;
  cardsList = cardsDeckToList(MySQLCardsDeck);

  queryToCode = CardsToSQL.toSQL;

  codeToQuery = SQLToCards;

  parseQuery = (query) => null;

  parseTreeToQueryString = CardsToSQL.toSQL;

  syntaxConfig = syntaxConfig;

  // function to get transform bars?
  // autocomplete?
}

export default new MySQLBackend();
