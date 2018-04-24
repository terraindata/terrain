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

  // TODO could consider a prop here to force shouldRender, which you could trigger
  //  on hover, to try to improve responsiveness of opening the drawer
}

class DrawerAnimation extends TerrainComponent<Props>
{
  public state = {
    contentRef: null,

    // needing these state overrides to optimize the component:
    //  don't render when open is false, but still do the animation
    shouldRender: this.props.open,
    renderMaxHeight: 0, // start at 0 no matter what, so we get the animation even on mount
    closingTimeout: null,
    openingInterval: null,
  };

  // tracking if it was rendered; anti-pattern, I know, but I don't have anything better
  public hasRendered: boolean = false;

  public render()
  {
    const { open, maxHeight, children } = this.props;
    const { shouldRender, renderMaxHeight } = this.state;

    // we need to duplicate the children content
    // so that we can get the wrapper to size dynamically
    // to the content (in a hidden copy) and show the real copy
    // pinned to the bottom edge of the wrapper

    // TODO consider an optimization that only renders the children when the thing is open
    // attempt at ^
    if (!shouldRender)
    {
      this.hasRendered = false;
      return null;
    }

    this.hasRendered = true;

    return (
      <div
        className='drawer-animation'
        style={getStyle('maxHeight', renderMaxHeight)}
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
    if (this.props.open && !nextProps.open)
    {
      this.close();
    }

    if (!this.props.open && nextProps.open)
    {
      this.open();
    }

    if (nextProps.maxHeight !== this.props.maxHeight && nextProps.open && this.props.open)
    {
      // update the rendered max height
      this.setState({
        renderMaxHeight: nextProps.maxHeight,
      });
    }
  }

  public componentDidMount()
  {
    if (this.props.open)
    {
      this.open();
    }
  }

  private open()
  {
    // open
    this.clearTimeouts();

    this.setState({
      shouldRender: true, // render now
      renderMaxHeight: 0, // but in a closed state
      openingInterval: setInterval(() =>
      {
        {
          // make sure we've already rendered, so we get that animation
          this.setState({
            renderMaxHeight: this.props.maxHeight,
          });
          this.clearTimeouts();
          // scroll the content into view
          setTimeout(() =>
          {
            const el = ReactDOM.findDOMNode(this.state.contentRef) as Element;
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
      },
        0), // quick delay
    });

  }

  private close()
  {
    this.clearTimeouts();
    this.setState({
      shouldRender: true, // should be unchanged
      renderMaxHeight: 0, // tell it we're closing
      closingTimeout: setTimeout(() =>
      {
        this.setState({
          shouldRender: false,
        });
        this.clearTimeouts();
      }, 500),
    });
  }

  private clearTimeouts()
  {
    if (this.state.closingTimeout)
    {
      // clear the timeout, so nothing weird happens
      clearTimeout(this.state.closingTimeout);
    }

    if (this.state.openingInterval)
    {
      // clear the timeout, so nothing weird happens
      clearTimeout(this.state.openingInterval);
    }
  }
}

export default DrawerAnimation;
