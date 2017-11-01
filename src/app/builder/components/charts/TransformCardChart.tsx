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

// tslint:disable:no-empty restrict-plus-operands strict-boolean-expressions

import * as Immutable from 'immutable';
import * as _ from 'lodash';
const { List, Map } = Immutable;
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as BlockUtils from '../../../../blocks/BlockUtils';
import { AllBackendsMap } from '../../../../database/AllBackends';
import TerrainComponent from '../../../common/components/TerrainComponent';
import Util from '../../../util/Util';
import Actions from '../../data/BuilderActions';

interface ScorePoint
{
  id: string;
  score: number;
  value: number;
  set: (f: string, v: any) => ScorePoint;
}
type ScorePoints = List<ScorePoint>;

const ZOOM_FACTOR = 2.0;

import TransformChart from './TransformChart';

export interface Props
{
  points: ScorePoints;
  bars: any;
  domain: List<number>;
  range: List<number>;
  keyPath: KeyPath;
  canEdit: boolean;
  inputKey: string;
  updatePoints: (points: ScorePoints, released?: boolean) => void;
  onRequestDomainChange: (domain: List<number>, overrideMaxDomain: boolean) => void;
  onRequestZoomToData: () => void;
  width: number;
  language: string;
  colors: [string, string];
  spotlights: any; // TODO spawtlights
  mode: string;
}

// http://nicolashery.com/integrating-d3js-visualizations-in-a-react-app/

class TransformCardChart extends TerrainComponent<Props>
{
  public state: {
    pointsCache: ScorePoints; //  this component points
    pointsBuffer: ScorePoints; // parent component points
    selectedPointIds: IMMap<string, boolean>;
    lastSelectedPointId?: string;
    initialScore?: number;
    initialValue?: number;
    initialPoints?: ScorePoints;
    initialLineY?: number;
    // these move seeds are use to identify fluid point movements, which should all be undone in the same action
    moveSeed: number;
    movedSeed: number;
    dragging: boolean;
    // Save state of all modes of cards so that they go back during mode-change
    linearPoints: ScorePoints,
    normalPoints: ScorePoints,
    exponentialPoints: ScorePoints,
    logarithmicPoints: ScorePoints, // consider combining log/exp
    sigmoidPoints: ScorePoints,
  } = {
    pointsCache: this.props.points,
    pointsBuffer: null,
    selectedPointIds: Map<string, boolean>({}),
    moveSeed: 0,
    movedSeed: -1,
    dragging: false,
    linearPoints: null,
    normalPoints: null,
    exponentialPoints: null,
    logarithmicPoints: null, // consider combining log/exp
    sigmoidPoints: null,
  };

  constructor(props: Props)
  {
    super(props);
    this.debouncedUpdatePoints = _.debounce(this.debouncedUpdatePoints, 300);
  }

  public componentDidMount()
  {
    const el = ReactDOM.findDOMNode(this);
    TransformChart.create(el, this.getChartState());
  }

  public onSelect(pointId: string, selectRange: boolean): void
  {
    const { points } = this.props;
    let { selectedPointIds } = this.state;

    if (pointId)
    {
      if (selectRange)
      {
        selectedPointIds = selectedPointIds.set(pointId, true);
        const firstIndex = points.findIndex((point) => point.id === pointId);
        const secondIndex = points.findIndex((point) => point.id === this.state.lastSelectedPointId);
        if (firstIndex !== -1 && secondIndex !== -1)
        {
          _.range(
            Math.min(firstIndex, secondIndex),
            Math.max(secondIndex, firstIndex),
          ).map((index) =>
            selectedPointIds = selectedPointIds.set(points.get(index).id, true),
          );
        }
      }
      else
      {
        // clicking on a single point with shift or ctrl
        selectedPointIds = selectedPointIds.set(pointId, !selectedPointIds.get(pointId));
      }
    }
    else
    {
      selectedPointIds = Map<string, boolean>();
    }
    // else, a click to unselect things

    this.setState({
      selectedPointIds,
      lastSelectedPointId: pointId,
    });

    TransformChart.update(ReactDOM.findDOMNode(this), this.getChartState(selectedPointIds));
  }

  // gets turned into debounced function/object
  public debouncedUpdatePoints: any = (points, lastUpdateConcrete) =>
  {
    this.props.updatePoints(points, lastUpdateConcrete);
  }

  public updatePoints(points: ScorePoints, isConcrete?: boolean)
  {
    const domainRange = this.props.domain.get(1) - this.props.domain.get(0);
    const valueDecimalPoints = 4 - Math.floor(Math.log10(domainRange));

    points = points.map(
      (scorePoint) =>
        scorePoint
          .set('score', Util.roundNumber(scorePoint.score, 4))
          .set('value', Util.roundNumber(scorePoint.value, valueDecimalPoints)),
    ).toList();
    this.setState({
      pointsCache: points,
      pointsBuffer: null,
    });
    this.debouncedUpdatePoints(points, isConcrete);
    if (isConcrete)
    {
      this.debouncedUpdatePoints.flush();
    }
  }

  public onPointMoveStart(initialScore, initialValue)
  {
    this.setState({
      initialScore,
      initialValue,
      initialPoints: this.state.pointsCache,
      moveSeed: this.state.moveSeed + 1,
      dragging: true,
    });
  }

  public sortNumber(a, b)
  {
    return a - b;
  }

  public onPointMove(pointName, pointId, newScore, newValue, pointValues, pointScores, cx, altKey)
  {
    const scoreDiff = this.state.initialScore - newScore;
    const valueDiff = this.state.initialValue - newValue;
    pointValues.sort(this.sortNumber);
    const pointIndex = this.state.pointsCache.findIndex((scorePoint) => scorePoint.id === pointId);
    let min: number;
    let max: number;
    let points;

    // If the point is the average in a normal curve, move all points so that std_dev remains the same
    if (pointName === 'Average')
    {
      points = this.state.initialPoints.map((scorePoint, i) =>
      {
        // TODO SET SCORE SO THAT STD DEV IS SAME...
        scorePoint = scorePoint.set('score', Util.valueMinMax(scorePoint.score - scoreDiff, 0, 1));
        const domainMin = this.props.domain.get(0);
        const domainMax = this.props.domain.get(1);
        const domainRange = domainMax - domainMin;
        min = (i - 1) >= 0 ?
          Math.max(this.props.domain.get(0), pointValues[i - 1] + domainRange / 1000)
          : domainMin;
        max = (i + 1) < pointValues.length ?
          Math.min(this.props.domain.get(1), pointValues[i + 1] - domainRange / 1000)
          : domainMax;
        scorePoint = scorePoint.set('value', Util.valueMinMax(scorePoint.value - valueDiff, min, max));
        return scorePoint;
      });
    }

    else if (this.props.mode === 'sigmoid' && pointName === 'x0')
    {
      points = this.state.initialPoints.map((scorePoint, i) =>
      {
        scorePoint = scorePoint.set('score', Util.valueMinMax(scorePoint.score - scoreDiff, 0, 1));
        const domainMin = this.props.domain.get(0);
        const domainMax = this.props.domain.get(1);
        const domainRange = domainMax - domainMin;
        min = (i - 1) >= 0 ?
          Math.max(this.props.domain.get(0), pointValues[i - 1] + domainRange / 1000)
          : domainMin;
        max = (i + 1) < pointValues.length ?
          Math.min(this.props.domain.get(1), pointValues[i + 1] - domainRange / 1000)
          : domainMax;
        scorePoint = scorePoint.set('value', Util.valueMinMax(scorePoint.value - valueDiff, min, max));
        return scorePoint;
      });
    }
    else if (this.props.mode === 'sigmoid' && pointName === 'k')
    {
      const x0 = pointValues[2];
      const L = pointScores[3];
      const a = pointScores[0];
      points = this.state.initialPoints.map((scorePoint, i) =>
      {
        if (scorePoint.id === pointId)
        {
          // constrain score to be between L and a scores
          let value = 0;
          if (a > L)
          {
            value = Util.valueMinMax(scorePoint.score - scoreDiff, L, a);
          }
          else
          {
            value = Util.valueMinMax(scorePoint.score - scoreDiff, a, L);
          }
          scorePoint = scorePoint.set('score', value);
          scorePoint = scorePoint.set('value', Util.valueMinMax(scorePoint.value - valueDiff, pointValues[0], x0 - 0.001 * x0));
        }
        return scorePoint;
      });
    }

    else
    {
      points = this.state.initialPoints.map((scorePoint) =>
      {
        if (scorePoint.id === pointId || this.state.selectedPointIds.get(scorePoint.id))
        {
          scorePoint = scorePoint.set('score',
            Util.valueMinMax(scorePoint.score - scoreDiff, this.props.mode === 'exponential' ? 0.001 : 0, 1));
          if (!(this.state.selectedPointIds.size > 1) && !altKey)
          {
            const index = pointValues.indexOf(cx);
            if (index < 0)
            {
              min = scorePoint.value - valueDiff;
              max = scorePoint.value - valueDiff;
            }
            else
            {
              const domainMin = this.props.domain.get(0);
              const domainMax = this.props.domain.get(1);
              const domainRange = domainMax - domainMin;

              min = (index - 1) >= 0 ?
                Math.max(this.props.domain.get(0), pointValues[index - 1] + domainRange / 1000)
                : domainMin;
              max = (index + 1) < pointValues.length ?
                Math.min(this.props.domain.get(1), pointValues[index + 1] - domainRange / 1000)
                : domainMax;
            }
            if (this.props.mode === 'logarithmic' && min === 0)
            {
              min = 0.0011 * (this.props.domain.get(1) - this.props.domain.get(0));
            }
            if (this.props.mode === 'normal')
            {
              max = max - 0.01 * (this.props.domain.get(1) - this.props.domain.get(0));
            }
            scorePoint = scorePoint.set('value', Util.valueMinMax(scorePoint.value - valueDiff, min, max));
          }
        }
        return scorePoint;
      });
    }

    const isConcrete = this.state.moveSeed !== this.state.movedSeed;
    this.setState({
      movedSeed: this.state.moveSeed,
    });
    this.updatePoints(points.toList(), isConcrete);
  }

  public onPointRelease()
  {
    this.debouncedUpdatePoints.flush();
    this.setState({
      dragging: false,
    });
    if (this.state.pointsBuffer !== null)
    {
      this.setState({
        pointsCache: this.state.pointsBuffer,
        pointsBuffer: null,
      });
    }
  }

  public onLineClick(x, y)
  {
    this.setState({
      initialLineY: y,
      initialPoints: this.state.pointsCache,
    });
  }

  public onLineMove(x, y)
  {
    const scoreDiff = y - this.state.initialLineY;

    this.updatePoints(this.state.initialPoints.map(
      (point) => point.set('score', Util.valueMinMax(point.score + scoreDiff, 0, 1)),
    ).toList());
  }

  public onDelete(pointId)
  {
    this.updatePoints(this.state.pointsCache.filterNot(
      (point) => point.id === pointId || this.state.selectedPointIds.get(point.id),
    ).toList(), true);
  }

  public onCreate(value, score, updatePoints = true)
  {
    if (score < 0)
    {
      score = 0;
    }
    // const { points } = this.props;
    const points = this.state.pointsCache;
    let index = 0;
    while (points.get(index) && points.get(index).value < value)
    {
      index++;
    }
    const newPoint = BlockUtils.make(
      AllBackendsMap[this.props.language].blocks, 'scorePoint', {
        value,
        score,
      },
    );
    if (updatePoints)
    {
      this.updatePoints(
        points.splice(index, 0, newPoint,
        ).toList(),
        true,
      );
    }
    return newPoint;
  }

  public changeDomain(domain, override = false)
  {
    if (isNaN(domain.get(0)) || isNaN(domain.get(1)) || domain.get(0) >= domain.get(1))
    {
      return;
    }
    this.props.onRequestDomainChange(domain, override);
  }

  public onZoom(el, mouse, zoomFactor)
  {
    const canvasWidth = el.select('.inner-svg').attr('width');
    const mousePositionRatio = canvasWidth < 1 ? 0 : mouse[0] / canvasWidth;
    const currentMin = this.props.domain.get(0);
    const currentMax = this.props.domain.get(1);
    const domainWidth = currentMax - currentMin;
    const spreadDistance = domainWidth / zoomFactor * 0.5;
    const mouseDomainPosition = currentMin + mousePositionRatio * domainWidth;
    const newDomain = List([mouseDomainPosition - spreadDistance, mouseDomainPosition + spreadDistance]);
    this.changeDomain(newDomain);
  }

  public onZoomIn(el, mouse)
  {
    this.onZoom(el, mouse, ZOOM_FACTOR);
  }

  public onZoomOut(el, mouse)
  {
    this.onZoom(el, mouse, 1.0 / ZOOM_FACTOR);
  }

  public onZoomToFit(el, mouse) // zoom to fit all bars data or all points
  {
    if (this.state.pointsCache && this.state.pointsCache.size > 0)
    {
      const max = this.state.pointsCache.max((a, b) => a.value - b.value).value;
      const min = this.state.pointsCache.min((a, b) => a.value - b.value).value;
      const tailWidth = this.state.pointsCache.size === 1 ? 1 : (max - min) * 0.05;
      this.changeDomain(List([min - tailWidth, max + tailWidth]), true);
    }
  }

  public onFitCurveToData()
  {
    const pointsMax = this.state.pointsCache.max((a, b) => a.value - b.value).value;
    const pointsMin = this.state.pointsCache.min((a, b) => a.value - b.value).value;
    const tailWidth = this.state.pointsCache.size === 1 ? 1 : (pointsMax - pointsMin) * 0.05;
    const pointsDomain = pointsMax - pointsMin + 2 * tailWidth;

    const domainPadding = 0.05 * (this.props.domain.get(1) - this.props.domain.get(0));
    const currDomain = this.props.domain.get(1) - this.props.domain.get(0) - 2 * domainPadding;
    const scaleFactor = currDomain / pointsDomain;
    const points = this.state.pointsCache.map((point) => {
      point = point.set('value', point.value * scaleFactor);
      return point;
    });
    this.updatePoints(points.toList(), );
  }

  public onZoomToData(el, mouse)
  {
    this.props.onRequestZoomToData();
  }

  public onClearAll(el, mouse)
  {
    this.updatePoints(List<ScorePoint>(), true);
  }

  public getContextOptions()
  {
    const options = {
      'Zoom in': this.onZoomIn,
      'Zoom out': this.onZoomOut,
      'Auto-center on curve': this.onZoomToFit,
      'Auto-center on data': this.onZoomToData,
      'Fit curve to data': this.onFitCurveToData,
    };
    if (this.props.mode === 'linear')
    {
      return _.extend({}, options, { 'Clear all points': this.onClearAll });
    }
    return options;
  }

  public componentDidUpdate()
  {
    TransformChart.update(ReactDOM.findDOMNode(this), this.getChartState());
  }

  public getChartState(overrideState?: any)
  {
    overrideState = overrideState || {};

    let points = (overrideState.points || this.state.pointsCache).map((scorePoint) => ({
      x: scorePoint.value,
      y: scorePoint.score,
      id: scorePoint.id,
      selected: !!this.state.selectedPointIds.get(scorePoint.id),
    }));
    const mode = overrideState.mode || this.props.mode;
    const xDomain = (overrideState && overrideState.domain && overrideState.domain.toJS()) || this.props.domain.toJS();

    // When the chart is in log/exp/normal mode, must restrict the # of points to 2
    if ((mode === 'logarithmic' || mode === 'normal' || mode === 'exponential')
      && this.state[mode + 'Points'] === null)
    {
      const pointsNeeded = 2;
      const oldSize = points.size;
      if (oldSize < pointsNeeded)
      {
        let scorePoints: ScorePoints = List([]);
        for (let i = oldSize; i < pointsNeeded; i++)
        {
          const value = Math.random() * (xDomain[1] - xDomain[0]) + xDomain[0];
          const score = Math.random();
          const p = this.onCreate(value, score, false);
          points = points.push({
            x: value,
            y: score,
            id: p.id,
            selected: false,
          });
          scorePoints = scorePoints.push(p);
        }
        this.updatePoints(scorePoints);
      }
      else if (oldSize > pointsNeeded)
      {
        for (let i = oldSize - 1; i >= pointsNeeded; i--)
        {
          const p = points.get(i);
          if (p !== undefined)
          {
            this.onDelete(points.get(i).id);
          }
        }
        points = points.splice(pointsNeeded);
      }
    }
    if (mode === 'sigmoid' && this.state.sigmoidPoints === null)
    {
      if (points.size !== 4)
      {
        const domainRange = xDomain[1] - xDomain[0];
        const values = [0.1 * domainRange, 0.56 * domainRange, 0.6 * domainRange, 0.9 * domainRange];
        const scores = [0.1, 0.344, 0.5, 0.9];
        let scorePoints: ScorePoints = List([]);
        for (let i = 0; i < 4; i++)
        {
          const p = this.onCreate(values[i], scores[i], false);
          points = points.push({
            x: values[i],
            y: scores[i],
            id: p.id,
            selected: false,
          });
          scorePoints = scorePoints.push(p);
        }
        this.updatePoints(scorePoints);
      }
    }

    const spotlights = overrideState.spotlights || this.props.spotlights || [];
    _.map(spotlights, (spotlight) =>
    {
      spotlight.id = spotlight.id.replace(/\.|#/g, '-');
      spotlight.primaryKey = spotlight.primaryKey.replace(/\.|#/g, '-');
    },
    );
    const chartState = {
      barsData: (overrideState.bars || this.props.bars).toJS(),
      pointsData: points.toJS(),
      domain: {
        x: xDomain,
        y: this.props.range.toJS(),
      },
      onMove: this.onPointMove,
      onRelease: this.onPointRelease,
      onLineClick: this.onLineClick,
      onLineMove: this.onLineMove,
      spotlights, // TODO toJS()
      onSelect: this.onSelect,
      onDelete: this.onDelete,
      onCreate: this.onCreate,
      onPointMoveStart: this.onPointMoveStart,
      width: overrideState.width || this.props.width,
      height: 300,
      canEdit: this.props.canEdit,
      inputKey: overrideState.inputKey || this.props.inputKey,
      colors: this.props.colors,
      contextOptions: this.getContextOptions(),
      mode,
    };

    return chartState;
  }

  public componentWillUnmount()
  {
    this.setState({
      dragging: false,
    });
    this.debouncedUpdatePoints.flush();
    const el = ReactDOM.findDOMNode(this);
    TransformChart.destroy(el);
  }

  // happens on undos/redos
  public componentWillReceiveProps(nextProps)
  {
    if (!this.state.dragging)
    {
      this.debouncedUpdatePoints.flush();
      this.setState({
        pointsCache: nextProps.points,
        pointsBuffer: null,
      });
    }
    else
    {
      this.setState({
        pointsBuffer: nextProps.points,
      });
    }
    // Mode changed, save points
    if (this.props.mode !== nextProps.mode)
    {
      const oldMode = this.props.mode + 'Points';
      const newMode = nextProps.mode + 'Points';
      this.setState({
        [oldMode]: nextProps.points,
        pointsCache: this.state[newMode] !== null ? this.state[newMode] : this.state.pointsCache,
      });
    }
  }

  public render()
  {
    return (
      <div />
    );
  }
}
export default TransformCardChart;
