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

// tslint:disable:restrict-plus-operands

import * as classNames from 'classnames';
import * as React from 'react';
import { backgroundColor, borderColor, Colors } from '../../../colors/Colors';
import TerrainComponent from './../../../common/components/TerrainComponent';
import './ScoreBar.less';
import Slider, { Range } from 'rc-slider';
// We can just import Slider or Range to reduce bundle size
// import Slider from 'rc-slider/lib/Slider';
// import Range from 'rc-slider/lib/Range';
import 'rc-slider/assets/index.css';


const BORDER_RADIUS = '5px';
const SCORE_COLORS =
  {
    // POSITIVE: ['#DFDE52', '#AFD364', '#9DCF66', '#4ef9ab'],
    POSITIVE: ['#4ef9ab'],
    NEGATIVE: ['#d14f42'],
  };

const FIXED_SLIDER_HANDLE_STYLE = { display: 'none' };
const DRAGGABLE_SLIDER_HANDLE_STYLE = {
  width: '24px',
  height: '24px',
  marginTop: 3,
  marginLeft: 12,
  borderRadius: 6,
  border: 0,
  marginLeft: -11,
}

interface Props {
  parentData: {
    weights: Array<{ weight: number }>;
  };
  data: {
    weight: number;
  }
  keyPath: KeyPath;
  noAnimation?: boolean;
}

class ScoreBar extends TerrainComponent<Props>
{
  public constructor(props)
  {
    super(props);

    this.state = {
      sliderValue: [0, 0];
    };
  }

  public render()
  {
    const weights = this.props.parentData.weights;
    const weight = this.props.data;

    let max = 0;
    weights.map((w) =>
    {
      if (Math.abs(w.weight) > max)
      {
        max = Math.abs(w.weight);
      }
    });

    const perc = Math.abs(weight.weight) / max * 100;
    const style: React.CSSProperties = {
      width: perc / 2 + '%',
    };

    if (weight.weight > 0)
    {
      style.left = '50%';
      style['background'] = SCORE_COLORS.POSITIVE[Math.floor((perc - 1) / (100 / SCORE_COLORS.POSITIVE.length))];
      style.borderTopRightRadius = BORDER_RADIUS;
      style.borderBottomRightRadius = BORDER_RADIUS;
    }
    else if (weight.weight < 0)
    {
      style.right = '50%';
      style['background'] = SCORE_COLORS.NEGATIVE[Math.floor((perc - 1) / (100 / SCORE_COLORS.NEGATIVE.length))];
      style.borderTopLeftRadius = BORDER_RADIUS;
      style.borderBottomLeftRadius = BORDER_RADIUS;
    }

    const handleStyle = this.state.sliderValue === [0, 0]  || this.state.sliderValue[0] < 0 ?
      [
        { ...DRAGGABLE_SLIDER_HANDLE_STYLE, backgroundColor: SCORE_COLORS.NEGATIVE },
        FIXED_SLIDER_HANDLE_STYLE,
      ] :
      [
        FIXED_SLIDER_HANDLE_STYLE,
        { ...DRAGGABLE_SLIDER_HANDLE_STYLE, backgroundColor: SCORE_COLORS.POSITIVE },
      ]

    const trackStyle = this.state.sliderValue === [0, 0]  || this.state.sliderValue[0] < 0 ?
      [{ backgroundColor: SCORE_COLORS.NEGATIVE, height: '24px', borderRadius: 0, top: 8 }] :
      [{ backgroundColor: SCORE_COLORS.POSITIVE, height: '24px', borderRadius: 0, top: 8 }];


    return (
      <div style={{ width: '100%', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 5, left: 0, height: '30px', width: '100%', borderRadius: 6, backgroundColor: '#e9e9e9' }} />
        <div style={{ width: 'calc(100% - 30px)', position: 'relative', marginLeft: 14 }}>
          <div style={{ zIndex: 2, position: 'absolute', left: '50%', top: 2, borderLeft: '1px solid #abe2fb', height: '34px' }} />
          <Range
            min= {-10}
            max={10}
            defaultValue={[0,0]}
            railStyle={{ height: '30px' }}
            trackStyle={trackStyle}
            handleStyle={handleStyle}
            onChange={(value) => this.setState({ sliderValue: value })}
          />
        </div>
      </div>
    );
  }
}

export default ScoreBar;
