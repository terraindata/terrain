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

import { tooltip } from 'common/components/tooltip/Tooltips';
import TerrainComponent from './../../common/components/TerrainComponent';
import './Scoreline.less';

export interface Props
{
  scores: Array<{
    color: string,
    score: number,
    name?: string,
  }>;

  hideZeroes: boolean;
}

class Scoreline extends TerrainComponent<Props>
{
  public renderScore(score: { color: string, score: number, name?: string }, index: number)
  {
    if (score.score === 0 && this.props.hideZeroes)
    {
      return null;
    }
    return tooltip(
      <div className='scoreline-score'>
        <div
          className='scoreline-score-icon'
          style={{ backgroundColor: score.color }}
        />
        <div
          className='scoreline-score-score'
          style={{ color: score.color }}
        >
          {score.score}
        </div>
      </div>,
      {
        title: score.name,
        key: index,
        size: 'small',
        position: 'top-start',
      },
    );
  }

  public render()
  {
    let none: any;
    if (this.props.hideZeroes && this.props.scores.every((score) => score.score === 0))
    {
      none = <div className='scoreline-none'>None</div>;
    }

    return (
      <div className='scoreline'>
        {
          this.props.scores.map(this.renderScore)
        }
        {
          none
        }
      </div>
    );
  }
}

export default Scoreline;
