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

// tslint:disable:no-var-requires strict-boolean-expressions max-line-length

import * as Immutable from 'immutable';
import * as _ from 'lodash';
import * as Radium from 'radium';
import * as React from 'react';
import { DragDropContext } from 'react-dnd';
import { server } from '../../../../midway/src/Midway';
import { backgroundColor, buttonColors, Colors, fontColor, link } from '../../common/Colors';
import Modal from '../../common/components/Modal';
import { isValidIndexName, isValidTypeName } from './../../../../shared/database/elastic/ElasticUtil';
import { parseCSV, ParseCSVConfig, parseJSONSubset } from './../../../../shared/Util';
import Autocomplete from './../../common/components/Autocomplete';
import Dropdown from './../../common/components/Dropdown';
import TemplateList from './../../common/components/TemplateList';
import TerrainComponent from './../../common/components/TerrainComponent';
import SchemaStore from './../../schema/data/SchemaStore';
import { databaseId, tableId } from './../../schema/SchemaTypes';
import * as SchemaTypes from './../../schema/SchemaTypes';
import Actions from './../data/FileImportActions';
import FileImportStore from './../data/FileImportStore';
import * as FileImportTypes from './../FileImportTypes';
import './FileImport.less';
import FileImportPreview from './FileImportPreview';
import FileImportPreviewRow from './FileImportPreviewRow';
import has = Reflect.has;
const HTML5Backend = require('react-dnd-html5-backend');
const { List } = Immutable;

// const ArrowIcon = require('./../../../images/icon_carrot.svg');

const PREVIEW_CHUNK_SIZE = FileImportTypes.PREVIEW_CHUNK_SIZE;

export interface Props
{
  params?: any;
  location?: any;
  router?: any;
  route?: any;
}

@Radium
class FileImport extends TerrainComponent<any>
{
  public state: {
    fileImportState: FileImportTypes.FileImportState;
    columnOptionNames: List<string>;
    stepId: number;
    servers?: SchemaTypes.ServerMap;
    serverNames: List<string>;
    serverIndex: number;
    dbs?: SchemaTypes.DatabaseMap;
    dbNames: List<string>;
    tables?: SchemaTypes.TableMap;
    tableNames: List<string>;
    fileSelected: boolean;
    filetype: string;
    filename: string,
    dbValid: boolean,
    tableValid: boolean,
  } = {
    fileImportState: FileImportStore.getState(),
    columnOptionNames: List([]),
    stepId: 0,
    serverIndex: -1,
    serverNames: List([]),
    dbNames: List([]),
    tableNames: List([]),
    fileSelected: false,
    filetype: '',
    filename: '',
    dbValid: false,
    tableValid: false,
  };

  constructor(props)
  {
    super(props);

    this._subscribe(FileImportStore, {
      stateKey: 'fileImportState',
    });

    this._subscribe(SchemaStore, {
      updater: (schemaState: SchemaTypes.SchemaState) =>
      {
        this.setState({
          servers: schemaState.servers,
          dbs: schemaState.databases,
          tables: schemaState.tables,
          serverNames: schemaState.servers.keySeq().toList(),
        });
      },
    });
  }

  public setError(err: string)
  {
    Actions.setErrorMsg(err);
  }

  public incrementStep()
  {
    const { filetype, stepId } = this.state;
    // TODO: convert stepIds to enums
    this.setState({
      stepId: filetype === 'json' && stepId === 0 ? stepId + 2 : stepId + 1, // skip choose csv header step
    });
  }

  public decrementStep()
  {
    const { filetype, stepId } = this.state;
    this.setState({
      stepId: filetype === 'json' && stepId === 2 ? stepId - 2 : stepId - 1,
    });
  }

  public handleServerChange(serverIndex: number)
  {
    const { servers, serverNames } = this.state;
    const serverName = serverNames.get(serverIndex);
    this.setState({
      serverIndex,
      dbNames: List(servers.get(serverName).databaseIds.map((db) =>
        db.split('/').pop(),
      )),
    });

    Actions.changeServer(this.state.servers.get(serverName).connectionId, serverName);
    this.incrementStep();
  }

  public handleAutocompleteDbChange(dbName: string)
  {
    const { dbs } = this.state;
    const { serverName } = this.state.fileImportState;
    this.setState({
      tableNames: dbName && dbs.get(databaseId(serverName, dbName)) ?
        List(dbs.get(databaseId(serverName, dbName)).tableIds.map((table) =>
          table.split('.').pop(),
        ))
        :
        List([]),
    });

    Actions.changeDbName(dbName);
    this.setState({
      dbValid: !isValidIndexName(dbName),
    });
  }

  public handleAutocompleteTableChange(tableName: string)
  {
    const { tables } = this.state;
    const { serverName, dbName } = this.state.fileImportState;
    this.setState({
      columnOptionNames: tableName && tables.get(tableId(serverName, dbName, tableName)) ?
        List(tables.get(tableId(serverName, dbName, tableName)).columnIds.map((column) =>
          column.split('.').pop(),
        ))
        :
        List([]),
    });

    Actions.changeTableName(tableName);
    this.setState({
      tableValid: !isValidTypeName(tableName),
    });
  }

  public parseJson(file: string): object[]
  {
    const items: object[] = parseJSONSubset(file, FileImportTypes.NUMBER_PREVIEW_ROWS);
    if (!Array.isArray(items))
    {
      Actions.setErrorMsg('Input JSON file must parse to an array of objects.');
      return undefined;
    }
    return items;
  }

  public parseCsv(file: string, hasCsvHeader: boolean): object[]
  {
    if (hasCsvHeader)
    {
      const testDuplicateConfig: ParseCSVConfig = {
        preview: 1,
        hasHeaderRow: false,
      };

      const columnHeaders = parseCSV(file, testDuplicateConfig);
      if (columnHeaders === undefined)
      {
        return undefined;
      }
      const colHeaderSet = new Set();
      const duplicateHeaderSet = new Set();
      _.map(columnHeaders[0], (colHeader) =>
      {
        if (colHeaderSet.has(colHeader))
        {
          duplicateHeaderSet.add(colHeader);
        }
        else
        {
          colHeaderSet.add(colHeader);
        }
      });
      if (duplicateHeaderSet.size > 0)
      {
        alert('duplicate column names not allowed: ' + JSON.stringify(Array.from(duplicateHeaderSet)));
        return undefined;
      }
    }
    const config: ParseCSVConfig = {
      preview: FileImportTypes.NUMBER_PREVIEW_ROWS,
      hasHeaderRow: hasCsvHeader,
    };
    return parseCSV(file, config);
  }

  public parseFile(file: File, filetype: string, hasCsvHeader: boolean)
  {
    const fileToRead: Blob = file.slice(0, PREVIEW_CHUNK_SIZE);
    const fr = new FileReader();
    fr.readAsText(fileToRead);
    fr.onloadend = () =>
    {
      // assume preview fits in one chunk
      let items;
      switch (filetype)
      {
        case 'json':
          items = this.parseJson(fr.result);
          break;
        case 'csv':
          items = this.parseCsv(fr.result, hasCsvHeader);
          break;
        default:
      }
      if (items === undefined)
      {
        this.setState({
          filename: '',
        });
        return;
      }

      const previewRows = items.map((item) =>
        _.map(item, (value, key) =>
          typeof value === 'string' ? value : JSON.stringify(value), // JSON infers types
        ),
      );
      const columnNames = _.map(items[0], (value, index) =>
        filetype === 'csv' && !hasCsvHeader ? 'column ' + String(index) : index, // csv's with no header row will be named 'column 0, column 1...'
      );

      Actions.chooseFile(filetype, List<List<string>>(previewRows), List<string>(columnNames));
      this.setState({
        fileSelected: true,
      });
      this.incrementStep();
    };
  }

  public handleSelectFile(file)
  {
    const fileSelected = !!file.target.files[0];
    if (!fileSelected)
    {
      return;
    }
    this.setState({
      fileSelected: false,
    });

    const filetype: string = file.target.files[0].name.split('.').pop();
    if (FileImportTypes.FILE_TYPES.indexOf(filetype) === -1)
    {
      alert('Invalid filetype: ' + String(filetype));
      return;
    }
    this.setState({
      filename: file.target.files[0].name,
      filetype,
    });
    Actions.saveFile(file.target.files[0], filetype);

    // if (filetype === 'csv')
    // {
    //   this.setState({
    //     showCsvHeaderOption: true,
    //   });
    // }
    // else
    // {
    //   this.parseFile(file.target.files[0], filetype, null);
    // }

    this.parseFile(file.target.files[0], filetype, false);
  }

  public handleSelectFileButtonClick()
  {
    this.refs['file']['value'] = null; // prevent file-caching
    this.refs['file']['click']();
  }

  public handleCsvHeaderChoice(hasCsvHeader: boolean)
  {
    Actions.changeHasCsvHeader(hasCsvHeader);
    const { file, filetype } = this.state.fileImportState;
    this.parseFile(file, filetype, hasCsvHeader); // TODO: what happens on error?
  }

  public handleSelectDb(dbName: string)
  {
    const msg = isValidIndexName(dbName);
    if (msg)
    {
      Actions.setErrorMsg(msg);
      return;
    }
    this.incrementStep();
  }

  public handleSelectTable(tableName: string)
  {
    const msg = isValidTypeName(tableName);
    if (msg)
    {
      Actions.setErrorMsg(msg);
      return;
    }
    this.incrementStep();
  }

  public renderSteps()
  {
    return (
      <div className='fi-step'>
        <div className='fi-step-name'>
          {
            FileImportTypes.STEP_NAMES[this.state.stepId]
          }
        </div>
        {
          this.state.stepId > 0 &&
          <div className='fi-step-title'>
            {
              FileImportTypes.STEP_TITLES[this.state.stepId]
            }
          </div>
        }
      </div>
    );
  }

  public renderContent()
  {
    const { fileImportState } = this.state;
    const { serverId, dbName, tableName } = fileImportState;
    const { previewRows, columnNames, columnsToInclude, columnTypes, primaryKeys, primaryKeyDelimiter } = fileImportState;
    const { templates, transforms, uploadInProgress, elasticUpdate } = fileImportState;

    let content;
    switch (this.state.stepId)
    {
      case 0:
        content = this.renderSelect();
        break;
      case 1:
        content = this.renderCsv();
        break;
      case 2:
        content =
          <Dropdown
            selectedIndex={serverId !== -1 ? this.state.serverIndex : -1}
            options={this.state.serverNames}
            onChange={this.handleServerChange}
            canEdit={true}
          />;
        break;
      case 3:
        content = [];
        content.push(
          <Autocomplete
            value={dbName}
            options={this.state.dbNames}
            onChange={this.handleAutocompleteDbChange}
            placeholder={'database'}
            disabled={false}
            onEnter={this._fn(this.handleSelectDb)}
            onSelectOption={this._fn(this.handleSelectDb)}
            key={'fi-content-autocomplete-db'}
          />,
          <div
            className='fi-content-subtext'
            key={'fi-content-subtext-db'}
          >
            <span
              className='fi-content-subtext-text'
              style={{ text: Colors().text2 }}
            >
              {
                FileImportTypes.STEP_SUBTEXT.DATABASE_SUBTEXT
              }
            </span>
          </div>,
        );
        break;
      case 4:
        content = [];
        content.push(
          <Autocomplete
            value={tableName}
            options={this.state.tableNames}
            onChange={this.handleAutocompleteTableChange}
            placeholder={'table'}
            disabled={false}
            onEnter={this._fn(this.handleSelectTable)}
            onSelectOption={this._fn(this.handleSelectTable)}
            key={'fi-content-autocomplete-table'}
          />,
          <div
            className='fi-content-subtext'
            key={'fi-content-subtext-table'}
          >
            <span
              className='fi-content-subtext-text'
              style={{ text: Colors().text2 }}
            >
              {
                FileImportTypes.STEP_SUBTEXT.TABLE_SUBTEXT
              }
            </span>
          </div>,
        );
        break;
      case 5:
        content =
          <FileImportPreview
            previewRows={previewRows}
            primaryKeys={primaryKeys}
            primaryKeyDelimiter={primaryKeyDelimiter}
            columnNames={columnNames}
            columnsToInclude={columnsToInclude}
            columnTypes={columnTypes}
            templates={templates}
            transforms={transforms}
            columnOptions={this.state.columnOptionNames}
            uploadInProgress={uploadInProgress}
            elasticUpdate={elasticUpdate}
            exporting={false}
          />;
        break;
      default:
    }

    return (
      <div
        className='fi-content'
        style={this.state.stepId === 0 ? backgroundColor(Colors().bg1) : backgroundColor(Colors().bg3)}
      >
        {
          content
        }
      </div>
    );
  }

  public renderSelect()
  {
    return (
      <div>
        <div
          className='flex-container fi-content-choose'
        >
          <input ref='file' type='file' name='abc' onChange={this.handleSelectFile} />
          <div
            className='fi-content-choose-button'
            onClick={this.handleSelectFileButtonClick}
            style={buttonColors()}
            ref='fi-content-choose-button'
          >
            Choose File
          </div>
        </div>
      </div>
    );
  }

  public renderCsv()
  {
    const { previewRows } = this.state.fileImportState;
    return (
      <div
        className='fi-content-csv'
      >
        <div
          className='fi-content-csv-wrapper'
        >
          <div
            className='fi-content-csv-option button'
            onClick={() => this.handleCsvHeaderChoice(true)}
            style={buttonColors()}
            ref='fi-yes-button'
          >
            Yes
          </div>
          <div
            className='fi-content-csv-option button'
            onClick={() => this.handleCsvHeaderChoice(false)}
            style={buttonColors()}
            ref='fi-no-button'
          >
            No
          </div>
        </div>
        <div
          className='fi-content-rows-container'
        >
          {
            previewRows.map((items, key) =>
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

  public renderNav()
  {
    const { stepId, fileSelected, dbValid, tableValid } = this.state;
    const { serverName, errorMsg } = this.state.fileImportState;
    let nextEnabled = false;
    switch (stepId)
    {
      case 0:
        nextEnabled = fileSelected;
        break;
      case 1:
        nextEnabled = false;
        break;
      case 2:
        nextEnabled = !!serverName;
        break;
      case 3:
        nextEnabled = dbValid;
        break;
      case 4:
        nextEnabled = tableValid;
        break;
      default:
    }

    return (
      <div
        className='flex-container fi-nav'
      >
        {
          stepId > 0 &&
          <div
            className='fi-back-button'
            onClick={this.decrementStep}
            style={buttonColors()}
            ref='fi-back-button'
          >
            Back
          </div>
        }
        {
          stepId > 1 && stepId < 5 &&
          <div
            className='fi-next-button'
            onClick={nextEnabled ? this.incrementStep : this._fn(this.setError, errorMsg)}
            style={nextEnabled ?
              buttonColors()
              :
              {
                background: Colors().bg3,
                text: Colors().text3,
              }
            }
            ref='fi-next-button'
          >
            Next
          </div>
        }
      </div>
    );
  }

  public renderError()
  {
    const { errorMsg } = this.state.fileImportState;
    return (
      <Modal
        open={!!errorMsg}
        message={errorMsg}
        error={true}
        onClose={this._fn(this.setError, '')}
      />
    );
  }

  public render()
  {
    return (
      <div
        className='file-import'
      >
        <div
          className='file-import-inner'
        >
          {this.renderError()}
          {this.renderSteps()}
          {this.renderContent()}
          {this.renderNav()}
        </div>
      </div>
    );
  }
}

// ReactRouter does not like the output of DragDropContext, hence the `any` cast
const ExportFileImport = DragDropContext(HTML5Backend)(FileImport) as any;

export default ExportFileImport;
