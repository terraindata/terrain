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

require('./Loading.less')
import * as $ from 'jquery';
import * as classNames from 'classnames';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

import PureClasss from '../../common/components/PureClasss.tsx';

const Sprites = require("./../../../images/spritesheet_terrainLoading_optimized.png");

const fps = 30;

interface Props {
  loading: boolean;
  loaded: boolean;
  onLoadedEnd: () => void;
  
  width: number;
  height: number;
}

// Frame Breakdown
// (Appear: frames 0-10) (Loading Appear: frames 11-16) (Loading Loop: frames 17-50) (Disappear: frames 51-56)

class Loading extends PureClasss<Props>
{
  state = {
    stage: 0,
  };
  
  // Stages:
  // 0: initial appear (Freeze here if not loading)
  // 1: loading appear
  // 2: loading, loop
  // 3: loaded, phase out (freeze after the end)
  
  stageParams: {
    loop: boolean;
    endFrame: number;
    startFrame: number;
    followThrough?: boolean;
  }[] = [
    {
      loop: false,
      startFrame: 0,
      endFrame: 10,
    },
    {
      loop: false,
      startFrame: 11,
      endFrame: 16,
      followThrough: true,
    },
    {
      loop: true,
      startFrame: 17,
      endFrame: 50,
    },
    {
      loop: false,
      startFrame: 17,
      endFrame: 56,
    },
  ];
  
  componentWillUnmount()
  {
    
  }
  
  handleClick()
  {
    this.setState({
      stage: (this.state.stage + 1) % this.stageParams.length
    })
  }

  render()
  {
    let params = this.stageParams[this.state.stage];
    console.log(this.state.stage);
    
    let {width} = this.props;
    let {loop, startFrame, endFrame} = params;
    let frameCount = endFrame - startFrame;
    
    
    let animationCss = this.stageParams.map((p, f) =>
    {
      let {loop, startFrame, endFrame} = p;
      let startMargin = -1 * startFrame * width;
      let endMargin = -1 * endFrame * width;
      return `@keyframes loadingPlay${f} { 0% { margin-left: ${startMargin}px; } 100% { margin-left: ${endMargin}px; } }`;
    }).join('\n');
    
    return (
      <div
        className={classNames({
          'loading-wrapper': true,
        })}
        onClick={this.handleClick}
        style={{
          height: this.props.height,
          width: this.props.width,
        }}
      >
        <style
          dangerouslySetInnerHTML={{
            __html: animationCss
          }}
        />
        <img
          src={Sprites}
          className='moutain-loading-img'
          style={{
            animation: `loadingPlay${this.state.stage} ${frameCount / fps}s steps(${frameCount}) ${loop ? 'infinite' : ''}`,
            height: this.props.height,
            marginLeft: -1 * endFrame * width,
          }}
        />
      </div>
    );
   }
        // {
        //   this.stageParams.map((params, stage) =>
        //     this.state.stage === stage &&
        //       <SpriteAnimator
        //         sprite={MountainGif}
        //         width={288} 
        //         height={288}
                
        //         stopLastFrame={!params.loop}
        //         startFrame={params.startFrame}
        //         frameCount={params.endFrame - params.startFrame + 1}
                
        //         key={stage}
        //       />
        //   )
        // }
};

export default Loading;