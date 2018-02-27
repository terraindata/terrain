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

import Slider from 'rc-slider';
// We can just import Slider or Range to reduce bundle size
// import Slider from 'rc-slider/lib/Slider';
// import Range from 'rc-slider/lib/Range';
import 'rc-slider/assets/index.css';
import * as React from 'react';
import TerrainComponent from './../../../common/components/TerrainComponent';

const FIXED_SLIDER_HANDLE_STYLE = { display: 'none' };

interface ScoreWeightSliderProps
{
  color: string;
  min: number;
  max: number;
  value: number;
  onBeforeChange: (value: number) => void;
  onChange: (value: number) => void;
  onAfterChange: (value: number) => void;
  height: number;
}

export default class ScoreWeightSlider extends TerrainComponent<ScoreWeightSliderProps>
{
  public getHandleStyle()
  {
    const {
      value,
      color,
    } = this.props;

    const baseStyle = {
      width: this.getTrackHeight(), // to make the handle a square, we set width === height
      height: this.getTrackHeight(), // the handle height is always the same as the track's
      marginTop: 0,
      borderRadius: 4,
      border: 0,
      marginLeft: -11,
    };

    return { ...baseStyle, backgroundColor: color };
  }

  public getTrackStyle()
  {
    const {
      value,
      color,
    } = this.props;

    // The track is always 6 pixels smaller than the height defined for the component
    // to give the sense of padding.
    const baseStyle = { height: this.getTrackHeight(), borderRadius: 0 };

    return { ...baseStyle, backgroundColor: color };
  }

  public getTrackHeight()
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
      borderRadius: 4,
      backgroundColor: 'transparent',
    };
  }

  public render()
  {
    const {
      min,
      max,
      height,
      value,
    } = this.props;
    const handleStyle = this.getHandleStyle();
    const trackStyle = this.getTrackStyle();
    const railStyle = this.getCustomRailStyle();

    return (
      <div style={{ width: '100%', position: 'relative', height: 33 }}>
        <div style={railStyle} />
        <div style={{ width: `calc(100% - ${height}px)`, position: 'relative', marginLeft: 14 }}>
          <div style={{ zIndex: 2, top: -3, position: 'absolute', height: height + 6, borderLeft: '1px solid rgba(30, 180, 250, .5)' }} />
          <Slider
            min={min}
            max={max}
            value={value}
            defaultValue={50}
            railStyle={{ height, backgroundColor: 'transparent' }}
            trackStyle={trackStyle}
            handleStyle={handleStyle}
            onBeforeChange={this.props.onBeforeChange}
            onChange={this.props.onChange}
            onAfterChange={this.props.onAfterChange}
          />
        </div>
      </div>
    );
  }
}
