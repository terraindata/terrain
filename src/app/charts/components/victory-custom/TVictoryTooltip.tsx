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
import TerrainVictoryTheme from 'charts/TerrainVictoryTheme';
import { omit, random, round } from 'lodash';
import * as moment from 'moment';
import * as React from 'react';
import { Border, VictoryLegend } from 'victory';

const CustomLabel = (props) =>
{
  return (
    <text dy={5} x={props.x} y={props.y} style={props.style} >
      <tspan style={{ fontWeight: 'bold' }}>{round(props.datum.value, 3)}</tspan>
      <tspan dx={10} style={{ fill: 'white' }}>{props.datum.reference}</tspan>
    </text>
  );
};

interface TVictoryTooltipProps
{
  xDataKey: string;
  dateFormat: string;
  tooltipStyle: any;
  datum?: any;
  text?: any;
  style?: any;
}

const TVictoryTooltip = (props: TVictoryTooltipProps) =>
{
  const {
    datum,
    text,
    xDataKey,
    style,
    dateFormat,
    tooltipStyle,
  } = props;

  const data = text.map((t) =>
  {
    const parsedText = t.split('|');
    const value = round(parsedText[1], 3);
    return {
      id: parsedText[0],
      value,
      // set the full label text in the 'name' key so the legend border width
      // is correctly calculated
      name: `${value} ${parsedText[2]}`,
      reference: parsedText[2],
      symbol: { fill: parsedText[3] },
      labels: {
        ...omit(style[0], ['textAnchor']),
        fill: parsedText[3],
      },
    };
  });

  const timestamp = datum[xDataKey];
  const date = moment(timestamp);
  const title = date.format(dateFormat);

  const labelComponent = <CustomLabel />;

  return (
    <VictoryLegend
      theme={TerrainVictoryTheme}
      standalone={false}
      x={10}
      y={50}
      padding={0}
      gutter={20}
      data={data}
      orientation={'vertical'}
      style={tooltipStyle}
      title={title}
      labelComponent={labelComponent}
      borderComponent={<Border
        // need to change this prop so the border re-renders
        className={`custom-tooltip-label-${random(0, 100)}`}
      />}
    />
  );
};

export default TVictoryTooltip;
