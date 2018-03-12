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
// tslint:disable:strict-boolean-expressions

import * as classNames from 'classnames';
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
  step?: number;
  value: number;
  onBeforeChange: (value: number) => void;
  onChange: (value: number) => void;
  onAfterChange: (value: number) => void;
  height: number;
  noLeftLine?: boolean;
  rounded?: boolean;
  noPadding?: boolean;
  background?: string;
  growOnHover?: boolean;
  lengthOffset?: number;
}

const styles = {
  wrapper: (height, background) => ({
    width: '100%',
    position: 'relative' as 'relative',
    height,
    background: background !== undefined ? background : 'transparent',
  }),
  rail: (height) => ({
    height,
    backgroundColor: 'transparent',
  }),
  innerSliderWrapper: (lengthOffset) => ({
    width: `calc(100% - ${lengthOffset}px)`,
    position: 'relative' as 'relative',
    marginLeft: 0, // not sure why this used to have 14px margin
  }),
  leftLine: (height) => ({
    zIndex: 2,
    top: -3,
    position: 'absolute' as 'absolute',
    height: parseInt(height, 10) + 6,
    borderLeft: '1px solid rgba(30, 180, 250, .5)',
  }),
};

export default class ScoreWeightSlider extends TerrainComponent<ScoreWeightSliderProps>
{
  public getHandleStyle()
  {
    const {
      value,
      color,
      rounded,
    } = this.props;

    const baseStyle = {
      width: this.getTrackHeight(), // to make the handle a square, we set width === height
      height: this.getTrackHeight(), // the handle height is always the same as the track's
      marginTop: 0,
      borderRadius: rounded ? 40 : 4,
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

    const baseStyle = {
      height: this.getTrackHeight(),
      borderRadius: 0,
    };

    return { ...baseStyle, backgroundColor: color };
  }

  public getTrackHeight()
  {
    const { height, noPadding } = this.props;
    // The track can be 6 pixels smaller than the height defined for the component
    // to give the sense of padding.
    return noPadding ? height : height - 6;
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
      background,
      noLeftLine,
      step,
      lengthOffset,
    } = this.props;

    const handleStyle = this.getHandleStyle();
    const trackStyle = this.getTrackStyle();
    const customRailStyle = this.getCustomRailStyle();
    let { value } = this.props;
    if (typeof value === 'string')
    {
      value = parseFloat(value);
      if (isNaN(value))
      {
        value = 0;
      }
    }
    return (
      <div
        style={styles.wrapper(height, background)}
        className={classNames({
          'score-weight-slider': true,
          'score-weight-slider-grow': this.props.growOnHover,
        })}
      >
        <div style={customRailStyle} />
        <div style={styles.innerSliderWrapper(lengthOffset)}>
          {
            !noLeftLine &&
            <div style={styles.leftLine(height)}
            />
          }
          <Slider
            min={min}
            max={max}
            value={value}
            defaultValue={50}
            railStyle={styles.rail(height)}
            trackStyle={trackStyle}
            handleStyle={handleStyle}
            onBeforeChange={this.props.onBeforeChange}
            onChange={this.props.onChange}
            onAfterChange={this.props.onAfterChange}
            step={step || 1}
          />
        </div>
      </div>
    );
  }
}
