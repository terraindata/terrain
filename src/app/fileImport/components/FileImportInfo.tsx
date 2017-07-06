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
import * as Immutable from 'immutable';
import * as React from 'react';
import * as Papa from 'papaparse';
import PureClasss from './../../common/components/PureClasss';
import Dropdown from './../../common/components/Dropdown';
import CheckBox from './../../common/components/CheckBox';
import Actions from './../data/FileImportActions';
import SchemaTypes from '../../schema/SchemaTypes';
import Autocomplete from './../../common/components/Autocomplete';
import Util from './../../util/Util';
import { dbTableErrorCheck } from "../../../../shared/fileImport/Util";
const { List } = Immutable;

export interface Props
{
  canSelectServer: boolean;
  servers: SchemaTypes.ServerMap;

  canSelectDb: boolean;
  dbs: List<string>;
  dbText: string;

  canSelectTable: boolean;
  tables: List<string>;
  tableText: string;

  canImport: boolean;
  validFiletypes: List<string>;
  previewRowsCount: number;
  hasCsvHeader: boolean;
}

class FileImportInfo extends PureClasss<Props>
{
  public state: {
    serverIndex: number,
    serverSelected: boolean;
    dbSelected: boolean;
    tableSelected: boolean;
    fileSelected: boolean;
  } = {
    serverIndex: -1,
    serverSelected: false,
    dbSelected: false,
    tableSelected: false,
    fileSelected: false,
  };

  public handleServerChange(serverIndex: number)
  {
    this.setState({
      serverIndex,
      serverSelected: true,
    });
    const serverName = this.props.servers.keySeq().toList().get(serverIndex);
    Actions.changeServer(this.props.servers.get(serverName).connectionId, serverName);
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

  public handleCsvHeaderChange()
  {
    Actions.changeHasCsvHeader();
  }

  public parseData(file: string, filetype: string): object[]
  {
    // TODO: read JSON line by line and return items
    let items = [];

    if (filetype === 'json')
    {
      items = JSON.parse(file);
      if (!Array.isArray(items))
      {
        alert('Input JSON file must parse to an array of objects.');
        this.refs['file']['value'] = null;
        return;
      }
      console.log("Parsed json: ", items);

      // if (items.length > 0)
      // {
      //   const desiredHash: string = hashObject(getEmptyObject(items[0]));
      //   for (const obj of items)
      //   {
      //     if (hashObject(getEmptyObject(obj)) !== desiredHash)
      //     {
      //       alert('Objects in provided input JSON do not have the same keys and/or types.');
      //       return;
      //     }
      //   }
      // }
    }
    else if (filetype === 'csv')
    {
      const config = {
        header: this.props.hasCsvHeader,
        preview: this.props.previewRowsCount,
        error: (err) =>
        {
          alert('CSV format incorrect: ' + String(err));
          this.refs['file']['value'] = null;
          return;
        },
        skipEmptyLines: true,
      }
      items = Papa.parse(file, config).data;
      console.log("Parsed csv: ", items);

      for (let i = 1; i < items.length; i++)
      {
        if (items[i].length !== items[0].length)
        {
          alert('CSV format incorrect: each row must have same number of fields');
          this.refs['file']['value'] = null;
          return;
        }
      }
    }

    items.splice(this.props.previewRowsCount, items.length - this.props.previewRowsCount);
    return items;
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
    if (this.props.validFiletypes.indexOf(filetype) === -1)
    {
      alert("Invalid filetype: " + filetype + ", please select another file");
      this.refs['file']['value'] = null;
      return;
    }

    const fr = new FileReader();
    fr.readAsText(file.target.files[0]);
    fr.onloadend = () =>
    {
      console.log("File chosen contents: ", fr.result);
      const preview = this.parseData(fr.result, filetype);

      Actions.chooseFile(fr.result, filetype, preview);
      this.refs['file']['value'] = null;
    }
  }

  public handleUploadFile()
  {
    if (!this.props.canImport)
    {
      alert('You do not have permission to upload files');
      return;
    }
    if (!this.state.fileSelected)
    {
      alert('Please select a file to upload');
      return;
    }
    if (!this.state.serverSelected)
    {
      alert('Please select a server');
      return;
    }
    if (!this.state.dbSelected)
    {
      alert('Please select a database');
      return;
    }
    if (!this.state.tableSelected)
    {
      alert('Please select a table');
      return;
    }

    const msg = dbTableErrorCheck(this.props.dbText, this.props.tableText);
    if (msg)
    {
      alert(msg);
      return;
    }

    Actions.uploadFile();
  }

  public render()
  {
    const { canSelectServer, canSelectDb, canSelectTable } = this.props;

    return (
      <div>
        <div>
          <input ref="file" type="file" name="abc" onChange={this.handleChooseFile} />
          has header row (csv only)
          <CheckBox
            checked={this.props.hasCsvHeader}
            onChange={this.handleCsvHeaderChange}
          />
        </div>
        <div>
          <h3>Server</h3>
        </div>
        <div>
          <Dropdown
            selectedIndex={this.state.serverIndex}
            options={this.props.servers ? this.props.servers.keySeq().toList() : List<string>()}
            onChange={this.handleServerChange}
            canEdit={canSelectServer}
          />
        </div>
        <div>
          <h3>Database</h3>
        </div>
        <div>
          <Autocomplete
            value={this.props.dbText}
            options={this.props.dbs || List([])}
            onChange={this.handleAutocompleteDbChange}
            placeholder={'database'}
            disabled={!canSelectDb}
          />
        </div>
        <div>
          <h3>Table</h3>
        </div>
        <div>
          <Autocomplete
            value={this.props.tableText}
            options={this.props.tables || List([])}
            onChange={this.handleAutocompleteTableChange}
            placeholder={'table'}
            disabled={!canSelectTable}
          />
        </div>
        <button onClick={this.handleUploadFile}>
          Import
        </button>
      </div>
    );
  }
}

export default FileImportInfo;
