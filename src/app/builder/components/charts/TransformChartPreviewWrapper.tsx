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

// Copyright 2018 Terrain Data, Inc.

// tslint:disable:no-empty restrict-plus-operands strict-boolean-expressions

import * as Immutable from 'immutable';
import * as _ from 'lodash';
const { List, Map } = Immutable;
import Colors from 'app/colors/Colors';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import TerrainComponent from '../../../common/components/TerrainComponent';

interface ScorePoint
{
  id: string;
  score: number;
  value: number;
  set: (f: string, v: any) => ScorePoint;
}
export type ScorePoints = List<ScorePoint>;

const ZOOM_FACTOR = 2.0;

import TransformChartPreview from './TransformChartPreview';

export interface Props
{
  points: ScorePoints;
  domain: List<number>;
  range: List<number>;
  height: number;
  width: number;
  mode: string;
}

// http://nicolashery.com/integrating-d3js-visualizations-in-a-react-app/

class TransformChartPreviewWrapper extends TerrainComponent<Props>
{

  public componentDidMount()
  {
    const el = ReactDOM.findDOMNode(this);
    TransformChartPreview.create(el, this.getChartState());
  }

  public componentDidUpdate()
  {
    TransformChartPreview.update(ReactDOM.findDOMNode(this), this.getChartState());
  }

  public getChartState()
  {

    const points = this.props.points.map((scorePoint) => ({
      x: scorePoint.value,
      y: scorePoint.score,
      id: scorePoint.id,
      selected: false,
    }));

    const chartState = {
      pointsData: points.toJS(),
      domain: {
        x: this.props.domain.toJS(),
        y: this.props.range.toJS(),
      },
      width: this.props.width,
      height: this.props.height,
      colors: [Colors().builder.cards.categories.score, Colors().bg3],
      mode: this.props.mode,
    };

    return chartState;
  }

  public componentWillUnmount()
  {
    const el = ReactDOM.findDOMNode(this);
    TransformChartPreview.destroy(el);
  }

  public render()
  {
    return (
      <div />
    );
  }
}
export default TransformChartPreviewWrapper;
