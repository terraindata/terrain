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

require('./EasterEggs.less');
import PureClasss from './../../common/components/PureClasss.tsx';
import * as $ from 'jquery';
import * as _ from 'underscore';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as classNames from 'classnames';
import * as Immutable from 'immutable';
import Util from '../../util/Util.tsx';

interface Props {
}

class EasterEggs extends PureClasss<Props>   
{
  state = {
    christmas: true,
  };
  
  componentDidMount()
  {
    setTimeout(this.startChristmas, 200);
  }
  
  startChristmas()
  {
    let w = $('body').width();
    let h = $('body').height();
    let r = 3;
    let buckets = _.range(0, w / r).map(i => 0);
    
    let dropSnow = () =>
    {
      let c = Util.randInt(4);
      _.range(0, c).map(q =>
      {
        let id = 'a' + Util.randInt(1000000);
        let b = Util.randInt(buckets.length);
        let y = Math.floor(h / r);
        let x = b;
        
        $('#snow').append(
          `<div class="snow" id="${id}" style="left:${x * r}px; bottom:${y * r}px; width:${r}px; height:${r}px;"></div>`
        );
        
        let int = setInterval(() =>
        {
          y --;
          x += Util.randInt(3) - 1;
          
          if(buckets[x] >= y)
          {
            buckets[x] ++;
            clearInterval(int);
          }
          $('#' + id).css('left', x * r + 'px').css('bottom', y * r + 'px');
        }, 100);
      });
    }
    // dropSnow();
    setInterval(dropSnow, 100);
  }
  
  render() 
  {
    if(this.state.christmas)
    {
      return (
        <div className='snow-egg' id='snow'>
        </div>
      );
    }
  }
}

export default EasterEggs;