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
import MultipleAreaChart from 'charts/components/MultipleAreaChart';
import { mount, shallow } from 'enzyme';
import * as Immutable from 'immutable';
import * as LibraryTypes from 'library/LibraryTypes';
import * as React from 'react';
import configureStore from 'redux-mock-store';
import { ItemType } from '../../../items/types/Item';

describe('MultipleAreaChart', () =>
{
  let chartComponent = null;
  const variantId = 1;
  const variantName = 'Bargain Shopper';
  const datasets = Immutable.Map<ID, any>({
    [variantId]: {
      id: variantId,
      label: variantName,
      data: [
        { time: new Date(2017, 8, 1, 0, 0, 0), value: 1 },
        { time: new Date(2017, 8, 2, 0, 0, 0), value: 2 },
      ],
    },
    2: {
      id: 2,
      label: 'Customer Rating Boost',
      data: [
        { time: new Date(2017, 8, 1, 0, 0, 0), value: 5 },
        { time: new Date(2017, 8, 2, 0, 0, 0), value: 4 },
      ],
    },
  });
  const handleLegendClick = jest.fn();

  beforeEach(() =>
  {
    chartComponent = shallow(
      <MultipleAreaChart
        datasets={datasets}
        xDataKey={'xaxis'}
        yDataKey={'yaxis'}
        onLegendClick={handleLegendClick}
        dateFormat={'MM/DD/YYYY'}
      />,
    );
  });

  describe('#renderData', () =>
  {
    it('should return one area and one scatter per visible dataset', () =>
    {
      chartComponent.setState({ visibleDatasets: Immutable.List(['1']) });

      const visibleDatasetsCount = chartComponent.state().visibleDatasets.count();
      const data = chartComponent.instance().renderData();

      expect(data.areas.length).toEqual(visibleDatasetsCount);
      expect(data.scatters.length).toEqual(visibleDatasetsCount);
    });
  });

  it('should set all datasets as visible by default', () =>
  {
    // jmansor: I don't like these assertions, there must be something better
    // to assert on Immutable objects.
    expect(chartComponent.state().visibleDatasets.toJS()).toEqual(datasets.keySeq().toJS());
  });

  describe('#componentWillReceiveProps', () =>
  {
    it('should update the visible datasets list when new datasets are received', () =>
    {
      const nextDatasets = Immutable.Map<ID, any>({
        3: {
          id: 3,
          label: 'Variant 3',
          data: [
            { time: new Date(2017, 8, 1, 0, 0, 0), value: 10 },
            { time: new Date(2017, 8, 2, 0, 0, 0), value: 12 },
          ],
        },
        4: {
          id: 4,
          label: 'Variant 4',
          data: [
            { time: new Date(2017, 8, 1, 0, 0, 0), value: 15 },
            { time: new Date(2017, 8, 2, 0, 0, 0), value: 14 },
          ],
        },
      });

      chartComponent.setProps({ datasets: nextDatasets });

      expect(chartComponent.state().visibleDatasets.toJS())
        .toEqual(chartComponent.instance().props.datasets.keySeq().toJS());
    });
  });

  describe('#handleZoom', () =>
  {
    it('should update state.brushDomain (that handles the brush)', () =>
    {
      expect(chartComponent.state().brushDomain).toEqual({});
      const nextZoomDomain = { x: [0, 5], y: [10, 15] };
      chartComponent.instance().handleZoom(nextZoomDomain);

      expect(chartComponent.state().brushDomain).toEqual(nextZoomDomain);
    });
  });

  describe('#handleBrush', () =>
  {
    it('should update state.zoomDomain', () =>
    {
      expect(chartComponent.state().zoomDomain).toEqual({});
      const nextBrushDomain = { x: [0, 5], y: [10, 15] };
      chartComponent.instance().handleBrush(nextBrushDomain);

      expect(chartComponent.state().zoomDomain).toEqual(nextBrushDomain);
    });
  });

  describe('#handleLegendClick', () =>
  {
    it('should call props.onLegendClick', () =>
    {
      chartComponent.instance().handleLegendClick({}, { datum: { id: 1 } });

      expect(chartComponent.instance().props.onLegendClick)
        .toHaveBeenCalledTimes(1);
    });
  });
});
