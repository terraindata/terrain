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
import { line } from 'd3-shape';
import * as React from 'react';
import * as _ from 'underscore';
import { AllBackendsMap } from '../../../../../shared/backends/AllBackends';
import MidwayQueryResponse from '../../../../../shared/backends/types/MidwayQueryResponse';
import MidwayError from '../../../../../shared/error/MidwayError';
import { MidwayErrorItem } from '../../../../../shared/error/MidwayErrorItem';
import Query from '../../../../../shared/items/types/Query';
import { _ResultsConfig, ResultsConfig } from '../../../../../shared/results/types/ResultsConfig';
import { BaseClass, New } from '../../../Classes';
import { Ajax } from '../../../util/Ajax';
import AjaxM1, { M1QueryResponse } from '../../../util/AjaxM1';
import Util from '../../../util/Util';
import { spotlightAction, SpotlightState, SpotlightStore } from '../../data/SpotlightStore';
import BackendInstance from './../../../../../shared/backends/types/BackendInstance';
import PureClasss from './../../../common/components/PureClasss';

export const MAX_RESULTS = 200;

class ResultClass extends BaseClass
{
  // all available fields for display
  public fields: IMMap<string, string> = Map<string, string>({});

  public spotlight: any;

  public rawFields: IMMap<string, string> = Map<string, string>({});
  public transformFields: IMMap<string, string> = Map<string, string>({});
}
export type Result = ResultClass & IRecord<ResultClass>;
const _Result = (config: Object = {}) =>
  New<Result>(new ResultClass(config), config, true); // generates unique IDs

export type Results = List<Result>;

class ResultsStateC extends BaseClass
{
  public results: Results = List([]);
  public fields: List<string> = List([]);
  public count: number = 0;
  public rawResult: string = '';

  public primaryKeyToIndex: IMMap<string, number> = Map<string, number>({});

  public hasError: boolean = false;
  public errorMessage: string = '';
  public hasAllFieldsError: boolean = false;
  public allFieldsErrorMessage: string = '';
  public mainErrorMessage: string = '';
  public subErrorMessage: string = '';
  public errorLine: number = -1;

  public valid: boolean = false; // are these results still valid for the given query?

  public loading: boolean = false; // if we're still loading any fields, besides for the count

  public hasLoadedResults: boolean = false;
  public hasLoadedAllFields: boolean = false;
  public hasLoadedCount: boolean = false;
  public hasLoadedTransform: boolean = false;
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
  lastQuery?: Query;
  midwayQueryResponse?: MidwayQueryResponse;
  midwayAllQueryResponse?: MidwayQueryResponse;
  query?: ResultsQuery;
  allQuery?: ResultsQuery;
  countQuery?: ResultsQuery;
  transformQuery?: ResultsQuery;
}

const stateQueries = ['query', 'allQuery', 'countQuery', 'transformQuery'];

export class ResultsManager extends PureClasss<Props>
{
  public state: State = {};

  // apply a function to all active queries
  public mapQueries(fn: (query: ResultsQuery, stateKey: string) => void)
  {
    stateQueries.map(
      (stateKey) =>
        this && this.state && this.state[stateKey] &&
        fn(this.state[stateKey], stateKey),
    );
  }

  public componentWillMount()
  {
    Util.addBeforeLeaveHandler(this.killQueries);
    this.queryResults(this.props.query, this.props.db);
  }

  public componentWillUnmount()
  {
    this.killQueries();

    this.mapQueries(
      (query, stateKey) =>
        this.setState({
          [stateKey]: null,
        }),
    );
  }

  public queryResults(query: Query, db: BackendInstance)
  {
    if (!query || !db)
    {
      return;
    }

    if (db.source === 'm1')
    {
      this.queryM1Results(query, db);
    } else if (db.source === 'm2')
    {
      this.queryM2Results(query, db);
    } else
    {
      console.log('Unknown Database ' + query);
    }
    // temporarily disable count
    // this.setState({
    //   countXhr:
    //     Ajax.query(
    //       TQLConverter.toTQL(query, {
    //         count: true,
    //         replaceInputs: true,
    //       }),
    //       db,
    //       this.handleCountResponse,
    //       this.handleCountError
    //     ),
    // });
  }

  public killQueries()
  {
    this.mapQueries(
      (query) =>
      {
        AjaxM1.killQuery(query.queryId);
        query.xhr.abort();
      },
    );
  }

  public componentWillReceiveProps(nextProps: Props)
  {
    if (
      nextProps.query
      && nextProps.query.tql
      && (!this.props.query ||
        (
          this.props.query.tql !== nextProps.query.tql ||
          this.props.query.cards !== nextProps.query.cards ||
          this.props.query.inputs !== nextProps.query.inputs
        )
      )
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

  public handleCountResponse(response: M1QueryResponse)
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

  public handleCountError()
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

  public changeResults(changes: { [key: string]: any })
  {
    let { resultsState } = this.props;
    _.map(changes,
      (value: any, key: string) =>
        resultsState = resultsState.set(key, value),
    );

    this.props.onResultsStateChange(resultsState);
  }

  public render()
  {
    return (
      <div />
    );
  }

  private queryM1Results(query: Query, db: BackendInstance)
  {
    const tql = AllBackendsMap[query.language].queryToCode(
      query,
      {
        limit: MAX_RESULTS,
        replaceInputs: true,
      },
    );

    if (tql !== this.state.queriedTql)
    {
      this.killQueries();
      this.setState({
        queriedTql: tql,
        query: AjaxM1.queryM1(
          tql,
          db,
          (resp) =>
          {
            this.handleM1QueryResponse(resp, false);
          },
          (err) =>
          {
            this.handleM1Error(err, false);
          },
        ),
      });
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
        const alltql = AllBackendsMap[query.language].queryToCode(
          query,
          {
            allFields: true,
            transformAliases: true,
            limit: MAX_RESULTS,
            replaceInputs: true,
          });
        this.setState({
          allQuery: AjaxM1.queryM1(
            alltql,
            db,
            (resp) =>
            {
              this.handleM1QueryResponse(resp, false);
            },
            (err) =>
            {
              this.handleM1Error(err, false);
            },
          ),
        });
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

  private queryM2Results(query: Query, db: BackendInstance)
  {
    if (query.parseTree === null || query.parseTree.hasError())
    {
      return;
    }

    if (query !== this.state.lastQuery)
    {
      const eql = AllBackendsMap[query.language].parseTreeToQueryString(
        query,
        {},
      );

      this.setState({
        lastQuery: query,
        queriedTql: eql,
        query: Ajax.query(
          eql,
          db,
          (resp) =>
          {
            this.handleM2QueryResponse(resp, false);
          },
          (err) =>
          {
            this.handleM2RouteError(err, false);
          },
        ),
      });
      let allFieldsQueryCode;
      try
      {
        allFieldsQueryCode = AllBackendsMap[query.language].parseTreeToQueryString(
          query,
          { allFields: true },
        );
      }
      catch (err)
      {
        console.log('Could not generate all field Elastic request, reason:' + err);
      }
      if (allFieldsQueryCode)
      {
        this.setState({
          allQuery: Ajax.query(
            allFieldsQueryCode,
            db,
            (resp) =>
            {
              this.handleM2QueryResponse(resp, true);
            },
            (err) =>
            {
              this.handleM2RouteError(err, true);
            },
          ),
        });

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

  private updateResults(resultsData: any[], isAllFields: boolean)
  {
    const { resultsState } = this.props;

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
      loading: (isAllFields && !resultsState.hasLoadedResults) ||
      (!isAllFields && !resultsState.hasLoadedAllFields && !this.props.noExtraFields),
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

  private handleM1QueryResponse(response: M1QueryResponse, isAllFields: boolean)
  {
    const queryKey = isAllFields ? 'allQuery' : 'query';
    this.setState({
      [queryKey]: null,
    });
    if (!response || response.errorMessage)
    {
      this.handleM1Error(response, isAllFields);
      return;
    }
    const resultsData = response.results as any[];
    this.updateResults(resultsData, isAllFields);
  }

  private handleM2QueryResponse(response: MidwayQueryResponse, isAllFields: boolean)
  {
    const queryKey = isAllFields ? 'allQuery' : 'query';
    this.setState({
      [queryKey]: null,
    });
    const k = isAllFields ? 'midwayAllQueryResponse' : 'midwayQueryResponse';
    this.setState({
      [k]: response,
    });
    // m2
    if (response.hasError())
    {
      this.handleM2QueryError(response, isAllFields);
      return;
    }
    const resultsData = response.getResultsData();
    this.updateResults(resultsData, isAllFields);
  }

  private handleM1Error(response: any, isAllFields?: boolean)
  {
    let { errorMessage } = response || { errorMessage: '' };
    errorMessage = errorMessage || 'There was no response from the server.';
    let { resultsState } = this.props;

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

        if (isNaN(line) !== true && line !== null && line !== undefined)
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

  private updateM2ErrorState(errors: MidwayErrorItem[], isAllFields?: boolean)
  {
    // TODO: handle myltiple errors.
    const err = errors[0];
    let { resultsState } = this.props;
    if (!isAllFields)
    {
      resultsState = resultsState
        .set('mainErrorMessage', err.title)
        .set('subErrorMessage', err.detail);
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
        err.title,
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

  private handleM2QueryError(response: MidwayQueryResponse, isAllFields?: boolean)
  {
    this.updateM2ErrorState(response.errors, isAllFields);
  }

  private handleM2RouteError(response: MidwayError | string, isAllFields: boolean)
  {
    let errorItems: MidwayErrorItem[];
    if (typeof response === 'string')
    {
      let error: MidwayError;
      try
      {
        error = MidwayError.fromJSON(response);
      } catch (err)
      {
        console.log('The error message does not match MidwayError.' + response);
        error = new MidwayError(-1, 'Unknow Route Error', response, {});
      }
      errorItems = error.getMidwayErrors();
    } else
    {
      errorItems = response.errors;
    }
    this.updateM2ErrorState(errorItems, isAllFields);
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
