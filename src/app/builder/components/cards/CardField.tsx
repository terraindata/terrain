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

  leftContent?: El;
  rightContent?: El;
  aboveContent?: El;
  belowContent?: El;
  
  children?: El;
}

class CardField extends PureClasss<Props>
{
  state: {
    moving: boolean;
    originalMouseY: number;
    dY: number;
    minDY: number;
    maxDY: number;
  } = {
    moving: false,
    originalMouseY: 0,
    dY: 0,
    minDY: 0,
    maxDY: 0,
  };
  
	removeField(event)
	{
    Util.animateToHeight(this.refs['all'], 0, () =>
		  this.props.onRemove(this.props.index));
	}
  
  addField(event)
  {
    this.props.onAdd(this.props.index);
  }
  
  handleHandleMousedown(event:MEvent)
  {
    $('body').on('mousemove', this.handleMouseMove);
    $('body').on('mouseup', this.handleMouseUp);
    $('body').on('mouseleave', this.handleMouseUp);
    
    let cr = this.refs['all']['getBoundingClientRect']();
    let parentCr = Util.parentNode(this.refs['all'])['getBoundingClientRect']();
    
    let minDY = parentCr.top - cr.top;
    let maxDY = parentCr.bottom - cr.bottom;
    
    this.setState({
      moving: true,
      originalMouseY: event.pageY,
      dY: 0,
      minDY,
      maxDY,
    });
  }
  
  handleMouseMove(evt)
  {
    this.setState({
      dY: Util.valueMinMax(evt.pageY - this.state.originalMouseY, this.state.minDY, this.state.maxDY),
    });
  }
  
  handleMouseUp(evt)
  {
    $('body').off('mousemove', this.handleMouseMove);
    $('body').off('mouseup', this.handleMouseUp);
    $('body').off('mouseleave', this.handleMouseUp);
    
    this.setState({
      moving: false,
      dY: 0,
    });
  }

	render()
  {
		var leftContent = this.props.leftContent || (
      <div
        className='card-field-handle'
        onMouseDown={this.handleHandleMousedown}
      >
        ⋮⋮
      </div>
    );
    
    var rightContent = this.props.rightContent || (
      <div>
        { 
          <div
            className='card-field-add'
            onClick={this.addField}
            data-tip='Add another'
          >
            <AddIcon />
          </div> 
        }
        { 
          <div
            className='card-field-remove'
            onClick={this.removeField}
            data-tip='Remove'
          >
            <RemoveIcon />
          </div>
        }
      </div>
		);

    return (
      <div
        ref='all'
        className='card-field-wrapper'
        style={!this.state.moving ? null : {
          top: this.state.dY,
          position: 'relative',
          zIndex: 999999,
        }}
      >
        { this.props.aboveContent ? this.props.aboveContent: null }
        <div
          className={classNames({
            'card-field': true,
            'card-field-moving': this.state.moving,
          })}
          ref='cardField'
        >
  				<div className='card-field-tools-left'>
            <div className='card-field-tools-left-inner'>
              { leftContent }
            </div>
          </div>
  				<div className='card-field-inner' >
  					{ this.props.children }
  				</div>
  				<div className='card-field-tools-right'>
            <div className='card-field-tools-right-inner'>
              { rightContent }
            </div>
          </div>
  			</div>
        { this.props.belowContent ? this.props.belowContent : null }
      </div>
	  );
	}
}

export default CardField;