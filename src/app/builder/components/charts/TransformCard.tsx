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

// tslint:disable:restrict-plus-operands strict-boolean-expressions no-unused-expression

import { List } from 'immutable';
import * as React from 'react';
import * as Dimensions from 'react-dimensions';

import * as BlockUtils from '../../../../blocks/BlockUtils';
import Block from '../../../../blocks/types/Block';
import { Card, CardString } from '../../../../blocks/types/Card';

import { Ajax } from '../../../util/Ajax';
import AjaxM1 from '../../../util/AjaxM1';
import * as SpotlightTypes from '../../data/SpotlightTypes';
import TerrainComponent from './../../../common/components/TerrainComponent';
import TransformCardChart from './TransformCardChart';
import TransformCardPeriscope from './TransformCardPeriscope';

import { BuilderState } from 'app/builder/data/BuilderState';
import Util from 'app/util/Util';
import { ElasticQueryResult } from '../../../../../shared/database/elastic/ElasticQueryResponse';
import { MidwayError } from '../../../../../shared/error/MidwayError';
import { AllBackendsMap } from '../../../../database/AllBackends';
import { getIndex, getType } from '../../../../database/elastic/blocks/ElasticBlockHelpers';
import MidwayQueryResponse from '../../../../database/types/MidwayQueryResponse';
import { M1QueryResponse } from '../../../util/AjaxM1';

const NUM_BARS = 1000;

export interface Props
{
  keyPath: KeyPath;
  data: any; // transform card
  onChange: (keyPath: KeyPath, value: any, isDirty?: boolean) => void;
  language: string;

  canEdit?: boolean;
  // spotlights?: any;
  spotlights?: SpotlightTypes.SpotlightState;
  containerWidth?: number;

  builder?: BuilderState;
}

export interface Bar
{
  id: string;
  count: number;
  percentage: number; // of max
  range:
  {
    min: number;
    max: number;
  };
}
export type Bars = List<Bar>;

class TransformCard extends TerrainComponent<Props>
{
  public state: {
    // the domain of the chart and the periscope, updated by the periscope domain change and zoom in/out from the chart
    chartDomain: List<number>;
    // the maximum domain, updated by the two input fields.
    maxDomain: List<number>;
    range: List<number>;
    bars: Bars;
    queryXhr?: XMLHttpRequest;
    queryId?: string;
    error?: boolean;
    builderState?: any;
  };

  constructor(props: Props)
  {
    super(props);
    this.state = {
      // props.data.domain is List<string>
      maxDomain: List([Number(props.data.domain.get(0)), Number(props.data.domain.get(1))]),
      chartDomain: List([Number(props.data.domain.get(0)), Number(props.data.domain.get(1))]),
      range: List([0, 1]),
      bars: List([]),
    };
  }

  public componentDidMount()
  {
    this.computeBars(this.props.data.input, this.state.maxDomain, !this.props.data.hasCustomDomain);
  }

  public componentWillReceiveProps(nextProps: Props)
  {
    if ((nextProps.builder.query.tql !== this.props.builder.query.tql ||
      nextProps.builder.query.inputs !== this.props.builder.query.inputs)
      && !this.props.data.closed && nextProps.data.input === '_score')
    {
      this.computeBars(nextProps.data.input, this.state.maxDomain, true, nextProps.builder.query);
    }

    // nextProps.data.domain is list<string>
    const newDomain: List<number> = List([Number(nextProps.data.domain.get(0)), Number(nextProps.data.domain.get(1))]);
    if (!newDomain.equals(this.state.maxDomain))
    {
      const trimmedDomain = this.trimDomain(this.state.maxDomain, newDomain);
      if (trimmedDomain !== this.state.maxDomain)
      {
        this.setState({
          maxDomain: trimmedDomain,
          chartDomain: trimmedDomain,
        });
        this.computeBars(nextProps.data.input, trimmedDomain);
        return;
      }
    }

    if (nextProps.data.input !== this.props.data.input)
    {
      this.computeBars(nextProps.data.input, this.state.maxDomain, true);
    }
  }

  public componentWillUnmount()
  {
    this.state.queryXhr && this.state.queryXhr.abort(); // M1 mysql
    this.killXHR('domainAggregationAjax');
    this.killXHR('aggregationAjax');
    this.killQuery();
  }

  public killXHR(stateKey)
  {
    this.state[stateKey] && this.state[stateKey].xhr &&
      this.state[stateKey].xhr.abort();
  }

  public killQuery()
  {
    if (this.props.language === 'mysql')
    {
      this && this.state && this.state.queryId &&
        AjaxM1.killQuery(this.state.queryId);
    }
  }

  // M1 (mysql)
  public handleQueryError(error: any)
  {
    this.setState({
      bars: List([]),
      error: true,
      queryXhr: null,
      queryId: null,
    });
  }

  public handleChartDomainChange(chartDomain: List<number>)
  {
    this.setState({
      chartDomain,
    });
  }

  // called by TransformCardChart to zoom on a specific part of the domain
  public handleRequestDomainChange(domain: List<number>, overrideMaxDomain = false)
  {
    const trimmedDomain = this.trimDomain(this.state.chartDomain, domain);

    let low = trimmedDomain.get(0);
    let high = trimmedDomain.get(1);

    if (!overrideMaxDomain)
    {
      low = Math.max(low, this.state.maxDomain.get(0));
      high = Math.min(high, this.state.maxDomain.get(1));
    }

    if (low !== this.state.chartDomain.get(0) || high !== this.state.chartDomain.get(1))
    {
      const newDomain = List([low, high]);
      this.setState({
        chartDomain: newDomain,
      });
      if (overrideMaxDomain)
      {
        this.setState({
          maxDomain: newDomain,
        });
        this.props.onChange(this._ikeyPath(this.props.keyPath, 'domain'), newDomain, true);
      }
    }
  }

  // called by TransformCardChart to request that the view be zoomed to fit the data
  public handleZoomToData()
  {
    this.computeBars(this.props.data.input, this.state.maxDomain, true);
  }

  public handleUpdatePoints(points, isConcrete?: boolean)
  {
    this.props.onChange(this._ikeyPath(this.props.keyPath, 'scorePoints'), points, !isConcrete);
    // we pass !isConcrete as the value for "isDirty" in order to tell the Store when to
    //  set an Undo checkpoint. Moving the same point in the same movement should not result
    //  in more than one state on the Undo stack.
  }

  public render()
  {
    const spotlights = this.props.spotlights.spotlights;
    const { data } = this.props;
    const width = this.props.containerWidth ? this.props.containerWidth + 55 : 300;
    return (
      <div
        className='transform-card-inner'
      >
        <TransformCardChart
          onRequestDomainChange={this.handleRequestDomainChange}
          onRequestZoomToData={this.handleZoomToData}
          canEdit={this.props.canEdit}
          points={data.scorePoints}
          bars={this.state.bars}
          domain={this.state.chartDomain}
          range={this.state.range}
          keyPath={this.props.keyPath}
          spotlights={spotlights && spotlights.toList().toJS()}
          inputKey={BlockUtils.transformAlias(this.props.data)}
          updatePoints={this.handleUpdatePoints}
          width={width}
          language={this.props.language}
          colors={this.props.data.static.colors}
          mode={this.props.data.mode}
          builder={this.props.builder}
        />
        <TransformCardPeriscope
          onDomainChange={this.handleChartDomainChange}
          barsData={this.state.bars}
          domain={this.state.chartDomain}
          range={this.state.range}
          maxDomain={this.state.maxDomain}
          inputKey={BlockUtils.transformAlias(this.props.data)}
          keyPath={this.props.keyPath}
          canEdit={this.props.canEdit}
          width={width}
          language={this.props.language}
          colors={this.props.data.static.colors}
          builder={this.props.builder}
        />
      </div>
    );
  }

  private trimDomain(curStateDomain: List<number>, maxDomain: List<number>): List<number>
  {
    const low = maxDomain.get(0);
    const high = maxDomain.get(1);
    if (Number.isNaN(low) || Number.isNaN(high) || low >= high)
    {
      // TODO: show an error message about the wrong domain values.
      return curStateDomain;
    }
    return List([low, high]);
  }

  private handleElasticAggregationError(err: MidwayError | string)
  {
    this.setState({
      bars: List([]),
      error: true,
      aggregationAjax: {
        xhr: null,
        queryId: null,
      },
    });
  }

  private handleElasticAggregationResponse(resp: MidwayQueryResponse)
  {
    this.setState({
      aggregationAjax: {
        xhr: null,
        queryId: null,
      },
    });

    const min = this.state.maxDomain.get(0);
    const max = this.state.maxDomain.get(1);

    const elasticHistogram = (resp.result as ElasticQueryResult).aggregations;
    const hits = (resp.result as ElasticQueryResult).hits;
    let totalDoc = 0;
    if (hits && hits.total)
    {
      totalDoc = hits.total;
    }
    let theHist;
    if (totalDoc > 0 && elasticHistogram.transformCard.buckets.length >= NUM_BARS)
    {
      theHist = elasticHistogram.transformCard.buckets;
    } else
    {
      return this.handleElasticAggregationError('No Result');
    }
    const bars: Bar[] = [];
    for (let j = 0; j < NUM_BARS; j++)
    {
      bars.push({
        id: '' + j,
        count: theHist[j].doc_count,
        percentage: theHist[j].doc_count / totalDoc,
        range: {
          min: theHist[j].key,
          max: theHist[j + 1].key,
        },
      });
    }

    this.setState({
      bars: List(bars),
    });
  }

  private handleElasticDomainAggregationError(err: MidwayError | string)
  {
    this.setState({
      error: true,
      domainAggregationAjax: {
        xhr: null,
        queryId: null,
      },
    });
  }

  private handleElasticDomainAggregationResponse(resp: MidwayQueryResponse)
  {
    this.setState({
      domainAggregationAjax: {
        xhr: null,
        queryId: null,
      },
    });
    const agg = (resp.result as ElasticQueryResult).aggregations;
    if (agg === undefined || agg['minimum'] === undefined || agg['maximum'] === undefined)
    {
      return;
    }
    const newDomain = this.trimDomain(this.state.maxDomain, List([agg['minimum'].value, agg['maximum'].value]));
    this.setState({
      chartDomain: newDomain,
      maxDomain: newDomain,
    });
    this.props.onChange(this._ikeyPath(this.props.keyPath, 'domain'), newDomain, true);
    this.props.onChange(this._ikeyPath(this.props.keyPath, 'dataDomain'), newDomain, true);
    this.computeBars(this.props.data.input, this.state.maxDomain);
  }

  // TODO move the bars computation to a higher level
  private computeBars(input: CardString, maxDomain: List<number>, recomputeDomain = false, overrideQuery?)
  {
    switch (this.props.language)
    {
      case 'mysql':
        this.computeTQLBars(input);
        break;
      case 'elastic':
        this.computeElasticBars(input, maxDomain, recomputeDomain, overrideQuery);
        break;
      default:
        break;
    }
  }

  // To calculate a histogram for _score, the query that is actually being run has to
  // be run because _score is only set when there are text filters, so an empty query isn't sufficient
  private computeScoreElasticBars(maxDomain: List<number>, recomputeDomain: boolean, overrideQuery?)
  {
    const query = overrideQuery || this.props.builder.query;
    const tqlString = AllBackendsMap[query.language].parseTreeToQueryString(
      query,
      {
        replaceInputs: true,
      },
    );
    const tql = JSON.parse(tqlString);
    tql['size'] = 0;
    tql['sort'] = {};
    if (recomputeDomain)
    {
      tql['aggs'] = {
        maximum: {
          max: {
            script: { inline: '_score' },
          },
        },
        minimum: {
          min: {
            script: { inline: '_score' },
          },
        },
      };
    }
    else
    {
      const min = maxDomain.get(0);
      const max = maxDomain.get(1);
      const interval = (max - min) / NUM_BARS;
      tql['aggs'] = {
        transformCard: {
          histogram: {
            script: { inline: '_score' },
            interval,
            extended_bounds: {
              min, max,
            },
          },
        },
      };
    }
    return tql;
  }

  private computeElasticBars(input: CardString, maxDomain: List<number>, recomputeDomain: boolean, overrideQuery?)
  {
    const { builder } = this.props;
    const { db } = builder;

    if (!input)
    {
      return;
    }

    const index: string | List<string> = getIndex('', builder);
    const type: string | List<string> = getType('', builder);
    const filter = [];
    // If index and type are strings (there aren't multiple indexes/types) then add filters for them
    if (typeof index === 'string')
    {
      filter.push({
        term: {
          _index: index,
        },
      });
    }
    if (typeof type === 'string')
    {
      filter.push({
        term: {
          _type: type,
        },
      });
    }
    if (recomputeDomain)
    {
      let domainQuery;
      if (input === '_score')
      {
        domainQuery = this.computeScoreElasticBars(maxDomain, recomputeDomain, overrideQuery);
      }
      else
      {
        domainQuery = {
          query: {
            bool: {
              filter,
            },
          },
          aggs: {
            maximum: {
              max: {
                field: input,
              },
            },
            minimum: {
              min: {
                field: input,
              },
            },
          },
          size: 0,
        };
      }
      const domainAggregationAjax = Ajax.query(
        JSON.stringify(domainQuery),
        db,
        (resp) =>
        {
          this.handleElasticDomainAggregationResponse(resp);
        },
        (err) =>
        {
          this.handleElasticDomainAggregationError(err);
        },
      );
      this.setState({
        domainAggregationAjax,
      });
    } else
    {
      const min = maxDomain.get(0);
      const max = maxDomain.get(1);
      const interval = (max - min) / NUM_BARS;
      let aggQuery;
      if (input === '_score')
      {
        aggQuery = this.computeScoreElasticBars(maxDomain, recomputeDomain, overrideQuery);
      }
      else
      {
        aggQuery = {
          query: {
            bool: {
              filter,
              must: {
                range: {
                  [input as string]: { gte: min, lt: max },
                },
              },
            },
          },
          aggs: {
            transformCard: {
              histogram: {
                field: input,
                interval,
                extended_bounds: {
                  min, max, // force the ES server to return NUM_BARS + 1 bins.
                },
              },
            },
          },
          size: 0,
        };
      }
      const aggregationAjax = Ajax.query(
        JSON.stringify(aggQuery),
        db,
        (resp) =>
        {
          this.handleElasticAggregationResponse(resp);
        },
        (err) =>
        {
          this.handleElasticAggregationError(err);
        });
      this.setState({
        aggregationAjax,
      });
    }
  }

  private handleM1TQLQueryResponse(response: M1QueryResponse)
  {
    this.setState({
      queryXhr: null,
      queryId: null,
    });

    const results = response.results;
    if (results && results.length)
    {
      let max = +results[0].value;
      let min = +results[0].value;
      results.map((v) =>
      {
        const val = +v.value;
        if (val > max)
        {
          max = val;
        }
        if (val < min)
        {
          min = val;
        }
      });

      if (this.props.data.hasCustomDomain)
      {
        min = Math.max(min, this.props.data.domain.get(0));
        max = Math.min(max, this.props.data.domain.get(1));
      }

      const bars: Bar[] = [];
      for (let j = 0; j < NUM_BARS; j++)
      {
        bars.push({
          id: '' + j,
          count: 0,
          percentage: 0,
          range: {
            min: min + (max - min) * j / NUM_BARS,
            max: min + (max - min) * (j + 1) / NUM_BARS,
          },
        });
      }

      results.map((v) =>
      {
        const val = +v.value;
        let i = Math.floor((val - min) / (max - min) * NUM_BARS);
        if (i === NUM_BARS)
        {
          i = NUM_BARS - 1;
        }
        if (i < 0 || i >= bars.length)
        {
          // out of bounds for our custom domain
          return;
        }

        bars[i].count++;
        bars[i].percentage += 1 / results.length;
      });

      this.setState({
        bars: List(bars),
      });

      if (!this.props.data.hasCustomDomain)
      {
        const domain = List([min, max]);
        this.setState({
          domain: this.trimDomain(this.state.maxDomain, domain),
        });
        this.props.onChange(this._ikeyPath(this.props.keyPath, 'domain'), domain, true);
      }
    }
  }

  private findTableForAlias(data: Block | List<Block>, alias: string): string
  {
    if (Immutable.List.isList(data))
    {
      const list = data as List<Block>;
      for (let i = 0; i < list.size; i++)
      {
        const table = this.findTableForAlias(list.get(i), alias);
        if (table)
        {
          return table;
        }
      }
      return null;
    }

    if (data['type'] === 'table' && data['alias'] === alias)
    {
      return data['table'];
    }

    if (Immutable.Iterable.isIterable(data))
    {
      const keys = data.keys();
      let i = keys.next();
      while (!i.done)
      {
        const value = data[i.value];
        if (Immutable.Iterable.isIterable(value))
        {
          const table = this.findTableForAlias(value, alias);
          if (table)
          {
            return table;
          }
        }
        i = keys.next();
      }
    }
    return null;
  }

  private computeTQLBars(input: CardString)
  {
    // TODO consider putting the query in context
    const { builder } = this.props;
    const { cards } = builder.query;
    const { db } = builder;

    if (typeof input === 'string')
    {
      // TODO: cache somewhere
      const parts = input.split('.');
      if (parts.length === 2)
      {
        const alias = parts[0];
        const field = parts[1];
        const table = this.findTableForAlias(cards, alias);

        if (table)
        {
          if (this.props.language === 'mysql')
          {
            this.setState(
              AjaxM1.queryM1(
                `SELECT ${field} as value FROM ${table};`, // alias select as 'value' to catch any weird renaming
                db,
                this.handleM1TQLQueryResponse,
                this.handleQueryError,
              ),
            );
          }
          return;
        }
      }
    }
    else if (input && input._isCard) // looks like this is never called
    {
      const card = input as Card;
      if (card.type === 'score' && card['weights'].size)
      {
        // only case we know how to handle so far is a score card with a bunch of fields
        //  that all come from the same table
        let finalTable: string = '';
        let finalAlias: string = '';
        card['weights'].map((weight) =>
        {
          if (finalTable === null)
          {
            return; // already broke
          }

          const key = weight.get('key');
          if (typeof key === 'string')
          {
            const parts = key.split('.');
            if (parts.length === 2)
            {
              const alias = parts[0];
              if (finalAlias === '')
              {
                finalAlias = alias;
              }
              if (alias === finalAlias)
              {
                const table = this.findTableForAlias(cards, alias);
                if (!finalTable.length)
                {
                  finalTable = table;
                }
                if (finalTable === table)
                {
                  return; // so far so good, continue
                }
              }
            }
          }

          finalTable = null; // Not good, abort!
        });

        if (finalTable)
        {
          // convert the score to TQL, do the query
          if (this.props.language === 'mysql')
          {
            // this.setState(
            //   AjaxM1.queryM1(
            //     `SELECT ${CardsToSQL._parse(card)} as value FROM ${finalTable} as ${finalAlias};`,
            //     db,
            //     this.handleQueryResponse,
            //     this.handleQueryError,
            //   ),
            // );
          }
          return;
        }
      }

      // TODO, or something
    }
    this.setState({
      bars: List([]), // no can do get bars sadly, need to figure it out one day
    });
  }
}

export default Util.createTypedContainer(
  Dimensions({
    elementResize: true,
    containerStyle: {
      height: 'auto',
    },
  })(TransformCard),
  ['builder', 'spotlights'],
  {},
);
