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

import {Cards} from '../../blocks/types/Card';
import BlockUtils from '../../blocks/BlockUtils';

// A query can be viewed and edited in the Builder
// currently, only Variants have Queries, 1:1, but that may change
class QueryC
{
  type: 'QUERY' = 'QUERY';
  parent: number = -1;
  name: string = '';
  status: 'BUILD' | 'LIVE' = 'BUILD';
  language: 'elastic';
  
  id: ID = -1;
  variantId: number = -1;
  
  // TODO change?
  db: {
    id: ID;
    name: string;
    source: 'm1' | 'm2';
    type: string;
  } = {} as any;

  cards: Cards = List([]);
  inputs: List<any> = List([]);
  resultsConfig: IResultsConfig = null;
  tql: string = '';
  deckOpen: boolean = true;

  cardsAndCodeInSync: boolean = false;
  parseError: string = null;
  
  
  dbFields = ['id', 'parent', 'name', 'status', 'type'];
  excludeFields= ['dbFields', 'excludeFields'];
  
  modelVersion = 2; // 2 is for the first version of Node midway
}
const Query_Record = Immutable.Record(new QueryC());
export interface Query extends QueryC, IRecord<Query> {}

export const _Query = (config?: Object) => {
  config = config || {};
  config['cards'] = BlockUtils.recordFromJS(config['cards'] || []);
  config['inputs'] = BlockUtils.recordFromJS(config['inputs'] || []);
  config['resultsConfig'] = _IResultsConfig(config['resultsConfig']);

  let query = new Query_Record(config) as any as Query;

  return query;
};

export function queryForSave(query: Query): Object
{
  query = query
    .set('cards', cardsForServer(query.cards))
    .set('resultsConfig', query.resultsConfig.toJS());
  return query.toJS();
}

export default Query;
