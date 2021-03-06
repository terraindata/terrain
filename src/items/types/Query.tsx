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

// tslint:disable:variable-name strict-boolean-expressions member-access comment-format

import { List, Map } from 'immutable';

import Util from 'app/util/Util';
import * as Immutable from 'immutable';
import { createRecordType } from 'shared/util/Classes';
import ESInterpreter from '../../../shared/database/elastic/parser/ESInterpreter';
import { _ResultsConfig } from '../../../shared/results/types/ResultsConfig';
import { _Path, Path } from '../../app/builder/components/pathfinder/PathfinderTypes';
import { Aggregation } from '../../app/builder/components/results/ResultTypes';
import * as BlockUtils from '../../blocks/BlockUtils';
import { Cards } from '../../blocks/types/Card';
import { _Input, Input } from '../../blocks/types/Input';
import { AllBackendsMap } from '../../database/AllBackends';

// A query can be viewed and edited in the Builder
// currently, only Algorithms have Queries, 1:1, but that may change
class QueryC
{
  type: 'QUERY' = 'QUERY';
  parent: number = -1;
  name: string = '';
  status: 'BUILD' | 'LIVE' = 'BUILD';

  language: 'elastic' | 'mysql' = 'elastic';

  id: ID = -1;
  algorithmId: number = -1;

  // TODO change?
  db: {
    id: ID;
    name: string;
    source: 'm1' | 'm2';
    type: string;
  } = {} as any;

  cards: Cards = List([]);
  inputs: List<Input> = List([]);
  resultsConfig = null; //: ResultsConfig = null;
  tql: string = '';
  tqlMode: 'auto' | 'manual' = 'auto';
  parseTree: ESInterpreter = null;
  lastMutation: number = 0;
  deckOpen: boolean = false; // TODO change back to TRUE once deck is complete
  cardsAndCodeInSync: boolean = false;

  path: Path = _Path();
  pathErrorMap: Map<string, List<string>> = Map<string, List<string>>();

  resultsViewMode: string = 'Hits';
  aggregationList: Map<string, Aggregation> = Map<string, Aggregation>();

  meta: IMMap<string, any> = Map<string, any>();

  dbFields = ['id', 'parent', 'name', 'status', 'type'];
  excludeFields = ['dbFields', 'excludeFields'];

  modelVersion = CurrentQueryModelVersion;

  // what order the cards are in the tuning column
  tuningOrder: List<string> = List([]);
  cardKeyPaths: Map<ID, KeyPath> = Map<ID, KeyPath>();

}
export const Query_Record = createRecordType(new QueryC(), 'QueryC');
export interface Query extends QueryC, IRecord<Query> { }

export const _Query = (config?: object) =>
{
  config = config || {};
  const Blocks = AllBackendsMap[config['language'] || 'elastic'].blocks;
  config['cards'] = BlockUtils.recordFromJS(config['cards'] || [], Blocks);
  config['inputs'] = Util.arrayToImmutableList(config['inputs'], _Input);
  config['resultsConfig'] = _ResultsConfig(config['resultsConfig']);
  config['meta'] = Map<string, any>(config['meta']);
  config['cardKeyPaths'] = Map<ID, KeyPath>(config['cardKeyPaths']);
  config['tuningOrder'] = List<string>(config['tuningOrder']);
  config['aggregationList'] = Map<string, Aggregation>(config['aggregationList']);
  config['path'] = _Path(config['path']);
  config['pathErrorMap'] = Immutable.fromJS(config['pathErrorMap'] || {});
  if (config)
  {
    if (!config['modelVersion'] || config['modelVersion'] < 3)
    {
      config['modelVersion'] = 3;
      config['algorithmId'] = config['variantId'];
    }

    if (config['modelVersion'] < 4)
    {
      config['modelVersion'] = 4;
      config['cardsAndCodeInSync'] = false;
    }
  }
  const query = new Query_Record(config) as any as Query;
  return query;
};

export function queryForSave(query: Query): object
{
  query = query
    .set('cards', BlockUtils.cardsForServer(query.cards))
    .set('parseTree', null)
    .set('tqlMode', 'auto')
    .set('resultsConfig', query.resultsConfig.toJS());
  return query.toJS();
}

// first version is 2.
// version 3 renames algorithmId to variantId.
// version 4 introduces a new custom filter card.
export const CurrentQueryModelVersion = 4;

export default Query;
