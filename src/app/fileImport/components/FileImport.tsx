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
import * as React from 'react';
import { DragDropContext } from 'react-dnd';
import * as _ from 'underscore';
import { server } from '../../../../midway/src/Midway';
import { isValidFieldName, isValidIndexName, isValidTypeName } from './../../../../shared/fileImport/Util';
import Autocomplete from './../../common/components/Autocomplete';
import CheckBox from './../../common/components/CheckBox';
import Dropdown from './../../common/components/Dropdown';
import TerrainComponent from './../../common/components/TerrainComponent';
import SchemaStore from './../../schema/data/SchemaStore';
import * as SchemaTypes from './../../schema/SchemaTypes';
import { databaseId, tableId } from './../../schema/SchemaTypes';
import Actions from './../data/FileImportActions';
import FileImportStore from './../data/FileImportStore';
import * as FileImportTypes from './../FileImportTypes';
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

class FileImport extends TerrainComponent<any>
{
  public state: {
    fileImportState: FileImportTypes.FileImportState;
    servers?: SchemaTypes.ServerMap;
    dbs?: SchemaTypes.DatabaseMap;
    tables?: SchemaTypes.TableMap;
    stepId: number;
    serverIndex: number;
    serverSelected: boolean;
    dbSelected: boolean;
    tableSelected: boolean;
    fileSelected: boolean;
  } = {
    fileImportState: FileImportStore.getState(),
    stepId: 0,
    serverIndex: -1,
    serverSelected: false,
    dbSelected: false,
    tableSelected: false,
    fileSelected: false,
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
        });
      }
      ,
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
          alert('Please select a database');
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
          alert('Please select a table');
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
    Actions.changeHasCsvHeader();
  }

  public handleServerChange(serverIndex: number)
  {
    this.setState({
      serverIndex,
      serverSelected: true,
    });
    const serverName = this.state.servers.keySeq().toList().get(serverIndex);
    Actions.changeServer(this.state.servers.get(serverName).connectionId, serverName);
  }

  public handleAutocompleteDbChange(value)
  {
    this.setState({
      dbSelected: !!value,
    });
    Actions.changeDbText(value);
  }

  public handleAutocompleteTableChange(value)
  {
    this.setState({
      tableSelected: !!value,
    });
    Actions.changeTableText(value);
  }

  public parseAndChooseFile(file: string, filetype: string)
  {
    // TODO: read JSON line by line and return items
    let items = [];

    if (filetype === 'json')
    {
      items = JSON.parse(file);
      if (!Array.isArray(items))
      {
        alert('Input JSON file must parse to an array of objects.');
        return;
      }
    }
    else if (filetype === 'csv')
    {
      const config = {
        quoteChar: '\'',
        // header: this.props.hasCsvHeader,
        header: true,
        preview: FileImportTypes.NUMBER_PREVIEW_ROWS,
        error: (err) =>
        {
          alert('CSV format incorrect: ' + String(err));
          return;
        },
        skipEmptyLines: true,
      };
      items = Papa.parse(file, config).data;

      items.map((item) =>
      {
        if (item.length !== items[0].length)
        {
          alert('CSV format incorrect: each row must have same number of fields');
          return;
        }
      });
    }

    items.splice(FileImportTypes.NUMBER_PREVIEW_ROWS, items.length - FileImportTypes.NUMBER_PREVIEW_ROWS);
    const previewRows = items.map((item, i) =>
      _.map(item, (value, key) =>
        typeof value === 'string' ? value : JSON.stringify(value),
      ),
    );

    const columnNames = _.map(items[0], (value, index) =>
      // TODO: fix hasCsvHeader
      // filetype === 'csv' && !this.props.hasCsvHeader ? 'column' + index : index
      index,
    );

    Actions.chooseFile(file, filetype, List<List<string>>(previewRows), List<string>(columnNames));
  }

  public handleChooseFile(file)
  {
    const fileSelected = !!file.target.files[0];
    this.setState({
      fileSelected,
    });
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

    const fr = new FileReader();
    fr.readAsText(file.target.files[0]);
    fr.onloadend = () =>
    {
      this.parseAndChooseFile(fr.result, filetype);
      this.refs['file']['value'] = null;                 // prevent file-caching
    };
  }

  public render()
  {
    const { fileImportState } = this.state;
    const { serverText, dbText, tableText, previewRows, columnNames, columnsToInclude, columnsCount, columnTypes, hasCsvHeader,
      primaryKey, oldNames, templates, transforms } = fileImportState;

    let content = {};
    switch (this.state.stepId)
    {
      case 0:
        content =
          <div>
            <h3>step 1: select a file</h3>
            <input ref='file' type='file' name='abc' onChange={this.handleChooseFile} />
            has header row (csv only)
            <CheckBox
              checked={hasCsvHeader}
              onChange={this.handleCsvHeaderChange}
            />
          </div>;
        break;
      case 1:
        content =
          <div>
            <h3>step 2: select a server</h3>
            <Dropdown
              selectedIndex={this.state.serverIndex}
              options={this.state.servers ? this.state.servers.keySeq().toList() : List<string>()}
              onChange={this.handleServerChange}
              canEdit={true}
            />
          </div>;
        break;
      case 2:
        content =
          <div>
            <h3>step 3: select a database</h3>
            <Autocomplete
              value={dbText}
              options={
                this.state.servers && serverText && this.state.servers.get(serverText) ?
                  List(this.state.servers.get(serverText).databaseIds.map((value, index) =>
                    value.split('/').pop(),
                  ))
                  :
                  List([])
              }
              onChange={this.handleAutocompleteDbChange}
              placeholder={'database'}
              disabled={false}
            />
          </div>;
        break;
      case 3:
        content =
          <div>
            <h3>step 4: select a table</h3>
            <Autocomplete
              value={tableText}
              options={
                this.state.dbs && dbText && this.state.dbs.get(databaseId(serverText, dbText)) ?
                  List(this.state.dbs.get(databaseId(serverText, dbText)).tableIds.map((value, index) =>
                    value.split('.').pop(),
                  ))
                  :
                  List([])
              }
              onChange={this.handleAutocompleteTableChange}
              placeholder={'table'}
              disabled={false}
            />
          </div>;
        break;
      case 4:
        content =
          <div>
            <h3>step 5: choose and format columns</h3>
            <FileImportPreview
              previewRows={previewRows}
              columnsCount={columnsCount}
              primaryKey={primaryKey}
              columnNames={columnNames}
              columnsToInclude={columnsToInclude}
              columnTypes={columnTypes}
              oldNames={oldNames}
              templates={templates}
              transforms={transforms}
              columnOptions={
                this.state.tables && tableText && this.state.tables.get(tableId(serverText, dbText, tableText)) ?
                  List(this.state.tables.get(tableId(serverText, dbText, tableText)).columnIds.map((value, index) =>
                    value.split('.').pop(),
                  ))
                  :
                  List([])
              }
            />
          </div>;
        break;
      default:
    }

    return (
      <div>
        {content}
        {
          this.state.stepId > 0 &&
          <button onClick={this.handlePrevStepChange}>
            back
        </button>
        }
        {
          this.state.stepId < 4 &&
          <button onClick={this.handleNextStepChange}>
            next
        </button>
        }
      </div>
    );
  }
}

// ReactRouter does not like the output of DragDropContext, hence the `any` cast
const ExportFileImport = DragDropContext(HTML5Backend)(FileImport) as any;

export default ExportFileImport;
