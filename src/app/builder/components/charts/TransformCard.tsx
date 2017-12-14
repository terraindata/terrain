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
import SpotlightStore from '../../data/SpotlightStore';
import TerrainComponent from './../../../common/components/TerrainComponent';
import TransformCardChart from './TransformCardChart';
import TransformCardPeriscope from './TransformCardPeriscope';

import { ElasticQueryResult } from '../../../../../shared/database/elastic/ElasticQueryResponse';
import { MidwayError } from '../../../../../shared/error/MidwayError';
import { getIndex, getType } from '../../../../database/elastic/blocks/ElasticBlockHelpers';
import MidwayQueryResponse from '../../../../database/types/MidwayQueryResponse';
import { M1QueryResponse } from '../../../util/AjaxM1';

const NUM_BARS = 1000;

export interface Props
{
  keyPath: KeyPath;
  data: any; // transform card
  onChange: (keyPath: KeyPath, value: any, isDirty?: boolean) => void;
  builderState: any;
  language: string;

  canEdit?: boolean;
  spotlights?: any;

  containerWidth?: number;
  index?: string;
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
    spotlights: IMMap<string, any>;
    queryXhr?: XMLHttpRequest;
    queryId?: string;
    error?: boolean;
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
      spotlights: null,
    };
  }

  public componentDidMount()
  {
    this.computeBars(this.props.data.input, this.state.maxDomain, !this.props.data.hasCustomDomain);
    this._subscribe(SpotlightStore, {
      isMounted: true,
      storeKeyPath: ['spotlights'],
      stateKey: 'spotlights',
    });
  }

  public componentWillReceiveProps(nextProps: Props)
  {
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
    this.state.queryXhr && this.state.queryXhr.abort();
    this.killQuery();
  }

  public killQuery()
  {
    if (this.props.language === 'mysql')
    {
      this && this.state && this.state.queryId &&
        AjaxM1.killQuery(this.state.queryId);
    }
  }

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
    const spotlights = this.state.spotlights;
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
        />
        <TransformCardPeriscope
          onDomainChange={this.handleChartDomainChange}
          barsData={this.state.bars}
          domain={this.state.chartDomain}
          range={this.state.range}
          maxDomain={this.state.maxDomain}
          keyPath={this.props.keyPath}
          canEdit={this.props.canEdit}
          width={width}
          language={this.props.language}
          colors={this.props.data.static.colors}
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
      queryXhr: null,
      queryId: null,
    });
  }

  private handleElasticAggregationResponse(resp: MidwayQueryResponse)
  {
    this.setState({
      queryXhr: null,
      queryId: null,
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

  private handleElasticDomainAggregationResponse(resp: MidwayQueryResponse)
  {
    this.setState({
      queryXhr: null,
      queryId: null,
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
  private computeBars(input: CardString, maxDomain: List<number>, recomputeDomain = false)
  {
    switch (this.props.language)
    {
      case 'mysql':
        this.computeTQLBars(input);
        break;
      case 'elastic':
        this.computeElasticBars(input, maxDomain, recomputeDomain);
        break;
      default:
        break;
    }
  }

  private computeElasticBars(input: CardString, maxDomain: List<number>, recomputeDomain: boolean)
  {
    const { builderState } = this.props;
    const { db } = builderState;
    if (!input)
    {
      return;
    }
    let index: string = '';
    let type: string = '';
    if (this.props.index !== undefined)
    {
      index = this.props.index;
    }
    else
    {
      index = getIndex('');
      type = getType('');
    }
    if (recomputeDomain)
    {
      const domainQuery = {
        body: {
          size: 0,
          query: {
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
        },
      };

      domainQuery['index'] = index;
      domainQuery['type'] = type;

      Ajax.query(
        JSON.stringify(domainQuery),
        db,
        (resp) =>
        {
          this.handleElasticDomainAggregationResponse(resp);
        },
        (err) =>
        {
          this.handleElasticAggregationError(err);
        },
      );
    } else
    {
      const min = maxDomain.get(0);
      const max = maxDomain.get(1);
      const interval = (max - min) / NUM_BARS;

      const aggQuery = {
        body: {
          size: 0,
          query: {
            bool: {
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
        },
      };
      aggQuery['index'] = index;
      aggQuery['type'] = type;

      this.setState(
        Ajax.query(
          JSON.stringify(aggQuery),
          db,
          (resp) =>
          {
            this.handleElasticAggregationResponse(resp);
          },
          (err) =>
          {
            this.handleElasticAggregationError(err);
          }),
      );
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
    const { builderState } = this.props;
    const { cards } = builderState.query;
    const { db } = builderState;

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

export default Dimensions({
  elementResize: true,
  containerStyle: {
    height: 'auto',
  },
})(TransformCard);
