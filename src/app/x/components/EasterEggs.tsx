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

// tslint:disable:no-empty-interface prefer-const max-line-length strict-boolean-expressions

import * as Immutable from 'immutable';
import * as $ from 'jquery';
import * as _ from 'lodash';
import * as React from 'react';
import Util from '../../util/Util';
import TerrainComponent from './../../common/components/TerrainComponent';
import './EasterEggs.less';
const r = 3;
export interface Props
{
}

class EasterEggs extends TerrainComponent<Props>
{
  public state: {
    christmas: boolean;
    snow: Immutable.List<{ x: number, y: number, moving: boolean }>;
    buckets: Immutable.List<number>;
    w: number;
    h: number;
  } = {
      christmas: false,
      snow: null,
      buckets: null,
      w: 0,
      h: 0,
    };

  public componentDidMount()
  {
    // setTimeout(this.startChristmas, 200);
    const keyCodes = [];
    const keys = [];
    $('body').keydown((evt) =>
    {
      if (evt.key !== 'Shift')
      {
        keys.unshift(evt.key);
      }
      keyCodes.unshift(evt.keyCode);

      if (keyCodes[0] === 39 && keyCodes[1] === 37 && keyCodes[2] === 39 && keyCodes[3] === 37 && keyCodes[4] === 40
        && keyCodes[5] === 40 && keyCodes[6] === 38 && keyCodes[7] === 38)
      {
        this.startChristmas();
        $('body').keydown(null);
      }

      if (keys.slice(0, 'independence'.length).reverse().join('') === 'independence')
      {
        // $("body").append("<div class='july-easter flag' style='position: fixed; top: 0px; left: 0px; width: 100%; height: 100%; z-index: 9999; background: rgba(0,0,0,0.25); pointer-events: none;' ></div>");
        $('body').append("<img class='flag' src='http://bestanimations.com/Flags/USA/usa-american-flag-gif-3.gif' style='position: fixed; top: 0px; left: 0px; width: 100%; height: 100%; z-index: 99999; opacity: 0.25; pointer-events: none;' />");
        $('body').append("<img class='firework' src='https://i.giphy.com/media/c1R3XcUXVWAFy/giphy.webp' style='position: fixed; top: 30px; left: 30px; width: 200px; height: 200px; z-index: 99999; pointer-events: none; mix-blend-mode: screen;' />");
        $('body').append("<img class='firework' src='https://i.giphy.com/media/c1R3XcUXVWAFy/giphy.webp' style='position: fixed; bottom: 130px; left: 70px; width: 200px; height: 200px; z-index: 99999; pointer-events: none; mix-blend-mode: screen;' />");
        $('body').append("<img class='firework' src='https://i.giphy.com/media/c1R3XcUXVWAFy/giphy.webp' style='position: fixed; top: 2000px; right: 40px; width: 200px; height: 200px; z-index: 99999; pointer-events: none; mix-blend-mode: screen;' />");
        $('body').append("<img class='firework' src='https://i.giphy.com/media/c1R3XcUXVWAFy/giphy.webp' style='position: fixed; bottom: 90px; right: 250px; width: 200px; height: 200px; z-index: 99999; pointer-events: none; mix-blend-mode: screen;' />");

        $('body').append('<iframe width="560" height="315" src="https://www.youtube.com/embed/M1wLtAXDgqg?autohide=1&autoplay=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>');
      }
    });
  }

  public dropSnow()
  {
    let { buckets, snow, w, h } = this.state;
    if (!buckets || !snow)
    {
      return;
    }

    // new snow
    const c = Util.randInt(4);
    _.range(0, c).map((q) =>
    {
      const y = Math.floor(h / r);
      const x = Util.randInt(w / r);

      snow = snow.push({ x, y, moving: true });
    });

    snow = snow.map((s) =>
    {
      if (!s.moving)
      {
        return s;
      }

      let { x, y } = s;
      if (buckets.get(x) >= y)
      {
        buckets = buckets.set(x, buckets.get(x) + 1);
        return {
          x, y, moving: false,
        };
      }

      y--;
      const newx = Util.valueMinMax(x + Util.randInt(3) - 1, 0, Math.floor(w / r));
      if (buckets.get(newx) < y)
      {
        x = newx;
      }

      return { x, y, moving: true };
    }).toList();

    this.setState({
      snow, buckets,
    });
  }

  public startChristmas()
  {
    const w = $('body').width();
    const h = $('body').height();
    const buckets = Immutable.List(_.range(0, w / r).map((i) => 0));
    const snow = Immutable.List([]);
    this.setState({
      buckets,
      snow,
      w,
      h,
      christmas: true,
    });

    setInterval(this.dropSnow, 100);
  }

  public render()
  {
    if (this.state.christmas)
    {
      return (
        <div className='snow-egg'>
          {
            this.state.snow && this.state.snow.map((s) =>
              <div
                className='snow'
                style={{
                  width: r,
                  height: r,
                  left: s.x * r,
                  bottom: s.y * r,
                }}
              />,
            )
          }
          <iframe className='youtube-player' src='http://www.youtube.com/embed/6b9BKK27HuQ?wmode=opaque&autohide=1&autoplay=1'>&lt;br /&gt;</iframe>
        </div>
      );
    }

    return null;
  }
}

export default EasterEggs;
