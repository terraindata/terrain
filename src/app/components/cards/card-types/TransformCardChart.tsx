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

import * as _ from 'underscore';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import Actions from "../../../data/Actions.tsx";
import Util from '../../../util/Util.tsx';
import { CardModels } from './../../../models/CardModels.tsx';

import TransformChart from '../../../charts/TransformChart.tsx';

interface Props {
  card: CardModels.ITransformCard;
  pointsData: any;
  barsData: any;
  domain: any;
  barColor: string;
  lineColor: string;
}

// http://nicolashery.com/integrating-d3js-visualizations-in-a-react-app/

class TransformCardChart extends React.Component<Props, any>
{
  constructor(props:Props)
  {
    super(props);
    this.onPointMove = this.onPointMove.bind(this);
    this.state = {
      width: -1,
      domain: Util.deeperCloneObj(props.domain),
      pointsData: Util.deeperCloneArr(props.pointsData),
      barsData: Util.deeperCloneArr(props.barsData),
      barColor: props.barColor,
      lineColor: props.lineColor,
    }
  }
  
  componentDidMount() 
  {
    var el = ReactDOM.findDOMNode(this);
    TransformChart.create(el, {
      width: '100%',
      height: '300px',
    }, this.getChartState());
  }
  
  componentWillReceiveProps(newProps)
  {
    var changed = false;
    var newDomain = this.state.domain;
    var newPointsData = this.state.pointsData;
    var newBarsData = this.state.barsData;
    var newWidth = this.state.width;
    var newBarColor = this.state.barColor;
    var newLineColor = this.state.lineColor;
    
    if(ReactDOM.findDOMNode(this).getBoundingClientRect().width !== this.state.width)
    {
      changed = true;
      newWidth = ReactDOM.findDOMNode(this).getBoundingClientRect().width;
    }
    
    if(!_.isEqual(newProps.domain, this.state.domain))
    {
      changed = true;
      newDomain = Util.deeperCloneObj(newProps.domain);
    }
    
    if(!_.isEqual(newProps.pointsData, this.state.pointsData))
    {
      changed = true;
      newPointsData = Util.deeperCloneArr(newProps.pointsData);
    }
    
    if(!_.isEqual(newProps.barsData, this.state.barsData))
    {
      changed = true;
      newBarsData = Util.deeperCloneArr(newProps.barsData);
    }
    
    if(this.state.barColor !== newProps.barColor)
    {
      changed = true;
      newBarColor = newProps.barColor;
    }
    
    if(this.state.lineColor !== newProps.lineColor)
    {
      changed = true;
      newLineColor = newProps.lineColor;
    }
    
    if(changed)
    {
      this.setState({
        domain: newDomain,
        pointsData: newPointsData,
        barsData: newBarsData,
        width: newWidth,
        barColor: newBarColor,
        lineColor: newLineColor,
      });
      
      var el = ReactDOM.findDOMNode(this);
      TransformChart.update(el, this.getChartState({
        barColor: newBarColor,
        lineColor: newLineColor,
      }));
    }
    
  }
  
  onPointMove(scorePointId, newScore) {
    newScore = Util.valueMinMax(newScore, 0, 1);
    Actions.cards.transform.scorePoint(this.props.card, scorePointId, newScore);
  }
  
  getChartState(overrideState?: any) {
    overrideState = overrideState || {};
    
    var pointsData = this.props.pointsData.map((scorePoint) => ({
      x: scorePoint.value,
      y: scorePoint.score,
      id: scorePoint.id,
    }));
    
    var chartState = {
      barsData: this.props.barsData,
      pointsData: pointsData,
      domain: this.props.domain,
      onMove: this.onPointMove,
      colors: {
        bar: overrideState.barColor || this.props.barColor,
        line: overrideState.lineColor || this.props.lineColor,
      },
    };
    
    return chartState;
  }
  
  componentWillUnmount() {
    var el = ReactDOM.findDOMNode(this);
    TransformChart.destroy(el);
  }

	render() {
    return (
      <div></div>
		);
	}
};

export default TransformCardChart;