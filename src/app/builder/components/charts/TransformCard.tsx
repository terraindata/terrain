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
let {Map, List} = Immutable;
import * as _ from 'underscore';
import * as React from 'react';
import Actions from "../../data/BuilderActions.tsx";
import BuilderStore from "../../data/BuilderStore.tsx";
import SpotlightStore from '../../data/SpotlightStore.tsx';
import Util from '../../../util/Util.tsx';
import { Ajax, QueryResponse } from '../../../util/Ajax.tsx';
import { BuilderTypes } from './../../BuilderTypes.tsx';
import PureClasss from './../../../common/components/PureClasss.tsx';
import TransformCardChart from './TransformCardChart.tsx';
import TQLConverter from '../../../tql/TQLConverter.tsx';
const Dimensions = require('react-dimensions');

const NUM_BARS = 1000; 

interface Props
{
  keyPath: KeyPath;
  data: any; // transform card
  
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
  }
}
export type Bars = List<Bar>;

import TransformCardPeriscope from './TransformCardPeriscope.tsx';

class TransformCard extends PureClasss<Props>
{
  state: {
    domain: List<number>;
    range: List<number>;
    bars: Bars;
    spotlights: Map<string, any>;
  };
  
  constructor(props:Props)
  {
    super(props);
    this.state = {
      domain: List(props.data.domain as number[]),
      range: List([0,1]),
      bars: List([]),
      spotlights: null,
    };
  }
  
  componentDidMount()
  {
    this.computeBars(this.props.data.input);
    this._subscribe(SpotlightStore, {
      isMounted: true,
      storeKeyPath: ['spotlights'],
      stateKey: 'spotlights',
    });
    
  }
  
  componentWillReceiveProps(nextProps:Props)
  {
    if(nextProps.data.input !== this.props.data.input)
    {
      this.computeBars(nextProps.data.input);
    }
    
    if(nextProps.data.domain !== this.props.data.domain)
    {
      
      this.setState({
        domain: this.trimDomain(this.state.domain, nextProps.data.domain)
      });
      
      if(nextProps.data.input === this.props.data.input)
      {
        // input didn't change but still need to compute bars to get the set within this domain
        this.computeBars(this.props.data.input);
      }
    }
  }
  
  trimDomain(curStateDomain: List<number>, maxDomain: List<number>): List<number>
  {
    let low = maxDomain.get(0);
    let high = maxDomain.get(1);
    var buffer = (high - low) * 0.02;
    
    return List([
      Util.valueMinMax(curStateDomain.get(0), low, high - buffer),
      Util.valueMinMax(curStateDomain.get(1), low + buffer, high),
    ]);
  }
  
  findTableForAlias(data:BuilderTypes.IBlock | List<BuilderTypes.IBlock>, alias:string): string
  {
    if(Immutable.List.isList(data))
    {
      let list = data as List<BuilderTypes.IBlock>;
      for(let i = 0; i < list.size; i ++)
      {
        let table = this.findTableForAlias(list.get(i), alias);
        if(table)
        {
          return table;
        }
      }
      return null;
    }
    
    if(data['type'] === 'table' && data['alias'] === alias)
    {
      return data['table'];
    }
    
    if(Immutable.Iterable.isIterable(data))
    {
      let keys = data.keys();
      let i = keys.next();
      while(!i.done)
      {
        let value = data[i.value];
        if(Immutable.Iterable.isIterable(value))
        {
          let table = this.findTableForAlias(value, alias);
          if(table)
          {
            return table;
          }
        }
        i = keys.next();
      }
    }
    return null;
  }
  
  queryXhr: any;
  
  computeBars(input: BuilderTypes.CardString)
  {
    // TODO consider putting the query in context
    let builderState = BuilderStore.getState();
    let {cards} = builderState.query;
    let {db} = builderState;
    
    if(typeof input === 'string')
    {
      // TODO: cache somewhere
      let parts = input.split('.');
      if(parts.length === 2)
      {
        let alias = parts[0];
        let field = parts[1];
        
        let table = this.findTableForAlias(cards, alias);
        
        if(table)
        {
          this.queryXhr = Ajax.query(
            `SELECT ${field} as value FROM ${table};`, // alias select as 'value' to catch any weird renaming
            db,
            this.handleQueryResponse,
            this.handleQueryError
          );
          return;
        }
      }
    }
    else if(input && input._isCard)
    {
      let card = input as BuilderTypes.ICard;
      if(card.type === 'score' && card['weights'].size)
      {
        // only case we know how to handle so far is a score card with a bunch of fields
        //  that all come from the same table
        let finalTable: string = '';
        let finalAlias: string = '';
        card['weights'].map((weight) =>
        {
          if(finalTable === null)
          {
            return; // already broke
          }
          
          let key = weight.get('key');
          if(typeof key === 'string')
          {
            let parts = key.split('.');
            if(parts.length === 2)
            {
              let alias = parts[0];
              if(finalAlias === '')
              {
                finalAlias = alias;
              }
              if(alias === finalAlias)
              {
                let table = this.findTableForAlias(cards, alias);
                if(!finalTable.length)
                {
                  finalTable = table;
                }
                if(finalTable === table)
                {
                  return; // so far so good, continue
                }
              }
            }
          }
          
          finalTable = null; // Not good, abort!
        });
        
        if(finalTable)
        {
          // convert the score to TQL, do the query
          this.queryXhr = Ajax.query(
            `SELECT ${TQLConverter._parse(card)} as value FROM ${finalTable} as ${finalAlias};`,
            db,
            this.handleQueryResponse,
            this.handleQueryError
          );
          return;
        }
      }
      
      // TODO, or something
    }
    this.setState({
      bars: List([]), // no can do get bars sadly, need to figure it out one day
    });
  }
  
  componentWillUnmount()
  {
    this.queryXhr && this.queryXhr.abort();
  }
  
  handleQueryResponse(response: QueryResponse)
  {
    let results = response.resultSet;
    if(results.length)
    {
      let max = +results[0].value;
      let min = +results[0].value;
      results.map(v =>
      {
        let val = +v.value;
        if(val > max)
        {
          max = val;
        }
        if(val < min)
        {
          min = val;
        }
      });
      
      if(this.props.data.hasCustomDomain)
      {
        min = Math.max(min, this.props.data.domain.get(0));
        max = Math.min(max, this.props.data.domain.get(1));
      }
      
      let bars: Bar[] = [];
      for(let j = 0; j < NUM_BARS; j ++)
      {
        bars.push({
          id: "" + j,
          count: 0,
          percentage: 0,
          range: {
            min: min + (max - min) * j / NUM_BARS,
            max: min + (max - min) * (j + 1) / NUM_BARS,
          }
        });
      }
      
      results.map(v =>
      {
        let val = +v.value;
        let i = Math.floor((val - min) / (max - min) * NUM_BARS);
        if(i === NUM_BARS)
        {
          i = NUM_BARS - 1;
        }
        if(i < 0 || i > NUM_BARS)
        {
          // out of bounds for our custom domain
          return;
        }
        
        bars[i].count ++;
        bars[i].percentage += 1 / results.length;
      });
      
      this.setState({
        bars: List(bars),
      });
      
      if(!this.props.data.hasCustomDomain)
      {
        let domain = List([min, max]);
        this.setState({
          domain: this.trimDomain(this.state.domain, domain),
        });
        Actions.change(this._ikeyPath(this.props.keyPath, 'domain'), domain);
      }
    }
  }
  
  handleQueryError(error: any)
  {
    console.log('Transform card query error');
  }
  
  handleDomainChange(domain: List<number>)
  {
    this.setState({
      domain,
    });
  }
  
  handleUpdatePoints(points)
  {
    Actions.change(this._ikeyPath(this.props.keyPath, 'scorePoints'), points); 
  }
  
  render()
  {
    let spotlights = this.state.spotlights;
    let {data} = this.props;
    let width = this.props.containerWidth ? this.props.containerWidth + 110 : 300;
    
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
          inputKey={BuilderTypes.transformAlias(this.props.data)}
          updatePoints={this.handleUpdatePoints}
          width={width}
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
        />
      </div>
    );
  }
};

export default Dimensions({
  elementResize: true,
  containerStyle: {
    height: 'auto',
  },
})(TransformCard);