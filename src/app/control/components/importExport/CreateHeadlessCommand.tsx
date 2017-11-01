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
import { CopyToClipboard } from 'react-copy-to-clipboard';

import { backgroundColor, borderColor, Colors, fontColor, getStyle } from 'app/colors/Colors';
import Dropdown from 'common/components/Dropdown';
import { notificationManager } from 'common/components/InAppNotification';
import TerrainComponent from 'common/components/TerrainComponent';
import { tooltip } from 'common/components/tooltip/Tooltips';
import * as FileImportTypes from 'fileImport/FileImportTypes';
import VariantSelector from 'library/components/VariantSelector';
import { LibraryStore } from 'library/data/LibraryStore';

import TemplateSelector from './TemplateSelector';

import './CreateHeadlessCommand.less';

const { List } = Immutable;
const ClipboardIcon = require('images/icon_clipboard.svg');

type Template = FileImportTypes.Template;

export interface Props
{
  templates: List<Template>;
  index: number;
  getServerName: (dbid) => string;
}

export interface HeadlessCommandData
{
  command: string;
  errors: string[];
  requests: string[];
}

export interface HeadlessCommandArgs
{
  template: Template;
  fileType: string;
  midwayURL: string;
  variantId?: number; // for export
  filename?: string; // for import
  objectKey?: string;
}

const inputElementWidth = '220px';
const fileTypeOptions = List(FileImportTypes.FILE_TYPES) as List<string>;

enum FileTypes // TODO make this more type robust to track FileImportTypes.FILE_TYPES
{
  JSON,
  JSON_TYPE_OBJECT,
  CSV,
}

export function computeHeadlessCommand(headlessArgs: HeadlessCommandArgs): HeadlessCommandData
{
  const { template, fileType, midwayURL } = headlessArgs;

  const errors = [];
  const requests = [];
  let command = '';

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
    if (template.dbid === -1 || template.dbid === undefined)
    {
      errors.push('Template has no database');
    }
    if (template.persistentAccessToken === '' || template.persistentAccessToken === undefined)
    {
      errors.push('Template has no access token');
    }
    if (midwayURL === '')
    {
      requests.push('Please Enter a URL for Midway');
    }

    let contentTypeText; // for export
    let fileTypeTextImport; // TODO remove when import is able to handle type object
    switch (fileType)
    {
      case fileTypeOptions.get(FileTypes.JSON): // json
      case fileTypeOptions.get(FileTypes.JSON_TYPE_OBJECT): // json [type object]
        contentTypeText = 'application/json';
        fileTypeTextImport = 'json';
        break;
      case fileTypeOptions.get(FileTypes.CSV): // csv
        contentTypeText = 'text/plain';
        fileTypeTextImport = 'csv';
        break;
      default:
        break;
    }

    if (template.export) // export
    {
      const { variantId, objectKey } = headlessArgs;

      if (variantId === -1)
      {
        requests.push('Please Select a Variant');
      }

      if (fileType === fileTypeOptions.get(FileTypes.JSON_TYPE_OBJECT) && (objectKey === undefined || objectKey === ''))
      {
        requests.push('Please Provide an Export Object Key');
      }

      command = `${midwayURL}/midway/v1/export/headless` +
        `?id=${template.templateId}&persistentAccessToken=${template.persistentAccessToken}` +
        `&dbid=${template.dbid}&filetype=${fileType}` +
        `&templateId=${template.templateId}&variantId=${variantId}`;
    }
    else // import
    {
      const { filename } = headlessArgs;

      if (filename === '' || filename === undefined)
      {
        requests.push('Please Enter a Filename');
      }

      command = `curl -X POST ${midwayURL}/midway/v1/import/headless ` +
        `-F id=${template.templateId} -F persistentAccessToken=${template.persistentAccessToken} ` +
        `-F filetype="${fileTypeTextImport}" -F templateId=${template.templateId} -F file="@${filename}"`;
    }
  }

  return { command, errors, requests };
}

@Radium
class CreateHeadlessCommand extends TerrainComponent<Props>
{
  public state: {
    index: number;
    fileTypeIndex: number;
    midwayURLValue: string;
    objectKeyValue: string; // this does nothing until we add ability to override the template's object key
    selectedIds: List<number>;
    filenameValue: string;
  } = {
    index: this.props.index,
    fileTypeIndex: 0,
    midwayURLValue: this.getInitialURL(),
    objectKeyValue: '',
    selectedIds: List([-1, -1, -1]),
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

  public getInitialURL()
  {
    return window.location.origin.match(/http:\/\/localhost:8080/) ? 'localhost:3000' : window.location.origin;
  }

  public handleTextCopied()
  {
    notificationManager.addNotification('Text Copied to Clipboard', '', 'info', 4);
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
        fileTypeIndex: FileTypes.CSV,
      });
    }
    else if (filename.match(/\.json$/i) && fileTypeIndex === FileTypes.CSV)
    { // switch from json to csv
      this.setState({
        fileTypeIndex: FileTypes.JSON,
      });
    }
  }

  public renderExportOptions(template)
  {
    const inputStyle = getStyle('borderRadius', '1px');
    const columnStyle = getStyle('width', inputElementWidth);
    const { fileTypeIndex } = this.state;
    return (
      <div>
        <VariantSelector
          libraryState={LibraryStore.getState()}
          onChangeSelection={this._setStateWrapper('selectedIds')}
          ids={this.state.selectedIds}
          dropdownWidth={inputElementWidth}
        />
        <div className='headless-form-block'>
          <div className='headless-form-column' style={columnStyle}>
            <div className='headless-form-label'>
              Midway URL
            </div>
            <div className='headless-form-input'>
              <input
                value={this.state.midwayURLValue}
                onChange={this._setStateWrapperPath('midwayURLValue', 'target', 'value')}
                style={inputStyle}
              />
            </div>
          </div>
          <div className='headless-form-column' style={columnStyle}>
            <div className='headless-form-label'>
              Export File Type
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
              fileTypeIndex === FileTypes.JSON_TYPE_OBJECT &&
              <div className='headless-form-label'>
                Export Object Key
              </div>
            }
            {
              fileTypeIndex === FileTypes.JSON_TYPE_OBJECT &&
              <div className='headless-form-input'>
                <input
                  value={template.objectKey}
                  onChange={this._setStateWrapperPath('objectKeyValue', 'target', 'value')}
                  style={_.extend({}, inputStyle, backgroundColor(Colors().altHighlight))}
                  disabled={true}
                />
              </div>
            }
          </div>
        </div>
      </div>
    );
  }

  public renderImportOptions(template)
  {
    const inputStyle = getStyle('borderRadius', '1px');
    const columnStyle = getStyle('width', inputElementWidth);

    return (
      <div>
        <div className='headless-form-block'>
          <div className='headless-form-column' style={columnStyle}>
            <div className='headless-form-label'>
              Midway URL
            </div>
            <div className='headless-form-input'>
              <input
                value={this.state.midwayURLValue}
                onChange={this._setStateWrapperPath('midwayURLValue', 'target', 'value')}
                style={inputStyle}
              />
            </div>
          </div>
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
              File Type
            </div>
            <div className='headless-form-input'>
              <Dropdown
                options={fileTypeOptions}
                selectedIndex={this.state.fileTypeIndex}
                canEdit={true}
                onChange={this._setStateWrapper('fileTypeIndex')}
                openDown={true}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  public renderCommandContent(command, requests, errors)
  {
    return (
      <div
        className='headless-command-content'
        style={_.extend({}, backgroundColor(Colors().bg3), fontColor(Colors().text2))}
      >
        {(errors.length !== 0 || requests.length !== 0) &&
          <div className='headless-command-veil' style={backgroundColor(Colors().fadedOutBg)} />
        }
        {errors.length > 0 &&
          <div className='headless-command-errors' style={fontColor(Colors().error)}>
            <div className='headless-command-errors-spacer'> {`ERROR: ${JSON.stringify(errors)}`} </div>
          </div>
        }
        {requests.length > 0 && errors.length === 0 &&
          <div className='headless-command-requests'>
            <div className='headless-command-requests-spacer'> {requests.length === 0 ? '' : requests[0]} </div>
          </div>
        }
        {
          <div className='headless-command-command'>
            {command}
          </div>
        }
      </div>
    );
  }

  public render()
  {
    const template: Template = this.state.index !== -1 ? this.props.templates.get(this.state.index) : undefined;
    const typeText = template !== undefined ? (template.export ? 'Export' : 'Import') : '';
    const { command, requests, errors } = computeHeadlessCommand({
      template,
      fileType: fileTypeOptions.get(this.state.fileTypeIndex),
      midwayURL: this.state.midwayURLValue,
      variantId: this.state.selectedIds.get(2),
      filename: this.state.filenameValue,
      objectKey: template.objectKey ? template.objectKey : this.state.objectKeyValue,
    });
    const iconWrapperStyle = fontColor(Colors().bg3);
    const formComplete = requests.length === 0 && errors.length === 0;
    return (
      <div className='headless-command-generator' style={backgroundColor(Colors().altBg2)}>
        <TemplateSelector
          index={this.state.index}
          templates={this.props.templates}
          getServerName={this.props.getServerName}
          onChange={this._setStateWrapper('index')}
        />
        {
          template !== undefined && template.export ? this.renderExportOptions(template) : this.renderImportOptions(template)
        }
        <div className='headless-entry-row'>
          <div className='headless-command-title'> Headless Command </div>
          {
            formComplete &&
            <CopyToClipboard text={command} onCopy={this.handleTextCopied}>
              <div className='headless-entry-icon-wrapper'
                style={iconWrapperStyle}
              >
                {
                  tooltip(
                    <ClipboardIcon className='headless-entry-icon' />,
                    { title: 'Copy Command to Clipboard', distance: 15 },
                  )
                }
              </div>
            </CopyToClipboard>
          }
        </div>
        {this.renderCommandContent(command, requests, errors)}
      </div>
    );
  }
}

export default CreateHeadlessCommand;
