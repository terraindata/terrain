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

require('./TransformCardPeriscope.less');
import * as Immutable from 'immutable';
let {Map, List} = Immutable;
import * as _ from 'underscore';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import Actions from "../../data/BuilderActions.tsx";
import Util from '../../../util/Util.tsx';
import PureClasss from '../../../common/components/PureClasss.tsx';
import { BuilderTypes } from './../../BuilderTypes.tsx';
import Periscope from './Periscope.tsx';
import {Bar, Bars} from './TransformCard.tsx';
import BuilderTextbox from '../../../common/components/BuilderTextbox.tsx';

interface Props 
{
  barsData: Bars;
  maxDomain: List<number>;
  domain: List<number>;
  range: List<number>;
  onDomainChange: (domain: List<number>) => void;
  keyPath:KeyPath;
  canEdit: boolean;
}

const MAX_BARS = 100;

class TransformCardPeriscope extends PureClasss<Props>
{
  state: {
    width: number,
    initialDomain: List<number>,
    chartState: Map<string, any>,
    initialVal: number,
    bars: Bars,
  } = {
    chartState: null,
    width: 0,
    initialDomain: null,
    initialVal: 0,
    bars: null,
  };
  
  refs: {
    [k: string]: Ref;
    chart: Ref;
  }
  
  constructor(props:Props)
  {
    super(props);
    this.state.bars = this.formatBars(props.barsData);
  }
  
  formatBars(bars:Bars):Bars
  {
    if(bars.size > MAX_BARS)
    {
      var newBars: Bars = List([]);
      var min = bars.first().range.min;
      var max = bars.last().range.max;
      
      bars.map((bar:Bar) => 
      {
        let b = Math.floor((bar.range.min - min) / (max - min) * MAX_BARS);
        let newBar: Bar = newBars.get(b);
        if(!newBar)
        {
          newBars = newBars.push(JSON.parse(JSON.stringify(bar)));
        }
        else
        {
          newBar.count += bar.count;
          newBar.percentage += bar.percentage;
          newBar.range.max = bar.range.max;
          newBars = newBars.set(b, newBar);
        }
      });
      return newBars;
    }
    return bars;
  }
  
  componentDidMount()
  {
    var el = ReactDOM.findDOMNode(this.refs.chart);
    var width = el.getBoundingClientRect().width;
    let chartState = this.getChartState({
      width,
    });
    
    this.setState({
      width,
      chartState,
    });
    Periscope.create(el, chartState.toJS());
  }
  
  componentWillReceiveProps(nextProps:Props)
  {
    if(this.shouldComponentUpdate(nextProps, this.state))
    {
      var bars = this.state.bars;
      if(nextProps.barsData !== this.props.barsData)
      {
        bars = this.formatBars(nextProps.barsData);
        this.setState({
          bars,
        });
      }
      this.update(_.extend({}, nextProps, { bars }));
    }
  }
  
  update(overrideState?)
  {
    var el = ReactDOM.findDOMNode(this.refs.chart);
    Periscope.update(el, this.getChartState(overrideState).toJS()); 
  }
  
  handleDomainChangeStart(initialVal)
  {
    this.setState({
      initialDomain: this.props.domain,
      initialVal,
    })
  }
  
  handleDomainChange(handleIndex, newVal)
  {
    var domain = 
      this.state.initialDomain.set(handleIndex, 
        this.state.initialDomain.get(handleIndex) + newVal - this.state.initialVal
      );
      
    let {maxDomain} = this.props;
    var buffer = (maxDomain.get(1) - maxDomain.get(0)) * 0.01;
    domain = domain.set(0, 
        Util.valueMinMax(domain.get(0), maxDomain.get(0), this.state.initialDomain.get(1) - buffer)
      );
    domain = domain.set(1, 
      Util.valueMinMax(domain.get(1), 
        this.state.initialDomain.get(0) + buffer, 
        maxDomain.get(1))
      );
    this.props.onDomainChange(domain);
    this.update({
      domain,
    });
  }
  
  handleDomainTextChange()
  {
    Actions.change(this._ikeyPath(this.props.keyPath, 'hasCustomDomain'), true);
  }
  
  getChartState(overrideState = {}): Map<string, any>
  {
    var chartState = Map({
      barsData: (overrideState['bars'] || this.state.bars).toJS(),
      maxDomain: (overrideState['maxDomain'] || this.props.maxDomain),
      domain: {
        x: (overrideState['domain'] || this.props.domain).toJS(),
        y: (overrideState['range'] || this.props.range).toJS(),
      },
      onDomainChange: this.handleDomainChange,
      onDomainChangeStart: this.handleDomainChangeStart,
      width: (overrideState && overrideState['width']) || this.state.width,
      height: 40,
    });
    
    return chartState;
  }
  
  componentWillUnmount()
  {
    var el = ReactDOM.findDOMNode(this.refs.chart);
    Periscope.destroy(el);
  }

  render()
  {
    return (
      <div className='transform-periscope-wrapper'>
        <div ref='chart' />
        
        <div className='tp-text-wrapper'>
          <BuilderTextbox
            value={this.props.maxDomain.get(0)}
            keyPath={this._ikeyPath(this.props.keyPath, 'domain', 0)}
            isNumber={true}
            className='tp-tb-left'
            canEdit={this.props.canEdit}
            onChange={this.handleDomainTextChange}
          />
          <BuilderTextbox
            value={this.props.maxDomain.get(1)}
            keyPath={this._ikeyPath(this.props.keyPath, 'domain', 1)}
            isNumber={true}
            className='tp-tb-right'
            canEdit={this.props.canEdit}
            onChange={this.handleDomainTextChange}
          />
        </div>
        
      </div>
    );
  }
};

export default TransformCardPeriscope;