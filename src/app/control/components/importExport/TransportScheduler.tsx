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
import * as Immutable from 'immutable';
import * as _ from 'lodash';
import memoizeOne from 'memoize-one';
import * as Radium from 'radium';
import * as React from 'react';

import { backgroundColor, borderColor, Colors, fontColor, getStyle } from 'common/Colors';

import Dropdown from 'common/components/Dropdown';
import { notificationManager } from 'common/components/InAppNotification';
import TerrainComponent from 'common/components/TerrainComponent';
import { tooltip } from 'common/components/tooltip/Tooltips';
import * as FileImportTypes from 'fileImport/FileImportTypes';
import VariantSelector from 'library/components/VariantSelector';
import { LibraryStore } from 'library/data/LibraryStore';

import ControlActions from '../../data/ControlActions';
import TemplateSelector from './TemplateSelector';
import './TransportScheduler.less';

const { List } = Immutable;
type Template = FileImportTypes.Template;

export interface Props
{
  templates: List<Template>;
  index: number;
  getServerName: (dbid) => string;
}

const temporarySFTPNames = List(['Sample SFTP 1', 'SFTP 2', 'SFTP 3']);

const inputElementWidth = '220px';
const fileTypeOptions = List(FileImportTypes.FILE_TYPES) as List<string>;

enum FileTypes // TODO make this more type robust to track FileImportTypes.FILE_TYPES
{
  JSON,
  JSON_TYPE_OBJECT,
  CSV,
}

@Radium
class TransportScheduler extends TerrainComponent<Props>
{
  public state: {
    index: number;
    fileTypeIndex: number;
    sftpIndex: number;
    selectedIds: List<number>;
    objectKeyValue: string;
    filenameValue: string;
  } = {
    index: this.props.index,
    fileTypeIndex: 0,
    sftpIndex: 0,
    selectedIds: List([-1, -1, -1]),
    objectKeyValue: '',
    filenameValue: '',
  };

  public componentDidMount()
  {
    this.setState({
      index: this.props.index,
    });
  }

  public componentWillReceiveProps(nextProps)
  {
    if (this.props.index !== nextProps.index)
    {
      this.setState({
        index: nextProps.index,
      });
    }
  }

  public handleFilenameChange(event)
  {
    const filename = event.target.value;
    const { fileTypeIndex } = this.state;
    this.setState({
      filenameValue: filename,
    });

    if (filename === undefined || filename.length === 0)
    {
      return;
    }

    if (filename.match(/\.csv$/i) && (fileTypeIndex === FileTypes.JSON || fileTypeIndex === FileTypes.JSON_TYPE_OBJECT))
    { // switch from json to csv
      this.setState({
        fileTypeIndex: 2,
      });
    }
    else if (filename.match(/\.json$/i) && fileTypeIndex === FileTypes.CSV)
    { // switch from json to csv
      this.setState({
        fileTypeIndex: 0,
      });
    }
  }

  /*
   *  SFTP info
   */
  public renderConnectionOptions(template: Template)
  {
    const columnStyle = getStyle('width', inputElementWidth);
    return (
      <div className='headless-form-block'>
        <div className='headless-form-column' style={columnStyle}>
          <div className='headless-form-label'>
            SFTP Name
          </div>
          <div className='headless-form-input'>
            <Dropdown
              options={temporarySFTPNames}
              selectedIndex={this.state.sftpIndex}
              canEdit={true}
              onChange={this._setStateWrapper('sftpIndex')}
              openDown={true}
            />
          </div>
        </div>
      </div>
    );
  }

  /*
   *  Date and Time for the CRON job
   */
  public renderScheduleOptions(template: Template)
  {
    const inputStyle = getStyle('borderRadius', '1px');
    return (
      <div className='headless-form-block'>
        <div className='headless-form-column'>
          <div className='headless-form-label'>
            Minutes
          </div>
          <div className='headless-form-input'>
              <input
                value={this.state.filenameValue}
                onChange={this.handleFilenameChange}
                style={inputStyle}
              />
          </div>
        </div>
        <div className='headless-form-column'>
          <div className='headless-form-label'>
            Hours
          </div>
          <div className='headless-form-input'>
              <input
                value={this.state.filenameValue}
                onChange={this.handleFilenameChange}
                style={inputStyle}
              />
          </div>
        </div>
        <div className='headless-form-column'>
          <div className='headless-form-label'>
            Days of the Month
          </div>
          <div className='headless-form-input'>
              <input
                value={this.state.filenameValue}
                onChange={this.handleFilenameChange}
                style={inputStyle}
              />
          </div>
        </div>
        <div className='headless-form-column'>
          <div className='headless-form-label'>
            Months of the Year
          </div>
          <div className='headless-form-input'>
              <input
                value={this.state.filenameValue}
                onChange={this.handleFilenameChange}
                style={inputStyle}
              />
          </div>
        </div>
        <div className='headless-form-column'>
          <div className='headless-form-label'>
            Days of the Week
          </div>
          <div className='headless-form-input'>
              <input
                value={this.state.filenameValue}
                onChange={this.handleFilenameChange}
                style={inputStyle}
              />
          </div>
        </div>
      </div>
    );
  }

  /*
   *  Filename and filetype, Variant Selection (if export)
   */
  public renderImportExportOptions(template: Template)
  {
    const inputStyle = getStyle('borderRadius', '1px');
    const columnStyle = getStyle('width', inputElementWidth);
    const { fileTypeIndex } = this.state;
    const typeText = template.export ? 'Export' : 'Import';
    const showObjectKeyField = fileTypeIndex === FileTypes.JSON_TYPE_OBJECT && !template.export;
    // TODO: show import object key when import supports object key
    return (
      <div>
        {
          !!template.export &&
          <VariantSelector
            libraryState={LibraryStore.getState()}
            onChangeSelection={this._setStateWrapperPath('selectedIds')}
            ids={this.state.selectedIds}
            dropdownWidth={inputElementWidth}
          />
        }
        <div className='headless-form-block'>
          <div className='headless-form-column' style={columnStyle}>
            <div className='headless-form-label'>
              Import Filename
            </div>
            <div className='headless-form-input'>
              <input
                value={this.state.filenameValue}
                onChange={this.handleFilenameChange}
                style={inputStyle}
              />
            </div>
          </div>
          <div className='headless-form-column' style={columnStyle}>
            <div className='headless-form-label'>
              {typeText} File Type
            </div>
            <div className='headless-form-input'>
              <Dropdown
                options={fileTypeOptions}
                selectedIndex={fileTypeIndex}
                canEdit={true}
                onChange={this._setStateWrapper('fileTypeIndex')}
                openDown={true}
              />
            </div>
          </div>
          <div className='headless-form-column' style={columnStyle}>
            {
              showObjectKeyField &&
              <div className='headless-form-label'>
                Export Key
              </div>
            }
            {
              showObjectKeyField &&
              <div className='headless-form-input'>
                <input
                  value={this.state.objectKeyValue}
                  onChange={this._setStateWrapperPath('objectKeyValue', 'target', 'value')}
                  style={inputStyle}
                />
              </div>
            }
          </div>
        </div>
      </div>
    );
  }

  public render()
  {
    const template: Template = this.state.index !== -1 ? this.props.templates.get(this.state.index) : undefined;
    return (
      <div className='transport-scheduler' style={backgroundColor(Colors().altBg2)}>
        <TemplateSelector
          index={this.state.index}
          templates={this.props.templates}
          getServerName={this.props.getServerName}
          onChange={this._setStateWrapper('index')}
        />
        {
          template !== undefined && this.renderImportExportOptions(template)
        }
        {
          this.renderScheduleOptions(template)
        }
        {
          this.renderConnectionOptions(template)
        }
      </div>
    );
  }
}

export default TransportScheduler;
