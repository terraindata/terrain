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
import {spotlightAction} from '../../data/SpotlightStore.tsx';
import ColorManager from '../../../util/ColorManager.tsx';
import Classs from './../../../common/components/Classs.tsx';
import {IResultsConfig} from './ResultsConfig.tsx';

var PinIcon = require("./../../../../images/icon_pin_21X21.svg?name=PinIcon");
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
  config: IResultsConfig;
  index: number;
  onExpand: (index:number) => void;
  expanded?: boolean;
  isDragging: boolean;
  connectDragSource: (a:any) => any;
  isOver: boolean;
  connectDropTarget: (a:any) => any;
  primaryKey: string;
}

class Result extends Classs<Props> {
  state: {
    isSpotlit: boolean;
    spotlightColor: string;
  } = {
    isSpotlit: false,
    spotlightColor: "",
  };
  
  shouldComponentUpdate(nextProps, nextState)
  {
    // Note: in the future, convert the results to cached immutable objects
    /// and compute any differences when the AJAX response returns
    
    if(!_.isEqual(this.props.data, nextProps.data) || !_.isEqual(this.state, nextState))
    {
      return true;
    }
    
    for(var k in this.props)
    {
      if(k !== 'data' && this.props[k] !== nextProps[k])
      {
        return true;
      }
    }
    
    return false;    
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
    this.dragPreview = createDragPreview(getResultName(this.props.data, this.props.allFieldsData, 
      this.props.config), dragPreviewStyle);
    props.connectDragPreview(this.dragPreview);
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
    
    var value = getResultValue(this.props.data, this.props.allFieldsData, field, this.props.config, overrideFormat);
    
    let format = this.props.config && this.props.config.formats.get(field);
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
  
  getData(): any
  {
    return _.extend({}, this.props.allFieldsData, this.props.data);
  }
  
  spotlight()
  {
    let id = this.props.primaryKey;
    let spotlightColor = ColorManager.colorForKey(id);
    this.setState({
      isSpotlit: true,
      spotlightColor,
    });
    
    let spotlightData = this.getData();
    spotlightData['name'] = getResultName(this.props.data, this.props.allFieldsData, this.props.config);
    spotlightData['color'] = spotlightColor;
    spotlightData['id'] = id;
    spotlightAction(id, spotlightData);
  }
  
  // componentWillUnmount()
  // {
  //   if(this.state.isSpotlit)
  //   {
  //     spotlightAction(this.props.primaryKey, null);
  //   }
  // }
  
  unspotlight()
  {
    this.setState({
      isSpotlit: false,
    });
    spotlightAction(this.props.primaryKey, null);
  }
  
  pin()
  {
    // TODO
  }
  
  unpin()
  {
    // TODO
  }
  
  renderSpotlight()
  {
    if(!this.state.isSpotlit)
    {
      return null;
    }
    
    return (
      <div
        className='result-spotlight'
        style={{
          background: this.state.spotlightColor,
        }}
      />
    );
  }
  
  getMenuOptions()
  {
    var menuOptions = List([]);
    
    if(this.state.isSpotlit)
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
  
	render()
  {
    const { isDragging, connectDragSource, isOver, connectDropTarget, config, data, allFieldsData } = this.props;
    
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
    
    let name = getResultName(data, allFieldsData, config);
    let fields = getResultFields(data, allFieldsData, config);
    
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
      var expanded = (
        <div className='result-expanded-fields'>
          <div className='result-expanded-fields-title'>
            All Fields
          </div>
          {
            _.map(allFieldsData || this.props.data, this.renderExpandedField)
          }
          {
            allFieldsData ? null : 'Loading more...'
          }
        </div>
      );
    }
    
    return connectDropTarget(connectDragSource(
      <div
        className={classes}
        onDoubleClick={this.expand}
      >
        <div className='result-inner'>
          <div className='result-name'>
            <div className='result-name-inner'>
              {this.renderSpotlight()}
              <div className='result-pin-icon'>
                <PinIcon />
              </div>
              { 
                name
              }
            </div>
          </div>
          <Menu options={this.getMenuOptions()} />
          { scoreArea }
          <div className='result-fields-wrapper'>
            {
                _.map(fields, this.renderField)
            }
            { 
              bottom
            }
            { 
              expanded
            }
          </div>
        </div>
      </div>
    ));
              // this.props.expanded
              //   ? _.map(this.props.result, this.renderField)
              //   : fields.map(this.renderField)
	}
};



export function ResultFormatValue(field: string, value: string | number, config: IResultsConfig, overrideFormat?: any): any
{
  let format = config && config.formats && config.formats.get(field);
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
        <div
          className='result-field-value-image-wrapper'
        >
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
        
      break;
    }
  }
  
  if(typeof value === 'number')
  {
    value = Math.floor((value as number) * 10000) / 10000;
    value = value.toLocaleString();
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

export function getResultValue(resultData, allFieldsData, field: string, config: IResultsConfig, overrideFormat?: any): string
{
  var value = (resultData && resultData[field]) ||(allFieldsData && allFieldsData[field]);
  
  return ResultFormatValue(field, value, config, overrideFormat);
}

export function getResultFields(resultData, allFieldsData, config: IResultsConfig): string[]
{
  if(config && config.enabled && config.fields && config.fields.size)
  {
    var fields = config.fields.toArray();
  }
  else
  {
    var fields = _.union(_.keys(resultData), _.keys(allFieldsData));
  }
  
  return fields;
}
  
export function getResultName(resultData, allFieldsData, config: IResultsConfig)
{
  if(config && config.name && config.enabled)
  {
    var nameField = config.name;
  }
  else
  {
    var nameField = _.first(getResultFields(resultData, allFieldsData, config));
  }
  
  return getResultValue(resultData, allFieldsData, nameField, config);
}


export default DropTarget('RESULT', resultTarget, dropCollect)(DragSource('RESULT', resultSource, dragCollect)(Result));
