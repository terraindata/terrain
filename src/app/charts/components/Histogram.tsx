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

// tslint:disable:no-var-requires switch-default strict-boolean-expressions restrict-plus-operands
import * as classNames from 'classnames';
import * as Immutable from 'immutable';
import * as _ from 'lodash';
import * as Radium from 'radium';
import * as React from 'react';
import
{
  createContainer,
  VictoryArea,
  VictoryAxis,
  VictoryBar,
  VictoryBrushContainer,
  VictoryChart,
  VictoryGroup,
  VictoryLegend,
  VictoryPortal,
  VictoryScatter,
  VictoryTheme,
  VictoryTooltip,
} from 'victory';
import ColorManager from '../../util/ColorManager';
import { backgroundColor, borderColor, Colors, fontColor } from './../../common/Colors';
import TerrainComponent from './../../common/components/TerrainComponent';

export interface Props
{
  data: BarData[];
  height?: number;
  width?: number;
  showLabels?: boolean;
  xCategories?: string[];
  yCategories?: string[];
  onBarClick?: () => void;
  onBarHover?: () => void;
  horizontal?: boolean;
  parentStyle?: any;
  barStyle?: any;
  barWidth?: number;
}

interface BarData
{
  x: number;
  y: number;
}

@Radium
class Histogram extends TerrainComponent<Props> {

  public state: {
    xValues: number[],
    yValues: number[],
    barWidth: number,
  } = {
    xValues: [],
    yValues: [],
    barWidth: 0,
  };

  public getBarWidth()
  {
    if (this.props.barWidth !== undefined && this.props.barWidth > 0)
    {
      return this.props.barWidth;
    }
    const width = this.props.width !== undefined ? this.props.width : 300;
    const numBars = this.props.data.length;
    if (numBars > 0)
    {
      return width / numBars;
    }
    return 0;
  }

  public parseData()
  {
    const barWidth = this.getBarWidth();
    return this.props.data.map((data) => _.extend({}, data, { width: barWidth }));
  }

  public render()
  {
    const data = this.parseData();
    const { height, width, showLabels, xCategories, yCategories, onBarClick, onBarHover,
      horizontal, parentStyle, barStyle } = this.props;
    return (
      <VictoryChart
        theme={VictoryTheme.material}
        height={height !== undefined ? height : 300}
        width={width !== undefined ? width : 300}
        domainPadding={10}
      >
        <VictoryBar
          style={{
            data: {
              fill: Colors().active,
            },
          }}
          data={this.props.data}
        />
      </VictoryChart>
    );
  }
}

export default Histogram;
