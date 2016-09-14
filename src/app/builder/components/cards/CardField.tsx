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

require('./CardField.less');
import * as $ from 'jquery';
import * as _ from 'underscore';
import * as React from 'react';
import Util from '../../../util/Util.tsx';
import PureClasss from '../../../common/components/PureClasss.tsx';
import BuilderComponent from '../BuilderComponent.tsx';
import {Display} from '../../BuilderDisplays.tsx';
import ManualInfo from '../../../manual/components/ManualInfo.tsx';
const classNames = require('classnames');

var AddIcon = require("./../../../../images/icon_add_7x7.svg?name=AddIcon");
var RemoveIcon = require("./../../../../images/icon_close_8x8.svg?name=RemoveIcon");

var FIELD_HEIGHT = 32;
var STANDARD_MARGIN = 6;

interface Props
{
  index: number;
  onAdd: (index: number) => void;
  onRemove: (index: number) => void;
  onMove: (index: number, newIndex: number) => void;
  
  isSingle?: boolean;

  row: {
    inner: Display | Display[];
    above?: Display | Display[];
    below?: Display | Display[];
    hideToolsWhenNotString?: boolean;
  }
  keyPath: KeyPath;
  data: any; // record
  canEdit: boolean;
  keys: List<string>;
  
  parentData?: any;
  // provide parentData if necessary but avoid if possible
  // as it will cause re-renders
  helpOn?: boolean;
  addColumn?: (number, string?) => void;
  columnIndex?: number;
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

const DefaultMoveState =
{
  moving: false,
  movedTo: null,
}

  const shallowCompare = require('react-addons-shallow-compare');
// TODO consider adding state to the template
class CardField extends PureClasss<Props>
{
  state: IMoveState = DefaultMoveState;
  
  ss(state: IMoveState)
  {
    this.setState(state);
  }
  
  // TODO
  // shouldComponentUpdate(nextProps: Props, nextState: any)
  // {
  //   if(shallowCompare(this, nextProps, nextState))
  //   {
  //     console.log('update');
  //     for(var i in this.props)
  //     {
  //       if(nextProps[i] !== this.props[i])
  //       {
  //         console.log(i, this.props[i], nextProps[i]);
  //       }
  //     }
  //     for(var i in this.state)
  //     {
  //       if(nextState[i] !== this.state[i])
  //       {
  //         console.log(i, this.state[i], nextState[i]);
  //       }
  //     }
  //   }
  //   return shallowCompare(this, nextProps, nextState);
  // }
  
	removeField(event)
	{
    Util.animateToHeight(this.refs['all'], 0, () =>
		  this.props.onRemove(this.props.index));
	}
  
  addField(event)
  {
    this.props.onAdd(this.props.index + 1);
  }
  
  addFieldTop(event)
  {
    this.props.onAdd(0);
  }
  
  handleHandleMousedown(event:MEvent)
  {
    $('body').on('mousemove', this.handleMouseMove);
    $('body').on('mouseup', this.handleMouseUp);
    $('body').on('mouseleave', this.handleMouseUp);
    
    let parent = Util.parentNode(this.refs['all']);
    
    let cr = this.refs['all']['getBoundingClientRect']();
    let parentCr = parent['getBoundingClientRect']();
    
    let minDY = parentCr.top - cr.top;
    let maxDY = parentCr.bottom - cr.bottom;
    
    let siblings = Util.siblings(this.refs['all']);
    let midpoints = [];
    let tops = [];
    _.range(0, siblings.length).map(i =>
    {
      let sibCr = siblings[i]['getBoundingClientRect']();
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
    } as IMoveState);
  }
  
  shiftSiblings(evt, shiftSelf:boolean): ({ dY: number, index: number })
  {
    let dY = Util.valueMinMax(evt.pageY - this.state.originalMouseY, this.state.minDY, this.state.maxDY);
  
    // TODO search from the bottom up if dragging downwards  
    if(dY < 0)
    {
      // if dragged up, search from top down
      for
      (
        var index = 0;
        this.state.midpoints[index] < this.state.originalElTop + dY;
        index ++
      );
    }
    else
    {
      for
      (
        var index = this.state.midpoints.length - 1;
        this.state.midpoints[index] > this.state.originalElBottom + dY;
        index --
      );
    }
  
    let sibs = Util.siblings(this.refs['all']);
    _.range(0, sibs.length).map(i =>
    {
      let el = sibs[i];
      if(i === this.props.index)
      {
        $(el).removeClass('card-field-wrapper-moving');
        return;
      }
      
      var shift = 0;
      if(index < this.props.index)
      {
        // move things down
        if(i < this.props.index && i >= index)
        {
          shift = 1;
        }
      }
      else
      {
        // move up
        if(i > this.props.index && i <= index)
        {
          shift = -1;
        }
      }
      
      el['style'].top = shift * this.state.elHeight;
      $(el).addClass('card-field-wrapper-moving');
    });
    
    return { dY, index };
  }
  
  handleMouseMove(evt)
  {
    this.setState({
      dY: this.shiftSiblings(evt, false).dY,
    });
    evt.preventDefault();
    evt.stopPropagation();
  }
  
  move()
  {
    if(this.props.index !== this.state.movedTo)
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
  
  componentWillReceiveProps(nextProps: Props)
  {
    if(nextProps.index !== this.props.index)
    {
      this.setState({
        movedTo: null,
        moving: false,
      });
      let sibs = Util.siblings(this.refs['all']);
      _.range(0, sibs.length).map(i =>
        sibs[i]['style'].top = 0
      );
    }
  }
  
  handleMouseUp(evt)
  {
    $('body').off('mousemove', this.handleMouseMove);
    $('body').off('mouseup', this.handleMouseUp);
    $('body').off('mouseleave', this.handleMouseUp);
    
    let {index} = this.shiftSiblings(evt, true);
    
    setTimeout(this.move, 150);
    
    this.setState({
      movedTo: index,
    });
  }

	render()
  {
    var style = null;
    if(this.state.movedTo !== null)
    {
      style = {
        top: this.state.tops[this.state.movedTo] - this.state.originalElTop,
      };
    }
    else if(this.state.moving)
    {
      style = {
        top: this.state.dY,
        zIndex: 99999,
      };
    }
    
    let {row} = this.props;
    
    let renderTools = ! row.hideToolsWhenNotString || typeof this.props.data[this.props.row.inner['key']] === 'string';

    return (
      <div
        ref='all'
        className={classNames({
          'card-field-wrapper': true,
          'card-field-wrapper-moving': this.state.movedTo !== null,
        })}
        style={style}
      >
        { ! row.above ? null :
            <BuilderComponent
              display={this.props.row.above}
              keyPath={this.props.keyPath}
              data={this.props.data}
              canEdit={this.props.canEdit}
              keys={this.props.keys}
              parentData={this.props.parentData}
              helpOn={this.props.helpOn}
              addColumn={this.props.addColumn}
              columnIndex={this.props.columnIndex}
            />
        }
        <div
          className={classNames({
            'card-field': true,
            'card-field-moving': this.state.moving,
            'card-field-single': this.props.isSingle,
            // ^ hides the left drag handle if single
          })}
          ref='cardField'
        >
          {
            !renderTools && this.props.canEdit &&
              <div
                className='card-field-top-add card-field-add'
                onClick={this.addFieldTop}
                data-tip={'Add another'}
              >
                <AddIcon />
              </div>
          }
          {
            renderTools && this.props.canEdit &&
      				<div className='card-field-tools-left'>
                <div className='card-field-tools-left-inner'>
                  <div
                    className='card-field-handle'
                    onMouseDown={this.handleHandleMousedown}
                  >
                    ⋮⋮
                  </div>
                  {
                      this.props.helpOn ?
                      <ManualInfo 
                        information="Can move fields around within the current card by dragging and dropping"
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
              keys={this.props.keys}
              parentData={this.props.parentData}
              helpOn={this.props.helpOn}
              addColumn={this.props.addColumn}
              columnIndex={this.props.columnIndex}
            />
  				</div>
          {
            renderTools && this.props.canEdit &&
      				<div className='card-field-tools-right'>
                <div className='card-field-tools-right-inner'>
                  <div>
                    <div
                      className='card-field-add'
                      onClick={this.addField}
                      data-tip={'Add another'}
                    >
                      <AddIcon />
                    </div> 
                    {
                      this.props.helpOn ?
                      <ManualInfo 
                        information="Can add field using the plus button or remove fields using the x button"
                        rightSide={true}
                        className='card-field-manual-info'
                      />
                      : null
                    }
                    <div
                      className='card-field-remove'
                      onClick={this.removeField}
                      data-tip={'Remove'}
                    >
                      <RemoveIcon />
                    </div>
                  </div>
                </div>
              </div>
           }
  			</div>
        { ! row.below ? null :
            <BuilderComponent
              display={this.props.row.below}
              keyPath={this.props.keyPath}
              data={this.props.data}
              canEdit={this.props.canEdit}
              keys={this.props.keys}
              parentData={this.props.parentData}
              helpOn={this.props.helpOn}
              addColumn={this.props.addColumn}
              columnIndex={this.props.columnIndex}
            />
        }
      </div>
	  );
	}
}

export default CardField;