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

// tslint:disable:no-var-requires member-access no-console strict-boolean-expressions

import ESConverter from '../../../../shared/database/elastic/formatter/ESConverter';
import ESJSONParser from '../../../../shared/database/elastic/parser/ESJSONParser';
import ESQueryTransform from '../../../../shared/database/elastic/parser/ESQueryTransform';
import { Query } from '../../../items/types/Query';
import ElasticToCards from './ElasticToCards';
import ESCardParser from './ESCardParser';
import { ParseElasticQuery } from './ParseElasticQuery';

export default class LoadElasticQuery
{
  public static upgradeQuery(query: Query): Query
  {
    const parser = new ESJSONParser(query.tql, true);
    const root = parser.getValue();

    if (parser.hasError())
    {
      return query;
    }

    if (root.index || root.type || root.from || root.size)
    {
      return LoadElasticQuery.upgradeQueryRoot(query, parser);
    }

    return query;
  }

  public static loadQuery(query: Query, queryReady: (query: Query) => void): Query
  {
    query = LoadElasticQuery.upgradeQuery(query);

    if (query.cards && query.cards.size > 0)
    {
      // Elastic cards must start from the body card
      if (query.cards.get(0)['type'] !== 'eqlbody')
      {
        query = query.set('cardsAndCodeInSync', false);
      }
    }

    if (query.tql)
    {
      query = query.set('parseTree', ParseElasticQuery(query));
    }
    else
    {
      query = query.set('parseTree', null);
    }

    if (query.cardsAndCodeInSync === false)
    {
      if (query.tql)
      {
        query = ElasticToCards(query, queryReady);
      } else
      {
        query = query.set('cardsAndCodeInSync', true);
      }
    } else
    {
      const parsedCards = ESCardParser.parseAndUpdateCards(query.cards);
      query = query.set('cards', parsedCards);
    }

    return query;
  }

  private static upgradeQueryRoot(query: Query, parser: ESJSONParser = null): Query
  {
    if (parser === null)
    {
      parser = new ESJSONParser(query.tql, true);
    }
    const root = parser.getValue();

    const theIndex = root.index || null;
    const theType = root.type || null;
    const theFrom = root.from || null;
    const theSize = root.size || null;

    const newRootValue = ESQueryTransform.upgradeRoot(root, theIndex, theType, theFrom, theSize);
    const newRootValueParser = new ESJSONParser(JSON.stringify(newRootValue), true);

    if (newRootValueParser.hasError())
    {
      console.log('Error: New query: ' + JSON.stringify(newRootValue) +
        ', has errors: ' + JSON.stringify(newRootValueParser.getErrorMessages()));
      return query;
    }
    const newQuery = ESConverter.formatES(newRootValueParser);
    query = query
      .set('tql', newQuery)
      .set('cardsAndCodeInSync', false);

    return query;
  }
}
