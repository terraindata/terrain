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
import { backgroundColor, buttonColors, Colors } from '../../common/Colors';
import TemplateList from '../../common/components/TemplateList';
import { getTemplateId, getTemplateName, updateTemplateName } from './../../../../shared/Util';
import Autocomplete from './../../common/components/Autocomplete';
import CheckBox from './../../common/components/CheckBox';
import Dropdown from './../../common/components/Dropdown';
import Loading from './../../common/components/Loading';
import Modal from './../../common/components/Modal';
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
  filetype: string;
  requireJSONHaveAllFields: boolean;

  columnOptions: List<string>;
  templates: List<Template>;
  transforms: List<Transform>;

  uploadInProgress: boolean;
  elasticUpdate: boolean;
  exporting: boolean;

  query?: string;
  dbName?: string;
  serverId?: number;
  variantName?: string;
}

@Radium
class FileImportPreview extends TerrainComponent<Props>
{
  public state: {
    appliedTemplateName: string,
    saveTemplateName: string,
    templateOptions: List<string>,
    showingDelimTextBox: boolean,
    showingUpdateTemplate: boolean,
    showingApplyTemplate: boolean,
    showingSaveTemplate: boolean,
    showingAdvanced: boolean,
    showingAddColumn: boolean,
    addColumnName: string,
    previewErrorMsg: string,
    advancedCheck: boolean,
  } = {
    appliedTemplateName: '',
    saveTemplateName: '',
    templateOptions: List([]),
    showingDelimTextBox: false,
    showingUpdateTemplate: false,
    showingApplyTemplate: false,
    showingSaveTemplate: false,
    showingAdvanced: false,
    showingAddColumn: false,
    addColumnName: '',
    previewErrorMsg: '',
    advancedCheck: this.props.requireJSONHaveAllFields,
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

  public setError(msg: string)
  {
    this.setState({
      previewErrorMsg: msg,
    });
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

  public showSaveTemplate()
  {
    this.setState({
      showingSaveTemplate: true,
    });
  }

  public hideSaveTemplate()
  {
    this.setState({
      showingSaveTemplate: false,
    });
  }

  public showAdvanced()
  {
    this.setState({
      showingAdvanced: true,
    });
  }

  public hideAdvanced()
  {
    this.setState({
      showingAdvanced: false,
    });
  }

  public showUpdateTemplate()
  {
    this.setState({
      showingUpdateTemplate: true,
    });
  }

  public hideUpdateTemplate()
  {
    this.setState({
      showingUpdateTemplate: false,
    });
  }

  public showAddColumn()
  {
    this.setState({
      showingAddColumn: true,
    });
  }

  public hideAddColumn()
  {
    this.setState({
      showingAddColumn: false,
    });
  }

  public onSaveTemplateNameChange(saveTemplateName: string)
  {
    this.setState({
      saveTemplateName,
    });
  }

  public handleSaveTemplate()
  {
    const { appliedTemplateName, saveTemplateName } = this.state;
    if (!saveTemplateName)
    {
      Actions.setErrorMsg('Please enter a template name');
      return;
    }
    console.log(this.props.templates, saveTemplateName);
    if (this.props.templates.find((temp) => temp.templateName === saveTemplateName))
    {
      this.showUpdateTemplate();
      return;
    }
    Actions.saveTemplate(this.state.saveTemplateName, this.props.exporting);
    this.setState({
      showingSaveTemplate: false,
      appliedTemplateName: updateTemplateName(appliedTemplateName, saveTemplateName),
    });
  }

  public handleAdvanced()
  {
    Actions.togglePreviewColumn(this.state.advancedCheck);
  }

  public handleUpdateTemplate()
  {
    const { appliedTemplateName, saveTemplateName } = this.state;
    Actions.updateTemplate(getTemplateId(appliedTemplateName), this.props.exporting);
    this.setState({
      showingSaveTemplate: false,
      appliedTemplateName: updateTemplateName(appliedTemplateName, saveTemplateName),
    });
  }

  public handleDeleteTemplate(itemIndex: number)
  {
    const templateName = this.state.templateOptions.get(itemIndex);
    Actions.deleteTemplate(getTemplateId(templateName), this.props.exporting);
  }

  public handleApplyTemplate(itemIndex: number)
  {
    const templateName = this.state.templateOptions.get(itemIndex);

    // check if template is compatible with current mapping -> whether column names match
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

    Actions.applyTemplate(getTemplateId(templateName));
    this.setState({
      showingApplyTemplate: false,
      appliedTemplateName: templateName,
      saveTemplateName: getTemplateName(templateName),
    });
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

  public handleRequireJSONHaveAllFieldsChange()
  {
    this.setState({
      advancedCheck: !this.state.advancedCheck,
    });
  }

  public deletePrimaryKey(columnName: string)
  {
    Actions.changePrimaryKey(this.props.columnNames.indexOf(columnName));
  }

  public changePrimaryKeyDelimiter(delim: string)
  {
    Actions.changePrimaryKeyDelimiter(delim);
  }

  public handleUploadFile()
  {
    if (this.props.exporting)
    {
      if (this.props.dbName === undefined || this.props.dbName === '')
      {
        this.setError('Index must be selected in order to export results');
        return;
      }
      Actions.exportFile(this.props.query, this.props.serverId, this.props.dbName, true,
        this.props.variantName + '_' + String(moment().format('MM-DD-YY')) + '.csv');
    }
    else
    {
      Actions.importFile();
    }
  }

  public onAddColumnNameChange(addColumnName: string)
  {
    this.setState({
      addColumnName,
    });
  }

  public handleAddPreviewColumn()
  {
    const { addColumnName } = this.state;
    if (!addColumnName)
    {
      Actions.setErrorMsg('Please enter a new column name');
      return;
    }
    if (this.props.columnNames.includes(addColumnName))
    {
      Actions.setErrorMsg('Column name already in use');
      return;
    }
    Actions.addPreviewColumn(addColumnName);
    this.setState({
      showingAddColumn: false,
    });
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
            title={'Select a Template to Apply'}
            onDelete={this.handleDeleteTemplate}
            onApply={this.handleApplyTemplate}
            confirmDelete={true}
          />
        }
        fill={true}
      />
    );
  }

  public renderSaveTemplate()
  {
    return (
      <Modal
        open={this.state.showingSaveTemplate}
        onClose={this.hideSaveTemplate}
        title={'Save As Template'}
        confirm={true}
        confirmButtonText={'Save'}
        onConfirm={this.handleSaveTemplate}
        showTextbox={true}
        initialTextboxValue={getTemplateName(this.state.appliedTemplateName)}
        onTextboxValueChange={this.onSaveTemplateNameChange}
        closeOnConfirm={false}
      />
    );
  }

  public renderAdvancedModal()
  {
    const restrictiveMode =
      (
        <div
          className='fi-advanced'
          style={{
            background: Colors().bg1,
          }}
        >
          <div
            className='fi-advanced-fields'
          >
            <CheckBox
              checked={this.state.advancedCheck}
              onChange={this.handleRequireJSONHaveAllFieldsChange}
            />
            <span
              className='clickable'
              onClick={this.handleRequireJSONHaveAllFieldsChange}
              style={{
                color: Colors().text1,
              }}
            >
              Require all JSON fields to exist?
            </span>
          </div>
        </div>
      );

    return (
      <Modal
        open={this.state.showingAdvanced}
        onClose={this.hideAdvanced}
        title={'Advanced'}
        children={restrictiveMode}
        confirm={true}
        confirmButtonText={'Save'}
        onConfirm={this.handleAdvanced}
        closeOnConfirm={true}
      />
    );
  }

  public renderUpdateTemplate()
  {
    return (
      <Modal
        open={this.state.showingUpdateTemplate}
        message={'By saving this, you are overwriting template ' + this.state.appliedTemplateName + ', Continue?'}
        onClose={this.hideUpdateTemplate}
        title={'Overwriting Template'}
        confirm={true}
        confirmButtonText={'Yes'}
        onConfirm={this.handleUpdateTemplate}
      />
    );
  }

  public renderAddColumn()
  {
    return (
      <Modal
        open={this.state.showingAddColumn}
        onClose={this.hideAddColumn}
        title={'Add New Column'}
        confirm={true}
        confirmButtonText={'Add'}
        onConfirm={this.handleAddPreviewColumn}
        showTextbox={true}
        initialTextboxValue={''}
        onTextboxValueChange={this.onAddColumnNameChange}
        closeOnConfirm={false}
      />
    );
  }

  public renderTemplate()
  {
    const renderAdvancedButton =
      (
        <div
          className='flex-container fi-preview-template-wrapper'
        >
          <div
            className='flex-grow fi-preview-template-button button'
            onClick={this.showAdvanced}
            style={buttonColors()}
            ref='fi-preview-template-button-advanced'
          >
            Advanced...
        </div>
        </div>
      );

    return (
      <div
        className='flex-container fi-preview-template'
      >
        <div
          className='flex-container fi-preview-template-wrapper'
        >
          <div
            className='flex-grow fi-preview-template-button button'
            onClick={this.showApplyTemplate}
            style={buttonColors()}
            ref='fi-preview-template-button-apply'
          >
            Apply Template
          </div>
        </div>
        <div
          className='flex-container fi-preview-template-wrapper'
        >
          <div
            className='flex-grow fi-preview-template-button button'
            onClick={this.showSaveTemplate}
            style={buttonColors()}
            ref='fi-preview-template-button-save'
          >
            Save As Template
          </div>
        </div>
        {renderAdvancedButton}
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
    const previewColumns = this.props.columnNames.map((value, key) =>
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
    ).toArray();
    if (this.props.filetype === 'json' && !this.props.requireJSONHaveAllFields)
    {
      previewColumns.push(
        (<div
          key={previewColumns.length}
          className='fi-preview-column fi-preview-add-column-button'
          onClick={this.showAddColumn}
          style={buttonColors()}
        >
          <div className='fi-preview-add-column-content'>
            {'+'}
          </div>

        </div>));
    }

    return (
      <div
        className='fi-preview-table-container'
      >
        <div
          className='fi-preview-columns-container'
        >
          {
            previewColumns
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
        className='fi-preview-import-button button'
        onClick={this.handleUploadFile}
        style={buttonColors()}
      >
        {this.props.exporting ? 'Export' : 'Import'}
      </div>;

    return (
      this.props.exporting ?
        upload
        :
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
        {this.renderUpload()}
      </div>
    );
  }

  public renderError()
  {
    const { previewErrorMsg } = this.state;
    if (this.props.exporting)
    {
      return (
        <Modal
          open={!!previewErrorMsg}
          message={previewErrorMsg}
          error={true}
          onClose={this._fn(this.setError, '')}
        />
      );
    }
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
        {this.renderSaveTemplate()}
        {this.renderUpdateTemplate()}
        {this.renderAdvancedModal()}
        {this.renderAddColumn()}
        {this.renderError()}
      </div>
    );
  }
}

export default FileImportPreview;
