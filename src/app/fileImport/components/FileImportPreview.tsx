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

// tslint:disable:no-empty strict-boolean-expressions no-console no-var-requires

import * as Immutable from 'immutable';
import * as moment from 'moment';
import * as Radium from 'radium';
import * as React from 'react';
import { buttonColors, Colors } from '../../common/Colors';
import Modal from '../../common/components/Modal';
import TemplateList from '../../common/components/TemplateList';
import Autocomplete from './../../common/components/Autocomplete';
import CheckBox from './../../common/components/CheckBox';
import Dropdown from './../../common/components/Dropdown';
import Loading from './../../common/components/Loading';
import TerrainComponent from './../../common/components/TerrainComponent';
import Actions from './../data/FileImportActions';
import * as FileImportTypes from './../FileImportTypes';
import './FileImportPreview.less';
import FileImportPreviewColumn from './FileImportPreviewColumn';
import FileImportPreviewRow from './FileImportPreviewRow';
const { List } = Immutable;

const CloseIcon = require('./../../../images/icon_close_8x8.svg?name=CloseIcon');

type Transform = FileImportTypes.Transform;
type Template = FileImportTypes.Template;
type ColumnTypesTree = FileImportTypes.ColumnTypesTree;

export interface Props
{
  previewRows: List<List<string>>;
  primaryKeys: List<number>;
  primaryKeyDelimiter: string;

  columnsToInclude: List<boolean>;
  columnNames: List<string>;
  columnTypes: List<ColumnTypesTree>;

  columnOptions: List<string>;
  templates: List<Template>;
  transforms: List<Transform>;

  uploadInProgress: boolean;
  elasticUpdate: boolean;
  exporting: boolean;

  query?: string;
  variantName?: string;
}

@Radium
class FileImportPreview extends TerrainComponent<Props>
{
  public state: {
    loadedTemplateId: number,
    templateName: string,
    templateOptions: List<string>,
    showingDelimTextBox: boolean,
    showingApplyTemplate: boolean,
  } = {
    loadedTemplateId: -1,
    templateName: '',
    templateOptions: List([]),
    showingDelimTextBox: false,
    showingApplyTemplate: false,
  };

  public componentDidMount()
  {
    Actions.fetchTemplates(this.props.exporting);
    this.setState({
      templateOptions: this.props.templates.map((template, i) => template.templateName),
    });
  }

  public componentWillReceiveProps(nextProps: Props)
  {
    if (!this.props.templates.equals(nextProps.templates))
    {
      this.setState({
        templateOptions: nextProps.templates.map((template, i) => String(template.templateId) + ': ' + template.templateName),
      });
    }
  }

  public onColumnNameChange(columnId: number, localColumnName: string): boolean
  {
    // If column name entered already exists when autocomplete box goes out of focus, return false to roll back change
    // otherwise, if the name has actually changed - set the new name and add the rename transform and return true
    if (this.props.columnNames.delete(columnId).contains(localColumnName))
    {
      Actions.setErrorMsg('column name: ' + localColumnName + ' already exists, duplicate column names are not allowed');
      return false;
    }

    if (this.props.columnNames.get(columnId) !== localColumnName)
    {
      Actions.setColumnName(columnId, localColumnName);
      Actions.addTransform(FileImportTypes._Transform(
        {
          name: 'rename',
          colName: this.props.columnNames.get(columnId),
          args: FileImportTypes._TransformArgs({
            newName: localColumnName,
          }),
        }));
      return true;
    }
  }

  public handleElasticUpdateChange()
  {
    Actions.changeElasticUpdate();
  }

  public deletePrimaryKey(columnName: string)
  {
    Actions.changePrimaryKey(this.props.columnNames.indexOf(columnName));
  }

  public changePrimaryKeyDelimiter(delim: string)
  {
    Actions.changePrimaryKeyDelimiter(delim);
  }

  public showDelimTextBox()
  {
    this.setState({
      showingDelimTextBox: true,
    });
  }

  public onDelimChange()
  {
    this.setState({
      showingDelimTextBox: false,
    });
  }

  public showApplyTemplate()
  {
    this.setState({
      showingApplyTemplate: true,
    });
  }

  public hideApplyTemplate()
  {
    this.setState({
      showingApplyTemplate: false,
    });
  }

  public handleAutocompleteTemplateChange(templateName: string)
  {
    this.setState({
      templateName,
    });
  }

  public handleDeleteTemplate(itemIndex: number)
  {
    const templateName = this.state.templateOptions.get(itemIndex);
    const templateId = Number(templateName.split(':').shift());
    Actions.deleteTemplate(templateId, this.props.exporting);
  }

  public handleLoadTemplate(itemIndex: number)
  {
    const templateName = this.state.templateOptions.get(itemIndex);
    const templateId = Number(templateName.split(':').shift());

    const colNames: Immutable.List<string> = this.props.templates.get(itemIndex).originalNames;
    let isCompatible: boolean = true;
    const unmatchedColNames: string[] = [];
    const unmatchedTableNames: string[] = this.props.columnNames.toArray();
    colNames.map((colName) =>
    {
      if (!this.props.columnNames.contains(colName))
      {
        isCompatible = false;
        unmatchedColNames.push(colName);
      }
      else
      {
        unmatchedTableNames.splice(unmatchedTableNames.indexOf(colName), 1);
      }
    });

    if (!isCompatible)
    {
      Actions.setErrorMsg('Incompatible template, unmatched column names:\n' + JSON.stringify(unmatchedColNames) + '\n and \n'
        + JSON.stringify(unmatchedTableNames));
      return;
    }
    Actions.loadTemplate(templateId);
    this.setState({
      showingApplyTemplate: false,
    });
  }

  public handleSaveTemplate()
  {
    if (!this.state.templateName)
    {
      Actions.setErrorMsg('Please enter a template name');
      return;
    }
    Actions.saveTemplate(this.state.templateName, this.props.exporting);
  }

  public handleUpdateTemplate()
  {
    if (this.state.loadedTemplateId === -1)
    {
      Actions.setErrorMsg('No template loaded');
      return;
    }
    Actions.updateTemplate(this.state.loadedTemplateId, this.props.exporting);
  }

  public handleUploadFile()
  {
    if (this.props.exporting)
    {
      Actions.exportFile(this.props.query, true, this.props.variantName + '_' + String(moment().format('MM-DD-YY')) + '.csv');
    }
    else
    {
      Actions.importFile();
    }
  }

  public renderApplyTemplate()
  {
    return (
      <Modal
        open={this.state.showingApplyTemplate}
        onClose={this.hideApplyTemplate}
        title={'Apply Template'}
        children={
          <TemplateList
            items={this.state.templateOptions}
            onDelete={this._fn(this.handleDeleteTemplate)}
            onApply={this._fn(this.handleLoadTemplate)}
          />
        }
        fill={true}
      />
    );
  }
  public renderTemplate()
  {
    return (
      <div
        className='flex-container fi-preview-template'
      >
        <div
          className='flex-container fi-preview-template-wrapper'
        >
          <div
            className='flex-grow fi-preview-template-button'
            onClick={this.showApplyTemplate}
            style={buttonColors()}
            ref='fi-preview-template-button-load'
          >
            Load Template
          </div>
        </div>
        {
          this.state.loadedTemplateId === -1 &&
          <div
            className='flex-container fi-preview-template-wrapper'
          >
            <div
              className='flex-grow fi-preview-template-button'
              onClick={this.handleUpdateTemplate}
              style={buttonColors()}
              ref='fi-preview-template-button-update'
            >
              Update
                </div>
          </div>
        }
        <div
          className='flex-container fi-preview-template-wrapper'
        >
          <div
            className='flex-grow fi-preview-template-button'
            onClick={this.handleSaveTemplate}
            style={buttonColors()}
            ref='fi-preview-template-button-save'
          >
            Save Template
          </div>
          <Autocomplete
            value={this.state.templateName}
            options={null}
            onChange={this.handleAutocompleteTemplateChange}
            placeholder={'template name'}
            className={'flex-grow fi-preview-template-save-autocomplete'}
            disabled={false}
          />
        </div>
      </div>
    );
  }

  public renderPrimaryKeys()
  {
    return (
      <div
        className='flex-container fi-preview-pkeys'
      >
        {
          this.props.primaryKeys.size > 0 ?
            this.props.primaryKeys.map((pkey, index) =>
              <div
                key={pkey}
                className='flex-shrink flex-container fi-preview-pkeys-wrapper'
              >
                <div
                  className='flex-shrink fi-preview-pkeys-pkey'
                  style={{
                    background: Colors().bg1,
                    text: Colors().text1,
                  }}
                >
                  {
                    this.props.columnNames.get(pkey)
                  }
                  <CloseIcon
                    onClick={this._fn(this.deletePrimaryKey, this.props.columnNames.get(pkey))}
                    className='close delete-primary-key'
                    data-tip='Delete Primary Key'
                  />
                </div>
                {
                  index !== this.props.primaryKeys.size - 1 &&
                  <div
                    className='flex-shrink fi-preview-pkeys-delim'
                    onClick={this.showDelimTextBox}
                  >
                    {
                      this.state.showingDelimTextBox ?
                        <Autocomplete
                          value={this.props.primaryKeyDelimiter}
                          options={null}
                          onChange={this.changePrimaryKeyDelimiter}
                          placeholder={'delimiter'}
                          className={'fi-preview-pkeys-autocomplete'}
                          disabled={false}
                          onEnter={this.onDelimChange}
                          onBlur={this.onDelimChange}
                        />
                        :
                        <span
                          className='clickable'
                        >
                          {
                            this.props.primaryKeyDelimiter
                          }
                        </span>
                    }
                  </div>
                }
              </div>,
            )
            :
            <div
              className='flex-shrink fi-preview-pkeys-nokey'
              style={{
                text: Colors().text1,
              }}
            >
              No Primary Keys Selected
            </div>
        }
      </div>
    );
  }

  public renderTable()
  {
    return (
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
                columnName={this.props.columnNames.get(key)}
                columnNames={this.props.columnNames}
                isIncluded={this.props.columnsToInclude.get(key)}
                columnType={this.props.columnTypes.get(key)}
                isPrimaryKey={this.props.primaryKeys.includes(key)}
                columnOptions={this.props.columnOptions}
                exporting={this.props.exporting}
                onColumnNameChange={this.onColumnNameChange}
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
    );
  }

  public renderUpload()
  {
    const upload =
      <div
        className='fi-preview-import-button'
        onClick={this.handleUploadFile}
        style={buttonColors()}
      >
        {this.props.exporting ? 'Export' : 'Import'}
      </div>;

    return (
      this.props.exporting ?
        this.props.uploadInProgress ?
          <div className='fi-preview-loading-container'>
            <Loading
              width={100}
              height={100}
              loading={this.props.uploadInProgress}
              loaded={false}
              onLoadedEnd={null}
            />
          </div>
          :
          upload
        :
        upload
    );
  }

  public renderTopBar()
  {
    return (
      <div
        className='flex-container fi-preview-topbar'
      >
        {
          !this.props.exporting &&
          this.renderPrimaryKeys()
        }
        {this.renderTemplate()}
      </div>
    );
  }

  public renderBottomBar()
  {
    return (
      <div
        className='fi-import-button-wrapper'
      >
        {
          !this.props.exporting &&
          <div
            className='fi-preview-update'
          >
            <CheckBox
              checked={this.props.elasticUpdate}
              onChange={this.handleElasticUpdateChange}
            />
            <span
              className='clickable'
              onClick={this.handleElasticUpdateChange}
            >
              Join against any existing entries
              </span>
          </div>
        }
        {
          this.props.uploadInProgress ?
            <div className='fi-preview-loading-container'>
              <Loading
                width={100}
                height={100}
                loading={this.props.uploadInProgress}
                loaded={false}
                onLoadedEnd={null}
              />
            </div>
            :
            this.renderUpload()
        }
      </div>
    );
  }

  public render()
  {
    return (
      <div
        className='fi-preview'
      >
        {this.renderTopBar()}
        {this.renderTable()}
        {this.renderBottomBar()}
        {this.renderApplyTemplate()}
      </div>
    );
  }
}

export default FileImportPreview;
