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
import Util from '../../../util/Util.tsx';
import Ajax from '../../../util/Ajax.tsx';
import { BuilderTypes } from './../../BuilderTypes.tsx';
import PureClasss from './../../../common/components/PureClasss.tsx';
import TransformCardChart from './TransformCardChart.tsx';
import TransformCardPeriscope from './TransformCardPeriscope.tsx';

const NUM_BARS = 1000;

interface Props
{
  keyPath: KeyPath;
  data: any; // transform card
  
  canEdit?: boolean;
  spotlights?: any;  
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

class TransformCard extends PureClasss<Props>
{
  state: {
    domain: List<number>;
    range: List<number>;
    bars: Bars;
  };
  
  constructor(props:Props)
  {
    super(props);
    this.state = {
      domain: List(props.data.domain as number[]),
      range: List([0,1]),
      bars: List([]),
    };
    this.computeBars(props.data.input);
  }
  
  updateDomain: boolean = false;
  componentWillReceiveProps(nextProps:Props)
  {
    if(nextProps.data.input !== this.props.data.input)
    {
      this.updateDomain = true;
      this.computeBars(nextProps.data.input);
    }
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
  
  computeBars(input:string)
  {
    if(!input || typeof input !== 'string')
    {
      return;
    }
    // TODO: cache somewhere
    let parts = input.split('.');
    if(parts.length === 2)
    {
      let alias = parts[0];
      let field = parts[1];
      let queryKeyPath = this.props.keyPath.skipLast(this.props.keyPath.size - 2);
      let query = BuilderStore.getState().getIn(queryKeyPath.toList());
      let db = query.db;
      let cards = query.cards;
      
      let table = this.findTableForAlias(cards, alias);
      
      if(table)
      {
        Ajax.query(
          `SELECT ${field} as value FROM ${table};`, // alias to catch any weird renaming
          db,
          this.handleQueryResults,
          this.handleQueryError
        );
      }
    }
  }
  
  handleQueryResults(results: {value: any}[])
  {
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
        
        bars[i].count ++;
        bars[i].percentage += 1 / NUM_BARS;
      });
      
      let domain = List([min, max]);
      this.setState({
        bars: List(bars),
        domain,
        // range: List([min, max]),
      });
      
      if(this.updateDomain)
      {
        console.log('ud', domain, this.props.keyPath.set(this.props.keyPath.size - 1, 'domain'));
        Actions.change(this.props.keyPath.set(this.props.keyPath.size - 1, 'domain'), domain);
      }
    }
  }
  
  handleQueryError(error: any)
  {
    console.log('Transform card query error', error);
  }
  
  handleDomainChange(domain: List<number>)
  {
    this.setState({
      domain,
    });
  }
  
  handleUpdatePoints(points)
  {
    Actions.change(this.props.keyPath, points);
  }
  
  render()
  {
    let {data} = this.props;
    return (
      <div className='transform-card'>
        <TransformCardChart
          canEdit={this.props.canEdit}
          points={data.scorePoints}
          bars={this.state.bars}
          domain={this.state.domain}
          range={this.state.range}
          spotlights={this.props.spotlights}
          inputKey={data.input}
          updatePoints={this.handleUpdatePoints}
        />
        <TransformCardPeriscope
          onDomainChange={this.handleDomainChange}
          barsData={this.state.bars}
          domain={this.state.domain}
          range={this.state.range}
          maxDomain={data.domain}
        />
      </div>
    );
  }
};

export default TransformCard;