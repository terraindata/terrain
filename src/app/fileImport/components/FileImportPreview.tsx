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
import * as classNames from 'classnames';
import * as $ from 'jquery';
import * as Immutable from 'immutable';
import * as React from 'react';
import * as FileImportTypes from './../FileImportTypes';
import * as _ from 'underscore';
import Util from '../../util/Util';
import TerrainComponent from './../../common/components/TerrainComponent';
import FileImportPreviewColumn from './FileImportPreviewColumn';
import FileImportPreviewRow from './FileImportPreviewRow';
import Actions from './../data/FileImportActions';

import './FileImportPreview.less';
const { List } = Immutable;

export interface Props
{
  previewRows: List<List<string>>;
  columnsCount: number;
  primaryKey: number;
  oldNames: List<string>;

  columnsToInclude: List<boolean>;
  columnNames: List<string>;
  columnTypes: List<object>;
  columnOptions: List<string>;
}

class FileImportPreview extends TerrainComponent<Props>
{
  public state: {
    oldName: string,
    newName: string,
  } = {
    oldName: '',
    newName: '',
  };

  /* To prevent redundancy of renames in list of transforms, save the current rename transform and only add to list
   * when changing transform columns or types */
  public handleRenameTransform(oldName: string, newName: string)
  {
    if (this.state.oldName && this.state.oldName !== oldName)
    {
      Actions.addTransform({
        name: 'rename',
        args: {
          oldName,
          newName,
        },
      });
    }
    console.log('setting rename transform: ', oldName + ' to ' + newName);
    this.setRenameTransform(oldName, newName);
  }

  public addRenameTransform()
  {
    if (this.state.oldName)
    {
      console.log('adding rename transform: ', this.state.oldName + ', ' + this.state.newName);
      Actions.addTransform({
        name: 'rename',
        args: {
          oldName: this.state.oldName,
          newName: this.state.newName,
        },
      });
      this.setRenameTransform('', '');
    }
  }

  public setRenameTransform(oldName: string, newName: string)
  {
    this.setState({
      oldName,
      newName,
    });
  }

  public handleUploadFile()
  {
    // TODO: database and table name error checking
    this.addRenameTransform();
    Actions.uploadFile();
  }

  // TODO: implement Templates
  public handleLoadTemplate()
  {
  }

  public handleSaveTemplate()
  {
  }

  public render()
  {
    return (
      <div>
        <button onClick={this.handleLoadTemplate}>
          Load Template
        </button>
        <button onClick={this.handleSaveTemplate}>
          Save as Template
        </button>
        <table>
          <thead>
            <tr>
              {
                this.props.columnNames.map((value, key) =>
                  <FileImportPreviewColumn
                    key={key}
                    columnId={key}
                    isIncluded={this.props.columnsToInclude.get(key)}
                    columnType={this.props.columnTypes.get(key)}
                    isPrimaryKey={this.props.primaryKey === key}
                    columnNames={this.props.columnNames}
                    datatypes={List(FileImportTypes.ELASTIC_TYPES)}
                    handleRenameTransform={this.handleRenameTransform}
                    addRenameTransform={this.addRenameTransform}
                    columnOptions={this.props.columnOptions}
                  />
                ).toArray()
              }
            </tr>
          </thead>
          <tbody>
            {
              this.props.previewRows.map((items, key) =>
                <FileImportPreviewRow
                  key={key}
                  items={items}
                />
              )
            }
          </tbody>
        </table>
        <button onClick={this.handleUploadFile}>
          Import
        </button>
      </div>
    );
  }
}

export default FileImportPreview;
