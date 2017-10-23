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

// tslint:disable:no-empty restrict-plus-operands strict-boolean-expressions interface-name no-var-requires
import * as $ from 'jquery';
import * as _ from 'lodash';
import * as Radium from 'radium';
import * as React from 'react';

import { tooltip } from 'common/components/tooltip/Tooltips';
import { Display, DisplayType, RowDisplay } from '../../../../blocks/displays/Display';
import { backgroundColor, borderColor, Colors, fontColor, getStyle } from '../../../colors/Colors';
import DragHandle from '../../../common/components/DragHandle';
import TerrainComponent from '../../../common/components/TerrainComponent';
import ManualInfo from '../../../manual/components/ManualInfo';
import Util from '../../../util/Util';
import BuilderComponent from '../BuilderComponent';
import { CardItem } from './CardComponent';
import CardDropArea from './CardDropArea';
import './CardField.less';
const classNames = require('classnames');

const AddIcon = require('./../../../../images/icon_add_7x7.svg?name=AddIcon');
const RemoveIcon = require('./../../../../images/icon_close_8x8.svg?name=RemoveIcon');

const FIELD_HEIGHT = 32;
const STANDARD_MARGIN = 6;

export interface Props
{
  index: number;
  language: string;

  onAdd: (index: number) => void;
  onRemove: (index: number) => void;
  onMove: (index: number, newIndex: number) => void;

  isSingle?: boolean;
  isFirstRow?: boolean;
  isOnlyRow?: boolean;

  row: RowDisplay;
  keyPath: KeyPath;
  data: any; // record
  canEdit: boolean;

  parentData?: any;
  // provide parentData if necessary but avoid if possible
  // as it will cause re-renders
  helpOn?: boolean;
  addColumn?: (number, string?) => void;
  columnIndex?: number;
  handleCardDrop?: (type: string) => any;
  tuningMode?: boolean;
}

interface IMoveState
{
  moving: boolean;
  originalMouseY?: number;
  originalElTop?: number;
  originalElBottom?: number;
  elHeight?: number;
  dY?: number;
  minDY?: number;
  maxDY?: number;
  midpoints?: number[];
  tops?: number[];
  movedTo?: number;
}

const DefaultMoveState: IMoveState =
  {
    moving: false,
    movedTo: null,
  };

const shallowCompare = require('react-addons-shallow-compare');
// TODO consider adding state to the template
@Radium
class CardField extends TerrainComponent<Props>
{
  public state: IMoveState = DefaultMoveState;

  public ss(state: IMoveState)
  {
    this.setState(state as any);
  }

  public removeField(event)
  {
    Util.animateToHeight(this.refs['all'], 0, () =>
      this.props.onRemove(this.props.index));
  }

  public addField(event)
  {
    this.props.onAdd(this.props.index + 1);
  }

  public addFieldTop(event)
  {
    this.props.onAdd(0);
  }

  public handleHandleMousedown(event: MEvent)
  {
    $('body').on('mousemove', this.handleMouseMove);
    $('body').on('mouseup', this.handleMouseUp);
    $('body').on('mouseleave', this.handleMouseUp);

    const parent = Util.parentNode(this.refs['all']);

    const cr = this.refs['all']['getBoundingClientRect']();
    const parentCr = parent['getBoundingClientRect']();

    const minDY = parentCr.top - cr.top;
    const maxDY = parentCr.bottom - cr.bottom;

    const siblings = Util.siblings(this.refs['all']);
    const midpoints = [];
    const tops = [];
    _.range(0, siblings.length).map((i) =>
    {
      const sibCr = siblings[i]['getBoundingClientRect']();
      midpoints.push((sibCr.top + sibCr.bottom) / 2); // - (i > this.props.index ? cr.height /**/ : 0));
      tops.push(sibCr.top);
    });

    this.setState({
      moving: true,
      originalMouseY: event.pageY,
      originalElTop: cr.top,
      originalElBottom: cr.bottom,
      elHeight: cr.height,
      dY: 0,
      minDY,
      maxDY,
      midpoints,
      tops,
    });
  }

  public shiftSiblings(evt, shiftSelf: boolean): ({ dY: number, index: number })
  {
    const dY = Util.valueMinMax(evt.pageY - this.state.originalMouseY, this.state.minDY, this.state.maxDY);

    let index: number;

    // TODO search from the bottom up if dragging downwards
    if (dY < 0)
    {
      // if dragged up, search from top down
      for (
        index = 0;
        this.state.midpoints[index] < this.state.originalElTop + dY;
        index++
      )
      {

      }
    }
    else
    {
      for (
        index = this.state.midpoints.length - 1;
        this.state.midpoints[index] > this.state.originalElBottom + dY;
        index--
      )
      {

      }
    }

    const sibs = Util.siblings(this.refs['all']);
    _.range(0, sibs.length).map((i) =>
    {
      const el = sibs[i];
      if (i === this.props.index)
      {
        $(el).removeClass('card-field-wrapper-moving');
        return;
      }

      let shift = 0;
      if (index < this.props.index)
      {
        // move things down
        if (i < this.props.index && i >= index)
        {
          shift = 1;
        }
      }
      else
      {
        // move up
        if (i > this.props.index && i <= index)
        {
          shift = -1;
        }
      }

      el['style'].top = shift * this.state.elHeight;
      $(el).addClass('card-field-wrapper-moving');
    });

    return {
      dY,
      index,
    };
  }

  public handleMouseMove(evt)
  {
    this.setState({
      dY: this.shiftSiblings(evt, false).dY,
    });
    evt.preventDefault();
    evt.stopPropagation();
  }

  public move()
  {
    if (this.props.index !== this.state.movedTo)
    {
      this.props.onMove(this.props.index, this.state.movedTo);
    }
    else
    {
      this.setState({
        movedTo: null,
        moving: false,
      });
    }

    $('.card-field-wrapper-moving').removeClass('card-field-wrapper-moving');
  }

  public componentWillReceiveProps(nextProps: Props)
  {
    if (nextProps.index !== this.props.index)
    {
      this.setState({
        movedTo: null,
        moving: false,
      });
      const sibs = Util.siblings(this.refs['all']);
      _.range(0, sibs.length).map((i) =>
        sibs[i]['style'].top = 0,
      );
    }
  }

  public handleMouseUp(evt)
  {
    $('body').off('mousemove', this.handleMouseMove);
    $('body').off('mouseup', this.handleMouseUp);
    $('body').off('mouseleave', this.handleMouseUp);

    const { index } = this.shiftSiblings(evt, true);

    setTimeout(this.move, 150);

    this.setState({
      movedTo: index,
    });
  }

  public beforeTopAddDrop(item: CardItem, targetProps)
  {
    this.props.onAdd(0);
  }

  public render()
  {
    let style = null;
    if (this.state.movedTo !== null)
    {
      style = {
        top: this.state.tops[this.state.movedTo] - this.state.originalElTop,
      };
    }
    else if (this.state.moving)
    {
      style = {
        top: this.state.dY,
        zIndex: 99999,
      };
    }

    const handleToolStyle = _.extend({},
      this.state.moving ? getStyle('color', Colors().active, Colors().active) : getStyle('color', Colors().text1, Colors().inactiveHover),
    );

    const { row } = this.props;

    const isData = typeof this.props.data[this.props.row.inner['key']] !== 'string';
    const renderTools = !row.hideToolsWhenNotString || !isData;
    return (
      <div
        ref='all'
        className={classNames({
          'card-field-wrapper': true,
          'card-field-wrapper-moving': this.state.movedTo !== null,
          'card-field-wrapper-first': this.props.isFirstRow,
        })}
        style={style}
      >
        {!row.above ? null :
          <BuilderComponent
            display={this.props.row.above}
            keyPath={this.props.keyPath}
            data={this.props.data}
            canEdit={this.props.canEdit}
            parentData={this.props.parentData}
            helpOn={this.props.helpOn}
            addColumn={this.props.addColumn}
            columnIndex={this.props.columnIndex}
            language={this.props.language}
            tuningMode={this.props.tuningMode}
          />
        }
        <div
          className={classNames({
            'card-field': true,
            'card-field-moving': this.state.moving,
            'card-field-single': this.props.isSingle,
            // ^ hides the left drag handle if single
            'card-field-editable': this.props.canEdit,
          })}
          ref='cardField'
        >
          {
            !renderTools && this.props.canEdit && this.props.isFirstRow && !this.props.tuningMode &&
            tooltip(
              <div
                className='card-field-top-add card-field-add'
                onClick={this.addFieldTop}
              >
                <AddIcon />
                <CardDropArea
                  index={null}
                  keyPath={this._ikeyPath(this.props.keyPath, (row.inner as Display).key)}
                  beforeDrop={this.beforeTopAddDrop}
                  renderPreview={true}
                  accepts={(this.props.row.inner as Display).accepts}
                  language={this.props.language}
                  handleCardDrop={this.props.handleCardDrop}
                />
              </div>,
              'Add another',
            )
          }
          {
            renderTools && this.props.canEdit &&
            <div
              className='card-field-tools-left'
              style={this.state.moving ? CARD_FIELD_MOVING_STYLE : {}}
            >
              <div className='card-field-tools-left-inner'>
                <div
                  className='card-field-handle'
                  onMouseDown={this.handleHandleMousedown}
                  style={handleToolStyle}
                  key={'handle-tool'}
                >
                  <DragHandle />
                </div>
                {
                  this.props.helpOn ?
                    <ManualInfo
                      information='Can move fields around within the current card by dragging and dropping'
                      className='card-field-manual-info'
                      leftSide={true}
                    />
                    : null
                }
              </div>
            </div>
          }
          <div className='card-field-inner' >
            <BuilderComponent
              display={row.inner}
              keyPath={this.props.keyPath}
              data={this.props.data}
              canEdit={this.props.canEdit}
              parentData={this.props.parentData}
              helpOn={this.props.helpOn}
              addColumn={this.props.addColumn}
              columnIndex={this.props.columnIndex}
              language={this.props.language}
              tuningMode={this.props.tuningMode}
            />
          </div>
          {
            renderTools && this.props.canEdit &&
            <div className='card-field-tools-right'>
              <div className='card-field-tools-right-inner'>
                <div>
                  {
                    tooltip(
                      <div
                        className='card-field-add'
                        onClick={this.addField}
                        style={ADD_TOOL_STYLE}
                        key={'add-tool'}
                      >
                        <AddIcon />
                      </div>,
                      'Add another',
                    )
                  }
                  {
                    this.props.helpOn ?
                      <ManualInfo
                        information='Can add field using the plus button or remove fields using the x button'
                        rightSide={true}
                        className='card-field-manual-info'
                      />
                      : null
                  }
                  {
                    tooltip(
                      <div
                        className='card-field-remove'
                        onClick={this.removeField}
                        style={REMOVE_TOOL_STYLE}
                        key={'remove-tool'}
                      >
                        <RemoveIcon />
                      </div>,
                      'Remove',
                    )
                  }
                </div>
              </div>
            </div>
          }
        </div>
        {!row.below ? null :
          <div
            className={classNames({
              'card-field-below': true,
              'card-field-below-first': this.props.isFirstRow,
              'card-field-below-data': isData && !this.props.row.noDataPadding,
            })}
          >
            <BuilderComponent
              display={this.props.row.below}
              keyPath={this.props.keyPath}
              data={this.props.data}
              canEdit={this.props.canEdit}
              parentData={this.props.parentData}
              helpOn={this.props.helpOn}
              addColumn={this.props.addColumn}
              columnIndex={this.props.columnIndex}
              language={this.props.language}
              tuningMode={this.props.tuningMode}
            />
          </div>
        }
      </div>
    );
  }
}

const REMOVE_TOOL_STYLE = _.extend({},
  getStyle('fill', Colors().text1),
  borderColor(Colors().text1),
);

const ADD_TOOL_STYLE = _.extend({},
  getStyle('fill', Colors().text1),
  backgroundColor('transparent', Colors().inactiveHover),
  borderColor(Colors().text1),
);

const CARD_FIELD_MOVING_STYLE = _.extend({},
  borderColor(Colors().active),
);

export default CardField;
