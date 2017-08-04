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

import * as Immutable from 'immutable';
const { Map, List } = Immutable;
import * as React from 'react';
import * as Dimensions from 'react-dimensions';
import * as _ from 'underscore';
import * as BlockUtils from '../../../../blocks/BlockUtils';
import Block from '../../../../blocks/types/Block';
import { Card, CardString } from '../../../../blocks/types/Card';
import { M1QueryResponse } from '../../../util/AjaxM1';
import AjaxM1 from '../../../util/AjaxM1';
import Util from '../../../util/Util';
import SpotlightStore from '../../data/SpotlightStore';
import TerrainComponent from './../../../common/components/TerrainComponent';
import TransformCardChart from './TransformCardChart';

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

import TransformCardPeriscope from './TransformCardPeriscope';

class TransformCard extends TerrainComponent<Props>
{
  public state: {
    domain: List<number>;
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
      domain: List(props.data.domain as number[]),
      range: List([0, 1]),
      bars: List([]),
      spotlights: null,
    };
  }

  public componentDidMount()
  {
    this.computeBars(this.props.data.input);
    this._subscribe(SpotlightStore, {
      isMounted: true,
      storeKeyPath: ['spotlights'],
      stateKey: 'spotlights',
    });
  }

  public componentWillReceiveProps(nextProps: Props)
  {
    if (nextProps.data.input !== this.props.data.input)
    {
      this.computeBars(nextProps.data.input);
    }

    if (!nextProps.data.domain.equals(this.props.data.domain))
    {
      this.setState({
        domain: this.trimDomain(this.state.domain, nextProps.data.domain),
      });

      if (nextProps.data.input === this.props.data.input)
      {
        // input didn't change but still need to compute bars to get the set within this domain
        this.computeBars(this.props.data.input);
      }
    }
  }

  public trimDomain(curStateDomain: List<number>, maxDomain: List<number>): List<number>
  {
    const low = maxDomain.get(0);
    const high = maxDomain.get(1);
    const buffer = (high - low) * 0.02;

    return List([
      Util.valueMinMax(curStateDomain.get(0), low, high - buffer),
      Util.valueMinMax(curStateDomain.get(1), low + buffer, high),
    ]);
  }

  public findTableForAlias(data: Block | List<Block>, alias: string): string
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

  // TODO move the bars computation to a higher level
  public computeBars(input: CardString)
  {
    if (this.props.language !== 'mysql')
    {
      // TODO MOD adapt Transform card for elastic.
      return;
    }
    console.log("CardString: " + input);
    // TODO consider putting the query in context
    const { builderState } = this.props;
    const { cards } = builderState.query;
    console.log("cards: " + JSON.stringify(cards));
    const { db } = builderState;

    if (typeof input === 'string')
    {
      // TODO: cache somewhere
      const parts = input.split('.');
      if (parts.length === 2)
      {
        const alias = parts[0];
        const field = parts[1];
        console.log("alias field " + alias + ":" + field);
        const table = this.findTableForAlias(cards, alias);
        console.log("table: " + table);

        if (table)
        {
          this.setState(
            AjaxM1.queryM1(
              `SELECT ${field} as value FROM ${table};`, // alias select as 'value' to catch any weird renaming
              db,
              this.handleQueryResponse,
              this.handleQueryError,
            ),
          );
          return;
        }
      }
    }
    else if (input && input._isCard)
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
          // this.setState(
          //   AjaxM1.queryM1(
          //     `SELECT ${CardsToSQL._parse(card)} as value FROM ${finalTable} as ${finalAlias};`,
          //     db,
          //     this.handleQueryResponse,
          //     this.handleQueryError,
          //   ),
          // );
          return;
        }
      }

      // TODO, or something
    }
    this.setState({
      bars: List([]), // no can do get bars sadly, need to figure it out one day
    });
  }

  public componentWillUnmount()
  {
    this.state.queryXhr && this.state.queryXhr.abort();
    this.killQuery();
  }

  public killQuery()
  {
    this && this.state && this.state.queryId &&
      AjaxM1.killQuery(this.state.queryId);
  }

  public handleQueryResponse(response: M1QueryResponse)
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
          domain: this.trimDomain(this.state.domain, domain),
        });
        this.props.onChange(this._ikeyPath(this.props.keyPath, 'domain'), domain, true);
      }
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

  public handleDomainChange(domain: List<number>)
  {
    this.setState({
      domain,
    });
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
          canEdit={this.props.canEdit}
          points={data.scorePoints}
          bars={this.state.bars}
          domain={this.state.domain}
          range={this.state.range}
          spotlights={spotlights && spotlights.toList().toJS()}
          inputKey={BlockUtils.transformAlias(this.props.data)}
          updatePoints={this.handleUpdatePoints}
          width={width}
          language={this.props.language}
        />
        <TransformCardPeriscope
          onDomainChange={this.handleDomainChange}
          barsData={this.state.bars}
          domain={this.state.domain}
          range={this.state.range}
          maxDomain={data.domain}
          keyPath={this.props.keyPath}
          canEdit={this.props.canEdit}
          width={width}
          language={this.props.language}
        />
      </div>
    );
  }
}

// import CardsToSQL from '../../../../../shared/backends/mysql/conversion/CardsToSQL';

export default Dimensions({
  elementResize: true,
  containerStyle: {
    height: 'auto',
  },
})(TransformCard);
