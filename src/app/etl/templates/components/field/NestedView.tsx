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
import DragDropItem from 'common/components/DragDropItem';
import DragHandle from 'common/components/DragHandle';
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
  canDrag: boolean;
  keyPath: KeyPath;
  onDrop: (dropIndex: List<number>, dragIndex: List<number>) => void;
  style?: any;
  children?: any; // the expandable content rendered beneath the content
  injectedContent?: any;
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
        key='arrow'
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
    return (
      <div
        className='nested-view-checkbox-column'
        key='checkbox'
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

  public renderDragHandleSection()
  {
    if (!this.props.canDrag)
    {
      return null;
    }

    return (
      <div
        className='nested-view-checkbox-column'
        key='drag-handle'
        style={{
          width: `${checkboxSize}px`,
          height: `${checkboxSize}px`,
          marginLeft: `${checkboxMargin}px`,
        }}
      >
        <DragHandle
        />
      </div>
    );
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

  public getBorderColor()
  {
    return Colors().inactiveHover;
  }

  public render()
  {
    const rootStyle = this.getNestedStyle(this.props.children != null, this.props.open);
    const style = this.props.style !== undefined ? _.extend({}, rootStyle, this.props.style) : rootStyle;

    return (
      <div style={getStyle('position', 'relative')}>
        <DragDropItem
          keyPath={this.props.keyPath}
          canDrag={this.props.canDrag}
          canDrop={this.props.canDrag}
          onDrop={this.props.onDrop}
          dropZoneStyle={DROP_ZONE_STYLE}
        >
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
                this.props.hideControls ? null : [
                  this.renderDragHandleSection(),
                  this.renderArrowSection(),
                  this.renderCheckboxSection(),
                ]
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
              this.renderChildren()
            }
          </div>
        </DragDropItem>
      </div>
    );
  }

  public getNestedStyle(hasChildren: boolean, isOpen: boolean)
  {
    if (hasChildren)
    {
      return {
        backgroundColor: Colors().bg2,
        margin: '6px 6px 0px 6px',
        padding: `0px 0px ${isOpen ? 6 : 0}px 0px`,
        border: `2px solid ${Colors().bg3}`,
        borderBottomLeftRadius: '0px',
        borderBottomRightRadius: '0px',
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

const DROP_ZONE_STYLE = {
  height: '100%',
  top: '0px',
};

export const leftColumnWidth = arrowSize + arrowSpacing + arrowColumnMargin + 3;
