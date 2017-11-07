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
import TransformCardChart from 'builder/components/charts/TransformCardChart';
import { shallow } from 'enzyme';
import * as Immutable from 'immutable';
import {List, Map} from 'immutable';
import * as React from 'react';
import * as _ from 'lodash';

jest.mock('react-dom', () => ({
  findDOMNode: () => {},
}));

describe('TransformCardChart', () =>
{
  let testPoints = List([
      {
        id: 'block-1',
        score: 0.1,
        value: 1,
      },
      {
      id: 'block-2',
      score: 0.5,
      value: 3,
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
        }
      },
      {
        id: 'bar-2',
        count: 90,
        percentage: 0.9,
        range: {
          min: 5,
          max: 10,
        }
      }  
    ]);
  let chartComponent = null;
  const chartState = {
    points: testPoints,
    domain: List([0, 10]),
    range: List([0, 1]),
    keyPath: [],
    canEdit: true,
    inputKey: 'price',
    updatePoints: (points: ScorePoints, released?: boolean) => {
      console.log('UPDATE POINTS');
      testPoints = points;
    },
    onRequestDomainChange: (domain: List<number>, overrideMaxDomain: boolean) => {},
    onRequestZoomToData: () => {},
    width: 300,
    language: 'elastic',
    colors: ['blue', 'green'],
    spotlights: [],
    mode: 'linear',
  };

  beforeEach(() =>
  {
    chartComponent = shallow(
      <TransformCardChart
        points={testPoints}
        domain={List([0, 10])}
        range={List([0, 1])}
        keyPath={[]}
        canEdit={true}
        inputKey={'price'}
        updatePoints={(points: ScorePoints, released?: boolean) => {
          console.log('UPDATE POINTS');
          testPoints = points;
        }}
        onRequestDomainChange={(domain: List<number>, overrideMaxDomain: boolean) => {}}
        onRequestZoomToData={() => {}}
        width={300}
        language='elastic'
        colors={['blue', 'green']}
        spotlights={[]}
        mode={'linear'}
      />,
      {createNodeMock}
    );
  });

  it('should render a transform card chart', () =>
  {
    // Should have one div for the transform chart
    expect(chartComponent.find('div')).toHaveLength(1);
  });

  it('should have two points', () =>
  {
    expect(chartComponent.state().pointsCache.toJS()).toHaveLength(2);
  });

  describe('#componentWillReceiveProps', () => {
    it('should update the linear points cache when mode is changed', () =>
    {
      const newMode = 'normal';
      chartComponent.setProps(_.extend({}, chartState, {mode: newMode}));

      expect(chartComponent.state().linearPoints.toJS()).toHaveLength(2);
    })
  });

  describe('#getChartState', () => {
    it('should change the number of points to 3 when mode is normal', () => 
    {
      chartComponent.instance().getChartState(_.extend({}, chartState, {mode: 'normal'}));
      // console.log(chartComponent.state());
      // console.log(testPoints);
      // expect(chartComponent.state().pointsCache.toJS()).toHaveLength(3);
      // expect(testPoints.toJS()).toHaveLength(3);
    });
  });

  // describe('#handleZoom', () =>
  // {
  //   it('should update state.brushDomain (that handles the brush)', () =>
  //   {
  //     expect(chartComponent.state().brushDomain).toEqual({});
  //     const nextZoomDomain = { x: [0, 5], y: [10, 15] };
  //     chartComponent.instance().handleZoom(nextZoomDomain);

  //     expect(chartComponent.state().brushDomain).toEqual(nextZoomDomain);
  //   });
  // });

  // describe('#handleBrush', () =>
  // {
  //   it('should update state.zoomDomain', () =>
  //   {
  //     expect(chartComponent.state().zoomDomain).toEqual({});
  //     const nextBrushDomain = { x: [0, 5], y: [10, 15] };
  //     chartComponent.instance().handleBrush(nextBrushDomain);

  //     expect(chartComponent.state().zoomDomain).toEqual(nextBrushDomain);
  //   });
  // });

  // describe('#handleLegendClick', () =>
  // {
  //   it('should call toggleDatasetVisibility', () =>
  //   {
  //     chartComponent.instance().toggleDatasetVisibility = jest.fn();

  //     chartComponent.instance().handleLegendClick({}, { datum: { id: 1 } });

  //     expect(chartComponent.instance().toggleDatasetVisibility)
  //       .toHaveBeenCalledTimes(1);
  //     expect(chartComponent.instance().toggleDatasetVisibility)
  //       .toHaveBeenCalledWith(1);
  //   });
  // });

  // describe('#toggleDatasetVisibility', () =>
  // {
  //   describe('when the dataset is currently visible', () =>
  //   {
  //     it('should remove the dataset from the visible list', () =>
  //     {
  //       chartComponent.instance().toggleDatasetVisibility('1');

  //       expect(chartComponent.state().visibleDatasets.toJS()).not.toContain('1');
  //     });
  //   });

  //   describe('when the dataset is NOT currently visible', () =>
  //   {
  //     it('should add the dataset from the visible list', () =>
  //     {
  //       chartComponent.instance().toggleDatasetVisibility('1');
  //       chartComponent.instance().toggleDatasetVisibility('1');

  //       expect(chartComponent.state().visibleDatasets.toJS()).toContain('1');
  //     });
  //   });
  // });
});
