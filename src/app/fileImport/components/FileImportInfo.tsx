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
import BackendInstance from './../../../../shared/backends/types/BackendInstance';
import Dropdown from './../../common/components/Dropdown';
import PureClasss from './../../common/components/PureClasss';
import UserThumbnail from './../../users/components/UserThumbnail';
import Util from './../../util/Util';
import Actions from './../data/FileImportActions';
import FileImportTypes from './../FileImportTypes';
import { FileImportState } from './../data/FileImportStore';
import Autocomplete from './../../common/components/Autocomplete';
import Preview from "./Preview";

export interface Props
{
  canSelectCluster: boolean;
  clusterIndex: number;
  clusters: List<string>;

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
  public handleClusterChange(clusterIndex: number)
  {
    Actions.changeCluster(clusterIndex);
  }

  public handleAutocompleteDbChange(event)
  {
    Actions.changeDbText(event);
  }

  public handleAutocompleteTableChange(event)
  {
    Actions.changeTableText(event);
  }

  public parseData(file: string, filetype: string): object[]
  {
    const preview = [];
    if (filetype === 'json')
    {
      const items: object[] = JSON.parse(file);
      if (!Array.isArray(items))
      {
        alert('Input JSON file must parse to an array of objects.');
        return;
      }
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
      for (let i = 0; i < Math.min(items.length, this.props.rowsCount); i++)
      {
        preview.push(items[i]);
      }
    }
    // else if (filetype === 'csv')
    // {
    //   // extract first n lines of file
    //   const newFile = extractCsv(file, this.props.rowsCount);
    //   csv({ flatKeys: true, checkColumn: true }).fromString(newFile).on('error', (e) =>
    //   {
    //     alert('CSV format incorrect: ' + String(e));
    //     return;
    //   });
    // }
    else
    {
      return;
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
      console.log("Parsed preview: ", preview);

      const previewMaps = [];
      const map = FileImportTypes._PreviewMap();

      for (let i = 0; i < preview.length; i++)
      {
        previewMaps.push(map);
      }

      Actions.chooseFile(fr.result, filetype);
      Actions.previewFile(preview, List(previewMaps));
    }
  }

  public handleUploadFile()
  {
    if (this.props.canImport && this.props.fileChosen && this.props.dbSelected && this.props.tableSelected)
    {
      Actions.uploadFile();
    }
    else
    {
      alert("Please select a file to upload, database, and table");
    }
  }

  public render()
  {
    const { canSelectCluster, canSelectDb, canSelectTable } = this.props;

    return (
      <div>
        <div>
          <input ref="file" type="file" onChange={this.handleChooseFile} />
        </div>
        <div>
          <h3>Cluster</h3>
        </div>
        <div>
          <Dropdown
            selectedIndex={this.props.clusterIndex}
            options={this.props.clusters}
            onChange={this.handleClusterChange}
            canEdit={canSelectCluster}
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
