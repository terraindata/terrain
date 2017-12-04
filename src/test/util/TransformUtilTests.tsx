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
// tslint:disable:no-empty
import { shallow } from 'enzyme';
import * as Immutable from 'immutable';
import { List, Map } from 'immutable';
import * as React from 'react';
import TransformUtil from 'util/TransformUtil';

describe('TransformUtil', () =>
{
  // Data points for curves with 2 points
  const pointsDataGrowthChart2 = [{ x: 10, y: 0.1 }, { x: 100, y: 0.8 }];
  const pointsDataGrowthBackend2 = [{ value: 10, score: 0.1 }, { value: 100, score: 0.8 }];
  const pointsDataDecayChart2 = [{ x: 10, y: 0.8 }, { x: 100, y: 0.1 }];
  const pointsDataDecayBackend2 = [{ value: 10, score: 0.8 }, { value: 100, score: 0.1 }];

  // Data points for curves with 3 points
  const pointsDataChart3 = [{ x: 3, y: 0.6 }, { x: 5, y: 0.9 }, { x: 9.122, y: 0.6097 }];
  const pointsDataBackend3 = [{ value: 3, score: 0.6 }, { value: 5, score: 0.9 }, { value: 9.122, score: 0.6097 }];

  // Data points for curves with 4 points
  const pointsDataGrowthChart4 = [{ x: 1, y: 0.1 }, { x: 5.6, y: 0.344 }, { x: 6, y: 0.5 }, { x: 9, y: 0.9 }];
  const pointsDataGrowthBackend4 =
    [{ value: 1, score: 0.1 }, { value: 5.6, score: 0.344 }, { value: 6, score: 0.5 }, { value: 9, score: 0.9 }];
  const pointsDataDecayChart4 = [{ x: 1, y: 0.1 }, { x: 5.346, y: 0.6519 }, { x: 6, y: 0.5 }, { x: 9, y: 0.9 }];
  const pointsDataDecayBackend4 =
    [{ value: 1, score: 0.1 }, { value: 5.346, score: 0.6519 }, { value: 6, score: 0.5 }, { value: 9, score: 0.9 }];

  describe('#getLogarithmicData', () =>
  {
    it('should return logarithmic growth data for chart', () =>
    {
      const data = TransformUtil.getLogarithmicData(99, pointsDataGrowthChart2, 0, 10);
      expect(data.outputs).toHaveLength(100);

      data.outputs.forEach((datapoint) =>
      {
        expect(!isNaN(datapoint));
      });

      data.ranges.forEach((datapoint) =>
      {
        expect(!isNaN(datapoint));
      });

      data.outputs.forEach((datapoint, i) =>
      {
        if (i > 0)
        {
          expect(datapoint >= data.outputs[i - 1]);
        }
      });

      data.ranges.forEach((datapoint, i) =>
      {
        if (i > 0)
        {
          expect(datapoint >= data.ranges[i - 1]);
        }
      });
    });

    it('should return logarithmic decay data for chart', () =>
    {
      const data = TransformUtil.getLogarithmicData(99, pointsDataDecayChart2, 0, 10);
      expect(data.outputs).toHaveLength(100);

      data.outputs.forEach((datapoint) =>
      {
        expect(!isNaN(datapoint));
      });

      data.ranges.forEach((datapoint) =>
      {
        expect(!isNaN(datapoint));
      });

      data.outputs.forEach((datapoint, i) =>
      {
        if (i > 0)
        {
          expect(datapoint >= data.outputs[i - 1]);
        }
      });

      data.ranges.forEach((datapoint, i) =>
      {
        if (i > 0)
        {
          expect(datapoint >= data.ranges[i - 1]);
        }
      });
    });

    it('should return logarithmic growth data for backend', () =>
    {
      const data = TransformUtil.getLogarithmicData(31, pointsDataGrowthBackend2, 0, 10);
      expect(data.outputs).toHaveLength(32);

      data.outputs.forEach((datapoint) =>
      {
        expect(!isNaN(datapoint));
      });

      data.ranges.forEach((datapoint) =>
      {
        expect(!isNaN(datapoint));
      });

      data.outputs.forEach((datapoint, i) =>
      {
        if (i > 0)
        {
          expect(datapoint >= data.outputs[i - 1]);
        }
      });

      data.ranges.forEach((datapoint, i) =>
      {
        if (i > 0)
        {
          expect(datapoint >= data.ranges[i - 1]);
        }
      });
    });

    it('should return logarithmic decay data for backend', () =>
    {
      const data = TransformUtil.getLogarithmicData(31, pointsDataDecayBackend2, 0, 10);
      expect(data.outputs).toHaveLength(32);

      data.outputs.forEach((datapoint) =>
      {
        expect(!isNaN(datapoint));
      });

      data.ranges.forEach((datapoint) =>
      {
        expect(!isNaN(datapoint));
      });

      data.outputs.forEach((datapoint, i) =>
      {
        if (i > 0)
        {
          expect(datapoint >= data.outputs[i - 1]);
        }
      });

      data.ranges.forEach((datapoint, i) =>
      {
        if (i > 0)
        {
          expect(datapoint >= data.ranges[i - 1]);
        }
      });
    });

  });

  describe('#getExponentialData', () =>
  {
    it('should return exponential growth data for chart', () =>
    {
      const data = TransformUtil.getExponentialData(99, pointsDataGrowthChart2);
      expect(data.outputs).toHaveLength(100);

      data.outputs.forEach((datapoint) =>
      {
        expect(!isNaN(datapoint));
      });

      data.ranges.forEach((datapoint) =>
      {
        expect(!isNaN(datapoint));
      });

      data.outputs.forEach((datapoint, i) =>
      {
        if (i > 0)
        {
          expect(datapoint >= data.outputs[i - 1]);
        }
      });

      data.ranges.forEach((datapoint, i) =>
      {
        if (i > 0)
        {
          expect(datapoint >= data.ranges[i - 1]);
        }
      });
    });

    it('should return exponential decay data for chart', () =>
    {
      const data = TransformUtil.getExponentialData(99, pointsDataDecayChart2);
      expect(data.outputs).toHaveLength(100);

      data.outputs.forEach((datapoint) =>
      {
        expect(!isNaN(datapoint));
      });

      data.ranges.forEach((datapoint) =>
      {
        expect(!isNaN(datapoint));
      });

      data.outputs.forEach((datapoint, i) =>
      {
        if (i > 0)
        {
          expect(datapoint >= data.outputs[i - 1]);
        }
      });

      data.ranges.forEach((datapoint, i) =>
      {
        if (i > 0)
        {
          expect(datapoint >= data.ranges[i - 1]);
        }
      });
    });

    it('should return exponential growth data for backend', () =>
    {
      const data = TransformUtil.getExponentialData(31, pointsDataGrowthBackend2);
      expect(data.outputs).toHaveLength(32);

      data.outputs.forEach((datapoint) =>
      {
        expect(!isNaN(datapoint));
      });

      data.ranges.forEach((datapoint) =>
      {
        expect(!isNaN(datapoint));
      });

      data.outputs.forEach((datapoint, i) =>
      {
        if (i > 0)
        {
          expect(datapoint >= data.outputs[i - 1]);
        }
      });

      data.ranges.forEach((datapoint, i) =>
      {
        if (i > 0)
        {
          expect(datapoint >= data.ranges[i - 1]);
        }
      });
    });

    it('should return exponential decay data for backend', () =>
    {
      const data = TransformUtil.getExponentialData(31, pointsDataDecayBackend2);
      expect(data.outputs).toHaveLength(32);

      data.outputs.forEach((datapoint) =>
      {
        expect(!isNaN(datapoint));
      });

      data.ranges.forEach((datapoint) =>
      {
        expect(!isNaN(datapoint));
      });

      data.outputs.forEach((datapoint, i) =>
      {
        if (i > 0)
        {
          expect(datapoint >= data.outputs[i - 1]);
        }
      });

      data.ranges.forEach((datapoint, i) =>
      {
        if (i > 0)
        {
          expect(datapoint >= data.ranges[i - 1]);
        }
      });
    });

  });

  describe('#getNormalData', () =>
  {

    it('should return normal data for chart', () =>
    {
      const data = TransformUtil.getNormalData(99, pointsDataChart3, 0, 10);
      expect(data.outputs).toHaveLength(100);

      data.outputs.forEach((datapoint) =>
      {
        expect(!isNaN(datapoint));
      });

      data.ranges.forEach((datapoint) =>
      {
        expect(!isNaN(datapoint));
      });

      data.outputs.forEach((datapoint, i) =>
      {
        if (i > 0)
        {
          expect(datapoint >= data.outputs[i - 1]);
        }
      });

      data.ranges.forEach((datapoint, i) =>
      {
        if (i > 0)
        {
          expect(datapoint >= data.ranges[i - 1]);
        }
      });
    });

    it('should return normal data for growth for backend', () =>
    {
      const data = TransformUtil.getNormalData(31, pointsDataBackend3, 0, 10);
      expect(data.outputs).toHaveLength(32);

      data.outputs.forEach((datapoint) =>
      {
        expect(!isNaN(datapoint));
      });

      data.ranges.forEach((datapoint) =>
      {
        expect(!isNaN(datapoint));
      });

      data.outputs.forEach((datapoint, i) =>
      {
        if (i > 0)
        {
          expect(datapoint >= data.outputs[i - 1]);
        }
      });

      data.ranges.forEach((datapoint, i) =>
      {
        if (i > 0)
        {
          expect(datapoint >= data.ranges[i - 1]);
        }
      });
    });

  });

  describe('#getSigmoidData', () =>
  {

    it('should return sigmoid growth data for chart', () =>
    {
      const data = TransformUtil.getSigmoidData(99, pointsDataGrowthChart4, 0, 10);
      expect(data.outputs).toHaveLength(100);

      data.outputs.forEach((datapoint) =>
      {
        expect(!isNaN(datapoint));
      });

      data.ranges.forEach((datapoint) =>
      {
        expect(!isNaN(datapoint));
      });

      data.outputs.forEach((datapoint, i) =>
      {
        if (i > 0)
        {
          expect(datapoint >= data.outputs[i - 1]);
        }
      });

      data.ranges.forEach((datapoint, i) =>
      {
        if (i > 0)
        {
          expect(datapoint >= data.ranges[i - 1]);
        }
      });
    });

    it('should return sigmod decay data for chart', () =>
    {
      const data = TransformUtil.getSigmoidData(99, pointsDataDecayChart4, 0, 10);
      expect(data.outputs).toHaveLength(100);

      data.outputs.forEach((datapoint) =>
      {
        expect(!isNaN(datapoint));
      });

      data.ranges.forEach((datapoint) =>
      {
        expect(!isNaN(datapoint));
      });

      data.outputs.forEach((datapoint, i) =>
      {
        if (i > 0)
        {
          expect(datapoint >= data.outputs[i - 1]);
        }
      });

      data.ranges.forEach((datapoint, i) =>
      {
        if (i > 0)
        {
          expect(datapoint >= data.ranges[i - 1]);
        }
      });
    });

    it('should return sigmoid growth data for backend', () =>
    {
      const data = TransformUtil.getSigmoidData(31, pointsDataGrowthBackend4, 0, 10);
      expect(data.outputs).toHaveLength(32);

      data.outputs.forEach((datapoint) =>
      {
        expect(!isNaN(datapoint));
      });

      data.ranges.forEach((datapoint) =>
      {
        expect(!isNaN(datapoint));
      });

      data.outputs.forEach((datapoint, i) =>
      {
        if (i > 0)
        {
          expect(datapoint >= data.outputs[i - 1]);
        }
      });

      data.ranges.forEach((datapoint, i) =>
      {
        if (i > 0)
        {
          expect(datapoint >= data.ranges[i - 1]);
        }
      });
    });

    it('should return sigmoid decay data for backend', () =>
    {
      const data = TransformUtil.getSigmoidData(31, pointsDataDecayBackend4, 0, 10);
      expect(data.outputs).toHaveLength(32);

      data.outputs.forEach((datapoint) =>
      {
        expect(!isNaN(datapoint));
      });

      data.ranges.forEach((datapoint) =>
      {
        expect(!isNaN(datapoint));
      });

      data.outputs.forEach((datapoint, i) =>
      {
        if (i > 0)
        {
          expect(datapoint >= data.outputs[i - 1]);
        }
      });

      data.ranges.forEach((datapoint, i) =>
      {
        if (i > 0)
        {
          expect(datapoint >= data.ranges[i - 1]);
        }
      });
    });

  });

});
