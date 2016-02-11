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

require('./Weighter.less');

import * as $ from 'jquery';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import Util from '../util/Util.tsx';

export interface Weight
{
  weight: number;
  key: string;
  color?: string;
  adjustable?: boolean;
}

interface Props
{
  weights: Weight[];
  onChange: (weights: Weight[]) => void;
}

export class Weighter extends React.Component<Props, any>
{
  constructor(props:Props)
  {
    super(props);
    Util.bind(this, ['renderHandle', 'renderWeight']);
  }
  
  renderHandle(index:number)
  {
    if(index === 0)
    {
      return null;
    }
    
    var ref = 'handle-' + index;
    
    var onHandleDown = (event) =>
    {
      var startX = event.clientX;
      var startWeight = this.props.weights[index].weight;
      var otherStartWeight = this.props.weights[index - 1].weight;
      
      var onMove = (event) =>
      {
        var diffX = startX - event.clientX;
        var diffWeight = diffX / ReactDOM.findDOMNode(this).getBoundingClientRect().width;
        var newWeight = startWeight + diffWeight;
        var otherNewWeight = otherStartWeight - diffWeight;
        
        if(newWeight < 0)
        {
          otherNewWeight = otherStartWeight + startWeight;
          newWeight = 0;
        }
        
        if(otherNewWeight < 0)
        {
          newWeight = startWeight + otherStartWeight;
          otherNewWeight = 0;
        }
        
        this.props.onChange(this.props.weights.map((weight, i) => ({
          weight: i === index ? newWeight : (i === index - 1 ? otherNewWeight : weight.weight),
          key: weight.key,
        })));
      }
      
      var offMove = (event) =>
      {
        $(document).off('mousemove', onMove);
        $(document).off('touchmove', onMove);
        $(document).off('mouseup', offMove);
        $(document).off('touchend', offMove);
      }
      
      $(document).on('mousemove', onMove);
      $(document).on('touchmove', onMove);
      
      $(document).on('touchend', offMove);
      $(document).on('mouseup', offMove);
    }
    
    return (
      <div className='weight-handle'
        ref={ref}
        onMouseDown={onHandleDown}
        onTouchStart={onHandleDown}>
      </div>
    );
  }
  
  renderWeight(weight:Weight, index:number)
  {
    var color = weight.color || '#47a7ff';
    
    var style =
    {
      background: color,
      width: (weight.weight * 100) + '%',
    }
    
    // var classes = Util.objToClassname({
    //   'weight-weight': true,
    // })
    
    return (
      <div className='weight-wrapper' style={style} key={weight.key}>
        { this.renderHandle(index) }
        <div className='weight-weight'>
          { Math.floor(weight.weight * 100) }%
        </div>
      </div>
    );
  }
  
  render()
  {
    return (
      <div className='weighter'>
        {
          this.props.weights.map(this.renderWeight)
        }
      </div>
    );
  }
}

