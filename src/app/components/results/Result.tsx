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

require('./Result.less');
import * as _ from 'underscore';
import * as React from 'react';
import * as classNames from 'classnames';
import { DragSource, DropTarget } from 'react-dnd';
var { createDragPreview } = require('react-dnd-text-dragpreview');
import Util from '../../util/Util.tsx';
import Menu from '../common/Menu.tsx';
import Actions from '../../data/Actions.tsx';
import ColorManager from '../../util/ColorManager.tsx';

var PinIcon = require("./../../../images/icon_pin_21x21.svg?name=PinIcon");
var ScoreIcon = require("./../../../images/icon_terrain_27x16.svg?name=ScoreIcon");

// var fields = 
// [
//   'current_school',
//   'cats_ok',
//   'xp_toddlers',
// ];

var dragPreviewStyle = {
  backgroundColor: '#cfd7c8',
  borderColor: '#cfd7c8',
  color: '#44484d',
  fontSize: 15,
  fontWeight: 'bold',
  paddingTop: 7,
  paddingRight: 12,
  paddingBottom: 9,
  paddingLeft: 12,
  borderRadius: 10
}

var Result = React.createClass<any, any>({
  
  getInitialState() {
    return {
      score: Math.random(),
      openFields: [],
      expanded: false,
    }
  },

	propTypes:
	{
		data: React.PropTypes.object.isRequired,
    onExpand: React.PropTypes.func.isRequired,
    index: React.PropTypes.number.isRequired,
	},
  
  shouldComponentUpdate(nextProps, nextState)
  {
    return !_.isEqual(this.props, nextProps) || !_.isEqual(this.state, nextState);
  },
  
  componentDidMount() {
    this.dragPreview = createDragPreview(this.props.data.name, dragPreviewStyle);
    this.props.connectDragPreview(this.dragPreview);
  },

	getDefaultProps() 
	{
		return {
			drag_x: true,
			drag_y: true,
			reorderOnDrag: true,
			dragInsideOnly: true,
      dragHandleRef: 'drag-handle',
      data: {},
		};
	},
  
  renderExpandedField(value, field)
  {
    return this.renderField(field);
  },
  
  renderField(field)
  {
    if(field === 'image')
    {
      return (
        <div className="result-field result-field-image" key={field}>
          <div className="result-field-name">
            { field }
          </div>
          <div className='result-field-value result-field-value-image'>
            <img src={this.props.data[field]} />
          </div>
        </div>
      );
    }
    
    if(this.props.data[field] === undefined)
    {
      return null;
    }
    
    var value = this.props.data[field];
    if(typeof value === 'boolean')
    {
      value = value ? 'true' : 'false';
    }
    // if(typeof value === 'string')
    // {
    //   value = value.replace(/\\n/g, '<br />');
    // }
    
    return (
      <div className="result-field" key={field}>
        <div className="result-field-name">
          { field }
        </div>
        <div
          className={'result-field-value ' + ((field + this.props.data[field]).length < 15 ? 'result-field-value-short' : '')}
        >
          {value}
        </div>
      </div>
    );
  },
  
  spotlight()
  {
    Actions.results.spotlight(this.props.data, ColorManager.colorForKey(this.props.data.id));
  },
  
  unspotlight()
  {
    Actions.results.spotlight(this.props.data, false);
  },
  
  pin()
  {
    Actions.results.pin(this.props.data, true);
  },
  
  unpin()
  {
    Actions.results.pin(this.props.data, false);
  },
  
  renderSpotlight()
  {
    if(!this.props.data.spotlight)
    {
      return null;
    }
    
    return <div className='result-spotlight' style={{background: this.props.data.spotlight}}></div>;
  },
  
  getMenuOptions()
  {
    var menuOptions = [];
    
    if(this.props.data.spotlight)
    {
      menuOptions.push({
        text: 'Un-Spotlight',
        onClick: this.unspotlight,
      });
    }
    else
    {
      menuOptions.push({
        text: 'Spotlight',
        onClick: this.spotlight,
      });
    }
    
    if(this.props.data.pinned)
    {
      menuOptions.push({
        text: 'Un-Pin',
        onClick: this.unpin,
      });
    }
    else
    {
      menuOptions.push({
        text: 'Pin',
        onClick: this.pin,
      })
    }
    
    return menuOptions;
  },
  
  expand() {
    this.props.onExpand(this.props.data);
  },
  
	render() {
    const { isDragging, connectDragSource, isOver, connectDropTarget } = this.props;
    
    var classes = classNames({
      'result': true,
      'result-pinned': this.props.data.pinned,
      'result-expanded': this.state.expanded,
      'result-dragging': isDragging,
      'result-drag-over': isOver,
    });
					// <div className='result-score'>
     //        <ScoreIcon className='result-score-icon' />
     //        Final Score
     //        <div className='result-score-score'>
     //          { this.props.data.score }
     //        </div>
					// </div>
    return connectDropTarget(connectDragSource(
      <div className={classes} onDoubleClick={this.expand}>
        <div className='result-inner'>
          <div className='result-name'>
            <div className='result-name-inner'>
              {this.renderSpotlight()}
              <div className='result-pin-icon'>
                <PinIcon />
              </div>
              { this.props.data[_.first(_.keys(this.props.data))] }
            </div>
          </div>
          <Menu options={this.getMenuOptions()} />
          <div className='result-fields-wrapper'>
            {
              _.map(this.props.data, this.renderExpandedField)
            }
          </div>
        </div>
        <div className='result-dragging' ref='drag-handle'>
          { this.props.data.name }
        </div>
      </div>
    ));
              // this.props.expanded
              //   ? _.map(this.props.result, this.renderField)
              //   : fields.map(this.renderField)
	},
});


// DnD stuff

// Defines a draggable result functionality
const resultSource = 
{
  beginDrag(props)
  {
    const item = props.data;
    return item;
  },
  
  endDrag(props, monitor, component)
  {
    if(!monitor.didDrop())
    {
      return;
    }
    
    const item = monitor.getItem();
    const dropResult = monitor.getDropResult();
  }
}

// Defines props to inject into the component
const dragCollect = (connect, monitor) =>
({
  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging(),
  connectDragPreview: connect.dragPreview()
});

const resultTarget = 
{
  canDrop(props, monitor)
  {
    return true;
  },
  
  hover(props, monitor, component)
  {
    const canDrop = monitor.canDrop();
  },
  
  drop(props, monitor, component)
  {
    const item = monitor.getItem();
    Actions.results.move(item, props.index);
  }
}

const dropCollect = (connect, monitor) =>
({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
  isOverCurrent: monitor.isOver({ shallow: true }),
  canDrop: monitor.canDrop(),
  itemType: monitor.getItemType()
});

export default DropTarget('RESULT', resultTarget, dropCollect)(DragSource('RESULT', resultSource, dragCollect)(Result));