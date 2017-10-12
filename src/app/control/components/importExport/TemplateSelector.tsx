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

import * as React from 'react';

import * as _ from 'lodash';
import memoizeOne from 'memoize-one';

import { Colors, fontColor, getStyle } from 'common/Colors';
import Dropdown from 'common/components/Dropdown';
import TerrainComponent from 'common/components/TerrainComponent';
import { tooltip } from 'common/components/tooltip/Tooltips';

import * as FileImportTypes from 'fileImport/FileImportTypes';
import './TemplateSelector.less';

type Template = FileImportTypes.Template;
const ViewIcon = require('images/icon_info.svg');

export interface Props
{
  templates: List<Template>;
  index: number;
  getServerName: (dbid) => string;
  onChange: (value, event) => void;
}

class TemplateSelector extends TerrainComponent<Props>
{
  public constructor(props)
  {
    super(props);
    this.getTemplateTextList = memoizeOne(this.getTemplateTextList);
  }

  public renderInfoTable(template)
  {
    const typeText = template !== undefined ? (template.export ? 'Export' : 'Import') : '';
    const labelStyle = _.extend({}, fontColor(Colors().altText3), getStyle('fontSize', '12px'));

    return (
      <div className='template-selector-data'>
        <div className='template-selector-column'>
          <table className='template-selector-info-table'>
            <tbody>
              <tr>
                <td style={labelStyle}> Template Type: </td>
                <td style={labelStyle}> {typeText} </td>
              </tr>
              <tr>
                <td style={labelStyle}> Template ID: </td>
                <td style={labelStyle}> {template.templateId} </td>
              </tr>
              <tr>
                <td style={labelStyle}> Access token: </td>
                <td className='access-token-cell' style={labelStyle}> {template.persistentAccessToken} </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className='template-selector-column'>
          <table className='template-selector-info-table'>
            <tbody>
              <tr>
                <td style={labelStyle}> Server Name: </td>
                <td style={labelStyle}> {this.props.getServerName(template.dbid)} </td>
              </tr>
              <tr>
                <td style={labelStyle}> Index: </td>
                <td style={labelStyle}> {template.dbname} </td>
              </tr>
              <tr>
                <td style={labelStyle}> Type: </td>
                <td style={labelStyle}> {template.tablename} </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  public getTemplateTextList(): List<string>
  {
    return this.props.templates.map((template, index) =>
    {
      return `(${template.export ? 'Export' : 'Import'}) ${template.templateName}`;
    }).toList();
  }

  public render()
  {
    const template: Template = this.props.index !== -1 ? this.props.templates.get(this.props.index) : undefined;
    const iconWrapperStyle = fontColor(Colors().bg3);
    const templateTextList = this.getTemplateTextList();
    return (
      <div className='template-selector-row'>
        <div className='template-selector-label'>
          Template
        </div>
        <div className='template-selector-input'>
          <Dropdown
            options={templateTextList.size !== 0 ? templateTextList : undefined}
            selectedIndex={this.props.index}
            onChange={this.props.onChange}
            canEdit={true}
            directionBias={90}
          />
        </div>
        <div className='template-selector-icon-wrapper'
          style={iconWrapperStyle}
        >
          {
            template !== undefined && tooltip(
              <ViewIcon className='template-selector-icon' />,
              {
                html: this.renderInfoTable(template),
                trigger: 'click',
                position: 'right',
                style: { display: 'inline' },
                interactive: true,
              },
            )
          }
        </div>
      </div>
    );
  }
}

export default TemplateSelector;
