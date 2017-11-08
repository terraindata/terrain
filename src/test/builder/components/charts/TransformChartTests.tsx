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
import TransformCardChart, { ScorePoint } from 'builder/components/charts/TransformCardChart';
import { shallow } from 'enzyme';
import * as Immutable from 'immutable';
import { List, Map } from 'immutable';
import * as React from 'react';

jest.mock('react-dom', () => ({
  findDOMNode: () => { },
}));

describe('TransformCardChart', () =>
{
  let chartComponent = null;
  const chartState = {
    points: List<ScorePoint>([
      {
        id: 'block-1',
        score: 0.1,
        value: 1,
        set: (key, value) => { },
      },
    ]),
    bars: List([
      {
        id: 'bar-1',
        count: 10,
        percentage: 0.1,
        range: {
          min: 0,
          max: 5,
        },
      },
      {
        id: 'bar-2',
        count: 90,
        percentage: 0.9,
        range: {
          min: 5,
          max: 10,
        },
      },
    ]),
    domain: List([0, 10]),
    range: List([0, 1]),
    keyPath: List([]),
    canEdit: true,
    inputKey: 'price',
    updatePoints: (points, released?: boolean) => { },
    onRequestDomainChange: (domain: List<number>, overrideMaxDomain: boolean) => { },
    onRequestZoomToData: () => { },
    width: 300,
    language: 'elastic',
    colors: ['blue', 'green'] as [string, string],
    spotlights: [],
    mode: 'linear',
  };

  beforeEach(() =>
  {
    chartComponent = shallow(
      <TransformCardChart
        {...chartState}
      />,
    );
  });

  it('should render a transform card chart with one point', () =>
  {
    expect(chartComponent.find('div')).toHaveLength(1);
    expect(chartComponent.state().pointsCache.toJS()).toHaveLength(1);
  });

  describe('#componentWillReciveProps', () =>
  {
    it('should update points cache', () =>
    {
      // Changing mode from linear -> normal, must be three points
      const newPoints = List<ScorePoint>([
        {
          id: 'block-1',
          score: 0.1,
          value: 1,
          set: (key, value) => { },
        },
        {
          id: 'block-2',
          score: 0.2,
          value: 2,
          set: (key, value) => { },
        }]);

      chartComponent.setProps({ points: newPoints });
      expect(chartComponent.state().pointsCache.toJS()).toEqual(newPoints.toJS());
    });
  });

  describe('#getChartState', () =>
  {
    it('should update the number of points based on the mode', () =>
    {
      chartComponent.instance().getChartState({ mode: 'normal' });
      expect(chartComponent.state().pointsCache.toJS()).toHaveLength(3);

      chartComponent.instance().getChartState({ mode: 'logarithmic' });
      expect(chartComponent.state().pointsCache.toJS()).toHaveLength(2);

      chartComponent.instance().getChartState({ mode: 'sigmoid' });
      expect(chartComponent.state().pointsCache.toJS()).toHaveLength(4);

      chartComponent.instance().getChartState({ mode: 'exponential' });
      expect(chartComponent.state().pointsCache.toJS()).toHaveLength(2);
    });
  });
});
