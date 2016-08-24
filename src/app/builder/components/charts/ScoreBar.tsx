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

require('./ScoreBar.less');
import * as React from 'react';
import * as Immutable from 'immutable';
import BuilderTypes from '../../BuilderTypes.tsx';
import PureClasss from './../../../common/components/PureClasss.tsx';

var BORDER_RADIUS = '5px';
var SCORE_COLORS = 
{
  POSITIVE: ["#DFDE52", "#AFD364", "#9DCF66", "#88C33E"],
  NEGATIVE: ["#F8B14A", "#FF735B", "#DD333C", "#A50808"],
};

class ScoreBar extends PureClasss<{
  parentData: BuilderTypes.IScoreCard;
  data: BuilderTypes.IWeight;
  keyPath: KeyPath;
  // weights: List<BuilderTypes.IWeight>,
  // index: number,
}>
{
  render()
  {
    let weights = this.props.parentData.weights;
    let weight = this.props.data;
    
    var max = 0;
    weights.map(w => {
      if(Math.abs(w.weight) > max)
      {
        max = Math.abs(w.weight);
      }
    })
    
    var perc = Math.abs(weight.weight) / max * 100;
    var style:React.CSSProperties = {
      width: perc / 2 + '%',
    };
    
    if(weight.weight > 0)
    {
      style.left = '50%';
      style['background'] = SCORE_COLORS.POSITIVE[Math.floor((perc - 1) / 25)];
      style.borderTopRightRadius = BORDER_RADIUS;
      style.borderBottomRightRadius = BORDER_RADIUS;
    }
    else if(weight.weight < 0)
    {
      style.right = '50%';
      style['background'] = SCORE_COLORS.NEGATIVE[Math.floor((perc - 1) / 25)];
      style.borderTopLeftRadius = BORDER_RADIUS;
      style.borderBottomLeftRadius = BORDER_RADIUS;
    }
    
    return (
      <div className='weight-graph'>
        <div className='weight-graph-inner'>
          <div className='weight-graph-bar' style={style} />
        </div>
        <div className='weight-graph-line' />
      </div>
    );
  }
}

export default ScoreBar;