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

// tslint:disable:no-empty max-classes-per-file strict-boolean-expressions max-line-length no-var-requires

import * as Immutable from 'immutable';
import * as _ from 'lodash';
import * as Radium from 'radium';
import './ResultsConfigStyle.less';
const { List, Map } = Immutable;
import { Hit } from 'app/builder/components/results/ResultTypes';
import { BuilderState } from 'app/builder/data/BuilderState';
import FloatingInput from 'app/common/components/FloatingInput';
import { SchemaState } from 'app/schema/SchemaTypes';
import BuilderActions from 'builder/data/BuilderActions';
import * as classNames from 'classnames';
import ElasticBlockHelpers, { getIndex } from 'database/elastic/blocks/ElasticBlockHelpers';
import * as React from 'react';
import { DragSource, DropTarget } from 'react-dnd';
import { _Format, _ResultsConfig, Format, ResultsConfig } from '../../../../../shared/results/types/ResultsConfig';
import { backgroundColor, borderColor, Colors, fontColor, getStyle } from '../../../colors/Colors';
import { ColorsActions } from '../../../colors/data/ColorsRedux';
import Util from '../../../util/Util';
import DragHandle from './../../../common/components/DragHandle';
import Switch from './../../../common/components/Switch';
import TerrainComponent from './../../../common/components/TerrainComponent';

const Color = require('color');

const CloseIcon = require('./../../../../images/icon_close_8x8.svg?name=CloseIcon');
const GearIcon = require('./../../../../images/icon_gear.svg?name=GearIcon');
const TextIcon = require('./../../../../images/icon_text_12x18.svg?name=TextIcon');
const ImageIcon = require('./../../../../images/icon_profile_16x16.svg?name=ImageIcon');
const HandleIcon = require('./../../../../images/icon_handle.svg?name=HandleIcon');
const MarkerIcon = require('./../../../../images/icon_marker.svg?name=MarkerIcon');
const DateIcon = require('images/icon_dateDropdown.svg?name=DateIcon');

export interface Props
{
  fields: List<string>;
  config: ResultsConfig;
  onConfigChange: (config: ResultsConfig, builderActions: typeof BuilderActions) => void;
  onSaveAsDefault: (config: ResultsConfig) => void;
  onClose: (config: ResultsConfig) => void;
  algorithmId?: ID;
  colorsActions: typeof ColorsActions;
  builderActions?: typeof BuilderActions;
  dataSource?: any;
  schema?: SchemaState;
  builder?: BuilderState;
  columns?: any;
  nested?: boolean;
  sampleHit?: Hit;
}

@Radium
export class ResultsConfigComponent extends TerrainComponent<Props>
{
  public state: {
    lastHover: { index: number, field: string },
    config: ResultsConfig;
    nestedFields: List<string>,
    showingNestedConfig: boolean,
    nestedField: string,
    searchTerm: string,
  } = {
      lastHover: { index: null, field: null },
      config: null,
      nestedFields: List([]),
      showingNestedConfig: false,
      nestedField: '',
      searchTerm: '',
    };

  constructor(props: Props)
  {
    super(props);
    this.state.config = props.config;
  }

  public componentWillMount()
  {
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.results-config-field-gear',
      style: { fill: Colors().iconColor },
    });
    this.getNestedFields(this.props);
  }

  public componentWillReceiveProps(nextProps: Props)
  {
    if (nextProps.config !== this.props.config)
    {
      this.setState({
        config: nextProps.config,
      });
    }
    if (this.props.fields !== nextProps.fields)
    {
      this.getNestedFields(nextProps);
    }
  }

  public getNestedFields(props)
  {
    // Get the fields that are nested
    let nestedFields;
    // When columns is defined, we already are in a nested results config
    // and need to look at these columns to see what fields are nested
    const { columns, builder, schema, dataSource } = props;
    if (columns !== undefined)
    {
      if (List.isList(columns))
      {
        nestedFields = columns.filter((col) =>
          col.datatype === 'nested',
        ).map((col) => col.name).toList();
      }
      else
      {
        nestedFields = _.keys(columns).filter((key) =>
        {
          return columns[key].type === 'nested';
        });
      }
    }
    else
    {
      nestedFields = props.fields.filter((field) =>
      {
        const type = ElasticBlockHelpers.getTypeOfField(
          schema,
          builder,
          field,
          true,
        );
        return type === 'nested' || type === '';
      }).toList();
    }
    this.setState({
      nestedFields,
    });
  }

  public handleDrop(type: string, field: string, index?: number)
  {
    if (this.state.lastHover.field === field && index === undefined && type === 'field')
    {
      this.setState({
        lastHover: { index: null, field: null },
      });
      return;
    }

    let { config } = this.state;

    // remove if already set
    if (config.thumbnail === field)
    {
      config = config.set('thumbnail', null);
    }
    if (config.name === field)
    {
      config = config.set('name', null);
    }
    if (config.score === field)
    {
      config = config.set('score', null);
    }
    if (config.fields.indexOf(field) !== -1)
    {
      config = config.set('fields',
        config.fields.splice(config.fields.indexOf(field), 1),
      );
    }

    // set if needed
    if (type === 'field')
    {
      if (index !== undefined)
      {
        config = config.set('fields', config.fields.splice(index, 0, field));
      }
      else
      {
        config = config.set('fields', config.fields.push(field));
      }
    }
    else if (type != null)
    {
      config = config.set(type, field);
      if (type === 'thumbnail')
      {
        if (!config.formats.get(field))
        {
          config = config.set('formats',
            config.formats.set(field, _Format({ type: 'image', template: '[value]' })));
        }
      }
    }

    this.changeConfig(config);

    if (index === undefined)
    {
      this.setState({
        lastHover: { index: null, field: null },
      });
    }
  }

  public handleNestedConfigChange(field, config, builderActions)
  {
    const newConfig = this.state.config.setIn(['formats', field, 'config'], config);
    this.changeConfig(newConfig);
  }

  public handleNestedConfigClose(field, config)
  {
    this.setState({
      showingNestedConfig: false,
      nestedField: '',
    });
  }

  public renderNestedConfig()
  {
    const field = this.state.nestedField;
    if (!this.state.showingNestedConfig)
    {
      return null;
    }
    const format = this.props.config.formats.get(field);
    // Get fields from the schema - this is for if nested is part of the object (not groupJoined)
    const { dataSource, schema, builder } = this.props;
    let index = dataSource && dataSource.index || getIndex('', builder);
    const server = builder.db.name;
    let indexId = `${server}/${String(index)}`;
    let columns;
    if (this.props.columns)
    {
      if (List.isList(this.props.columns))
      {
        columns = this.props.columns.filter((col) => col.name === field)
          .toList().get(0).properties;
      }
      else
      {
        columns = Util.asJS(this.props.columns)[field].properties;
      }
    }
    else
    {
      const cols = this.props.columns || schema.columns;
      // Get properties of column that matches field / index / serverId
      columns = cols.filter((col) =>
        col.serverId === String(server) &&
        col.databaseId === String(indexId) &&
        col.name === field,
      )
        .map((col) => col.properties)
        .toList().get(0);
    }
    let fields = List(_.keys(columns));
    if (columns === undefined)
    {
      // Figure out the index of the inner query (NOTE ONLY WORKS W/ PATHFINDER FOR NOW)
      // Based on that, extract the columns of that index
      const { path } = this.props.builder.query;
      const referenceIndex = path.nested.map((n) => n.name).toList().indexOf(field);
      index = (path.nested.get(referenceIndex).source.dataSource as any).index;
      indexId = `${builder.db.name}/${String(index)}`;
      columns = schema.columns.filter((col) =>
        col.serverId === String(server) &&
        col.databaseId === String(indexId),
      ).toList();
      fields = columns.map((col) => col.name).toList();
      // Use the sample hit to get any script fields included in the groupJoin
      if (this.props.sampleHit)
      {
        const allFields: any = this.props.sampleHit.fields.get(field);
        if (allFields && allFields.size && allFields.get(0).get('fields'))
        {
          fields = fields.concat(_.keys(allFields.get(0).get('fields').toJS())).toList();
        }
      }
    }
    fields = fields.push('_score');
    fields = Util.orderFields(fields, schema, this.props.algorithmId, indexId, true);
    return (
      <ResultsConfigComponent
        {...this.props}
        fields={fields}
        config={format !== undefined ? _ResultsConfig(Util.asJS(format)['config']) : _ResultsConfig()}
        onConfigChange={this._fn(this.handleNestedConfigChange, field)}
        onClose={this._fn(this.handleNestedConfigClose, field)}
        columns={columns}
        dataSource={{ index }}
        nested={true}
      />
    );
  }

  public handleOpenConfig(field)
  {
    this.setState({
      showingNestedConfig: true,
      nestedField: field,
    });
  }

  public changeConfig(config: ResultsConfig)
  {
    this.setState({
      config,
    });
  }

  public handleEnabledToggle()
  {
    this.changeConfig(this.state.config.set('enabled', !this.state.config.enabled));
  }

  public fieldType(field)
  {
    const { config } = this.state;
    if (!config)
    {
      return null;
    }
    if (config.thumbnail === field)
    {
      return 'thumbnail';
    }
    if (config.name === field)
    {
      return 'name';
    }
    if (config.score === field)
    {
      return 'score';
    }
    if (config.fields.indexOf(field) !== -1)
    {
      return 'field';
    }
    return null;
  }

  public handleFieldHover(index: number, field: string)
  {
    if (this.state.lastHover.index !== index || this.state.lastHover.field !== field)
    {
      this.setState({
        lastHover: { index, field },
      });
      this.handleDrop('field', field, index);
    }
  }

  public handleRemove(field: string)
  {
    this.handleDrop(null, field);
  }

  public handleFormatChange(field: string, format: Format)
  {
    this.changeConfig(
      this.state.config.setIn(['formats', field], format),
    );
  }

  public handleSaveAsDefault()
  {
    this.props.onSaveAsDefault(this.state.config);
  }

  public handleClose()
  {
    this.props.onConfigChange(this.state.config, this.props.builderActions);
    this.props.onClose(this.state.config);
  }

  public handlePrimaryKeysChange(primaryKeys: List<string>)
  {
    this.changeConfig(
      this.state.config.set('primaryKeys', primaryKeys),
    );
  }

  public handleSearchTermChange(value)
  {
    this.setState({
      searchTerm: value,
    });
  }

  public getAvailableFields(fields, term)
  {
    return fields.filter((field) =>
    {
      if (field === '_score')
      {
        return 'Match Quality'.toLowerCase().indexOf(term.toLowerCase()) !== -1;
      }
      return field.toLowerCase().indexOf(term.toLowerCase()) !== -1;
    });
  }

  public render()
  {
    const { config } = this.state;
    const { enabled, formats } = config;

    const shadowStyle = getStyle('boxShadow', '1px 2px 14px ' + Colors().boxShadow);
    const mainBg = backgroundColor(Colors().bg1);
    const mainFontColor = fontColor(Colors().text2);
    const placeholderStyle = [
      fontColor(Colors().text1),
      borderColor(Colors().border1),
      backgroundColor(Colors().bg1),
    ];

    const availableFields = this.getAvailableFields(this.props.fields, this.state.searchTerm);

    return (
      <div className='results-config-wrapper'>
        <div
          className={classNames({
            'results-config': true,
            'results-config-disabled': !enabled,
          })}
          style={[mainBg, borderColor(Colors().border2)]}
        >
          <div className='results-config-bar' style={[mainBg, borderColor(Colors().border1)]}>
            <div className='results-config-title' style={mainFontColor}>
              Customize Results
            </div>
            <div className='results-config-switch'>
              <Switch
                first='Enabled'
                second='Disabled'
                onChange={this.handleEnabledToggle}
                selected={enabled ? 1 : 2}
                medium={true}
              />
            </div>
            {
              !this.props.nested &&
              <div key={'results-config-default-button'}
                className='results-config-default-button'
                style={[
                  fontColor(Colors().text1),
                  borderColor(Colors().border1, Colors().border3),
                  backgroundColor(Colors().bg3),
                ]}
                onClick={this.handleSaveAsDefault}
              >
                Save as Default
              </div>
            }
            <div key={'results-config-button'}
              className='results-config-button'
              style={[
                fontColor(Colors().text1),
                borderColor(Colors().border1, Colors().border3),
                backgroundColor(Colors().bg3),
              ]}
              onClick={this.handleClose}
            >
              Done
            </div>
          </div>
          <div className='results-config-config-wrapper'>
            <div className='results-config-instructions'>
              Drag fields to/from the sample result below to customize
              how this algorithm's results look in the Builder.
            </div>
            <div className='results-config-config' style={[backgroundColor((localStorage.getItem('theme') === 'DARK') ? Colors().emptyBg : Colors().bg3), shadowStyle]}>
              <CRTarget
                className='results-config-thumbnail'
                type='thumbnail'
                onDrop={this.handleDrop}
              >
                <div className='results-config-area-title' style={mainFontColor}>
                  Thumbnail
                </div>
                {
                  config && config.thumbnail ?
                    <ResultsConfigResult
                      field={config.thumbnail}
                      is='score'
                      onRemove={this.handleRemove}
                      format={formats.get(config.thumbnail)}
                      onFormatChange={this.handleFormatChange}
                      primaryKeys={config.primaryKeys}
                      onPrimaryKeysChange={this.handlePrimaryKeysChange}
                      nested={this.state.nestedFields.indexOf(config.thumbnail) !== -1}
                      openConfig={this.handleOpenConfig}
                    />
                    :
                    <div className='results-config-placeholder' style={placeholderStyle}>
                      Drag thumbnail field <em>(optional)</em>
                    </div>
                }
              </CRTarget>
              <CRTarget
                className='results-config-name'
                type='name'
                onDrop={this.handleDrop}
              >
                <div className='results-config-area-title' style={mainFontColor}>
                  Name
                </div>
                {
                  config && config.name ?
                    <ResultsConfigResult
                      field={config.name}
                      is='score'
                      onRemove={this.handleRemove}
                      format={formats.get(config.name)}
                      onFormatChange={this.handleFormatChange}
                      primaryKeys={config.primaryKeys}
                      onPrimaryKeysChange={this.handlePrimaryKeysChange}
                      nested={this.state.nestedFields.indexOf(config.name) !== -1}
                      openConfig={this.handleOpenConfig}
                    />
                    :
                    <div className='results-config-placeholder' style={placeholderStyle}>
                      Drag name field <em>(optional)</em>
                    </div>
                }
              </CRTarget>
              {
                // <CRTarget
                //   className='results-config-score'
                //   type='score'
                //   onDrop={this.handleDrop}
                // >
                //   <div className='results-config-area-title' style={mainFontColor}>
                //     Score
                //   </div>
                //   {
                //     config && config.score ?
                //       <ResultsConfigResult
                //         field={config.score}
                //         is='score'
                //         onRemove={this.handleRemove}
                //         format={formats.get(config.score)}
                //         onFormatChange={this.handleFormatChange}
                //         primaryKeys={config.primaryKeys}
                //         onPrimaryKeysChange={this.handlePrimaryKeysChange}
                //         openConfig={this.handleOpenConfig}
                //         nested={this.state.nestedFields.indexOf(config.score) !== -1}
                //       />
                //       :
                //       <div className='results-config-placeholder' style={placeholderStyle}>
                //         Drag score field <em>(optional)</em>
                //       </div>
                //   }
                // </CRTarget>
              }
              <CRTarget
                className='results-config-fields'
                type='field'
                onDrop={this.handleDrop}
              >
                <div className='results-config-area-title' style={mainFontColor}>
                  Fields
                </div>
                {
                  config && config.fields.map((field, index) =>
                  {
                    return (
                      <div className='results-config-field-wrapper' key={field}>
                        <ResultsConfigResult
                          field={field}
                          is='field'
                          index={index}
                          onHover={this.handleFieldHover}
                          draggingField={this.state.lastHover.field}
                          onRemove={this.handleRemove}
                          format={formats.get(field)}
                          onFormatChange={this.handleFormatChange}
                          primaryKeys={config.primaryKeys}
                          onPrimaryKeysChange={this.handlePrimaryKeysChange}
                          openConfig={this.handleOpenConfig}
                          nested={this.state.nestedFields.indexOf(field) !== -1}
                        />
                      </div>
                    );
                  },
                  )
                }
                <div className='results-config-placeholder' style={placeholderStyle}>
                  Drag more fields here
                </div>
              </CRTarget>
            </div>
          </div>
          <div>
            <div
              className='results-config-input'
              style={backgroundColor(Colors().bg1)}
            >
              <FloatingInput
                value={this.state.searchTerm}
                onChange={this.handleSearchTermChange}
                label={'Search'}
                isTextInput={true}
                canEdit={true}
              />
            </div>
            <CRTarget
              className='results-config-available-fields'
              type={null}
              onDrop={this.handleDrop}
            >
              {
                availableFields.map((field) =>
                  <ResultsConfigResult
                    key={field}
                    field={field}
                    is={this.fieldType(field)}
                    isAvailableField={true}
                    onRemove={this.handleRemove}
                    format={formats.get(field)}
                    onFormatChange={this.handleFormatChange}
                    primaryKeys={config.primaryKeys}
                    onPrimaryKeysChange={this.handlePrimaryKeysChange}
                    openConfig={this.handleOpenConfig}
                    nested={this.state.nestedFields.indexOf(field) !== -1}
                  />,
                )
              }
            </CRTarget>
          </div>
          <div className='results-config-disabled-veil'
            style={backgroundColor(Colors().fadedOutBg)}
          >
            <div
              className='results-config-disabled-veil-inner'
              style={backgroundColor(Colors().bg1)}
            >
              <b>Custom results view is off.</b>
              Results will display the information returned from the query.
            </div>
          </div>
        </div>
        {
          this.renderNestedConfig()
        }
      </div>
    );
  }
}

interface ResultsConfigResultProps
{
  field: string;
  is?: string; // 'title', 'score', 'field', or null
  onHover?: (index: number, field: string) => void;
  index?: number;
  connectDragSource?: (a: any) => any;
  connectDropTarget?: (a: any) => any;
  isDragging?: boolean;
  draggingField?: string;
  isAvailableField?: boolean;
  onRemove: (field: any) => void;
  format: Format;
  onFormatChange: (field: string, format: Format) => void;
  primaryKeys: List<string>;
  onPrimaryKeysChange: (primaryKeys: List<string>) => void;
  nested?: boolean;
  openConfig: (field: string) => void;
}

@Radium
class ResultsConfigResultC extends TerrainComponent<ResultsConfigResultProps>
{
  public state: {
    showFormat: boolean;
  } = {
      showFormat: false,
    };

  public handleRemove()
  {
    this.props.onRemove(this.props.field);
  }

  public toggleShowFormat()
  {
    this.setState({
      showFormat: !this.state.showFormat,
    });
  }

  public changeFormatType(type: string)
  {
    this.changeFormat('type', type);
  }

  public toggleRaw(event)
  {
    this.changeFormat('showRaw', event.target.checked);
  }

  public toggleField(event)
  {
    this.changeFormat('showField', event.target.checked);
  }

  public handleTemplateChange(event)
  {
    this.changeFormat('template', event.target.value);
  }

  public changeFormat(key: string, val: any)
  {
    const format = this.props.format || _Format({
      type: 'text',
      template: '\"[value]\"',
      showRaw: false,
      showField: true,
    });

    this.props.onFormatChange(this.props.field,
      format.set(key, val),
    );
  }

  public handlePrimaryKeyChange()
  {
    let { primaryKeys } = this.props;
    if (primaryKeys.contains(this.props.field))
    {
      primaryKeys = primaryKeys.remove(primaryKeys.indexOf(this.props.field));
    }
    else
    {
      primaryKeys = primaryKeys.push(this.props.field);
    }
    this.props.onPrimaryKeysChange(primaryKeys);
  }

  public render()
  {
    const { format, field } = this.props;
    const image = format && format.type === 'image';
    const map = format && format.type === 'map';
    const date = format && format.type === 'date';
    // Check using the schema if it can be nested
    const selected: boolean = this.props.is !== null && this.props.isAvailableField;
    const mainStyle = [
      backgroundColor(Colors().bg3),
      fontColor(Colors().text1),
      getStyle('boxShadow', '1px 2px 4px 1px ' + Colors().boxShadow),
      getStyle('borderRightColor', Colors().border1, Colors().border2),
      getStyle('borderTopColor', Colors().border1, Colors().border2),
      getStyle('borderBottomColor', Colors().border1, Colors().border2),
      getStyle('borderLeftColor', selected ? Colors().active : Colors().border1, selected ? Colors().active : Colors().border2),
    ];

    const activeBtnStyle = [
      backgroundColor(Colors().active),
      fontColor(Colors().fontWhite),
      borderColor(Colors().border2),
    ];

    const inactiveBtnStyle = [
      backgroundColor(Colors().bg1),
      fontColor(Colors().text3, Colors().text2),
      borderColor(Colors().border1, Colors().border2),
    ];

    return this.props.connectDropTarget(this.props.connectDragSource(
      <div
        style={mainStyle}
        className={classNames({
          'results-config-field': true,
          'results-config-field-dragging': this.props.isDragging ||
            (this.props.draggingField && this.props.draggingField === field),
          'results-config-field-thumbnail': this.props.is === 'thumbnail',
          'results-config-field-name': this.props.is === 'name',
          'results-config-field-score': this.props.is === 'score',
          'results-config-field-field': this.props.is === 'field',
          'results-config-field-used': selected,
        })}
      >
        <div className='results-config-field-body flex-container'>
          <span className='results-config-handle'>
            <DragHandle
              key={'handle-for-' + field + String(this.props.index)}
            />
          </span>
          <span className='results-config-text flex-grow'>
            {
              field === '_score' ? 'Match Quality' : field
            }
          </span>
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
          'results-config-field-format-text': !(image || map || date),
          'results-config-field-format-image': image,
          'results-config-field-format-map': map,
          'results-config-field-format-date': date,
        })}>
          <div className='results-config-format-header'>
            <input
              type='checkbox'
              checked={this.props.primaryKeys.contains(field)}
              onChange={this.handlePrimaryKeyChange}
              id={'primaryKey-' + this.props.field}
              className='rcf-primary-key-input'
            />
            <label
              htmlFor={'primaryKey-' + field}
              className='rcf-primary-key-label'
            >
              {this.props.field} is a primary key
            </label>
          </div>
          <div className='results-config-format-header'>
            Display the value of {field} as:
          </div>
          {
            !this.props.nested &&
            <div className='results-config-format-btns'>

              <div className='results-config-text-btn'
                key={'text-btn-' + field}
                onClick={this._fn(this.changeFormatType, 'text')}
                style={(image || date) ? inactiveBtnStyle : activeBtnStyle}
              >
                <TextIcon
                  style={(image || date) ? { fill: Colors().iconColor } : { fill: Colors().fontWhite }}
                />
                Text
              </div>
              <div className='results-config-image-btn'
                key={'image-btn-' + field}
                onClick={this._fn(this.changeFormatType, 'image')}
                style={image ? activeBtnStyle : inactiveBtnStyle}
              >
                <ImageIcon
                  style={!image ? { fill: Colors().iconColor } : { fill: Colors().fontWhite }}
                />
                Image
                </div>
              <div className='results-config-date-btn'
                key={'date-btn-' + field}
                onClick={this._fn(this.changeFormatType, 'date')}
                style={date ? activeBtnStyle : inactiveBtnStyle}
              >
                <DateIcon
                  style={!date ? { fill: Colors().iconColor } : { fill: Colors().fontWhite }}
                />
                Date
              </div>
            </div>
          }
          {
            this.props.nested &&
            <div className='results-config-format-btns'>
              <div className='results-config-text-btn'
                onClick={this._fn(this.props.openConfig, field)}
                style={activeBtnStyle}
              >
                Configure
              </div>
            </div>
          }

          <div className='results-config-image'>
            <div>
              <b>Image URL Template</b>
            </div>
            <div>
              <input
                type='text'
                style={borderColor(Colors().border1)}
                value={format ? format.template : ''}
                onChange={this.handleTemplateChange}
              />
            </div>
            <div>
              <em>For example: http://example.com/[value].png or "[value]" which inserts the value of {field}</em>
            </div>
            <div className='results-config-field-value'>
              <input
                type='checkbox'
                id={'check-f-' + field}
                checked={format && format.showField}
                onChange={this.toggleField}
                value={'' /* can remove when updated to newest React */}
              />
              <label htmlFor={'check-f-' + field}>
                Show field name label
              </label>
            </div>
            <div className='results-config-raw-value'>
              <input
                type='checkbox'
                id={'check-' + field}
                checked={!!format && format.showRaw}
                onChange={this.toggleRaw}
                value={'' /* can remove when updated to newest React */}
              />
              <label htmlFor={'check-' + field}>
                Show raw value, as well
              </label>
            </div>
          </div>
        </div>
      </div>,
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
      if (!monitor.didDrop())
      {
        return;
      }

      const item = monitor.getItem();
      const dropResult = monitor.getDropResult();
    },
  };

// Defines props to inject into the component
const dragCollect = (connect, monitor) =>
  ({
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging(),
    connectDragPreview: connect.dragPreview(),
  });

const resultTarget =
  {
    canDrop(props, monitor)
    {
      return false;
    },

    hover(props, monitor, component)
    {
      if (!props.isAvailableField && props.onHover)
      {
        props.onHover(props.index, monitor.getItem().field);
      }
    },

    drop(props, monitor, component)
    {
    },
  };

const resultDropCollect = (connect, monitor) =>
  ({
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver(),
    canDrop: monitor.canDrop(),
  });

const ResultsConfigResult = DropTarget('RESULTCONFIG', resultTarget, resultDropCollect)(DragSource('RESULTCONFIG', resultSource, dragCollect)(ResultsConfigResultC));

interface CRTargetProps
{
  type: string;
  onDrop: (type: string, field: string) => void;
  className: string;
  connectDropTarget?: (a: any) => any;
  children?: any;
  isOver?: boolean;
}
class CRTargetC extends TerrainComponent<CRTargetProps>
{
  public render()
  {
    return this.props.connectDropTarget(
      <div className={this.props.className + (this.props.isOver ? ' results-config-over' : '')}
        style={borderColor(Colors().active)}
      >
        {this.props.children}
      </div>,
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
    },
  };

const crDropCollect = (connect, monitor) =>
  ({
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver(),
    canDrop: monitor.canDrop(),
  });

const CRTarget = DropTarget('RESULTCONFIG', crTarget, crDropCollect)(CRTargetC);

export default Util.createContainer(
  ResultsConfigComponent,
  [],
  {
    colorsActions: ColorsActions,
    builderActions: BuilderActions,
  },
);
