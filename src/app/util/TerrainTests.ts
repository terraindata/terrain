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

// Copyright 2018 Terrain Data, Inc.

// tslint:disable:variable-name strict-boolean-expressions no-console restrict-plus-operands max-line-length

import { ESCodeToPathfinder } from 'builder/components/pathfinder/CodeToPath';
import { parsePath } from 'builder/components/pathfinder/PathfinderParser';
import { browserHistory } from 'common/components/TerrainComponent';
import * as Immutable from 'immutable';
import LibraryActions from 'library/data/LibraryActions';
import { replaceRoute } from 'library/helpers/LibraryRoutesHelper';
import * as LibraryTypes from 'library/LibraryTypes';
import * as _ from 'lodash';
import TerrainStore from 'store/TerrainStore';
import Ajax from 'util/Ajax';
import ESInterpreter from '../../../shared/database/elastic/parser/ESInterpreter';
import ESJSONParser from '../../../shared/database/elastic/parser/ESJSONParser';
import ESParserError from '../../../shared/database/elastic/parser/ESParserError';
import CardsToElastic from '../../database/elastic/conversion/CardsToElastic';
import { ElasticValueInfoToCards } from '../../database/elastic/conversion/ElasticToCards';
import ESCardParser from '../../database/elastic/conversion/ESCardParser';
import { ItemStatus } from '../../items/types/Item';
import { _Query, default as Query } from '../../items/types/Query';

export default class TerrainTests
{
  public static lastCategoryId;
  public static lastGroupId;
  public static lastAlgorithmId;
  public static lastAlgorithm;
  public static testCreateCategory(baseUrl = 'library')
  {
    const createActionHandler = LibraryActions.categories.create(undefined, (id) =>
    {
      TerrainTests.lastCategoryId = id;
      replaceRoute(
        {
          basePath: baseUrl,
          categoryId: id,
        },
      );
    });
    createActionHandler(TerrainStore.dispatch, TerrainStore.getState, Ajax);
  }
  public static testCreateGroup(baseUrl = 'library', categoryId = TerrainTests.lastCategoryId)
  {
    const db = JSON.parse('{\"id\":1,\"name\":\"My ElasticSearch Instance\",\"type\":\"elastic\",\"host\":\"127.0.0.1:9200\",\"isAnalytics\":true,\"analyticsIndex\":\"terrain-analytics\",\"analyticsType\":\"events\",\"source\":\"m2\"}');
    const createActionHandler = LibraryActions.groups.createAs(categoryId, 'newGroup', db, (id) =>
    {
      TerrainTests.lastGroupId = id;
      replaceRoute(
        {
          basePath: baseUrl,
          categoryId,
          groupId: id,
        },
      );
    });
    createActionHandler(TerrainStore.dispatch, TerrainStore.getState);
  }

  public static testCreateAlgorithm(baseUrl = 'library', categoryId = TerrainTests.lastCategoryId, groupId = TerrainTests.lastGroupId, live: boolean = false)
  {
    const createActionHandler = LibraryActions.algorithms.create(categoryId, groupId, undefined, (r, a) =>
    {
      TerrainTests.lastAlgorithmId = r.id;
      this.lastAlgorithm = a.set('id', r.id);
      replaceRoute(
        {
          basePath: baseUrl,
          categoryId,
          groupId,
          algorithmId: r.id,
        });
    });
    createActionHandler(TerrainStore.dispatch, TerrainStore.getState);
  }

  public static setAlgorithmStatus(algorithm = TerrainTests.lastAlgorithm, newState = ItemStatus.Live)
  {
    TerrainStore.dispatch(LibraryActions.algorithms.status(algorithm, newState, true));
  }

  public static gotoAlgorithm(algorithmId = TerrainTests.lastAlgorithmId)
  {
    browserHistory.push(`/builder/?o=${algorithmId}`);
  }

  public static QueryToPathFinder(queryConfig)
  {
    const query: Query = _Query(queryConfig);
    const path = ESCodeToPathfinder(query.tql, query.inputs, { mergeRefQuery: true, refQuery: query.path });
    if (path)
    {
      return path.toJS();
    }
    return path;
  }

  public static PathFinderToQuery(queryConfig)
  {
    const query: Query = _Query(queryConfig);
    const currentTql = query.tql;
    const { tql, pathErrorMap } = parsePath(query.path, query.inputs);
    return { tql, pathErrorMap };
  }
}
