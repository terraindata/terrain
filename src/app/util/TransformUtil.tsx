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

//  tslint:disable:no-bitwise no-console

/*
  This file contains all the functionality for getting points data for the parameterized transform curves
  It is used by the TransformChart to draw lines and the Elastic Transform Card to pass data into the PWL script

  Logarithmic:
    Two different functions are used for growth versus decay to get the desired shape of the curve.
    For growth the curve is shifted so that x is small (relative to range) and then shifted back, to maximize curviness!

  Exponential:
    The curve is shifted down so that the lower point is at 0, the curve is built and then it is shifted back up
    This helps make the curve look more curvy and less linear

  Normal:
    The two halves of the graph are calculated using points 0 and 2 as the standard deviations, and this data
    is merged together

  Sigmoid:
    The fourth point is used to get L (the upper bound) and the first is used as a (lower bound)
    The third point is used as x0, the center x point of the sigmoid curve
    The second points is then used to calculate k, the steepness of the curve
    In the future, the fourth and first point might no longer be necessary if the curve is bounded between 0 and 1.
 */

'use strict';

import Util from './Util';

const NORMAL_CONSTANT = 1 / Math.sqrt(2 * Math.PI);

export const NUM_CURVE_POINTS = {
  logarithmic: 2,
  exponential: 2,
  normal: 3,
  sigmoid: 4,
};

const TransformUtil = {

  getLogarithmicData(numPoints, pointsData, domainMin, domainMax)
  {
    let x1: number = pointsData[0].x || pointsData[0].value;
    const y1: number = pointsData[0].y || pointsData[0].score;
    let x2: number = pointsData[1].x || pointsData[1].value;
    const y2: number = pointsData[1].y || pointsData[1].score;

    const ranges = [];
    const outputs = [];
    const stepSize = Math.abs(x2 - x1) * (1 / numPoints);
    // Decay
    if (y1 > y2)
    {
      const yMax = y1 + 0.05;
      const k = (Math.log(yMax - y1) - Math.log(yMax - y2)) / (x1 - x2);
      const b = x2 - Math.log(yMax - y2) / k;
      let x = x1;
      for (let i = 0; i <= numPoints; i++)
      {
        const y = -1 * Math.exp(k * (x - b)) + yMax;
        ranges.push(x);
        outputs.push(y);
        x += stepSize;
      }
    }
    // Growth
    else
    {
      const shift = x1 - 0.005 * (domainMax - domainMin);
      x1 = x1 - shift;
      x2 = x2 - shift;
      const a: number = (y1 - y2 * (Math.log(x1) / Math.log(x2))) / (1 - Math.log(x1) / Math.log(x2));
      const b: number = (y2 - a) / Math.log(x2);
      let x = x1;
      for (let i = 0; i <= numPoints; i++)
      {
        const y = TransformUtil._logarithmic(x, a, b);
        ranges.push(x + shift);
        outputs.push(y);
        x += stepSize;
      }
    }
    return { ranges, outputs };
  },

  _logarithmic(x: number, a: number, b: number)
  {
    return a + b * Math.log(x);
  },

  // Given a logarithmic x value and all of the points data, return the y value for the x
  getLogarithmicY(x: number, pointsData, domainMin, domainMax)
  {
    let x1: number = pointsData[0].x || pointsData[0].value;
    const y1: number = pointsData[0].y || pointsData[0].score;
    let x2: number = pointsData[1].x || pointsData[1].value;
    const y2: number = pointsData[1].y || pointsData[1].score;
    if (x >= x2)
    {
      return y2;
    }
    if (x <= x1)
    {
      return y1;
    }
    if (y1 > y2)
    {
      const yMax = y1 + 0.05;
      const k = (Math.log(yMax - y1) - Math.log(yMax - y2)) / (x1 - x2);
      const b = x2 - Math.log(yMax - y2) / k;
      return -1 * Math.exp(k * (x - b)) + yMax;
    }
    else
    {
      const shift = x1 - 0.005 * (domainMax - domainMin);
      x1 = x1 - shift;
      x2 = x2 - shift;
      const a: number = (y1 - y2 * (Math.log(x1) / Math.log(x2))) / (1 - Math.log(x1) / Math.log(x2));
      const b: number = (y2 - a) / Math.log(x2);
      return TransformUtil._logarithmic(x - shift, a, b);
    }
  },

  getExponentialData(numPoints, pointsData)
  {
    const x1: number = pointsData[0].x || pointsData[0].value;
    let y1: number = pointsData[0].y || pointsData[0].score;
    const x2: number = pointsData[1].x || pointsData[1].value;
    let y2: number = pointsData[1].y || pointsData[1].score;

    const shift = y2 < y1 ? y2 - 0.001 : y1 - 0.001;
    y1 -= shift;
    y2 -= shift;
    const ranges = [];
    const outputs = [];
    let x = x1;
    const stepSize = (x2 - x1) / numPoints;
    const lambda = (Math.log(y2) / x1 - Math.log(y1) / x1) / (1 - x2 / x1);
    const a = y2 / Math.exp(-1 * lambda * x2);
    for (let i = 0; i <= numPoints; i++)
    {
      const y = TransformUtil._exponential(x, lambda, a);
      outputs.push(y + shift);
      ranges.push(x);
      x += stepSize;
    }
    return { ranges, outputs };
  },

  _exponential(x, lambda, A)
  {
    return A * Math.exp(-1 * lambda * x);
  },

  getExponentialY(x, pointsData, domainMin?, domainMax?)
  {
    const x1: number = pointsData[0].x || pointsData[0].value;
    let y1: number = pointsData[0].y || pointsData[0].score;
    const x2: number = pointsData[1].x || pointsData[1].value;
    let y2: number = pointsData[1].y || pointsData[1].score;

    if (x >= x2)
    {
      return y2;
    }
    if (x <= x1)
    {
      return y1;
    }
    const shift = y2 < y1 ? y2 - 0.001 : y1 - 0.001;
    y1 -= shift;
    y2 -= shift;
    const lambda = (Math.log(y2) / x1 - Math.log(y1) / x1) / (1 - x2 / x1);
    const a = y2 / Math.exp(-1 * lambda * x2);
    return TransformUtil._exponential(x, lambda, a) + shift;
  },

  getNormalData(numPoints, pointsData, domainMin, domainMax)
  {
    console.log(pointsData);
    const average = pointsData[1].x || pointsData[1].value;
    let leftPoint = (pointsData[0].x || pointsData[0].value);
    const rightPoint = pointsData[2].x || pointsData[2].value;
    const averageHeight = pointsData[1].y || pointsData[1].score;
    // Left half of data
    leftPoint = leftPoint > 0 ? leftPoint : 0.001;
    let stdDev = Math.abs(average - leftPoint);
    let maxY = TransformUtil._normal(average, average, stdDev);
    let scaleFactor = averageHeight / maxY;
    const left = TransformUtil._getNormalDataSubset(average, stdDev, domainMin, average, scaleFactor, Math.floor(numPoints / 2));

    // Right half of data
    stdDev = Math.abs(rightPoint - average);
    maxY = TransformUtil._normal(average, average, stdDev);
    scaleFactor = averageHeight / maxY;
    const right = TransformUtil._getNormalDataSubset(average, stdDev, average, domainMax, scaleFactor, Math.floor(numPoints / 2));
    console.log(left.xData.concat(right.xData));
    console.log(left.yData.concat(right.yData));
    return { ranges: left.xData.concat(right.xData), outputs: left.yData.concat(right.yData) };
  },

  _getNormalDataSubset(average, stdDev, min, max, scaleFactor, numPoints)
  {
    const xData = [];
    const yData = [];
    const stepSize = (max - min) / numPoints;
    for (let i = min; i <= max; i += stepSize)
    {
      const y = TransformUtil._normal(i, average, stdDev);
      xData.push(i);
      yData.push(y * scaleFactor);
    }
    return { xData, yData };
  },

  _normal(x, average, stdDev)
  {
    x = (x - average) / stdDev;
    return NORMAL_CONSTANT * Math.exp(-.5 * x * x) / stdDev;
  },

  getNormalY(x, pointsData, domainMin, domainMax)
  {
    const average = pointsData[1].x || pointsData[1].value;
    const averageHeight = pointsData[1].y || pointsData[1].score;
    // Left half
    if (x < average)
    {
      const leftPoint = pointsData[0].x || pointsData[0].value;
      const stdDev = Math.abs(average - leftPoint);
      const maxY = TransformUtil._normal(average, average, stdDev);
      const scaleFactor = averageHeight / maxY;
      return TransformUtil._normal(x, average, stdDev) * scaleFactor;
    }
    else
    {
      const rightPoint = pointsData[2].x || pointsData[2].value;
      const stdDev = Math.abs(average - rightPoint);
      const maxY = TransformUtil._normal(average, average, stdDev);
      const scaleFactor = averageHeight / maxY;
      return TransformUtil._normal(x, average, stdDev) * scaleFactor;
    }
  },

  getSigmoidData(numPoints, pointsData, domainMin: number, domainMax: number)
  {
    const a: number = pointsData[0].y || pointsData[0].score;
    const xVal: number = pointsData[1].x || pointsData[1].value;
    const yVal: number = pointsData[1].y || pointsData[1].score;
    const x0: number = pointsData[2].x || pointsData[2].value;
    const y3: number = pointsData[3].y || pointsData[3].score;
    const L: number = y3 - a;
    const k: number = (-1 * Math.log(L / (yVal - a) - 1)) / (xVal - x0);

    const ranges = [];
    const outputs = [];
    const stepSize: number = (domainMax - domainMin) * (1 / numPoints);
    for (let i = domainMin; i <= domainMax; i += stepSize)
    {
      const y = TransformUtil._sigmoid(i, a, k, x0, L);
      ranges.push(i);
      outputs.push(y);
    }
    return { ranges, outputs };
  },

  getSigmoidY(x, pointsData, domainMin, domainMax)
  {
    const a: number = pointsData[0].y || pointsData[0].score;
    const xVal: number = pointsData[1].x || pointsData[1].value;
    const yVal: number = pointsData[1].y || pointsData[1].score;
    const x0: number = pointsData[2].x || pointsData[2].value;
    const y3: number = pointsData[3].y || pointsData[3].score;
    const L: number = y3 - a;
    const k: number = (-1 * Math.log(L / (yVal - a) - 1)) / (xVal - x0);
    return TransformUtil._sigmoid(x, a, k, x0, L);
  },

  _sigmoid(x: number, a: number, k: number, x0: number, L: number)
  {
    return L / (1 + Math.exp(-1 * k * (x - x0))) + a;
  },

};
export default TransformUtil;
