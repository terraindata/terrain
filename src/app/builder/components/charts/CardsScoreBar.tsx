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

// Copyright 2018 Terrain Data, Inc.

// tslint:disable:restrict-plus-operands

import * as React from 'react';
import { backgroundColor, borderColor, Colors } from '../../../colors/Colors';
import TerrainComponent from './../../../common/components/TerrainComponent';
import './CardsScoreBar.less';

const BORDER_RADIUS = '5px';
const SCORE_COLORS =
  {
    // POSITIVE: ['#DFDE52', '#AFD364', '#9DCF66', '#4ef9ab'],
    POSITIVE: ['#4ef9ab'],
    NEGATIVE: ['#d14f42'],
  };

class CardsScoreBar extends TerrainComponent<{
  parentData: {
    weights: Array<{ weight: number }>;
  };
  data: {
    weight: number;
  }
  keyPath: KeyPath;
}>
{
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

    return (
      <div
        className='weight-graph'
        style={borderColor(Colors().stroke)}
      >
        <div className='weight-graph-inner'>
          <div className='weight-graph-bar' style={style} />
        </div>
        <div className='weight-graph-line' />
      </div>
    );
  }
}

export default CardsScoreBar;
