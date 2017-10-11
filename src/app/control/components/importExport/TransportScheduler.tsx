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
import cronstrue from 'cronstrue';
import * as Immutable from 'immutable';
import * as _ from 'lodash';
import memoizeOne from 'memoize-one';
import * as Radium from 'radium';
import * as React from 'react';

import { backgroundColor, borderColor, Colors, fontColor, getStyle } from 'common/Colors';

import Dropdown from 'common/components/Dropdown';
import { notificationManager } from 'common/components/InAppNotification';
import Modal from 'common/components/Modal';
import TerrainComponent from 'common/components/TerrainComponent';
import { tooltip } from 'common/components/tooltip/Tooltips';
import * as FileImportTypes from 'fileImport/FileImportTypes';
import VariantSelector from 'library/components/VariantSelector';
import { LibraryStore } from 'library/data/LibraryStore';

import ControlActions from '../../data/ControlActions';
import TemplateSelector from './TemplateSelector';
import './TransportScheduler.less';

const { List } = Immutable;
const HelpIcon = require('images/icon_help-1.svg');
type Template = FileImportTypes.Template;

export interface Props
{
  templates: List<Template>;
  index: number;
  getServerName: (dbid) => string;
  modalOpen: boolean;
  onClose: () => void;
}

export interface ScheduleValidationData
{
  valid: boolean; // whether or not the args are valid (not to be fully relied on)
  readable: string; // human readable summary of command
  errors: string[];
  requests: string[];
}

export interface ScheduleArgs
{
  template: Template;
  fileType: string;
  filename: string;
  objectKey?: string;
  variantId?: number;
  sftpId: number;
  cronArgs: string[];
}

const fileTypeOptions = List(FileImportTypes.FILE_TYPES) as List<string>;

enum FileTypes // TODO make this more type robust to track FileImportTypes.FILE_TYPES
{
  JSON,
  JSON_TYPE_OBJECT,
  CSV,
}

export function validateScheduleSettings(args: ScheduleArgs): ScheduleValidationData
{
  const { cronArgs, filename, fileType, objectKey, sftpId, template, variantId } = args;

  const errors = [];
  const requests = [];

  let cronReadable = '';

  if (template === undefined)
  {
    requests.push('Please Select a Template');
  }
  else
  {
    if (template.templateId === -1 || template.templateId === undefined)
    {
      errors.push('Template has no ID');
    }
  }

  if (template.export)
  {
    if (variantId === -1 || variantId === undefined)
    {
      requests.push('Please Select a Variant');
    }
    if (fileType === fileTypeOptions.get(FileTypes.JSON_TYPE_OBJECT) && (objectKey === undefined || objectKey === ''))
    {
      requests.push('Please Provide an Export Object Key');
    }
  }
  else
  {
    if (fileType === fileTypeOptions.get(FileTypes.JSON_TYPE_OBJECT))
    {
      errors.push('Import with object keys is not supported');
    }
  }

  if (filename === '' || filename === undefined)
  {
    requests.push('Please Enter a Filename');
  }

  if (sftpId === undefined || sftpId === -1)
  {
    requests.push('Please Select an SFTP Connection');
  }

  if (cronArgs.length !== 5)
  {
    errors.push('Invalid number of Cron parameters');
  }
  else
  {
    const cronStr = `${cronArgs[0]} ${cronArgs[1]} ${cronArgs[2]} ${cronArgs[3]} ${cronArgs[4]}`;
    try
    {
      cronReadable = cronstrue.toString(cronStr); // TODO: cronstrue doesn't catch all errors
    }
    catch (err)
    {
      errors.push('Bad schedule parameters: ' + String(err));
    }
  }

  const typeText = template.export ? 'Export' : 'Import';
  const preposition = template.export ? 'to' : 'from';
  const readable = `${typeText} ${preposition} "${filename !== undefined && filename !== '' ?
    filename : '<please enter filename>'}" ${cronReadable}`;
  const valid = errors.length === 0 && requests.length === 0;

  return {
    valid,
    readable,
    requests,
    errors
  };

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
    cronParam0: string;
    cronParam1: string;
    cronParam2: string;
    cronParam3: string;
    cronParam4: string;
  } = {
    index: this.props.index,
    fileTypeIndex: 0,
    sftpIndex: 0,
    selectedIds: List([-1, -1, -1]),
    objectKeyValue: '',
    filenameValue: '',
    cronParam0: defaultCRONparams[0],
    cronParam1: defaultCRONparams[1],
    cronParam2: defaultCRONparams[2],
    cronParam3: defaultCRONparams[3],
    cronParam4: defaultCRONparams[4],
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

  public handleConfirm()
  {
    
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
              value={this.state.cronParam0}
              onChange={this._setStateWrapperPath('cronParam0', 'target', 'value')}
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
              value={this.state.cronParam1}
              onChange={this._setStateWrapperPath('cronParam1', 'target', 'value')}
              style={inputStyle}
            />
          </div>
        </div>
        <div className='headless-form-column'>
          <div className='headless-form-label'>
            Day(s) of Month
          </div>
          <div className='headless-form-input'>
            <input
              value={this.state.cronParam2}
              onChange={this._setStateWrapperPath('cronParam2', 'target', 'value')}
              style={inputStyle}
            />
          </div>
        </div>
        <div className='headless-form-column'>
          <div className='headless-form-label'>
            Month(s) of Year
          </div>
          <div className='headless-form-input'>
            <input
              value={this.state.cronParam3}
              onChange={this._setStateWrapperPath('cronParam3', 'target', 'value')}
              style={inputStyle}
            />
          </div>
        </div>
        <div className='headless-form-column'>
          <div className='headless-form-label'>
            Day(s) of Week
          </div>
          <div className='headless-form-input'>
            <input
              value={this.state.cronParam4}
              onChange={this._setStateWrapperPath('cronParam4', 'target', 'value')}
              style={inputStyle}
            />
          </div>
        </div>
        <div className='headless-form-column'>
          <div className='headless-form-label'>
            <div className='scheduler-help-spacer' />
          </div>
          <div className='headless-form-input scheduler-help-wrapper'>
            {
              tooltip(
                <HelpIcon className='scheduler-help-icon' />,
                {
                  html: helpTooltipElement,
                  position: 'right',
                  interactive: true,
                  trigger: 'click',
                }
              )
            }
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
    const showObjectKeyField = Boolean(template.export && fileTypeIndex === FileTypes.JSON_TYPE_OBJECT);
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
              {typeText} Filename
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
                Export Object Key
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

  public renderRequests(requests: string[])
  {
    return <span> Missing Fields: {requests.join(', ')} </span>
  }

  public renderErrors(errors: string[])
  {
    return <span style={fontColor(Colors().error)}> {errors.join(', ')} </span>;
  }

  public renderConfirmSection(validationData: ScheduleValidationData)
  {
    const { valid, readable, errors, requests } = validationData;

    return (
      <div className='scheduler-form-confirmation-row'>
        {valid ? readable : (errors.length !== 0 ? this.renderErrors(errors) : this.renderRequests(requests))}
      </div>
    );
  }

  public render()
  {
    const template: Template = this.state.index !== -1 ? this.props.templates.get(this.state.index) : undefined;
    const validationData = validateScheduleSettings({
      template,
      fileType: fileTypeOptions.get(this.state.fileTypeIndex),
      filename: this.state.filenameValue,
      objectKey: this.state.objectKeyValue,
      variantId: this.state.selectedIds.get(2),
      sftpId: this.state.sftpIndex, // TODO: fix this once Jason's connection object route gets added
      cronArgs: [this.state.cronParam0, this.state.cronParam1, this.state.cronParam2, this.state.cronParam3, this.state.cronParam4]
    });

    return (
      <Modal
        open={this.props.modalOpen}
        title={`Schedule an Import or Export`}
        onClose={this.props.onClose}
        allowOverflow={true}
        wide={true}
        noFooterPadding={true}
        confirm={true}
        onConfirm={this.handleConfirm}
        closeOnConfirm={false}
        confirmButtonText={'Schedule'}
        confirmDisabled={!validationData.valid}
      >
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
            template !== undefined && this.renderScheduleOptions(template)
          }
          {
            template !== undefined && this.renderConnectionOptions(template)
          }
          {
            this.renderConfirmSection(validationData)
          }
        </div>
      </Modal>
    );
  }
}

const temporarySFTPNames = List(['Sample SFTP 1', 'SFTP 2', 'SFTP 3']);
const inputElementWidth = '220px';
const scheduleHelpText =
  `Schedule parameters should follow CRON expression rules. Some common ones:
 - '*' matches all possible times.
 - '0' matches only the value 0.
 - '1,3,5' matches anything whose value is 1,3,5.
 - '2-6' matches anything between 2 and 6 inclusive.
 - Days/months can be like 'FRI' or 'JAN'.

Examples:
 - "* * * * *" runs the job every minute.
 - "30 18 * * SUN" runs the job at 6:30pm every Sunday.
`;
const helpTooltipElement = <div className='scheduler-help-text'> {scheduleHelpText} </div>
const defaultCRONparams = ['0', '0', '*', '*', 'SUN'];

export default TransportScheduler;
