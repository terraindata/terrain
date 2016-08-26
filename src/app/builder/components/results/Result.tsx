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
import * as Immutable from 'immutable';
const {List} = Immutable;
import { DragSource, DropTarget } from 'react-dnd';
var { createDragPreview } = require('react-dnd-text-dragpreview');
import Util from '../../../util/Util.tsx';
import Menu from '../../../common/components/Menu.tsx';
import Actions from '../../data/BuilderActions.tsx';
import ColorManager from '../../../util/ColorManager.tsx';
import Classs from './../../../common/components/Classs.tsx';
import {Config} from './ResultsConfig.tsx';

var PinIcon = require("./../../../../images/icon_pin_21x21.svg?name=PinIcon");
var ScoreIcon = require("./../../../../images/icon_terrain_27x16.svg?name=ScoreIcon");

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

interface Props
{
  data: {
    id: string;
    name: string;
    spotlight: any;
    pinned: boolean;
  };
  allFieldsData: any;
  connectDragPreview?: (a:any) => void;
  config: Config;
  index: number;
  onExpand: (index:number) => void;
  expanded?: boolean;
  isDragging: boolean;
  connectDragSource: (a:any) => any;
  isOver: boolean;
  connectDropTarget: (a:any) => any;
}

class Result extends Classs<Props> {
  shouldComponentUpdate(nextProps, nextState)
  {
    return !_.isEqual(this.props, nextProps) || !_.isEqual(this.state, nextState);
  }
  
  dragPreview: any;
  componentDidMount() {
    this.generateDragPreview(this.props); 
  }
  componentWillReceiveProps(nextProps)
  {
    this.generateDragPreview(nextProps);
  }
  generateDragPreview(props:Props)
  {
    this.dragPreview = createDragPreview(this.getName(props), dragPreviewStyle);
    props.connectDragPreview(this.dragPreview);
  }

  getValue(field, overrideFormat?)
  {
    var {data, allFieldsData} = this.props;
    var dataField = data && data[field];
    var allDataField = allFieldsData && allFieldsData[field];
    let value = allDataField || dataField;
    
    return ResultFormatValue(field, value, this.props.config, overrideFormat);
  }

  renderExpandedField(value, field)
  {
    return this.renderField(field, 0, null, {
      showField: true,
      showRaw: true,
    });
  }
  
  renderField(field, index?, fields?, overrideFormat?)
  {
    if(index >= 4)
    {
      return null;
    }
    
    var value = this.getValue(field, overrideFormat);
    
    let format = this.props.config && this.props.config.formats && this.props.config.formats[field];
    let showField = overrideFormat ? overrideFormat.showField : (!format || format.type === 'text' || format.showField);
    return (
      <div className="result-field" key={field}>
        {
          showField &&
            <div className="result-field-name">
              { field }
            </div>
        }
        <div
          className={classNames({
            'result-field-value': true,
            'result-field-value-short': (field + value).length < 0,
            'result-field-value-number': typeof value === 'number',
          })}
        >
          {value}
        </div>
      </div>
    );
  }
  
  spotlight()
  {
    // TODO
    // Actions.results.spotlight(this.props.data, ColorManager.colorForKey(this.props.data.id));
  }
  
  unspotlight()
  {
    // TODO
    // Actions.results.spotlight(this.props.data, false);
  }
  
  pin()
  {
    // TODO
    // Actions.results.pin(this.props.data, true);
  }
  
  unpin()
  {
    // TODO
    // Actions.results.pin(this.props.data, false);
  }
  
  renderSpotlight()
  {
    if(!this.props.data.spotlight)
    {
      return null;
    }
    
    return <div className='result-spotlight' style={{background: this.props.data.spotlight}}></div>;
  }
  
  getMenuOptions()
  {
    var menuOptions = List([]);
    
    if(this.props.data.spotlight)
    {
      menuOptions = menuOptions.push({
        text: 'Un-Spotlight',
        onClick: this.unspotlight,
      });
    }
    else
    {
      menuOptions = menuOptions.push({
        text: 'Spotlight',
        onClick: this.spotlight,
      });
    }
    
    // TODO add back in once we have Result pinning
    // if(this.props.data && this.props.data.pinned)
    // {
    //   menuOptions.push({
    //     text: 'Un-Pin',
    //     onClick: this.unpin,
    //   });
    // }
    // else
    // {
    //   menuOptions.push({
    //     text: 'Pin',
    //     onClick: this.pin,
    //   })
    // }
    
    return menuOptions;
  }
  
  expand()
  {
    this.props.onExpand(this.props.index);
  }
  
  getFields(): string[]
  {
    let {config, data} = this.props;
    if(config && config.enabled && config.fields && config.fields.length)
    {
      var fields = config.fields;
    }
    else
    {
      var fields = _.keys(data);
    }
    
    return fields;
  }
  
  getName(props?:Props)
  {
    let {config, data} = props || this.props;
    if(config && config.name && config.enabled)
    {
      var nameField = config.name;
    }
    else
    {
      var nameField = _.first(this.getFields());
    }
    
    return this.getValue(nameField);
  }
  
	render()
  {
    const { isDragging, connectDragSource, isOver, connectDropTarget, data, config } = this.props;
    
    var classes = classNames({
      'result': true,
      'result-pinned': this.props.data && this.props.data.pinned,
      'result-expanded': this.props.expanded,
      'result-dragging': isDragging,
      'result-drag-over': isOver,
    });
    
    if(config && config.score && config.enabled)
    {
          // <ScoreIcon className='result-score-icon' />
      var scoreArea = (
        <div className='result-score'>
          { this.renderField(config.score) }
    		</div>
      );
    }
    
    let fields = this.getFields();
    
    if(fields.length > 4 && !this.props.expanded)
    {
      var bottom = (
        <div className='result-bottom' onClick={this.expand}>
          { fields.length - 4 } more fields
        </div>
      );
    }
    
    if(this.props.expanded)
    {
      var {allFieldsData} = this.props;
      var expanded = (
        <div className='result-expanded-fields'>
          <div className='result-expanded-fields-title'>
            All Fields
          </div>
          {
            allFieldsData ? _.map(allFieldsData, this.renderExpandedField) : 'Loading...'
          }
        </div>
      );
    }
    
    return connectDropTarget(connectDragSource(
      <div className={classes} onDoubleClick={this.expand}>
        <div className='result-inner'>
          <div className='result-name'>
            <div className='result-name-inner'>
              {this.renderSpotlight()}
              <div className='result-pin-icon'>
                <PinIcon />
              </div>
              { this.getName() }
            </div>
          </div>
          <Menu options={this.getMenuOptions()} />
          { scoreArea }
          <div className='result-fields-wrapper'>
            {
                _.map(fields, this.renderField)
            }
            { bottom }
            { expanded }
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
	}
};



export function ResultFormatValue(field: string, value: string | number, config: Config, overrideFormat?: any): any
{
  let format = config && config.formats && config.formats[field];
  let {showRaw} = overrideFormat || format || { showRaw: false };
  var italics = false;
  
  if(value === undefined)
  {
    value = 'undefined';
    italics = true;
  }
  
  if(typeof value === 'boolean')
  {
    value = value ? 'true' : 'false';
    italics = true;
  }
  if(typeof value === "string" && !value.length)
  {
    value = '"" (blank)';
    italics = true;
  }
  if(value === null)
  {
    value = 'null';
    italics = true;
  }
  
  if(format)
  {
    switch(format.type)
    {
      case 'image':
      var url = format.template.replace(/\[value\]/g, value as string);
      return (
        <div>
          <div
            className='result-field-value-image'
            style={{
              backgroundImage: `url(${url})`,
              // give the div the background image, to make use of the "cover" CSS positioning,
              // but also include the <img> tag below (with opacity 0) so that right-click options still work
            }}
          >
            <img src={url} />
          </div>
          <div className='result-field-value'>
            {
              showRaw ? value : null
            }
          </div>
        </div>
      );
      case 'text':
      // nothing special for now
      break;
    }
  }
  
  if(italics)
  {
    return <em>{value}</em>;
  }
  
  return value;
}


// DnD stuff

// Defines a draggable result functionality
const resultSource = 
{
  canDrag(props)
  {
    return false; // TODO remove once we get result dragging and pinning working
    // return props.canDrag;
  },
  
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
    // TODO
    // Actions.results.move(item, props.index);
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