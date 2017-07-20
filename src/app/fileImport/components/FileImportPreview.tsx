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

// tslint:disable:no-empty strict-boolean-expressions no-console

import * as classNames from 'classnames';
import * as Immutable from 'immutable';
import * as $ from 'jquery';
import * as Radium from 'radium';
import * as React from 'react';
import * as _ from 'underscore';
import { backgroundColor, buttonColors, Colors, fontColor, link } from '../../common/Colors';
import Util from '../../util/Util';
import Autocomplete from './../../common/components/Autocomplete';
import Dropdown from './../../common/components/Dropdown';
import TerrainComponent from './../../common/components/TerrainComponent';
import Actions from './../data/FileImportActions';
import * as FileImportTypes from './../FileImportTypes';
import './FileImportPreview.less';
import FileImportPreviewColumn from './FileImportPreviewColumn';
import FileImportPreviewRow from './FileImportPreviewRow';
const { List } = Immutable;

export interface Props
{
  previewRows: List<List<string>>;
  columnsCount: number;
  primaryKey: number;

  columnsToInclude: List<boolean>;
  columnNames: List<string>;
  columnTypes: List<FileImportTypes.ColumnTypesTree>;
  columnOptions: List<string>;
  templates: List<FileImportTypes.Template>;
  transforms: List<FileImportTypes.Transform>;
}

@Radium
class FileImportPreview extends TerrainComponent<Props>
{
  public state: {
    templateId: number,
    templateText: string,
    editColumnId: number,
  } = {
    templateId: -1,
    templateText: '',
    editColumnId: -1,
  };

  public componentDidMount()
  {
    Actions.getTemplates();
  }

  public handleEditColumnChange(editColumnId: number)
  {
    this.setState({
      editColumnId,
    });
  }

  public handleTemplateChange(templateId: number)
  {
    this.setState({
      templateId,
    });
  }

  public handleAutocompleteTemplateChange(templateText: string)
  {
    this.setState({
      templateText,
    });
  }

  public handleLoadTemplate()
  {
    if (this.state.templateId === -1)
    {
      alert('Please select a template to load');
      return;
    }
    Actions.loadTemplate(this.state.templateId);
  }

  public handleSaveTemplate()
  {
    if (!this.state.templateText)
    {
      alert('Please enter a template name');
      return;
    }
    Actions.saveTemplate(this.state.templateText);
    Actions.getTemplates();
  }

  public handleUploadFile()
  {
    Actions.uploadFile();
  }

  public render()
  {
    return (
      <div
        className='fi-preview'
      >
        <div
          className='fi-preview-template'
        >
          <div
            className='fi-preview-load'
          >
            <div
              className='fi-load-button'
              onClick={this.handleLoadTemplate}
              style={buttonColors()}
              ref='fi-load-button'
            >
              Load Template
            </div>
            <Dropdown
              selectedIndex={this.state.templateId}
              options={List<string>(this.props.templates.map((template, i) => template.name))}
              onChange={this.handleTemplateChange}
              className={'fi-load-dropdown'}
              canEdit={true}
            />
          </div>

          <div
            className='fi-preview-save'
          >
            <div
              className='fi-save-button'
              onClick={this.handleSaveTemplate}
              style={buttonColors()}
              ref='fi-save-button'
            >
              Save Template
            </div>
            <Autocomplete
              value={this.state.templateText}
              options={null}
              onChange={this.handleAutocompleteTemplateChange}
              placeholder={'template name'}
              className={'fi-save-autocomplete'}
              disabled={false}
            />
          </div>
        </div>

        <div
          className='fi-preview-table-container'
        >
          <div
            className='fi-preview-columns-container'
          >
            {
              this.props.columnNames.map((value, key) =>
                <FileImportPreviewColumn
                  key={key}
                  columnId={key}
                  isIncluded={this.props.columnsToInclude.get(key)}
                  columnType={this.props.columnTypes.get(key)}
                  isPrimaryKey={this.props.primaryKey === key}
                  columnNames={this.props.columnNames}
                  columnOptions={this.props.columnOptions}
                  editing={key === this.state.editColumnId}
                  handleEditColumnChange={this.handleEditColumnChange}
                />,
              ).toArray()
            }
          </div>
          <div
            className='fi-preview-rows-container'
          >
            {
              this.props.previewRows.map((items, key) =>
                <FileImportPreviewRow
                  key={key}
                  items={items}
                />,
              )
            }
          </div>
        </div>
        <div
          className='fi-preview-import-button'
          onClick={this.handleUploadFile}
          style={buttonColors()}
        >
          Import
        </div>
      </div>
    );
  }
}

export default FileImportPreview;
