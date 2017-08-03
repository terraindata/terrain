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
import * as Papa from 'papaparse';
import * as Radium from 'radium';
import * as React from 'react';
import { DragDropContext } from 'react-dnd';
import * as _ from 'underscore';
import { server } from '../../../../midway/src/Midway';
import { backgroundColor, buttonColors, Colors, fontColor, link } from '../../common/Colors';
import { isValidIndexName, isValidTypeName, parseJSONSubset } from './../../../../shared/fileImport/Util';
import Autocomplete from './../../common/components/Autocomplete';
import CheckBox from './../../common/components/CheckBox';
import Dropdown from './../../common/components/Dropdown';
import TerrainComponent from './../../common/components/TerrainComponent';
import SchemaStore from './../../schema/data/SchemaStore';
import { databaseId, tableId } from './../../schema/SchemaTypes';
import * as SchemaTypes from './../../schema/SchemaTypes';
import Actions from './../data/FileImportActions';
import FileImportStore from './../data/FileImportStore';
import * as FileImportTypes from './../FileImportTypes';
import './FileImport.less';
import FileImportPreview from './FileImportPreview';
const HTML5Backend = require('react-dnd-html5-backend');
const { List } = Immutable;

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
    csvHeaderMissing: boolean;

    servers?: SchemaTypes.ServerMap;
    serverNames: List<string>;
    serverIndex: number;
    serverSelected: boolean;

    dbs?: SchemaTypes.DatabaseMap;
    dbNames: List<string>;
    dbSelected: boolean;

    tables?: SchemaTypes.TableMap;
    tableNames: List<string>;
    tableSelected: boolean;

    fileSelected: boolean;
    filetype: string,
    filename: string,
  } = {
    fileImportState: FileImportStore.getState(),
    columnOptionNames: List([]),
    stepId: 0,
    csvHeaderMissing: false,

    serverIndex: -1,
    serverNames: List([]),
    serverSelected: false,

    dbNames: List([]),
    dbSelected: false,

    tableNames: List([]),
    tableSelected: false,

    fileSelected: false,
    filetype: '',
    filename: '',
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

  public handleNextStepChange()
  {
    switch (this.state.stepId)
    {
      case 0:
        if (!this.state.fileSelected)
        {
          alert('Please select a file');
          return;
        }
        const { file, streaming } = this.state.fileImportState;
        const fileToRead = streaming ? file.slice(0, FileImportTypes.CHUNK_SIZE) : file;
        const fr = new FileReader();
        fr.readAsText(fileToRead);
        fr.onloadend = () =>
        {
          let stringifiedFile = streaming ? fr.result.substring(0, fr.result.lastIndexOf('\n')) : fr.result;

          let items;
          switch (this.state.filetype)
          {
            case 'json':
              items = this.parseJson(stringifiedFile);
              break;
            case 'csv':
              items = this.parseCsv(stringifiedFile);
              if (!this.state.csvHeaderMissing) // remove first line if csv has header
              {
                stringifiedFile = stringifiedFile.slice(Number(stringifiedFile.indexOf('\n')) + 1, stringifiedFile.length);
                Actions.enqueueChunk(fr.result.slice(Number(fr.result.indexOf('\n')) + 1, fr.result.length), 0, file.size <= FileImportTypes.CHUNK_SIZE);
              }
              else
              {
                Actions.enqueueChunk(fr.result, 0, file.size <= FileImportTypes.CHUNK_SIZE);
              }
              break;
            default:
          }
          if (items.length === 0)
          {
            return;
          }
          const previewRows = items.map((item, i) =>
            _.map(item, (value, key) =>
              typeof value === 'string' ? value : JSON.stringify(value),
            ),
          );
          const columnNames = _.map(items[0], (value, i) =>
            this.state.filetype === 'csv' && this.state.csvHeaderMissing ? 'column' + String(i) : i,
          );

          Actions.chooseFile(streaming ? '' : stringifiedFile, this.state.filetype, List<List<string>>(previewRows), List<string>(columnNames));
        };
        break;
      case 1:
        if (!this.state.serverSelected)
        {
          alert('Please select a server');
          return;
        }
        break;
      case 2:
        if (!this.state.dbSelected)
        {
          alert('Please select or enter a database');
          return;
        }
        let msg = isValidIndexName(this.state.fileImportState.dbText);
        if (msg)
        {
          alert(msg);
          return;
        }
        break;
      case 3:
        if (!this.state.tableSelected)
        {
          alert('Please select or enter a table');
          return;
        }
        msg = isValidTypeName(this.state.fileImportState.tableText);
        if (msg)
        {
          alert(msg);
          return;
        }
        break;
      default:
    }
    this.setState({
      stepId: this.state.stepId + 1,
    });
  }

  public handlePrevStepChange()
  {
    this.setState({
      stepId: this.state.stepId - 1,
    });
  }

  public handleCsvHeaderChange()
  {
    this.setState({
      csvHeaderMissing: !this.state.csvHeaderMissing,
    });
  }

  public handleServerChange(serverIndex: number)
  {
    const { servers, serverNames } = this.state;
    const serverName = serverNames.get(serverIndex);
    this.setState({
      serverIndex,
      serverSelected: true,
      dbNames: List(servers.get(serverName).databaseIds.map((db) =>
        db.split('/').pop(),
      )),
    });

    Actions.changeServer(this.state.servers.get(serverName).connectionId, serverName);
  }

  public handleAutocompleteDbChange(dbText: string)
  {
    const { dbs } = this.state;
    const { serverText } = this.state.fileImportState;
    this.setState({
      dbSelected: !!dbText,
      tableNames: dbText && dbs.get(databaseId(serverText, dbText)) ?
        List(dbs.get(databaseId(serverText, dbText)).tableIds.map((table) =>
          table.split('.').pop(),
        ))
        :
        List([]),
    });

    Actions.changeDbText(dbText);
  }

  public handleAutocompleteTableChange(tableText: string)
  {
    const { tables } = this.state;
    const { serverText, dbText } = this.state.fileImportState;
    this.setState({
      tableSelected: !!tableText,
      columnOptionNames: tableText && tables.get(tableId(serverText, dbText, tableText)) ?
        List(tables.get(tableId(serverText, dbText, tableText)).columnIds.map((column) =>
          column.split('.').pop(),
        ))
        :
        List([]),
    });

    Actions.changeTableText(tableText);
  }

  public parseJson(file: string): object[]
  {
    const items = parseJSONSubset(file, FileImportTypes.NUMBER_PREVIEW_ROWS);
    if (!Array.isArray(items))
    {
      alert('Input JSON file must parse to an array of objects.');
      return [];
    }
    return items;
  }

  public parseCsv(file: string): object[]
  {
    if (!this.state.csvHeaderMissing)
    {
      const testDuplicateConfig = {
        quoteChar: '\'',
        header: false,
        preview: 1,
        skipEmptyLines: true,
      };

      const columnHeaders = Papa.parse(file, testDuplicateConfig).data;
      const colHeaderSet = new Set();
      const duplicateHeaderSet = new Set();
      columnHeaders[0].map((colHeader) =>
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
        return [];
      }
    }
    const config = {
      quoteChar: '\'',
      header: !this.state.csvHeaderMissing,
      preview: FileImportTypes.NUMBER_PREVIEW_ROWS,
      error: (err) =>
      {
        alert('CSV format incorrect: ' + String(err));
      },
      skipEmptyLines: true,
    };

    const items = Papa.parse(file, config).data;
    for (let i = 1; i < items.length; i++)
    {
      if (items[i].length !== items[0].length)
      {
        alert('CSV format incorrect: each row must have same number of fields');
        return [];
      }
    }
    return items;
  }

  /*
  public parseAndChooseFile()
  {
    const { file, streaming, csvHeaderMissing } = this.state.fileImportState;
    console.log(file);
    const fileToRead = streaming ? file.slice(0, FileImportTypes.CHUNK_SIZE) : file;
    const fr = new FileReader();
    fr.readAsText(fileToRead);
    fr.onloadend = () =>
    {
      let stringifiedFile;
      if (streaming)
      {
        Actions.enqueueChunk(fr.result, file.size <= FileImportTypes.CHUNK_SIZE);
        stringifiedFile = fr.result.substring(0, fr.result.lastIndexOf('\n'));
      }
      else
      {
        stringifiedFile = fr.result;
      }

      let items = [];
      switch (this.state.filetype)
      {
        case 'json':
          items = this.parseJson(stringifiedFile);
          break;
        case 'csv':
          items = this.parseCsv(stringifiedFile);
          if (!this.state.fileImportState.csvHeaderMissing) // remove first line if csv has header
          {
            stringifiedFile.slice(0, stringifiedFile.indexOf('\n'));
          }
          break;
        default:
      }
      if (items.length === 0)
      {
        return;
      }
      const previewRows = items.map((item, i) =>
        _.map(item, (value, key) =>
          typeof value === 'string' ? value : JSON.stringify(value),
        ),
      );
      const columnNames = _.map(items[0], (value, i) =>
        this.state.filetype === 'csv' && csvHeaderMissing ? 'column' + String(i) : i,
      );

      Actions.chooseFile(streaming ? '' : stringifiedFile, this.state.filetype, List<List<string>>(previewRows), List<string>(columnNames));
    };
  } */

  public handleSelectFile(file)
  {
    const fileSelected = !!file.target.files[0];
    if (!fileSelected)
    {
      return;
    }

    const filetype = file.target.files[0].name.split('.').pop();
    if (FileImportTypes.FILE_TYPES.indexOf(filetype) === -1)
    {
      alert('Invalid filetype: ' + String(filetype));
      return;
    }
    this.setState({
      fileSelected,
      filetype,
      filename: file.target.files[0].name,
    });
    Actions.saveFile(file.target.files[0]);
    // this.refs['file']['value'] = null;                 // prevent file-caching
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
        <div className='fi-step-title'>
          {
            FileImportTypes.STEP_TITLES[this.state.stepId]
          }
        </div>
      </div>
    );
  }

  public handleSelectFileButtonClick()
  {
    this.refs['file']['click']();
  }

  public renderContent()
  {
    const { fileImportState } = this.state;
    const { dbText, tableText, previewRows, columnNames, columnsToInclude, columnsCount, columnTypes,
      primaryKey, templates, transforms, uploadInProgress, elasticUpdate, file, chunkQueue, streaming } = fileImportState;

    let content = {};
    switch (this.state.stepId)
    {
      case 0:
        content =
          <div>
            <div
              className='flex-container fi-step-row'
            >
              <input ref='file' type='file' name='abc' onChange={this.handleSelectFile} />
              <div
                className='button'
                onClick={this.handleSelectFileButtonClick}
                style={buttonColors()}
              >
                Choose File
              </div>
              <div
                className='flex-grow fi-input-label'
              >
                {
                  this.state.filename ? this.state.filename + ' selected' : 'No file selected'
                }
              </div>
            </div>
            <div>
              <CheckBox
                checked={!this.state.csvHeaderMissing}
                onChange={this.handleCsvHeaderChange}

              />
              <span
                className='clickable'
                onClick={this.handleCsvHeaderChange}
              >
                File has header row (csv only)
              </span>
            </div>
          </div>;
        break;
      case 1:
        content =
          <Dropdown
            selectedIndex={this.state.serverIndex}
            options={this.state.serverNames}
            onChange={this.handleServerChange}
            canEdit={true}
          />;
        break;
      case 2:
        content =
          <Autocomplete
            value={dbText}
            options={this.state.dbNames}
            onChange={this.handleAutocompleteDbChange}
            placeholder={'database'}
            disabled={false}
          />;
        break;
      case 3:
        content =
          <Autocomplete
            value={tableText}
            options={this.state.tableNames}
            onChange={this.handleAutocompleteTableChange}
            placeholder={'table'}
            disabled={false}
          />;
        break;
      case 4:
        content =
          <FileImportPreview
            previewRows={previewRows}
            columnsCount={columnsCount}
            primaryKey={primaryKey}
            columnNames={columnNames}
            columnsToInclude={columnsToInclude}
            columnTypes={columnTypes}
            templates={templates}
            transforms={transforms}
            columnOptions={this.state.columnOptionNames}
            chunkQueue={chunkQueue}
            file={file}
            streaming={streaming}
            uploadInProgress={uploadInProgress}
            elasticUpdate={elasticUpdate}
          />;
        break;
      default:
    }

    return (
      <div
        className='fi-content'
        style={backgroundColor(Colors().bg3)}
      >
        {
          content
        }
      </div>
    );
  }

  public renderNav()
  {
    return (
      <div
        className='fi-nav'
      >
        {
          this.state.stepId > 0 &&
          <div
            className='fi-back-button'
            onClick={this.handlePrevStepChange}
            style={buttonColors()}
            ref='fi-back-button'
          >
            &lt; Back
          </div>
        }
        {
          this.state.stepId < 4 &&
          <div
            className='fi-next-button'
            onClick={this.handleNextStepChange}
            style={buttonColors()}
            ref='fi-next-button'
          >
            Next &gt;
          </div>
        }
      </div>
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
