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

// tslint:disable:restrict-plus-operands strict-boolean-expressions interface-name no-var-requires no-unused-expression max-classes-per-file

import * as classNames from 'classnames';
import * as $ from 'jquery';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import './Loading.less';

import TerrainComponent from '../../common/components/TerrainComponent';
import Util from '../../util/Util';

const Sprites = require('./../../../images/spritesheet_terrainLoading_blue.png');

export interface Props
{
  loading: boolean;
  loaded: boolean;
  onLoadedEnd?: () => void;
  width: number;
  height: number;

  center?: boolean;
}

// Frame Breakdown
// (Appear: frames 0-10) (Loading Appear: frames 11-16) (Loading Loop: frames 17-50) (Disappear: frames 51-56)

class Loading extends TerrainComponent<Props>
{
  public state = {
    stage: 0,
  };

  // Stages:
  // 0: initial appear (Freeze here if not loading)
  // 1: loading appear
  // 2: loading, loop
  // 3: loaded, phase out (freeze after the end)

  public stageParams: IStage[] = [
    {
      loop: false,
      startFrame: 0,
      endFrame: 9,
      onStageEnd: this.handleFirstEnd,
    },
    {
      loop: false,
      startFrame: 10,
      endFrame: 15,
      followThrough: true,
    },
    {
      loop: true,
      startFrame: 16,
      endFrame: 49,
    },
    {
      loop: false,
      fadeOut: true,
      startFrame: 50,
      endFrame: 55,
      onStageEnd: this.handleEnd,
    },
  ];

  public imgLooper: ImgLooper;

  public componentDidMount()
  {
    this.imgLooper = new ImgLooper(ReactDOM.findDOMNode(this.refs['sprites']) as any, this.props.width, this.stageParams);
  }

  public componentWillUnmount()
  {
    this.imgLooper && this.imgLooper.dispose();
  }

  public componentWillReceiveProps(nextProps: Props)
  {
    let stage = -1;
    if (!this.props.loading && nextProps.loading)
    {
      stage = 1;
    }
    else if (!this.props.loaded && nextProps.loaded)
    {
      stage = 3;
    }
    else if (this.props.loading && !nextProps.loading)
    {
      stage = 0;
    }

    if (stage !== -1)
    {
      this.setStage(stage);
    }
  }

  public setStage(stage: number)
  {
    this.imgLooper.setStage(stage);
    this.setState({
      stage,
    });
  }

  public handleFirstEnd()
  {
    if (this.props.loaded)
    {
      this.setStage(3);
    }
    else if (this.props.loading)
    {
      this.setStage(1);
    }
  }

  public handleEnd()
  {
    if (typeof this.props.onLoadedEnd === 'function')
    {
      this.props.onLoadedEnd();
    }
  }

  public render()
  {
    const { width } = this.props;

    return (
      <div
        className={classNames({
          'loading-wrapper': true,
          'dead-center': this.props.center,
          'loading-wrapper-loaded': this.state.stage === 3,
        })}
        style={{
          height: this.props.height,
          width: this.props.width,
        }}
      >
        <img
          src={Sprites}
          className='moutain-loading-img'
          style={{
            height: this.props.height,
          }}
          ref='sprites'
        />
      </div>
    );
  }
}
const fps = DEV ? 55 : 35;

interface IStage
{
  loop: boolean;
  endFrame: number;
  startFrame: number;
  followThrough?: boolean;
  onStageEnd?: () => void;
  fadeOut?: boolean;
}

class ImgLooper
{
  public el: HTMLElement;
  public stages: IStage[];
  public stage: number;
  public frame: number;
  public width: number;
  public fadeOpacity: number = 0;

  public interval: any;

  constructor(_el: HTMLElement, _width: number, _stages: IStage[], _stage = 0)
  {
    Util.bind(this as any, 'setStage', 'dispose', 'nextFrame', 'showFrame', 'clearInterval');
    // this.nextFrame = this.nextFrame.bind(this);

    this.el = _el;
    this.stages = _stages;
    this.width = _width;
    this.setStage(_stage, true);

  }

  public setStage(_stage: number, showFrame: boolean = false)
  {
    const stageParams = this.stages[_stage];
    if (this.stage === -1 || showFrame || stageParams.endFrame < this.frame)
    {
      this.showFrame(stageParams.startFrame);
    }

    this.stage = _stage;

    if (!this.interval)
    {
      this.interval = setInterval(this.nextFrame, 1000 / fps);
    }
  }

  public dispose()
  {
    this.clearInterval();
  }

  // only called by the interval
  private nextFrame()
  {
    const { loop, startFrame, endFrame, followThrough, onStageEnd } = this.stages[this.stage];

    if (this.frame === endFrame)
    {
      if (followThrough)
      {
        this.setStage(this.stage + 1);
      }
      else if (loop)
      {
        this.showFrame(startFrame);
      }
      else
      {
        this.clearInterval();
      }

      onStageEnd && onStageEnd();
    }
    else
    {
      this.showFrame(this.frame + 1);
    }
  }

  private showFrame(_frame: number)
  {
    const m = -1 * this.width * _frame;
    this.el.style.marginLeft = m + 'px';
    this.frame = _frame;

    if (this.stages[this.stage] && this.stages[this.stage].fadeOut &&
      this.stages[this.stage].startFrame <= _frame)
    {
      this.fadeOpacity = Math.max(this.fadeOpacity - 0.1, 0);
      if (_frame === this.stages[this.stage].endFrame)
      {
        this.fadeOpacity = 0;
      }
    }
    else
    {
      this.fadeOpacity = Math.min(this.fadeOpacity + 0.1, 1);
    }
    $('.loading-wrapper').css('opacity', this.fadeOpacity);
  }

  private clearInterval()
  {
    this.interval && clearInterval(this.interval);
    this.interval = null;
  }
}

export default Loading;
