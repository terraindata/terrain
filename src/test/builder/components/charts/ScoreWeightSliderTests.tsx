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

import ScoreWeightSlider from 'builder/components/charts/ScoreWeightSlider';
import { shallow } from 'enzyme';
import * as React from 'react';

describe('ScoreWeightSlider', () =>
{
  let componentWrapper = null;
  const height = 33;

  beforeEach(() =>
  {
    componentWrapper = shallow(
      <ScoreWeightSlider
        color={'rgb(0,0,0,0.1)'}
        min={0}
        max={100}
        value={50}
        onBeforeChange={(value: number) => 1}
        onChange={(value: number) => 1}
        onAfterChange={(value: number) => 1}
        height={33}
      />
    )
  });

  describe('#render', () =>
  {
    describe('when created with default values', () =>
    {
      it('should render correctly', () =>
      {
        // Slider is returned with name ComponentEnhancer(undefined)
        expect(componentWrapper.find('ComponentEnhancer(undefined)')).toHaveLength(1);

        const divs = componentWrapper.find('div');
        expect(divs).toHaveLength(4);

        expect(divs.get(0).props.style).toEqual({
          width: '100%',
          position: 'relative',
          height,
          background: 'transparent',
        });

        expect(divs.get(1).props.style)
          .toEqual(componentWrapper.instance().getCustomRailStyle());

        expect(divs.get(2).props.style)
          .toEqual({
            width: `calc(100% - ${height}px)`,
            position: 'relative',
            marginLeft: 0,
          });

        expect(divs.get(3).props.style)
          .toEqual({
            zIndex: 2,
            top: -3,
            position: 'absolute',
            height: height + 6,
            borderLeft: '1px solid rgba(30, 180, 250, .5)',
          });
      });

      describe('when background prop is set', () =>
      {
        it('should pass the background prop into the wrapper div style prop', () =>
        {
          componentWrapper.setProps({ background: 'white' });
          const divs = componentWrapper.find('div');

          expect(divs.get(0).props.style).toEqual({
            width: '100%',
            position: 'relative',
            height,
            background: 'white',
          });
        });
      });

      describe('when growOnHover prop is set', () =>
      {
        it('should add score-weight-slider-grow className to the wrapper div', () =>
        {
          componentWrapper.setProps({ growOnHover: true });
          const divs = componentWrapper.find('div');

          expect(divs.get(0).props.className).toEqual(expect.stringContaining('score-weight-slider-grow'));
        });
      });
    });

    describe('when noLeftLine is true', () =>
    {
      it('should render only 3 divs', () =>
      {
        componentWrapper.setProps({ noLeftLine: true });
        expect(componentWrapper.find('div')).toHaveLength(3);
      });
    });
  });

  describe('#getHandleStyle', () =>
  {
    describe('when rounded is true', () =>
    {
      it('should return a rounded handle', () =>
      {
        componentWrapper.setProps({ rounded: true });
        const handleStyle = componentWrapper.instance().getHandleStyle()
        expect(handleStyle.borderRadius).toEqual(40);
      });
    });

    describe('when rounded is false', () =>
    {
      it('should return a rounded handle', () =>
      {
        componentWrapper.setProps({ rounded: false });
        const handleStyle = componentWrapper.instance().getHandleStyle()
        expect(handleStyle.borderRadius).toEqual(4);
      });
    });
  });

  describe('#getTrackHeight', () =>
  {
    describe('when noPadding is true', () =>
    {
      it('should return a track with no padding', () =>
      {
        componentWrapper.setProps({ noPadding: true });
        const trackHeight = componentWrapper.instance().getTrackHeight()
        expect(trackHeight).toEqual(height);
      });
    });

    describe('when noPadding is false', () =>
    {
      it('should return a track with padding', () =>
      {
        componentWrapper.setProps({ noPadding: false });
        const trackHeight = componentWrapper.instance().getTrackHeight()
        expect(trackHeight).toEqual(height - 6);
      });
    });
  });
});
