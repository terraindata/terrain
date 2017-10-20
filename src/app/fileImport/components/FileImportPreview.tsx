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

import * as classNames from 'classnames';
import * as Immutable from 'immutable';
import * as moment from 'moment';
import * as Radium from 'radium';
import * as React from 'react';
import { browserHistory } from 'react-router';

import { getIndex, getType } from 'database/elastic/blocks/ElasticBlockHelpers';
import { backgroundColor, buttonColors, Colors, fontColor } from '../../colors/Colors';
import TemplateList from '../../common/components/TemplateList';
import { getTemplateId, getTemplateName } from './../../../../shared/Util';
import { ESParseTreeToCode } from './../../../database/elastic/conversion/ParseElasticQuery';
import Query from './../../../items/types/Query';
import Autocomplete from './../../common/components/Autocomplete';
import CheckBox from './../../common/components/CheckBox';
import Dropdown from './../../common/components/Dropdown';
import { notificationManager } from './../../common/components/InAppNotification';
import Loading from './../../common/components/Loading';
import Modal from './../../common/components/Modal';
import TerrainComponent from './../../common/components/TerrainComponent';
import { tooltip } from './../../common/components/tooltip/Tooltips';
import Actions from './../data/FileImportActions';
import FileImportStore from './../data/FileImportStore';
import * as FileImportTypes from './../FileImportTypes';
import './FileImportPreview.less';
import FileImportPreviewColumn from './FileImportPreviewColumn';
import TransformModal from './TransformModal';

import ESJSONParser from '../../../../shared/database/elastic/parser/ESJSONParser';

const { List } = Immutable;

const CloseIcon = require('./../../../images/icon_close_8x8.svg?name=CloseIcon');

type Transform = FileImportTypes.Transform;
type Template = FileImportTypes.Template;
type ColumnTypesTree = FileImportTypes.ColumnTypesTree;

export interface Props
{
  exporting: boolean;
  filetype: string;
  previewColumns: List<List<string>>;
  columnsToInclude: List<boolean>;
  columnNames: List<string>;
  columnTypes: List<ColumnTypesTree>;
  objectKey: string;

  columnOptions: List<string>;
  templates: List<Template>;
  transforms: List<Transform>;
  requireJSONHaveAllFields: boolean;

  // import only
  primaryKeys?: List<number>;
  primaryKeyDelimiter?: string;
  existingIndexAndType?: boolean;
  uploadInProgress: boolean;
  elasticUpdate: boolean;
  exportRank?: boolean;
  query?: Query;
  inputs?: List<any>;
  serverId?: number;
  filesize?: number;
  handleFileImportSuccess?: () => void;
  showProgressBar?: boolean;
  router?: any;
  route?: any;

  // export only
  variantName?: string;
}
@Radium
class FileImportPreview extends TerrainComponent<Props>
{
  public state: {
    templateOptions: List<string>,
    appliedTemplateName: string,
    saveTemplateName: string,
    showingDelimTextBox: boolean,
    showingUpdateTemplate: boolean,
    showingApplyTemplate: boolean,
    showingSaveTemplate: boolean,

    showingTransformModal: boolean,
    transformColumnId: number,

    showingAdvanced: boolean,
    showingAddColumn: boolean,
    addColumnName: string,
    advancedCheck: boolean,
    typeObjectKey: string,
    advancedExportRank: boolean,
    exportFiletype: string,

    leaving: boolean,
    nextLocation: any,
    changeLocationAfterSave: boolean,
    showResponseModal: boolean,
    responseModalContent: string,
    responseModalTitle: string,
    responseModalError: boolean,
    previewErrorMsg: string,
  } = {
    templateOptions: List([]),
    appliedTemplateName: '',
    saveTemplateName: '',
    showingDelimTextBox: false,
    showingUpdateTemplate: false,
    showingApplyTemplate: false,
    showingSaveTemplate: false,

    showingTransformModal: false,
    transformColumnId: -1,

    showingAdvanced: false,
    showingAddColumn: false,
    addColumnName: '',
    advancedCheck: this.props.requireJSONHaveAllFields,
    typeObjectKey: this.props.objectKey,
    advancedExportRank: this.props.exportRank,
    exportFiletype: 'csv',

    leaving: false,
    nextLocation: null,
    changeLocationAfterSave: false,
    showResponseModal: false,
    responseModalContent: '',
    responseModalTitle: '',
    responseModalError: false,
    previewErrorMsg: '',
  };

  public confirmedLeave: boolean = false;

  public componentDidMount()
  {
    if (this.props.exporting)
    {
      const dbName = getIndex('');
      const tableName = getType('');
      Actions.setServerDbTable(this.props.serverId, '', dbName, tableName);
    } // Parse the TQL and set the filters so that when we fetch we get the right templates.

    Actions.fetchTemplates(this.props.exporting);
    this.setState({
      templateOptions: this.props.templates.map((template, i) => template.templateName),
    });

    if (!this.props.exporting && this.props.router !== undefined)
    {
      this.props.router.setRouteLeaveHook(this.props.route, this.routerWillLeave);
    }
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

  public handleModalCancel()
  {
    this.setState({
      leaving: false,
    });
  }

  public handleModalDontSave()
  {
    this.confirmedLeave = true;
    this.setState({
      leaving: false,
    });
    browserHistory.push(this.state.nextLocation);
  }

  public handleModalSave()
  {
    this.confirmedLeave = true;
    this.setState({
      leaving: false,
      showingSaveTemplate: true,
      changeLocationAfterSave: true,
    });
  }

  public routerWillLeave(nextLocation): boolean
  {
    if (this.confirmedLeave)
    {
      this.confirmedLeave = false;
      return true;
    }
    if (FileImportStore.getState().isDirty)
    {
      this.setState({
        leaving: true,
        nextLocation,
      });
      return false;

    }
    return true;
  }

  public setPreviewErrorMsg(msg: string)
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

  public showTransformModal()
  {
    this.setState({
      showingTransformModal: true,
    });
  }

  public hideTransformModal()
  {
    this.setState({
      showingTransformModal: false,
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
    if (this.state.changeLocationAfterSave)
    {
      browserHistory.push(this.state.nextLocation);
    }
    else
    {
      this.setState({
        showingSaveTemplate: false,
      });
    }
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

  public handleTemplateSaveSuccess()
  {
    notificationManager.addNotification('Template Saved', 'Successfully saved "' + this.state.saveTemplateName + '"', 'info', 4);
  }

  public handleSaveTemplate()
  {
    const { saveTemplateName } = this.state;
    if (!saveTemplateName)
    {
      this.setPreviewErrorMsg('Please enter a template name');
      return;
    }
    if (this.state.templateOptions.find((option) => getTemplateName(option) === saveTemplateName))
    {
      this.showUpdateTemplate();
      return;
    }
    if (this.props.exporting)
    {
      const dbName = getIndex('');
      const tableName = getType('');
      Actions.saveTemplate(this.state.saveTemplateName, this.props.exporting, this.handleTemplateSaveSuccess,
        this.props.serverId, dbName, tableName);
    }
    else
    {
      Actions.saveTemplate(this.state.saveTemplateName, this.props.exporting, this.handleTemplateSaveSuccess);
    }
    this.setState({
      showingSaveTemplate: false,
      appliedTemplateName: saveTemplateName,
    });

    if (this.confirmedLeave)
    {
      this.hideSaveTemplate();
    }
  }

  public handleAdvanced()
  {
    if (this.state.exportFiletype === 'json [type object]')
    {
      if (this.state.typeObjectKey === '')
      {
        this.setState({
          showResponseModal: true,
          responseModalContent: 'Must enter an object key value',
          responseModalTitle: 'Error saving template',
          responseModalError: true,

        });
        this.showAdvanced();
      }
    }

    if (this.props.exporting)
    {
      Actions.setExportFiletype(this.state.exportFiletype);
      Actions.toggleExportRank(this.state.advancedExportRank);
      Actions.setTypeObjectKey(this.state.typeObjectKey);
    }
    Actions.togglePreviewColumn(this.state.advancedCheck);
  }

  public handleObjectKeyInput(ev: any)
  {
    const { value } = ev.target;
    this.setState({
      typeObjectKey: value,
    });
  }

  public handleUpdateTemplateSuccess(templateName: string)
  {
    notificationManager.addNotification('Template Updated', 'Successfully updated "' + templateName + '"', 'info', 4);
  }

  public handleUpdateTemplateError(error: string)
  {
    this.setState({
      showResponseModal: true,
      responseModalContent: 'Error updating template: ' + error,
      responseModalTitle: 'Could not update template',
      responseModalError: true,
    });
  }

  public handleUpdateTemplate()
  {
    const { saveTemplateName } = this.state;
    const id = getTemplateId(this.state.templateOptions.find((option) => getTemplateName(option) === saveTemplateName));
    Actions.updateTemplate(id, this.props.exporting, this.handleUpdateTemplateSuccess, this.handleUpdateTemplateError, saveTemplateName);
    this.setState({
      showingSaveTemplate: false,
      appliedTemplateName: saveTemplateName,
    });
  }

  public handleDeleteTemplateError(error: string)
  {
    this.setState({
      showResponseModal: true,
      responseModalContent: 'Error deleting template: ' + error,
      responseModalTitle: 'Could not delete template',
      responseModalError: true,
    });
  }

  public handleDeleteTemplateSuccess(templateName: string)
  {
    notificationManager.addNotification('Template Deleted', 'Successfully deleted "' + templateName + '"', 'info', 4);
  }

  public handleDeleteTemplate(itemIndex: number)
  {
    const templateName = this.state.templateOptions.get(itemIndex);
    Actions.deleteTemplate(
      getTemplateId(templateName),
      this.props.exporting,
      this.handleDeleteTemplateSuccess,
      this.handleDeleteTemplateError,
      templateName);
  }

  public handleApplyTemplate(itemIndex: number)
  {
    const templateName = this.state.templateOptions.get(itemIndex);

    // check if template is compatible with current mapping; all current columns must exist in template
    const templateCols: string[] = this.props.templates.get(itemIndex).originalNames.toArray();
    let isCompatible: boolean = true;
    const unmatchedTemplateCols: Set<string> = new Set(templateCols);
    const missingTableCols: string[] = [];
    this.props.columnNames.map((tableCol) =>
    {
      if (templateCols.indexOf(tableCol) === -1)
      {
        isCompatible = false;
        missingTableCols.push(tableCol);
      }
      else
      {
        unmatchedTemplateCols.delete(tableCol);
      }
    });
    if (!isCompatible)
    {
      this.setPreviewErrorMsg('Incompatible template. Template does not contain columns: ' + JSON.stringify(missingTableCols));
      return;
    }
    // only allowed to add additional columns when importing JSON files and no strict checking
    if ((this.props.filetype !== 'json' || this.props.requireJSONHaveAllFields) && unmatchedTemplateCols.size > 0)
    {
      this.setPreviewErrorMsg('Incompatible template. Template contains extra columns: ' +
        JSON.stringify(Array.from(unmatchedTemplateCols)));
      return;
    }

    Actions.applyTemplate(getTemplateId(templateName), List(Array.from(unmatchedTemplateCols)));
    this.setState({
      showingApplyTemplate: false,
      appliedTemplateName: getTemplateName(templateName),
      saveTemplateName: getTemplateName(templateName),
    });
  }

  public onColumnNameChange(columnId: number, localColumnName: string): boolean
  {
    // If column name entered already exists when autocomplete box goes out of focus, return false to roll back change
    // otherwise, if the name has actually changed - set the new name and add the rename transform and return true
    if (this.props.columnNames.delete(columnId).contains(localColumnName))
    {
      this.setPreviewErrorMsg('column name: ' + localColumnName + ' already exists, duplicate column names are not allowed');
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

  public onTransform(transformColumnId: number)
  {
    this.showTransformModal();
    this.setState({
      transformColumnId,
    });
  }

  public handleElasticUpdateChange(elasticUpdate: boolean)
  {
    if (elasticUpdate === this.props.elasticUpdate)
    {
      return;
    }
    Actions.changeElasticUpdate(elasticUpdate);
  }

  public handleRequireJSONHaveAllFieldsChange()
  {
    this.setState({
      advancedCheck: !this.state.advancedCheck,
    });
  }

  public handleAdvancedRankChange()
  {
    this.setState({
      advancedExportRank: !this.state.advancedExportRank,
    });
  }

  public deletePrimaryKey(columnName: string)
  {
    Actions.changePrimaryKey(this.props.columnNames.indexOf(columnName));
  }

  public changePrimaryKeyDelimiter(delim: string)
  {
    if (delim === '')
    {
      this.setPreviewErrorMsg('Primary key delimiter cannot be empty string');
      return;
    }
    Actions.changePrimaryKeyDelimiter(delim);
  }

  public handleFileExportSuccess()
  {
    const filename = this.props.variantName + '_' + String(moment().format('MM-DD-YY')) + '.' + this.props.filetype;
    notificationManager.addNotification('Data Exported', 'Exported data to ' + filename, 'info', 4);
  }

  public handleFileExportError(error: string)
  {
    this.setState({
      showResponseModal: true,
      responseModalContent: 'Error exporting data: ' + error,
      responseModalTitle: 'Could not export data',
      responseModalError: true,
    });
  }

  public handleUploadFile()
  {
    this.confirmedLeave = true;
    if (this.props.exporting)
    {
      const stringQuery: string =
        ESParseTreeToCode(this.props.query.parseTree.parser as ESJSONParser, { replaceInputs: true }, this.props.inputs);
      const dbName = getIndex('');

      if (dbName === undefined || dbName === '')
      {
        this.setPreviewErrorMsg('Index must be selected in order to export results');
        return;
      }
      Actions.exportFile(
        stringQuery,
        this.props.serverId,
        dbName,
        this.props.exportRank,
        this.state.typeObjectKey,
        this.props.variantName + '_' + String(moment().format('MM-DD-YY')) + '.' + this.props.filetype,
        this.handleFileExportSuccess,
        this.handleFileExportError,
      );
    }
    else
    {
      Actions.importFile(this.props.handleFileImportSuccess);
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
      this.setPreviewErrorMsg('Please enter a new column name');
      return;
    }
    if (this.props.columnNames.includes(addColumnName))
    {
      this.setPreviewErrorMsg('Column name already in use');
      return;
    }
    Actions.addPreviewColumn(addColumnName);
    this.setState({
      showingAddColumn: false,
    });
  }

  public handleExportFiletypeChange(typeIndex: number)
  {
    const type = FileImportTypes.FILE_TYPES[typeIndex];
    this.setState({
      exportFiletype: type,
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
            title={this.state.templateOptions.size > 0 ? 'Select a template to apply' : 'There are no templates to apply'}
            onDelete={this.handleDeleteTemplate}
            onApply={this.handleApplyTemplate}
            confirmDelete={true}
          />
        }
        fill={true}
        noFooterPadding={true}
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
        initialTextboxValue={this.state.appliedTemplateName}
        onTextboxValueChange={this.onSaveTemplateNameChange}
        closeOnConfirm={false}
      />
    );
  }

  public renderUpdateTemplate()
  {
    const overwriteName: string = this.state.templateOptions.find((option) => getTemplateName(option) === this.state.saveTemplateName);
    return (
      <Modal
        open={this.state.showingUpdateTemplate}
        message={'By saving this, you are overwriting template ' + overwriteName + ', Continue?'}
        onClose={this.hideUpdateTemplate}
        title={'Overwriting Template'}
        confirm={true}
        confirmButtonText={'Yes'}
        onConfirm={this.handleUpdateTemplate}
      />
    );
  }

  public renderAdvancedModal()
  {
    const dropdownTooltips = Immutable.List(
      [
        'Creates a json file where the data is an array of all results',
        'Creates a json file where the data is an object with a single key with an array of all results as it\'s key',
        'Creates a csv file',
      ]);
    const advancedModalContent = this.props.exporting ?
      <div
        className='fi-advanced-fields'
        style={[
          fontColor(Colors().altText1),
          backgroundColor(Colors().altBg1),
        ]}
      >
        <div className='fi-advanced-fields-row'>
          <CheckBox
            checked={this.state.advancedExportRank}
            onChange={this.handleAdvancedRankChange}
            className={'fi-export-advanced-checkbox'}
          />
          <label
            className='clickable'
            onClick={this.handleAdvancedRankChange}
          >
            Include Terrain Rank in export
          </label>
        </div>
        <div className='fi-advanced-fields-dropdown-label'> Select file type for export </div>
        <Dropdown
          selectedIndex={FileImportTypes.FILE_TYPES.indexOf(this.state.exportFiletype)}
          options={List(FileImportTypes.FILE_TYPES)}
          onChange={this.handleExportFiletypeChange}
          canEdit={true}
          className={'fi-advanced-fields-dropdown'}
          openDown={true}
          tooltips={dropdownTooltips}
        />
        {
          this.state.exportFiletype === 'json [type object]' ?
            <div className='fi-advanced-bottom-margin'>
              <div className='fi-advanced-fields-dropdown-label'>
                Key for Type Object:
              </div>
              <input
                key={'object-key-input'}
                id='object-key-id'
                type='text'
                value={this.state.typeObjectKey}
                onChange={this.handleObjectKeyInput}
                className={'fi-advanced-fields-input'}
              />
            </div>
            :
            <div className='fi-advanced-bottom-margin' />
        }
      </div>
      :
      <div
        className='fi-advanced-fields'
        style={[
          fontColor(Colors().altText1),
          backgroundColor(Colors().altBg1),
        ]}
      >
        <div className='fi-advanced-fields-row'>
          <CheckBox
            checked={this.state.advancedCheck}
            onChange={this.handleRequireJSONHaveAllFieldsChange}
            className={'fi-export-advanced-checkbox'}
          />
          <label
            className='clickable'
            onClick={this.handleRequireJSONHaveAllFieldsChange}
          >
            Require all JSON fields to exist
          </label>
        </div>
      </div>;

    const restrictiveMode =
      <div
        className='fi-advanced'
        style={backgroundColor(Colors().bg1)}
      >
        {advancedModalContent}
      </div>;

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
    return (
      <div
        className='flex-container fi-preview-template-wrapper'
      >
        <div
          className='flex-container fi-preview-template'
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
          className='flex-container fi-preview-template'
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
        {
          this.props.filetype === 'json' || this.props.exporting &&
          <div
            className='flex-container fi-preview-template'
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
        }
      </div>
    );
  }

  public renderTransformModal()
  {
    console.log(this.state.transformColumnId);
    return (
      <TransformModal
        open={this.state.showingTransformModal}
        columnId={this.state.transformColumnId}
        columnName={this.props.columnNames.get(this.state.transformColumnId)}
        columnNames={this.props.columnNames}
        datatype={this.props.columnTypes.get(this.state.transformColumnId).type}
        onClose={this.hideTransformModal}
        setErrorMsg={this.setPreviewErrorMsg}
      />
    );
  }

  public renderPrimaryKeys()
  {
    const { primaryKeys } = this.props;

    return (
      <div
        className='flex-container fi-preview-pkeys-wrapper'
      >
        {
          primaryKeys.size > 0 ?
            primaryKeys.map((pkey, index) =>
              <div
                key={pkey}
                className='flex-shrink flex-container fi-preview-pkeys'
              >
                {
                  index === 0 &&
                  <div
                    style={fontColor(Colors().text1)}
                  >
                    Primary key{primaryKeys.size > 1 ? 's' : ''}:
                  </div>
                }
                <div
                  className='flex-shrink fi-preview-pkeys-pkey'
                  style={[
                    fontColor(Colors().text1),
                    backgroundColor(Colors().bg1),
                  ]}
                >
                  {
                    this.props.columnNames.get(pkey)
                  }
                  <CloseIcon
                    onClick={this._fn(this.deletePrimaryKey, this.props.columnNames.get(pkey))}
                    className='close delete-pkey'
                    data-tip='Delete Primary Key'
                  />
                </div>
                {
                  index !== this.props.primaryKeys.size - 1 &&
                  <div
                    className='flex-shrink fi-preview-pkeys-delim'
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
                        tooltip(
                          <span
                            className='clickable'
                            onClick={this.showDelimTextBox}
                          >
                            {
                              this.props.primaryKeyDelimiter
                            }
                          </span>,
                          'Click to edit delimiter',
                        )
                    }
                  </div>
                }
              </div>,
            )
            :
            <div
              className='flex-shrink fi-preview-pkeys-nokey'
              style={fontColor(Colors().text1)}
            >
              No primary keys selected
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
        items={this.props.previewColumns.get(key)}
        columnId={key}
        columnName={this.props.columnNames.get(key)}
        columnNames={this.props.columnNames}
        isIncluded={this.props.columnsToInclude.get(key)}
        columnType={this.props.columnTypes.get(key)}
        isPrimaryKey={this.props.exporting ? null : this.props.primaryKeys.includes(key)}
        columnOptions={this.props.columnOptions}
        exporting={this.props.exporting}
        onColumnNameChange={this.onColumnNameChange}
        onTransform={this.onTransform}
      />,
    ).toArray();
    if (this.props.filetype === 'json' && !this.props.requireJSONHaveAllFields)
    {
      previewColumns.push(
        (tooltip(<div
          key={previewColumns.length}
          className='fi-preview-column fi-preview-add-column-button'
          onClick={this.showAddColumn}
          style={buttonColors()}
        >
          <div className='fi-preview-add-column-content'>
            {'+'}
          </div>

        </div>, 'Add Column')));
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
      </div>
    );
  }

  public renderUpload()
  {
    const upload =
      <div
        className='fi-preview-import large-button'
        onClick={this.props.uploadInProgress ? this._fn(this.setPreviewErrorMsg, 'import in progress') : this.handleUploadFile}
        style={{
          color: Colors().import,
          border: 'solid 1px ' + Colors().import,
          background: Colors().bg3,
        }}
      >
        {this.props.exporting ? 'Export' : 'Import'}
      </div>;

    return (
      this.props.exporting ?
        upload
        :
        this.props.uploadInProgress && this.props.showProgressBar ?
          <div
            className='fi-preview-loading'
          >
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

  public renderUpdate()
  {
    return (
      <div
        className='flex-container fi-preview-update'
      >
        <div
          className='flex-container fi-preview-update-text'
        >
          <span
            className='fi-preview-update-text-text'
          >
            What should the import do when a primary key in a row in this data matches a primary key in a row in the
            existing data in Terrain?
            </span>
        </div>

        <div
          className='flex-container fi-preview-update-button-row'
        >
          <div
            className='clickable fi-preview-update-button'
            style={{
              color: this.props.elasticUpdate ? Colors().active : Colors().border3,
              border: this.props.elasticUpdate ? 'solid 1px ' + Colors().active : 'solid 1px ' + Colors().border3,
            }}
            onClick={this._fn(this.handleElasticUpdateChange, true)}
          >
            <div
              className='flex-container fi-preview-update-button-header'
            >
              <CheckBox
                checked={this.props.elasticUpdate}
                onChange={this._fn(this.handleElasticUpdateChange, true)}
              />
              <div
                className='fi-preview-update-button-header-title'
              >
                Merge Data
              </div>
            </div>
            <div
              className='fi-preview-update-button-subtext'
            >
              Add new data to existing row
            </div>
          </div>

          <div
            className='clickable fi-preview-update-button'
            style={{
              color: !this.props.elasticUpdate ? Colors().active : Colors().border3,
              border: !this.props.elasticUpdate ? 'solid 1px ' + Colors().active : 'solid 1px ' + Colors().border3,
            }}
            onClick={this._fn(this.handleElasticUpdateChange, false)}
          >
            <div
              className='flex-container fi-preview-update-button-header'
            >
              <CheckBox
                checked={!this.props.elasticUpdate}
                onChange={this._fn(this.handleElasticUpdateChange, false)}
              />
              <div
                className='fi-preview-update-button-header-title'
              >
                Replace Data
              </div>
            </div>
            <div
              className='fi-preview-update-button-subtext'
            >
              Remove the existing row and use the new row instead
            </div>
          </div>
        </div>
      </div>
    );
  }

  public renderTopBar()
  {
    return (
      <div
        className={classNames({
          'flex-container fi-preview-topbar': true,
          'fi-preview-topbar-export': this.props.exporting,
        })}
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
        className='flex-container fi-preview-bottombar'
      >
        {
          !this.props.exporting && this.props.existingIndexAndType && !this.props.uploadInProgress &&
          this.renderUpdate()
        }
        {this.renderUpload()}
      </div>
    );
  }

  public closeResponseModal()
  {
    this.setState({
      showResponseModal: false,
    });
  }

  public renderResponseModal()
  {
    return (
      <Modal
        open={this.state.showResponseModal}
        message={this.state.responseModalContent}
        onClose={this.closeResponseModal}
        title={this.state.responseModalTitle}
        error={this.state.responseModalError}
      />
    );
  }

  public renderError()
  {
    const { previewErrorMsg } = this.state;
    return (
      <Modal
        open={!!previewErrorMsg}
        message={previewErrorMsg}
        error={true}
        onClose={this._fn(this.setPreviewErrorMsg, '')}
      />
    );
  }

  public renderEmptyExport()
  {
    return (
      <div
        className='fi-preview-empty-export'
        style={fontColor(Colors().text1)}
      >
        You must create a query in order to export
      </div>
    );
  }

  public render()
  {
    return (
      <div
        className={classNames({
          'fi-preview': true,
          'fi-preview-export': this.props.exporting,
        })}
        style={backgroundColor(Colors().bg3)}
      >
        {
          this.props.exporting && !this.props.query ?
            this.renderEmptyExport()
            :
            <div>
              {this.renderTopBar()}
              {this.renderTable()}
              {this.renderBottomBar()}
              {this.renderApplyTemplate()}
              {this.renderSaveTemplate()}
              {this.renderUpdateTemplate()}
              {this.renderTransformModal()}
              {this.renderAdvancedModal()}
              {this.renderAddColumn()}
              {this.renderError()}
              {this.renderResponseModal()}
            </div>
        }
        <Modal
          open={this.state.leaving}
          message={'Save changes before leaving?'}
          title='Unsaved Changes'
          confirmButtonText='Save'
          confirm={true}
          onClose={this.handleModalCancel}
          onConfirm={this.handleModalSave}
          thirdButtonText="Don't Save"
          onThirdButton={this.handleModalDontSave}
        />
      </div>
    );
  }
}

export default FileImportPreview;
