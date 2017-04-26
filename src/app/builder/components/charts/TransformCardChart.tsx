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
let {List, Map} = Immutable;
import * as _ from 'underscore';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import Util from '../../../util/Util';
import PureClasss from '../../../common/components/PureClasss';
import { BuilderTypes } from './../../BuilderTypes';

type ScorePoint = {
  id: string;
  score: number;
  value: number;
  set: (f: string, v: any) => ScorePoint;
}
type ScorePoints = List<ScorePoint>;

import TransformChart from './TransformChart';

export interface Props 
{
  points: ScorePoints;
  bars: any;
  domain: List<number>;
  range: List<number>;
  canEdit: boolean;
  inputKey: string;
  updatePoints: (points:ScorePoints, released?: boolean) => void;
  width: number;

  spotlights: any;// TODO spawtlights
}

// http://nicolashery.com/integrating-d3js-visualizations-in-a-react-app/

class TransformCardChart extends PureClasss<Props>
{
  state: {
    selectedPointIds: IMMap<string, boolean>;
    lastSelectedPointId?: string;
    initialScore?: number;
    initialValue?: number;
    initialPoints?: ScorePoints;
    initialLineY?: number;
    // these move seeds are use to identify fluid point movements, which should all be undone in the same action
    moveSeed: number;
    movedSeed: number;
  } = {
    selectedPointIds: Map<string, boolean>({}),
    moveSeed: 0,
    movedSeed: -1,
  };

  componentDidMount()
  {
    var el = ReactDOM.findDOMNode(this);
    TransformChart.create(el, this.getChartState());
  }

  onSelect(pointId: string, selectRange: boolean): void
  {
    let {points} = this.props;
    var {selectedPointIds} = this.state;

    if(pointId)
    {
      if(selectRange)
      {
        selectedPointIds = selectedPointIds.set(pointId, true);
        let firstIndex = points.findIndex(point => point.id === pointId);
        let secondIndex = points.findIndex(point => point.id === this.state.lastSelectedPointId);
        if(firstIndex !== -1 && secondIndex !== -1)
        {
          _.range(
            Math.min(firstIndex, secondIndex),
            Math.max(secondIndex, firstIndex)
          ).map(index =>
            selectedPointIds = selectedPointIds.set(points.get(index).id, true)
          );
        }
      }
      else
      {
        // clicking on a single point with shift or ctrl
        selectedPointIds = selectedPointIds.set(pointId, ! selectedPointIds.get(pointId));
      }
    }
    else
    {
      selectedPointIds = Map<string, boolean>({});
    }
    // else, a click to unselect things

    this.setState({
      selectedPointIds,
      lastSelectedPointId: pointId,
    });

    TransformChart.update(ReactDOM.findDOMNode(this), this.getChartState(selectedPointIds));
  }

  updatePoints(points: ScorePoints, isConcrete?: boolean)
  {
    points = points.map(
      scorePoint =>
        scorePoint
          .set('score', Util.roundNumber(scorePoint.score, 4))
          .set('value', Util.roundNumber(scorePoint.value, 4))
    ).toList();
    this.props.updatePoints(points, isConcrete);
  }

  onPointMoveStart(initialScore, initialValue)
  {
    this.setState({
      initialScore,
      initialValue,
      initialPoints: this.props.points,
      moveSeed: this.state.moveSeed + 1,
    });
  }

  sortNumber(a, b)
  {
    return a - b;
  }

  onPointMove(pointId, newScore, newValue, pointValues, cx, altKey)
  {
    var scoreDiff = this.state.initialScore - newScore;
    var valueDiff = this.state.initialValue - newValue;
    pointValues.sort(this.sortNumber);
    var pointIndex = this.props.points.findIndex(scorePoint => scorePoint.id === pointId);
    var points = this.state.initialPoints.map(scorePoint => {
      if(scorePoint.id === pointId || this.state.selectedPointIds.get(scorePoint.id))
      {
        scorePoint = scorePoint.set('score', Util.valueMinMax(scorePoint.score - scoreDiff, 0, 1));
        if(!(this.state.selectedPointIds.size > 1) && !altKey)
        {
          var index = pointValues.indexOf(cx);
          if(index < 0)
          {
            var min = scorePoint.value - valueDiff;
            var max = scorePoint.value - valueDiff;
          }
          else
          {
            min = (index - 1) >= 0 ?
                    Math.max(this.props.domain.get(0), pointValues[index - 1]+.01)
                    : this.props.domain.get(0);
            max = (index + 1) < pointValues.length ?
                    Math.min(this.props.domain.get(1), pointValues[index + 1]-.01)
                    : this.props.domain.get(1);
          }
          scorePoint = scorePoint.set('value', Util.valueMinMax(scorePoint.value - valueDiff, min, max));
        }
      }
      return scorePoint;
    });

    let isConcrete = this.state.moveSeed !== this.state.movedSeed;
    this.setState({
      movedSeed: this.state.moveSeed,
    });
    this.updatePoints(points.toList(), isConcrete);
  }

  onPointRelease()
  {
  }

  onLineClick(x, y)
  {
    this.setState({
      lineMoving: true,
      initialLineY: y,
      initialPoints: this.props.points,
    })
  }

  onLineMove(x, y)
  {
    var scoreDiff = y - this.state.initialLineY;

    this.updatePoints(this.state.initialPoints.map(
      point => point.set('score', Util.valueMinMax(point.score + scoreDiff, 0, 1))
    ).toList());
  }

  onDelete(pointId)
  {
    this.updatePoints(this.props.points.filterNot(
      point => point.id === pointId || this.state.selectedPointIds.get(point.id)
    ).toList(), true);
  }

  onCreate(value, score)
  {
    let {points} = this.props;
    var index = 0;
    while(points.get(index) && points.get(index).value < value)
    {
      index ++;
    }

    this.updatePoints(points.splice(index, 0,
      BuilderTypes.make(BuilderTypes.Blocks.scorePoint, {
        value,
        score,
      })
    ).toList(), true);
  }

  componentDidUpdate()
  {
    TransformChart.update(ReactDOM.findDOMNode(this), this.getChartState());
  }

  getChartState(overrideState?: any) {
    overrideState = overrideState || {};

    var points = (overrideState.points || this.props.points).map((scorePoint) => ({
      x: scorePoint.value,
      y: scorePoint.score,
      id: scorePoint.id,
      selected: !! this.state.selectedPointIds.get(scorePoint.id),
    }));

    var chartState = {
      barsData: (overrideState.bars || this.props.bars).toJS(),
      pointsData: points.toJS(),
      domain: {
        x: (overrideState && overrideState.domain && overrideState.domain.toJS()) || this.props.domain.toJS(),
        y: this.props.range.toJS(),
      },
      onMove: this.onPointMove,
      onRelease: this.onPointRelease,
      onLineClick: this.onLineClick,
      onLineMove: this.onLineMove,
      spotlights: overrideState.spotlights || this.props.spotlights || [], // TODO toJS()
      onSelect: this.onSelect,
      onDelete: this.onDelete,
      onCreate: this.onCreate,
      onPointMoveStart: this.onPointMoveStart,
      width: overrideState.width || this.props.width,
      height: 300,
      canEdit: this.props.canEdit,
      inputKey: overrideState.inputKey || this.props.inputKey,
    };

    return chartState;
  }

  componentWillUnmount() {
    var el = ReactDOM.findDOMNode(this);
    TransformChart.destroy(el);
  }

	render() {
    return (
      <div />
		);
	}
}
export default TransformCardChart;
