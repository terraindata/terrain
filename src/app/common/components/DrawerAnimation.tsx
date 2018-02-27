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

// tslint:disable:no-var-requires

import { getStyle } from 'app/colors/Colors';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import TerrainComponent from './../../common/components/TerrainComponent';
const { VelocityTransitionGroup, VelocityComponent } = require('velocity-react');
import './DrawerAnimationStyle.less';

export interface Props
{
  open: boolean;
  children?: any;
  maxHeight: number;
}

class DrawerAnimation extends TerrainComponent<Props>
{
  public state = {
    contentRef: null,
  };

  public render()
  {
    const { open, maxHeight, children } = this.props;

    // we need to duplicate the children content
    // so that we can get the wrapper to size dynamically
    // to the content (in a hidden copy) and show the real copy
    // pinned to the bottom edge of the wrapper

    // TODO consider an optimization that only renders the children when the thing is open

    return (
      <div
        className='drawer-animation'
        style={getStyle('maxHeight', open ? maxHeight : 0)}
      >
        <div className='drawer-animation-content-copy'>
          {
            children
          }
        </div>
        <div
          className='drawer-animation-content'
          ref={this._fn(this._saveRefToState, 'contentRef')}
        >
          {
            children
          }
        </div>
      </div>
    );
  }

  public componentWillReceiveProps(nextProps: Props)
  {
    if (!this.props.open && nextProps.open)
    {
      // scroll the content into view
      setTimeout(() =>
      {
        const el = ReactDOM.findDOMNode(this.state.contentRef);

        if (el !== undefined)
        {
          el.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'nearest',
          });
        }
      }, 350); // coordinate this value with LESS
      // in the future you could consider a ghost element down at the bottom
      // of the position, so the window can scroll before the content has opened
    }
  }
}

export default DrawerAnimation;
