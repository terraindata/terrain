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

// tslint:disable:restrict-plus-operands radix prefer-const no-console strict-boolean-expressions max-classes-per-file no-shadowed-variable max-line-length

import { List, Map, Set } from 'immutable';
import * as Immutable from 'immutable';

import * as _ from 'lodash';
import * as React from 'react';

import { BuilderState } from 'builder/data/BuilderState';
import ElasticBlockHelpers, { getIndex } from 'database/elastic/blocks/ElasticBlockHelpers';
import { SchemaState } from 'schema/SchemaTypes';
import ESConverter from '../../../../../shared/database/elastic/formatter/ESConverter';
import ESJSONParser from '../../../../../shared/database/elastic/parser/ESJSONParser';
import MidwayError from '../../../../../shared/error/MidwayError';
import { MidwayErrorItem } from '../../../../../shared/error/MidwayErrorItem';
import { ResultsConfig } from '../../../../../shared/results/types/ResultsConfig';
import { isInput } from '../../../../blocks/types/Input';
import { AllBackendsMap } from '../../../../database/AllBackends';
import { ESParseTreeToCode, stringifyWithParameters } from '../../../../database/elastic/conversion/ParseElasticQuery';
import BackendInstance from '../../../../database/types/BackendInstance';
import MidwayQueryResponse from '../../../../database/types/MidwayQueryResponse';
import Query from '../../../../items/types/Query';
import Actions from '../../../fileImport/data/FileImportActions';
import * as FileImportTypes from '../../../fileImport/FileImportTypes';
import { Ajax } from '../../../util/Ajax';
import AjaxM1, { M1QueryResponse } from '../../../util/AjaxM1';
import Util from '../../../util/Util';
import { SpotlightActions } from '../../data/SpotlightRedux';
import * as SpotlightTypes from '../../data/SpotlightTypes';
import TerrainComponent from './../../../common/components/TerrainComponent';
import { _Hit, Hit, Hits, MAX_HITS, ResultsState } from './ResultTypes';

export interface Props
{
  query: Query;
  algorithmPath?: string;
  resultsState: ResultsState;
  db: BackendInstance;
  onResultsStateChange: (resultsState: ResultsState) => void;
  noExtraFields?: boolean;
  // injected props
  spotlights?: SpotlightTypes.SpotlightState;
  spotlightActions?: typeof SpotlightActions;
  builder?: BuilderState;
  schema?: SchemaState;
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

let HITS_CACHE: { [primaryKey: string]: Hit };

export class ResultsManager extends TerrainComponent<Props>
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
    // TODO consider querying results when the component is loaded
    // however adding a call to queryResults here causes a bug with our
    // current architecture that causes outdated results to be displayed
    // when you open an algorithm from the builder
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
        if (this.props.db.source === 'm1')
        {
          AjaxM1.killQuery(query.queryId);
        }
        query.xhr.abort();
      },
    );
  }

  public componentWillReceiveProps(nextProps: Props)
  {
    // TODO: the logic here is potentially broken since props appear to be updated at different times and are not consistent with eachother
    if (this.props.db !== nextProps.db ||
      (
        nextProps.query
        && nextProps.query.tql
        && (!this.props.query ||
          (
            this.props.query.tql !== nextProps.query.tql ||
            nextProps.query.tqlMode === 'manual' ||
            // this.props.query.cards !== nextProps.query.cards ||
            this.props.query.inputs !== nextProps.query.inputs
            // this.props.query.path !== nextProps.query.path
          )
        )
      )
    )
    {
      this.queryResults(nextProps.query, nextProps.db);
      if (!this.props.query || nextProps.query.id !== this.props.query.id)
      {
        this.changeResults({
          hits: undefined,
          aggregations: {},
        });
      }
    }

    if (nextProps.query && this.props.spotlights && (nextProps.resultsState.hits !== this.props.resultsState.hits))
    {
      // update spotlights
      let nextState = nextProps.resultsState;
      let { resultsConfig } = nextProps.query;

      this.props.spotlights.spotlights.map(
        (spotlight, id) =>
        {
          const nestedFields = this.getNestedFields(nextProps).toJS();

          let hitIndex = nextState.hits && nextState.hits.findIndex(
            (hit) =>
            {
              let hitStillInResults = getPrimaryKeyFor(hit, resultsConfig) === id;
              if (!hitStillInResults)
              {
                const hitStillInNestedResults = nestedFields.map(
                  (nestedField) =>
                  {
                    const nestedHits = hit.fields.get(nestedField);
                    const hitStillInNestedResult = nestedHits.map(
                      (nestedHit) => getPrimaryKeyFor({ fields: nestedHit } as Hit, resultsConfig) === id,
                    );

                    return hitStillInNestedResult.reduce((result, r) => result || r);
                  },
                );

                hitStillInResults = hitStillInResults ||
                  hitStillInNestedResults.reduce((result, r) => result || r);
              }

              return hitStillInResults;
            },
          );

          if (hitIndex !== -1)
          {
            this.props.spotlightActions({
              actionType: 'spotlightAction',
              id,
              hit: _.extend({
                color: spotlight.color,
                name: spotlight.name,
                rank: hitIndex,
              },
                nextState.hits.get(hitIndex).toJS(),
              ),
            });
            // TODO something more like this
            // spotlightAction(id,
            //   {
            //     color: spotlight.color,
            //     name: spotlight.name,
            //     result: nextState.results.get(resultIndex),
            //   }
            // );
          }
          else
          {
            this.props.spotlightActions({
              actionType: 'clearSpotlightAction',
              id,
            });
          }
        },
      );
    }
  }

  public getNestedFields(props: Props, overrideConfig?)
  {
    // Get the fields that are nested
    const { builder, schema, resultsState } = props;
    const dataSource = props.query.path.source.dataSource;
    let nestedFields = resultsState.fields.filter((field) =>
    {
      const type = ElasticBlockHelpers.getTypeOfField(
        schema,
        builder,
        field,
        dataSource,
        true,
      );
      return type === 'nested' || type === '';
    }).toList();
    // Filter out anything that it is a single object, not a list of objects
    if (resultsState.hits && resultsState.hits.size)
    {
      nestedFields = nestedFields.filter((field) =>
        List.isList(resultsState.hits.get(0).fields.get(field)),
      ).toList();
    }

    return nestedFields;
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

  public changeResults(changes: { [key: string]: any }, exportChanges?: { [key: string]: any })
  {
    let { resultsState } = this.props;
    _.map(changes,
      (value: any, key: string) =>
        resultsState = resultsState.set(key, value),
    );

    if (exportChanges)
    {
      const { filetype, filesize, preview, originalNames } = exportChanges;
      Actions.chooseFile(filetype, filesize, preview, originalNames);
    }

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
        limit: MAX_HITS,
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
            limit: MAX_HITS,
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

  private postprocessEQL(eql: string): string
  {
    const postprocessed: object = (new ESJSONParser(eql)).getValue();

    if (postprocessed.hasOwnProperty('size'))
    {
      postprocessed['size'] = Math.min(postprocessed['size'], MAX_HITS);
    }

    return ESConverter.formatES(new ESJSONParser(JSON.stringify(postprocessed)));
  }

  private queryM2Results(query: Query, db: BackendInstance)
  {
    //
    // if (query.parseTree === null || query.parseTree.hasError())
    // {
    //   return;
    // }
    // TODO: This only allows that path to make queries ( when one exists )
    let eql;
    if (query === this.state.lastQuery)
    {
      return;
    }
    if (query.path !== undefined)
    {
      try
      {
        const parser: ESJSONParser = new ESJSONParser(query.tql, true);
        eql = ESParseTreeToCode(parser, { replaceInputs: true }, query.inputs);
      }
      catch (e)
      {
        return;
      }
    }
    else
    {
      eql = AllBackendsMap[query.language].parseTreeToQueryString(
        query,
        {
          replaceInputs: true,
        },
      );

      if (query.tqlMode !== 'manual')
      {
        eql = this.postprocessEQL(eql);
      }
    }
    if (this.state.query && this.state.query.xhr)
    {
      this.state.query.xhr.abort();
    }
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

    this.changeResults({
      loading: true,
      hasLoadedResults: false,
      hasLoadedAllFields: false,
      hasLoadedCount: false,
      hasLoadedTransform: false,
    });

    // let allFieldsQueryCode;
    // try
    // {
    //   allFieldsQueryCode = AllBackendsMap[query.language].parseTreeToQueryString(
    //     query,
    //     {
    //       allFields: true,
    //       replaceInputs: true,
    //     },
    //   );
    // }
    // catch (err)
    // {
    //   console.log('Could not generate all field Elastic request, reason:' + err);
    // }
    // if (allFieldsQueryCode)
    // {
    //   this.setState({
    //     allQuery: Ajax.query(
    //       allFieldsQueryCode,
    //       db,
    //       (resp) =>
    //       {
    //         this.handleM2QueryResponse(resp, true);
    //       },
    //       (err) =>
    //       {
    //         this.handleM2RouteError(err, true);
    //       },
    //     ),
    //   });
    //
    // }
  }

  private updateResults(resultsData: any, isAllFields: boolean)
  {
    const { resultsState } = this.props;
    const hitsData = resultsData.hits;
    const resultsCount = hitsData.length;
    if (hitsData.length > MAX_HITS)
    {
      hitsData.splice(MAX_HITS, hitsData.length - MAX_HITS);
    }
    let hits: Hits =
      (resultsState.hasLoadedResults || resultsState.hasLoadedAllFields)
        ? resultsState.hits : List([]);
    if (hits === undefined)
    {
      hits = List([]);
    }
    hitsData.map(
      (hitData, index) =>
      {
        let hit: Hit = hits.get(index) || _Hit();
        hit = hit.set(
          'fields',
          hit.fields.merge(hitData),
        );

        hit = hit.set(
          'primaryKey',
          getPrimaryKeyFor(hit, this.props.query.resultsConfig, index),
        );

        if (!isAllFields)
        {
          hit = hit.set('rawFields', Map(hitData));
        }

        hits = hits.set(index, hit);
      },
    );

    // Looks at first 100 results to get fields
    let fieldsSet = Set<string>([]);
    if (hits && hits.size >= 0)
    {
      let i = 0;
      while (i < 100 && hits.get(i))
      {
        fieldsSet = fieldsSet.union(hits.get(i).fields.keySeq());
        i++;
      }
    }

    const loading = false;

    const changes: any = {
      hits,
      fields: fieldsSet.toList(),
      hasError: false,
      loading,
      [isAllFields ? 'hasLoadedAllFields' : 'hasLoadedResults']: true,
      errorLine: null,
      mainErrorMessage: null,
      subErrorMessage: null,
      aggregations: resultsData.aggregations,
      rawResult: resultsData.rawResult,
    };

    if (!resultsState.hasLoadedCount)
    {
      changes['count'] = hits.size;
    }

    const filteredFields = List(_.filter(fieldsSet.toArray(), (val) => !(val.charAt(0) === '_')));
    const exportChanges: any = {
      filetype: 'csv',
      originalNames: filteredFields,
      preview: List(filteredFields.map((field) =>
      {
        return hits.slice(0, FileImportTypes.NUMBER_PREVIEW_ROWS).map((hit) =>
        {
          const value = hit.fields.get(String(field));
          return Array.isArray(value) || typeof (value) === 'boolean' ? JSON.stringify(value) : value;
        });
      })),
    };
    this.changeResults(changes, exportChanges);
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
    const resultsData = response.results as any;
    // how is the data formatted?
    const hits = resultsData.hits.hits.map((hit) =>
    {
      const sort = hit.sort !== undefined ? { _sort: hit.sort[0] } : {};
      return _.extend({}, hit._source, sort, {
        _index: hit._index,
        _type: hit._type,
        _score: hit._score,
        _id: hit._id,
      });
    });
    const aggregations = resultsData.aggregations;
    this.updateResults({ hits, aggregations, rawResult: resultsData }, isAllFields);
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
    const hits = resultsData.hits.hits.map((hit) =>
    {
      let hitTemp = _.cloneDeep(hit);
      let rootKeys: string[] = [];
      rootKeys = _.without(Object.keys(hitTemp), '_index', '_type', '_id', '_score', '_source', 'sort', '', 'fields');
      if (rootKeys.length > 0) // there were group join objects
      {
        const duplicateRootKeys: string[] = [];
        rootKeys.forEach((rootKey) =>
        {
          if (Object.keys(hitTemp._source).indexOf(rootKey) > -1)
          {
            duplicateRootKeys.push(rootKey);
          }
        });
        if (duplicateRootKeys.length !== 0)
        {
          console.log('Duplicate keys ' + JSON.stringify(duplicateRootKeys) + ' in root level and source mapping');
        }
        rootKeys.forEach((rootKey) =>
        {
          hitTemp['_source'][rootKey] = hitTemp[rootKey];
          delete hitTemp[rootKey];
        });
      }
      const sort = hitTemp.sort !== undefined ? { _sort: hitTemp.sort[0] } : {};
      let fields = {};
      if (hitTemp.fields !== undefined)
      {
        _.keys(hitTemp.fields).forEach((field) =>
        {
          fields[field] = hitTemp.fields[field][0];
        });
      }
      return _.extend({}, hitTemp._source, sort, fields, {
        _index: hitTemp._index,
        _type: hitTemp._type,
        _score: hitTemp._score,
        _id: hitTemp._id,
      });
    });
    const aggregations = resultsData.aggregations;
    this.updateResults({ hits, aggregations, rawResult: resultsData }, isAllFields);
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

function getPrimaryKeyFor(hit: Hit, config: ResultsConfig, index?: number): string
{
  if (config && config.primaryKeys.size)
  {
    return config.primaryKeys.map(
      (field) => hit.fields.get(field),
    ).join('-and-');
  }

  return index + ': ' + JSON.stringify(hit.fields.toJS()); // 'result-' + Math.floor(Math.random() * 100000000);
}

export default Util.createTypedContainer(
  ResultsManager,
  ['spotlights', 'builder', 'schema'],
  { spotlightActions: SpotlightActions },
);
