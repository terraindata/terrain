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

require('./ResultsConfig.less');

import * as _ from 'underscore';
import * as React from 'react';
import * as classNames from 'classnames';
import Util from '../../../util/Util.tsx';
import Ajax from '../../../util/Ajax.tsx';
import Result from "../results/Result.tsx";
import InfoArea from '../../../common/components/InfoArea.tsx';
import Classs from './../../../common/components/Classs.tsx';
import Switch from './../../../common/components/Switch.tsx';
import { DragSource, DropTarget } from 'react-dnd';

var CloseIcon = require("./../../../../images/icon_close_8x8.svg?name=CloseIcon");
var GearIcon = require("./../../../../images/icon_gear.svg?name=GearIcon");

export interface Format
{
  type: string;
  template: string;
  showRaw: boolean;
  showField: boolean;
}

export interface Config
{
  name: string;
  score: string;
  fields: string[];
  enabled: boolean;
  formats: {
    [field: string]: Format
  }
}

interface Props
{
  results: any[];
  resultsWithAllFields: any[];
  config: Config;
  onConfigChange: (config:Config) => void;
  onClose: () => void;
}

export class ResultsConfig extends Classs<Props>
{
  state: {
    fields: string[];
    lastHover: {index: number, field: string},
  } = {
    fields: null,
    lastHover: {index: null, field: null},
  }
  
  componentWillMount()
  {
    this.calcFields(this.props);
  }
  
  componentWillReceiveProps(nextProps)
  {
    this.calcFields(nextProps);
  }
  
  calcFields(props:Props)
  {
    if(!props.resultsWithAllFields && !props.results)
    {
      this.setState({
        fields: [],
        loading: true,
      });
      return;
    }
    
    let fieldReducer = (fields, result) =>
    {
      _.map(result, (v, field) => fields[field] = 1);
      return fields;
    };
    let resultsFieldsReduced = props.results ? props.results.reduce(fieldReducer, {}) : {};
    let allResultsFieldsReduced = props.resultsWithAllFields ? props.resultsWithAllFields.reduce(fieldReducer, {}) : {};
    
    let fields = _.keys(_.extend(resultsFieldsReduced, allResultsFieldsReduced));
    
    this.setState({
      loading: false,
      fields,
    });
  }
  
  getConfig():Config
  {
    let {config} = this.props;
    return {
      name: config && config.name,
      score: config && config.score,
      fields: (config && config.fields) || [],
      enabled: config ? config.enabled : true,
      formats: (config && config.formats) || {},
    };
  }
  
  handleDrop(type: string, field: string, index?: number)
  {
    if(this.state.lastHover.field === field && index === undefined && type === 'field')
    {
      this.setState({
        lastHover: {index: null, field: null},
      });
      return;
    }
    
    var newConfig = this.getConfig();
    
    // remove if already set
    if(newConfig.name === field)
    {
      newConfig.name = null;
    }
    if(newConfig.score === field)
    {
      newConfig.score = null;
    }
    if(newConfig.fields.indexOf(field) !== -1)
    {
      newConfig.fields.splice(newConfig.fields.indexOf(field), 1);
    }

    // set if needed    
    if(type === 'field')
    {
      if(index !== undefined)
      {
        newConfig.fields.splice(index, 0, field);
      }
      else
      {
        newConfig.fields.push(field);
      }
    }
    else if(type != null)
    {
      newConfig[type] = field;
    }
    
    this.props.onConfigChange(newConfig);
    
    if(index === undefined)
    {
      this.setState({
        lastHover: {index: null, field: null},
      });
    }
  }
  
  handleEnabledToggle()
  {
    let config = this.getConfig();
    this.props.onConfigChange(_.extend({}, config,
    {
      enabled: !config.enabled,
    }));
  }
  
  fieldIsSelected(field)
  {
    let {config} = this.props;
    return config.name === field || config.score === field || config.fields.indexOf(field) !== -1;
  }
  
  fieldType(field)
  {
    let {config} = this.props;
    if(!config) return null;
    if(config.name === field)
    {
      return 'name';
    }
    if(config.score === field)
    {
      return 'score';
    }
    if(config.fields.indexOf(field) !== -1)
    {
      return 'field';
    }
    return null;
  }
  
  handleFieldHover(index:number, field:string)
  {
    if(this.state.lastHover.index !== index || this.state.lastHover.field !== field)
    {
      this.setState({
        lastHover: {index, field},
      });
      this.handleDrop('field', field, index);
    }
  }
  
  handleRemove(field:string)
  {
    this.handleDrop(null, field);
  }
  
  handleFormatChange(field:string, format:Format)
  {
    let config = this.getConfig();
    this.props.onConfigChange(_.extend({}, config,
    {
      formats: _.extend({}, config.formats,
      {
        [field]: format,
      })
    }));
  }
  
	render()
  {
    let config = this.getConfig();
    let enabled = config.enabled;
    let formats = config.formats || {};
    return (
      <div className='results-config-wrapper'>
        <div className={classNames({
            'results-config': true,
            'results-config-disabled': !enabled,
          })}>
          <div className='results-config-bar'>
            <div className='results-config-title'>
              Configure Results View
            </div>
            <div className='results-config-switch'>
              <Switch
                first='Enabled'
                second='Disabled'
                onChange={this.handleEnabledToggle}
                selected={enabled ? 1 : 2}
              />
            </div>
            <div className='results-config-button' onClick={this.props.onClose}>
              Done
            </div>
          </div>
          <div className='results-config-config-wrapper'>
            <div className='results-config-instructions'>
              Drag fields to/from the sample result below to customize
              how this algorithm's results look in the Builder.
            </div>
            <div className='results-config-config'>
              <CRTarget
                className='results-config-name'
                type='name'
                onDrop={this.handleDrop}
              >
                <div className='results-config-area-title'>
                  Name
                </div>
                { 
                  config && config.name ? 
                    <ConfigResult
                      field={config.name}
                      is='score'
                      onRemove={this.handleRemove}
                      format={formats[config.name]}
                      onFormatChange={this.handleFormatChange}
                    />
                  : 
                    <div className='results-config-placeholder'>
                      Drag name field <em>(optional)</em>
                    </div>
                }
              </CRTarget>
              <CRTarget
                className='results-config-score'
                type='score'
                onDrop={this.handleDrop}
              >
                <div className='results-config-area-title'>
                  Score
                </div>
                {
                  config && config.score ?
                    <ConfigResult
                      field={config.score}
                      is='score'
                      onRemove={this.handleRemove}
                      format={formats[config.score]}
                      onFormatChange={this.handleFormatChange}
                    />
                  : 
                    <div className='results-config-placeholder'>
                      Drag score field <em>(optional)</em>
                    </div>
                }
              </CRTarget>
              <CRTarget
                className='results-config-fields'
                type='field'
                onDrop={this.handleDrop}
              >
                <div className='results-config-area-title'>
                  Fields
                </div>
                {
                  config && config.fields.map((field, index) =>
                      <div className='results-config-field-wrapper' key={field}>
                        <ConfigResult
                          field={field}
                          is='field'
                          index={index}
                          onHover={this.handleFieldHover}
                          draggingField={this.state.lastHover.field}
                          onRemove={this.handleRemove}
                          format={formats[field]}
                          onFormatChange={this.handleFormatChange}
                        />
                      </div>
                    )
                }
                <div className='results-config-placeholder'>
                  Drag more fields here
                </div>
              </CRTarget>
            </div>
          </div>
          <CRTarget
            className='results-config-available-fields'
            type={null}
            onDrop={this.handleDrop}
          >
            { this.state.fields.map(field =>
                <ConfigResult
                  key={field}
                  field={field}
                  is={this.fieldType(field)}
                  isAvailableField={true}
                  onRemove={this.handleRemove}
                  format={formats[field]}
                  onFormatChange={this.handleFormatChange}
                />
            ) }
          </CRTarget>
          <div className='results-config-disabled-veil'>
            <div className='results-config-disabled-veil-inner'>
              <b>Custom results view is off.</b>
              Results will display the information returned from the query.
            </div>
          </div>
        </div>
      </div>
    );
	}
}

interface ConfigResultProps
{
  field: string;
  is?: string; // 'title', 'score', 'field', or null
  onHover?: (index:number, field:string) => void;
  index?: number;
  connectDragSource?: (a:any) => any; 
  connectDropTarget?: (a:any) => any; 
  isDragging?: boolean;
  draggingField?: string;
  isAvailableField?: boolean;
  onRemove: (field: any) => void;
  format: Format;
  onFormatChange: (field: string, format:Format) => void;
}
class ConfigResultC extends Classs<ConfigResultProps>
{
  state: {
    showFormat: boolean;
  } = {
    showFormat: false,
  }
  
  handleRemove()
  {
    this.props.onRemove(this.props.field);
  }
  
  toggleShowFormat()
  {
    this.setState({
      showFormat: !this.state.showFormat,
    })
  }
  
  changeToText()
  {
    this.changeFormat('type', 'text');
  }
  
  changeToImage()
  {
    this.changeFormat('type', 'image');
  }
  
  toggleRaw(event)
  {
    this.changeFormat('showRaw', event.target.checked);
  }
  
  toggleField(event)
  {
    this.changeFormat('showField', event.target.checked);
  }
  
  handleTemplateChange(event)
  {
    this.changeFormat('template', event.target.value);
  }
  
  changeFormat(key:string, val:any)
  {
    let format: Format = this.props.format || {
      type: 'text',
      template: '',
      showRaw: false,
      showField: true,
    };
    
    var newFormat = {
      [key]: val,
    };
    
    this.props.onFormatChange(this.props.field, _.extend({}, format, newFormat));
  }
  
  render()
  {
    let {format} = this.props;
    let image = format && format.type === 'image';
    return this.props.connectDropTarget(this.props.connectDragSource(
      <div className={classNames({
        'results-config-field': true,
        'results-config-field-dragging': this.props.isDragging ||
          (this.props.draggingField && this.props.draggingField === this.props.field),
        'results-config-field-name': this.props.is === 'name',
        'results-config-field-score': this.props.is === 'score',
        'results-config-field-field': this.props.is === 'field',
        'results-config-field-used': this.props.is !== null && this.props.isAvailableField,
      })}>
        <div className='results-config-field-body'>
          <span className='results-config-handle'>⋮⋮</span>
          {
            this.props.field
          }
          {
            this.props.is !== null ? 
              <CloseIcon
                className='close'
                onClick={this.handleRemove}
              />
            : null
          }
          <GearIcon
            className='results-config-field-gear'
            onClick={this.toggleShowFormat}
          />
        </div>
        
        <div className={classNames({
          'results-config-field-format': true,
          'results-config-field-format-showing': this.state.showFormat,
          'results-config-field-format-text': !image,
          'results-config-field-format-image': image,
        })}>
          <div className='results-config-format-btns'>
            <div className='results-config-text-btn' onClick={this.changeToText}>
              Text
            </div>
            <div className='results-config-image-btn' onClick={this.changeToImage}>
              Image
            </div>
          </div>
          
          <div className='results-config-image'>
            <div>
              <b>URL Template</b>
            </div>
            <div>
              <input
                type='text'
                value={format ? format.template : ''}
                onChange={this.handleTemplateChange}
                placeholder={'http://web.com/img/[value].png'}
              />
            </div>
            <div>
              <em>"[value]" inserts {this.props.field}</em>
            </div>
            <div className='results-config-field-value'>
              <input
                type='checkbox'
                id={'check-f-' + this.props.field}
                checked={format && format.showField}
                onChange={this.toggleField}
              />
              <label htmlFor={'check-f-' + this.props.field}>
                Show field name
              </label>
            </div>
            <div className='results-config-raw-value'>
              <input
                type='checkbox'
                id={'check-' + this.props.field}
                checked={format && format.showRaw}
                onChange={this.toggleRaw}
              />
              <label htmlFor={'check-' + this.props.field}>
                Show raw value
              </label>
            </div>
          </div>
        </div>
      </div>
    ));
  }
}
// Defines a draggable result functionality
const resultSource = 
{
  beginDrag(props)
  {
    return props;
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
    return false;
  },
  
  hover(props, monitor, component)
  {
    if(!props.isAvailableField && props.onHover)
    {
      props.onHover(props.index, monitor.getItem().field);
    }
  },
  
  drop(props, monitor, component)
  {
  }
}

const resultDropCollect = (connect, monitor) =>
({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop()
});


let ConfigResult = DropTarget('RESULTCONFIG', resultTarget, resultDropCollect)(DragSource('RESULTCONFIG', resultSource, dragCollect)(ConfigResultC));


interface CRTargetProps
{
  type: string;
  onDrop: (type:string, field:string) => void;
  className: string;
  connectDropTarget?: (a:any) => any;
  children?: any;
  isOver?: boolean;
}
class CRTargetC extends Classs<CRTargetProps>
{
  render()
  {
    return this.props.connectDropTarget(
      <div className={this.props.className + (this.props.isOver ? ' results-config-over' : '')}>
        { this.props.children } 
      </div>
    );
  }
}

const crTarget = 
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
    props.onDrop(props.type, item.field);
  }
}

const crDropCollect = (connect, monitor) =>
({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop()
});

let CRTarget = DropTarget('RESULTCONFIG', crTarget, crDropCollect)(CRTargetC);

export default ResultsConfig;
