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

import * as Immutable from 'immutable';
const {Map, List} = Immutable;
import * as React from 'react';
import * as _ from 'underscore';
import {BaseClass, New} from '../../../Classes';
import {Ajax, QueryResponse} from '../../../util/Ajax';
import Util from '../../../util/Util';
import BackendInstance from './../../../../../shared/backends/types/BackendInstance';
import {spotlightAction, SpotlightState, SpotlightStore} from '../../data/SpotlightStore';
import PureClasss from './../../../common/components/PureClasss';
import Query from '../../../../../shared/items/types/Query';
import { AllBackendsMap } from '../../../../../shared/backends/AllBackends';
import {ResultsConfig, _ResultsConfig} from '../../../../../shared/results/types/ResultsConfig';

export const MAX_RESULTS = 200;

class ResultClass extends BaseClass
{
  // all available fields for display
  fields: IMMap<string, string> = Map<string, string>({});

  spotlight: any;

  rawFields: IMMap<string, string> = Map<string, string>({});
  transformFields: IMMap<string, string> = Map<string, string>({});
}
export type Result = ResultClass & IRecord<ResultClass>;
const _Result = (config: Object = {}) =>
  New<Result>(new ResultClass(config), config, true); // generates unique IDs

export type Results = List<Result>;

class ResultsStateC extends BaseClass
{
  results: Results = List([]);
  fields: List<string> = List([]);
  count: number = 0;
  rawResult: string = '';

  primaryKeyToIndex: IMMap<string, number> = Map<string, number>({});

  hasError: boolean = false;
  errorMessage: string = '';
  hasAllFieldsError: boolean = false;
  allFieldsErrorMessage: string = '';
  mainErrorMessage: string = '';
  subErrorMessage: string = '';
  errorLine: number = -1;

  valid: boolean = false; // are these results still valid for the given query?

  loading: boolean = false; // if we're still loading any fields, besides for the count

  hasLoadedResults: boolean = false;
  hasLoadedAllFields: boolean = false;
  hasLoadedCount: boolean = false;
  hasLoadedTransform: boolean = false;
}
export type ResultsState = ResultsStateC & IRecord<ResultsStateC>;
export let _ResultsState = (config: Object = {}) =>
  New<ResultsState>(new ResultsStateC(config), config);

export interface Props
{
  query: Query;
  resultsState: ResultsState;
  db: BackendInstance;
  onResultsStateChange: (resultsState: ResultsState) => void;
  noExtraFields?: boolean;
}

interface ResultsQuery
{
  xhr: XMLHttpRequest;
  queryId: string;
}

interface State
{
  queriedTql?: string;

  query?: ResultsQuery;
  allQuery?: ResultsQuery;
  countQuery?: ResultsQuery;
  transformQuery?: ResultsQuery;
}

const stateQueries = ['query', 'allQuery', 'countQuery', 'transformQuery'];

export class ResultsManager extends PureClasss<Props>
{
  state: State = {};

  // apply a function to all active queries
  mapQueries(fn: (query: ResultsQuery, stateKey: string) => void)
  {
    stateQueries.map(
      (stateKey) =>
        this && this.state && this.state[stateKey] &&
          fn(this.state[stateKey], stateKey),
    );
  }

  componentWillMount()
  {
    Util.addBeforeLeaveHandler(this.killQueries);
    this.queryResults(this.props.query, this.props.db);
  }

  componentWillUnmount()
  {
    this.killQueries();

    this.mapQueries(
      (query, stateKey) =>
        this.setState({
          [stateKey]: null,
        }),
    );
  }

  queryResults(query: Query, db: BackendInstance)
  {
    if (!query || !db)
    {
      return;
    }

    let tql = query.tql;
    
    if(db.source === 'm1')
    {
      console.log(query.language);
      tql = AllBackendsMap[query.language].queryToCode(
        query, 
        {
          limit: MAX_RESULTS,
          replaceInputs: true,
        }
      );
    }

    if (tql !== this.state.queriedTql)
    {
      this.killQueries();
      this.setState({
        queriedTql: tql,
        query:
          Ajax.query(
            tql,
            db,
            this.handleResultsResponse,
            this.handleError,
          ),
      });

      if(this.props.db.source === 'm1')
      {
        const selectCard = query.cards.get(0);

        if (
          !this.props.noExtraFields
          && selectCard
          && selectCard.type === 'sfw'
          && !selectCard['cards'].some(
              (card) => card.type === 'groupBy',
            )
          && !selectCard['fields'].some(
              (field) => field.field.static && field.field.static.isAggregate,
            )
        )
        {
          // temporary, don't dispatch select * if query has group by
        
          this.setState({
            allQuery: Ajax.query(
              AllBackendsMap[query.language].queryToCode(
                query,
                {
                  allFields: true,
                  transformAliases: true,
                  limit: MAX_RESULTS,
                  replaceInputs: true,
                }
              ),
              db,
              this.handleAllFieldsResponse,
              this.handleAllFieldsError,
            ),
          });
        }

        // temporarily disable count
        // this.setState({
        //   countXhr:
        //     Ajax.query(
        //       .toTQL(query, {
        //         count: true,
        //         replaceInputs: true,
        //       }),
        //       db,
        //       this.handleCountResponse,
        //       this.handleCountError
        //     ),
        // });
      }

      this.changeResults({
        loading: true,
        hasLoadedResults: false,
        hasLoadedAllFields: false,
        hasLoadedCount: false,
        hasLoadedTransform: false,
      });
    }
  }

  killQueries()
  {
    this.mapQueries(
      (query) =>
      {
        Ajax.killQuery(query.queryId);
        query.xhr.abort();
      },
    );
  }

  componentWillReceiveProps(nextProps: Props)
  {
    if (
      nextProps.query != null
      && nextProps.query.tql != null
      && (this.props.query == null || this.props.query.tql !== nextProps.query.tql)
    )
    {
      this.queryResults(nextProps.query, nextProps.db);

      if (!this.props.query || nextProps.query.id !== this.props.query.id)
      {
        this.changeResults({
          results: List([]),
        });
      }
    }

    // if(nextProps.resultsState.results !== this.props.resultsState.results)
    // {
    //   // update spotlights
    //   let nextState = nextProps.resultsState;
    //   let {resultsConfig} = nextProps.query;

    //   SpotlightStore.getState().spotlights.map(
    //     (spotlight, id) =>
    //     {
    //       let resultIndex = nextState.results && nextState.results.findIndex(
    //         r => getPrimaryKeyFor(r, resultsConfig) === id
    //       );
    //       if(resultIndex !== -1)
    //       {
    //         spotlightAction(id, _.extend({
    //             color: spotlight.color,
    //             name: spotlight.name,
    //           },
    //           nextState.results.get(resultIndex).toJS()
    //         ));
    //         // TODO something more like this
    //         // spotlightAction(id,
    //         //   {
    //         //     color: spotlight.color,
    //         //     name: spotlight.name,
    //         //     result: nextState.results.get(resultIndex),
    //         //   }
    //         // );
    //       }
    //       else
    //       {
    //         spotlightAction(id, null);
    //       }
    //     }
    //   );
    // }
  }

  handleResultsResponse(response: QueryResponse, isAllFields?: boolean)
  {
    const queryKey = isAllFields ? 'allQuery' : 'query';
    this.setState({
      [queryKey]: null,
    });

    const {resultsState} = this.props;

    if (!response || response.errorMessage)
    {
      this.handleError(response, isAllFields);
      return;
    }

    const resultsData = response.results;
    const resultsCount = resultsData.length;
    if (resultsData.length > MAX_RESULTS)
    {
      resultsData.splice(MAX_RESULTS, resultsData.length - MAX_RESULTS);
    }

    let results: Results =
      (resultsState.hasLoadedResults || resultsState.hasLoadedAllFields)
        ? resultsState.results : List([]);

    resultsData.map(
      (resultData, index) =>
      {
        let result: Result = results.get(index) || _Result();
        result = result.set(
          'fields',
          result.fields.merge(resultData),
        );

        if (!isAllFields)
        {
          result = result.set('rawFields', Map(resultData));
        }

        results = results.set(index, result);
      },
    );

    let fields = List<string>([]);
    if (results.get(0))
    {
      fields = results.get(0).fields.keySeq().toList();
    }

    const changes: any = {
      results,
      fields,
      hasError: false,
      loading: (isAllFields && !resultsState.hasLoadedResults) || (!isAllFields && !resultsState.hasLoadedAllFields && !this.props.noExtraFields),
      [isAllFields ? 'hasLoadedAllFields' : 'hasLoadedResults']: true,
      errorLine: null,
      mainErrorMessage: null,
      subErrorMessage: null,
    };

    if (!resultsState.hasLoadedCount)
    {
      changes['count'] = results.size;
    }

    this.changeResults(changes);
  }

  handleAllFieldsResponse(response: QueryResponse)
  {
    this.handleResultsResponse(response, true);
  }

  handleCountResponse(response: QueryResponse)
  {
    this.setState({
      countQuery: null,
    });

    // let results = response.results;
    // if(results)
    // {
    //   if(results.length === 1)
    //   {
    //     this.setState({
    //       resultsCount: results[0]['COUNT(*)']
    //     });
    //   }
    //   else if(results.length > 1)
    //   {
    //     this.setState({
    //       resultsCount: results.length,
    //     })
    //   }
    //   else
    //   {
    //     this.handleCountError();
    //   }
    // }
    // else
    // {
    //   this.handleCountError();
    // }
  }

  handleCountError()
  {
    this.setState({
      countQuery: null,
    });
    // probably not needed
    // this.props.onResultsStateChange(
    //   this.props.resultsState
    //     .set('resultsLongCount', 0)
    // );
  }

  handleError(response: QueryResponse, isAllFields?: boolean)
  {
    let {errorMessage} = response || { errorMessage: '' };
    errorMessage = errorMessage || 'There was no response from the server.';
    let {resultsState} = this.props;

    if (typeof errorMessage === 'string')
    {
      if (errorMessage.charAt(errorMessage.length - 1) === '^')
      {
        errorMessage = errorMessage.substr(0, errorMessage.length - 1);
      }
      errorMessage = errorMessage.replace(/MySQL/g, 'TerrainDB');

      if (!isAllFields)
      {
        const matches = errorMessage.match(/([0-9]+)\:[0-9]+/);
        const line = matches && matches.length >= 2 && parseInt(matches[1]);
        let mainErrorMessage = errorMessage;
        let subErrorMessage: string = null;

        if (line !== NaN && line !== null && line !== undefined)
        {
          mainErrorMessage = 'Error on line ' + line + ': ';
          subErrorMessage = errorMessage;
        }

        resultsState = resultsState
          .set('mainErrorMessage', mainErrorMessage)
          .set('subErrorMessage', subErrorMessage)
          .set('errorLine', line);
      }
    }

    this.setState({
      [isAllFields ? 'query' : 'allQuery']: null,
    });

    this.props.onResultsStateChange(
      resultsState
        .set(
          isAllFields ? 'hasAllFieldsError' : 'hasError',
          true,
        )
        .set(
          isAllFields ? 'allFieldsErrorMessage' : 'errorMessage',
          errorMessage,
        )
        .set(
          isAllFields ? 'hasLoadedResults' : 'hasLoadedAllFields',
          true,
        )
        .set(
          'loading',
          false,
        ),
    );
  }

  handleAllFieldsError(response: QueryResponse)
  {
    this.handleError(response, true);
  }

  changeResults(changes: { [key: string]: any })
  {
    let {resultsState} = this.props;
    _.map(changes,
      (value: any, key: string) =>
        resultsState = resultsState.set(key, value),
    );

    this.props.onResultsStateChange(resultsState);
  }

	render()
  {
    return (
      <div />
    );
	}
}

export function getPrimaryKeyFor(result: any, config: ResultsConfig): string
{
  if (config && config.primaryKeys.size)
  {
    return config.primaryKeys.map(
      (field) => result[field],
    ).join('and');
  }

  return 'result-' + Math.floor(Math.random() * 100000000);
}

export default ResultsManager;
