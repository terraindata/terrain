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
  spotlights: any[];
  inputKey: string;
}

// http://nicolashery.com/integrating-d3js-visualizations-in-a-react-app/

class TransformCardChart extends React.Component<Props, any>
{
  constructor(props:Props)
  {
    super(props);
    Util.bind(this, ['onPointMove', 'dispatchAction', 'onLineClick', 'onLineMove', 'onSelect',
      'onDelete', 'onCreate', 'onPointMoveStart']);
    this.dispatchAction = _.debounce(this.dispatchAction, 500);
    
    this.state = {
      domain: Util.deeperCloneObj(props.domain),
      pointsData: Util.deeperCloneArr(props.pointsData),
      barsData: Util.deeperCloneArr(props.barsData),
      spotlights: props.spotlights,
      inputKey: props.inputKey,
      selectedPointIds: [],
    }
  }
  
  componentDidMount() 
  {
    var el = ReactDOM.findDOMNode(this);
    var width = 600;
    var height = width / 2;
    TransformChart.create(el, this.getChartState({
      width,
      height
    }));
    this.setState({ width, height });
  }
  
  componentWillReceiveProps(newProps)
  {
    var changed = false;
    var newDomain = this.state.domain;
    var newPointsData = this.state.pointsData;
    var newBarsData = this.state.barsData;
    var newSpotlights = this.state.spotlights;
    var newInputKey = this.state.inputKey;
    
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
    
    if(!_.isEqual(newProps.spotlights, this.state.spotlights))
    {
      changed = true;
      newSpotlights = Util.deeperCloneArr(newProps.spotlights);
    }
    
    if(newProps.inputKey !== this.state.inputKey)
    {
      changed = true;
      newInputKey = newProps.inputKey;
    }
    
    if(changed)
    {
      this.setState({
        domain: newDomain,
        pointsData: newPointsData,
        barsData: newBarsData,
        spotlights: newSpotlights,
        inputKey: newInputKey,
      });
      
      var el = ReactDOM.findDOMNode(this);
      TransformChart.update(el, this.getChartState({
        domain: newDomain,
        pointsData: newPointsData,
        barsData: newBarsData,
        spotlights: newSpotlights,
        inputKey: newInputKey,
      }));
    }
    
  }
  
  onSelect(pointId, selectRange)
  {
    if(pointId)
    {
      var pointMap: {[id: string]: boolean} = this.state.selectedPointIds.reduce((map, point) => {
        map[point] = true;
        return map;
      }, {});
      
      if(selectRange && this.state.lastSelectedPointId)
      {
        var find = (id, points) => points.findIndex(point => point.id === id);
        var firstIndex = find(pointId, this.state.pointsData);
        var secondIndex = find(this.state.lastSelectedPointId, this.state.pointsData);
        if(secondIndex !== -1)
        {
          var range = _.range(Math.min(firstIndex, secondIndex), Math.max(firstIndex, secondIndex) + 1);
          range.map(index => pointMap[this.state.pointsData[index].id] = true);
        }
        else
        {
          pointMap[pointId] = true;
        }
      }
      else
      {
        pointMap[pointId] = ! pointMap[pointId];
      }
      
      this.setState({
        selectedPointIds: _.reduce(pointMap, (ids, val, pointId) => {
          if(val) ids.push(pointId);
          return ids;
        }, []),
        lastSelectedPointId: pointId,
      });
    }
    else
    {
      // a click to unselect things
      this.setState({
        selectedPointIds: [],
      }); 
    }
    
    TransformChart.update(ReactDOM.findDOMNode(this), this.getChartState());
  }
  
  dispatchAction(arr)
  {
    if(arr[0] === true)
    {
      // only changing one score point
      var scorePointId = arr[1];
      var newScore = arr[2];
      var value = this.props.card.scorePoints.find(scorePoint => scorePoint.id === scorePointId).value;
      Actions.cards.transform.scorePoint(this.props.card, 
      {
        id: scorePointId,
        score: newScore,
        value,
      });
    } 
    else
    {
      Actions.cards.transform.scorePoints(this.props.card, arr);
    }
  }
  
  updatePointsData(newPointsData)
  {
    TransformChart.update(ReactDOM.findDOMNode(this), this.getChartState({
      pointsData: newPointsData,
    }));
    
    this.dispatchAction(newPointsData);
  }
  
  onPointMoveStart(initialScore)
  {
    this.setState({
      initialScore,
      initialPoints: Util.deeperCloneArr(this.props.pointsData),
    })
  }
  
  onPointMove(scorePointId, newScore)
  {
    var scoreDiff = this.state.initialScore - newScore;
    var pointIndex = this.props.pointsData.findIndex(scorePoint => scorePoint.id === scorePointId);
    var newPointsData = Util.deeperCloneArr(this.state.initialPoints).map(scorePoint => {
      if(scorePoint.id === scorePointId || this.state.selectedPointIds.find(id => id === scorePoint.id))
      {
        scorePoint.score = Util.valueMinMax(scorePoint.score - scoreDiff, 0, 1);
      }
      return scorePoint;
    });
    
    this.updatePointsData(newPointsData);
  }
  
  onLineClick(x, y)
  {
    this.setState({
      lineMoving: true,
      initialLineY: y,
      initialLinePoints: Util.deeperCloneArr(this.props.pointsData),
    })
  }
  
  onLineMove(x, y)
  {
    var scoreDiff = y - this.state.initialLineY;
    var newPointsData = Util.deeperCloneArr(this.state.initialLinePoints).map(point => {
      point.score = Util.valueMinMax(point.score + scoreDiff, 0, 1);
      return point;
    });
    
    this.updatePointsData(newPointsData);
  }
  
  onDelete(pointId)
  {
    var newPointsData = this.props.pointsData.reduce((pointsData, point) => {
      if(point.id !== pointId && ! this.state.selectedPointIds.find(id => id === point.id))
      {
        pointsData.push(point);
      }
      return pointsData;
    }, []);
    
    this.updatePointsData(newPointsData);
  }
  
  onCreate(value, score)
  {
    var index = 0;
    while(this.props.card.scorePoints[index] && this.props.card.scorePoints[index].value < value)
    {
      index ++;
    }
    var newPoints = Util.deeperCloneArr(this.props.pointsData);
    newPoints.splice(index, 0, {
      value: value,
      score: score,
      id: 'sp-' + Util.randInt(123456789),
    });
    
    this.updatePointsData(newPoints);
  }
  
  getChartState(overrideState?: any) {
    overrideState = overrideState || {};
    
    var pointsData = (overrideState.pointsData || this.props.pointsData).map((scorePoint) => ({
      x: scorePoint.value,
      y: scorePoint.score,
      id: scorePoint.id,
      selected: !! this.state.selectedPointIds.find(id => id === scorePoint.id),
    }));
    
    var chartState = {
      barsData: overrideState.barsData || this.props.barsData,
      pointsData: pointsData,
      domain: overrideState.domain || this.props.domain,
      onMove: this.onPointMove,
      onLineClick: this.onLineClick,
      onLineMove: this.onLineMove,
      spotlights: overrideState.spotlights || this.props.spotlights,
      inputKey: overrideState.inputKey || this.props.inputKey,
      onSelect: this.onSelect,
      onDelete: this.onDelete,
      onCreate: this.onCreate,
      onPointMoveStart: this.onPointMoveStart,
      width: overrideState.width || this.state.width,
      height: overrideState.height || this.state.height,
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