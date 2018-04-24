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

// tslint:disable:no-var-requires strict-boolean-expressions

import * as classNames from 'classnames';
import TerrainComponent from 'common/components/TerrainComponent';
import * as _ from 'lodash';
import * as Radium from 'radium';
import * as React from 'react';

import CheckBox from 'common/components/CheckBox';
import FadeInOut from 'common/components/FadeInOut';
import { backgroundColor, borderColor, Colors, fontColor, getStyle } from 'src/app/colors/Colors';

import './NestedView.less';
const ArrowIcon = require('images/icon_arrow.svg');
const ExpandIcon = require('images/icon_carrot.svg');

export interface Props
{
  content: any; // the content that is inline with the arrow and the checkbox
  open: boolean;
  onToggle: (ev?) => void;
  style?: any;
  children?: any; // the expandable content rendered beneath the content
  injectedContent?: any;
  showCheckbox?: boolean;
  checked?: boolean;
  hideControls?: boolean;
  onCheckboxClicked?: () => void;
}

class ExpandableView extends TerrainComponent<Props>
{
  public renderArrowSection()
  {
    const hasChildren = this.props.children !== undefined && this.props.children !== null;
    return (
      <div
        className='nested-view-arrow-column'
        style={{
          color: Colors().text3,
          marginLeft: `${arrowColumnMargin}px`,
          marginRight: `${arrowSpacing}px`,
        }}
      >
        <div className='nested-view-arrow-spacer-top' />
        <ExpandIcon
          className={classNames({
            'nested-view-arrow-icon': true,
            'nested-view-open': this.props.open,
            'nested-view-has-children': hasChildren,
          })}
          onClick={hasChildren ? this.props.onToggle : undefined}
          style={arrowStyle}
        />
        <div
          className={classNames({
            'nested-view-arrow-spacer-bottom': true,
            'nested-view-open': this.props.open,
            'nested-view-has-children': hasChildren,
          })}
          style={{
            borderColor: this.getBorderColor(),
          }}
        />
      </div>
    );
  }

  public renderCheckboxSection()
  {
    if (!this.props.showCheckbox)
    {
      return (
        <div
          className='nested-view-checkbox-column nested-view-checkbox-hidden'
          style={{
            width: '0px',
            height: '0px',
            paddingLeft: '0px',
          }}
        >
        </div>
      );
    }
    else
    {
      return (
        <div
          className='nested-view-checkbox-column'
          style={{
            width: `${checkboxSize}px`,
            height: `${checkboxSize}px`,
            marginLeft: `${checkboxMargin}px`,
          }}
        >
          <CheckBox
            checked={this.props.checked}
            className='nested-view-checkbox'
            onChange={this.props.onCheckboxClicked}
          />
        </div>
      );
    }
  }

  public renderChildren()
  {
    const leftBorderColor = this.getBorderColor();

    return (
      <FadeInOut open={this.props.open}>
        <div
          className={classNames({
            'nested-view-children-container': true,
            'nested-view-open': this.props.open,
          })}
        >
          {this.props.children}
        </div>
      </FadeInOut>
    );
  }

  public renderInjectedContent()
  {
    if (this.props.injectedContent !== null && this.props.injectedContent !== undefined)
    {
      return (
        <div
          className={classNames({
            'nested-view-injected-container': true,
            'nested-view-open': this.props.open,
          })}
          style={{
            borderColor: this.getBorderColor(),
          }}
        >
          {this.props.injectedContent}
        </div>
      );
    }
    else
    {
      return null;
    }
  }

  public getBorderColor()
  {
    return Colors().inactiveHover;
  }

  public render()
  {
    const rootStyle = this.getStyle(this.props.children != null);
    const style = this.props.style !== undefined ? _.extend({}, rootStyle, this.props.style) : rootStyle;

    return (
      <div className={classNames({
        'nested-view-container': true,
      })}
        style={style}
      >
        <div
          className='nested-view-content-row'
          style={{
            paddingTop: '0px',
            paddingBottom: '0px',
          }}
        >
          {
            this.props.hideControls ? null : this.renderArrowSection()
          }
          {
            this.props.hideControls ? null : this.renderCheckboxSection()
          }
          <div
            className='nested-view-content'
            style={{
              padding: this.props.children == null ? '0px' : '0px',
            }}
          >
            {this.props.content}
          </div>
        </div>
        {
          this.renderInjectedContent()
        }
        {
          this.renderChildren()
        }
      </div>
    );
  }

  public getStyle(hasChildren: boolean)
  {
    if (hasChildren)
    {
      return {
        backgroundColor: Colors().bg2,
        margin: '6px 6px 0px 6px',
        padding: '0px 0px 6px 0px',
        border: `2px solid ${Colors().bg3}`,
      };
    }
    else
    {
      return {
        margin: '0px 6px',
        padding: '0px',
        boxShadow: `inset 0 -1px 0 0 ${Colors().boxShadow}`,
        backgroundColor: Colors().bg3,
      };
    }
  }
}
export default ExpandableView;

const checkboxSize = 18;
const checkboxMargin = 6;
const arrowSize = 12;
const arrowSpacing = 3;
const arrowColumnMargin = 12;

const arrowStyle = {
  width: arrowSize,
  height: arrowSize,
  padding: `${arrowSpacing}px ${arrowSpacing}px ${arrowSpacing}px 0px`,
  margin: `-2px 0px`,
};

export const leftColumnWidth = arrowSize + arrowSpacing + arrowColumnMargin + 3;
