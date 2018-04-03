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
import './ExpandableView.less';

const ArrowIcon = require('images/icon_arrow.svg');

export interface Props
{
  content: any; // the content that is inline with the arrow and the checkbox
  open: boolean;
  onToggle: (ev?) => void;
  style?: any;
  children?: any; // the expandable content rendered beneath the content
  injectedContent?: any;
  hideContent?: boolean;
  hideArrow?: boolean;
  showCheckbox?: boolean;
  checked?: boolean;
  onCheckboxClicked?: () => void;
}

const checkboxSize = 18;
const checkboxMargin = 6;
const arrowSize = 12;
const arrowPadding = 2;
const containerLeftPadding = arrowPadding + arrowSize / 2;
const containerLeftMargin = containerLeftPadding - 1;

class ExpandableView extends TerrainComponent<Props>
{
  public renderArrowSection()
  {
    if (this.props.hideArrow)
    {
      return null;
    }

    const hasChildren = this.props.children !== undefined && this.props.children !== null;
    return (
      <div
        className='expandable-view-arrow-column'
        style={fontColor(Colors().text3)}
      >
        <div className='expandable-view-arrow-spacer-top' />
        <ArrowIcon
          className={classNames({
            'expandable-view-arrow-icon': true,
            'expandable-view-open': this.props.open,
            'expandable-view-has-children': hasChildren,
          })}
          onClick={hasChildren ? this.props.onToggle : undefined}
          style={{
            width: arrowSize,
            height: arrowSize,
            padding: `${arrowPadding}px`,
            margin: `-${arrowPadding}px 0px`,
          }}
        />
        <div
          className={classNames({
            'expandable-view-arrow-spacer-bottom': true,
            'expandable-view-open': this.props.open,
            'expandable-view-has-children': hasChildren,
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
          className='expandable-view-checkbox-column expandable-view-checkbox-hidden'
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
          className='expandable-view-checkbox-column'
          style={{
            width: `${checkboxSize}px`,
            height: `${checkboxSize}px`,
            marginLeft: `${checkboxMargin}px`,
          }}
        >
          <CheckBox
            checked={this.props.checked}
            className='expandable-view-checkbox'
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
            'expandable-view-children-container': true,
            'expandable-view-open': this.props.open,
          })}
          style={{
            marginLeft: this.props.hideArrow ? '' : `${containerLeftMargin}px`,
            paddingLeft: this.props.hideArrow ? '' : containerLeftPadding,
            borderLeft: this.props.hideArrow ? '0px solid' : `1px solid ${leftBorderColor}`,
          }}
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
            'expandable-view-injected-container': true,
            'expandable-view-open': this.props.open,
          })}
          style={{
            marginLeft: containerLeftMargin,
            paddingLeft: containerLeftPadding,
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
    return (
      <div className={classNames({
        'expandable-view-container': true,
      })}
        style={this.props.style || {}}
      >
        {
          this.props.hideContent ? <div /> :
            <div className='expandable-view-content-row'>
              {
                this.renderArrowSection()
              }
              {
                this.renderCheckboxSection()
              }
              <div className='expandable-view-content'>
                {this.props.content}
              </div>
            </div>
        }
        {
          this.renderInjectedContent()
        }
        {
          this.renderChildren()
        }
      </div>
    );
  }
}
export default ExpandableView;
