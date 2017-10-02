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
import * as React from 'react';

import { backgroundColor, borderColor, Colors, fontColor } from 'common/Colors';
import Dropdown from 'common/components/Dropdown';
import TerrainComponent from 'common/components/TerrainComponent';
import * as FileImportTypes from 'fileImport/FileImportTypes';

import ControlActions from '../../data/ControlActions';

import './CreateHeadlessCommand.less';

const Color = require('color');
const { List } = Immutable;
type Template = FileImportTypes.Template;

export interface Props
{
  templates: List<Template>;
  index: number;
}

class CreateHeadlessCommand extends TerrainComponent<Props>
{
  public state: {
    index: number;
  } = {
    index: this.props.index,
  };

  public constructor(props)
  {
    super(props);
    this.getTemplateTextList = memoizeOne(this.getTemplateTextList);
  }

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

  public getTemplateTextList(): List<string>
  {
    return this.props.templates.map((template, index) => {
        // const typeText = template.export ? 'Export' : 'Import';
        return `${template.templateName}`
      }).toList();
  }

  public handleTemplateDropdownChange(index, event)
  {
    this.setState({
      index,
    });
  }

  public renderInfoTable(template)
  {
    const typeText = template !== undefined ? (template.export ? 'Export' : 'Import') : '';
    const fadedStyle = fontColor(Colors().altText3);

    return (
      <div className='headless-generator-data'>
        <div className='headless-generator-column'>
          <table className='headless-generator-info-table'>
            <tbody>
              <tr>
                <td> Template Type </td><td style={fadedStyle}> {typeText} </td>
              </tr>
              <tr>
                <td> Template ID </td><td style={fadedStyle}> {template.templateId} </td>
              </tr>
              <tr>
                <td> Access token </td><td className='access-token-cell' style={fadedStyle}> {template.persistentAccessToken} </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className='headless-generator-column'>
          <table className='headless-generator-info-table'>
            <tbody>
              <tr>
                <td> Server ID </td><td style={fadedStyle}> {template.dbid} </td>
              </tr>
              <tr>
                <td> Index </td><td style={fadedStyle}> {template.dbname} </td>
              </tr>
              <tr>
                <td> Type </td><td style={fadedStyle}> {template.tablename} </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  public renderExportOptions(template)
  {
    const fileTypeOptions = List(['JSON', 'CSV']);
    return (
      <div>
        <div className='headless-entry-row'>
          <div className='headless-entry-label'>
            File Type
          </div>
          <div className='headless-entry-input'>
            <Dropdown
              options={fileTypeOptions}
              selectedIndex={0}
              canEdit={true}
            />
          </div>
          <div className='headless-entry-label'>
            URL
          </div>
          <div className='headless-entry-input'>
            <input value='localhost'/>
          </div>
        </div>
      </div>
    );
  }

  public renderImportOptions(template)
  {

  }

  public computeCommand()
  {
    return 'Please fill in the required information';
  }

  public render()
  {
    const template: Template = this.state.index !== -1 ? this.props.templates.get(this.state.index) : undefined;
    const typeText = template !== undefined ? (template.export ? 'Export' : 'Import') : '';

    return (
      <div className='headless-command-generator'>
        <div className='headless-entry-row'>
          <div className='headless-entry-label'>
            Template
          </div>
          <div className='headless-entry-input'>
            <Dropdown
              options={this.getTemplateTextList()}
              selectedIndex={this.state.index}
              onChange={this.handleTemplateDropdownChange}
              canEdit={true}
              directionBias={90}
            />
          </div>
        </div>
        {
          template !== undefined && this.renderInfoTable(template)
        }
        {
          template !== undefined && template.export ? this.renderExportOptions(template) : this.renderImportOptions(template)
        }
        <div className='headless-command-title'> Headless Command </div>
        <div
          className='headless-command-content'
          style={_.extend({}, borderColor(Colors().bg3), backgroundColor(Colors().bg3), fontColor(Colors().text2))}
        >
          {this.computeCommand()}
        </div>
      </div>
    );
  }
}

export default CreateHeadlessCommand;
