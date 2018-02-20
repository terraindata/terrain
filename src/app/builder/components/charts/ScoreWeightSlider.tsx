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

import * as React from 'react';
import TerrainComponent from './../../../common/components/TerrainComponent';
import Slider, { Range } from 'rc-slider';
// We can just import Slider or Range to reduce bundle size
// import Slider from 'rc-slider/lib/Slider';
// import Range from 'rc-slider/lib/Range';
import 'rc-slider/assets/index.css';

const FIXED_SLIDER_HANDLE_STYLE = { display: 'none' };

interface ScoreWeightSliderProps {
  negativeColor: string;
  positiveColor: string;
  dividerColor: string;
  min: number;
  max: number;
  value: Array<number>;
  onChange: (value: Array<number>) => void;
  height: number;
}

export default class ScoreWeightSlider extends TerrainComponent<ScoreWeightSliderProps>
{
  public getHandleStyle()
  {
    const {
      value,
      negativeColor,
      positiveColor,
    } = this.props;

    const baseStyle = {
      width: this.getTrackHeight(), // to make the handle a square, we set width === height
      height: this.getTrackHeight(), // the handle height is always the same as the track's
      marginTop: 3,
      borderRadius: 6,
      border: 0,
      marginLeft: -11,
    };

    return value === [0, 0]  || value[0] < 0 ?
      [
        { ...baseStyle, backgroundColor: negativeColor },
        FIXED_SLIDER_HANDLE_STYLE,
      ] :
      [
        FIXED_SLIDER_HANDLE_STYLE,
        { ...baseStyle, backgroundColor: positiveColor },
      ];
  }

  public getTrackStyle()
  {
    const {
      value,
      negativeColor,
      positiveColor,
    } = this.props;

    // The track is always 6 pixels smaller than the height defined for the component
    // to give the sense of padding.
    const baseStyle = { height: this.getTrackHeight(), borderRadius: 0, top: 8 };

    return value === [0, 0]  || value[0] < 0 ?
      [{ ...baseStyle, backgroundColor: negativeColor }] :
      [{ ...baseStyle, backgroundColor: positiveColor }] :
  }

  private getTrackHeight()
  {
    return this.props.height - 6;
  }

  public getCustomRailStyle()
  {
    const { height } = this.props;

    return {
      position: 'absolute' as 'absolute', // prevent Typescript error
      top: 5,
      left: 0,
      height,
      width: '100%',
      borderRadius: 6,
      backgroundColor: '#e9e9e9'
    };
  }

  public handleChange(newValue)
  {
    const { value: oldValue } = this.props;

    // One of the values must always be zero
    if (newValue[0] !== 0 && newValue[1] !== 0)
    {
      this.props.onChange(oldValue);
    }
    else
    {
      this.props.onChange(newValue);
    }
  }

  public render()
  {
    const {
      min,
      max,
      height,
      value,
      dividerColor,
    } = this.props;
    const handleStyle = this.getHandleStyle();
    const trackStyle = this.getTrackStyle();
    const railStyle = this.getCustomRailStyle();

    return (
      <div style={{ width: '100%', position: 'relative' }}>
        <div style={railStyle} />
        <div style={{ width: `calc(100% - ${height}px)`, position: 'relative', marginLeft: 14 }}>
          <div style={{ zIndex: 2, position: 'absolute', left: '50%', top: 2, borderLeft: `1px solid ${dividerColor}`, height: (height + 4) }} />
          <Range
            min={min}
            max={max}
            value={value}
            defaultValue={[0,0]}
            railStyle={{ height }}
            trackStyle={trackStyle}
            handleStyle={handleStyle}
            onChange={this.handleChange}
          />
        </div>
      </div>
    );
  }
};
