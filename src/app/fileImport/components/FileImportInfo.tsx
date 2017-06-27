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
// import * as csv from 'csvtojson';
// import * as hashObject from 'hash-object';
const { List } = Immutable;
import Dropdown from './../../common/components/Dropdown';
import PureClasss from './../../common/components/PureClasss';
import Util from './../../util/Util';
import Actions from './../data/FileImportActions';
import Preview from "./Preview";
import SchemaTypes from '../../schema/SchemaTypes';
import Autocomplete from './../../common/components/Autocomplete';
import FileImportTypes from './../FileImportTypes';
import * as Papa from 'papaparse';

export interface Props
{
  canSelectServer: boolean;
  serverIndex: number;
  servers: SchemaTypes.ServerMap;
  serverNames: List<string>;
  serverSelected: boolean;

  canSelectDb: boolean;
  dbs: List<string>;
  dbText: string;
  dbSelected: boolean;

  canSelectTable: boolean;
  tables: List<string>;
  tableText: string;
  tableSelected: boolean;

  canImport: boolean;
  validFiletypes: List<string>;
  fileChosen: boolean;
  rowsCount: number;
}

class FileImportInfo extends PureClasss<Props>
{
  public handleServerChange(serverIndex: number)
  {
    const key = this.props.serverNames.get(serverIndex);
    Actions.changeServer(serverIndex, this.props.servers.get(key).connectionId);
  }

  public handleAutocompleteDbChange(value)
  {
    Actions.changeDbText(value);
  }

  public handleAutocompleteTableChange(value)
  {
    Actions.changeTableText(value);
  }

  public parseData(file: string, filetype: string): object[]
  {
    const preview = [];
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
        header: true,
        preview: this.props.rowsCount,
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

    for (let i = 0; i < Math.min(items.length, this.props.rowsCount); i++)
    {
      preview.push(items[i]);
    }
    return preview;
  }

  public handleChooseFile(file)
  {
    if (!file.target.files[0])
    {
      Actions.unchooseFile();
      return;
    }

    // filetype error check
    const filetype = file.target.files[0].name.split('.').pop();
    if (this.props.validFiletypes.indexOf(filetype) === -1)
    {
      alert("Invalid filetype: " + filetype + ", please select another file");
      this.refs['file']['value'] = null;
      return;
    }

    // read and show preview
    const fr = new FileReader();
    fr.readAsText(file.target.files[0]);
    fr.onloadend = () =>
    {
      console.log("File chosen contents: ", fr.result);
      const preview = this.parseData(fr.result, filetype);

      Actions.chooseFile(fr.result, filetype);
      Actions.previewFile(preview);
    }
  }

  public handleUploadFile()
  {
    if (!this.props.canImport)
    {
      alert('You do not have permission to upload files');
      return;
    }
    if (!this.props.fileChosen)
    {
      alert('Please select a file to upload');
      return;
    }
    if (!this.props.serverSelected)
    {
      alert('Please select a server');
      return;
    }
    if (!this.props.dbSelected)
    {
      alert('Please select a database');
      return;
    }
    if (!this.props.tableSelected)
    {
      alert('Please select a table');
      return;
    }
    if (this.props.dbText === '' || this.props.tableText === '')
    {
      alert('Database and table names cannot be empty strings');
      return;
    }
    if (this.props.dbText !== this.props.dbText.toLowerCase())
    {
      alert('Database may not contain uppercase letters');
      return;
    }
    if (!/^[a-z\d].*$/.test(this.props.dbText))
    {
      alert('Database name must start with a lowercase letter or digit');
      return;
    }
    if (!/^[a-z\d][a-z\d\._\+-]*$/.test(this.props.dbText))
    {
      alert('Database name may only contain lowercase letters, digits, periods, underscores, dashes, and pluses');
      return;
    }
    if (/^_.*/.test(this.props.tableText))
    {
      alert('Table name may not start with an underscore');
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
          <input ref="file" type="file" onChange={this.handleChooseFile} />
        </div>
        <div>
          <h3>Server</h3>
        </div>
        <div>
          <Dropdown
            selectedIndex={this.props.serverIndex}
            options={this.props.serverNames}
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
            options={this.props.dbs}
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
            options={this.props.tables}
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
