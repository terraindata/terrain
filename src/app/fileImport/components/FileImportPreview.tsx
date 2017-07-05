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
import * as _ from 'underscore';
import Util from '../../util/Util';
import PureClasss from './../../common/components/PureClasss';
import FileImportPreviewColumn from './FileImportPreviewColumn';
import FileImportPreviewRow from './FileImportPreviewRow';
import FileImportTypes from './../FileImportTypes';
import Actions from './../data/FileImportActions';
import './FileImportPreview.less';
const { List } = Immutable;

export interface Props
{
  previewRows: List<List<string>>;
  columnsCount: number;
  primaryKey: string;
  oldNames: List<string>;

  columnsToInclude: List<boolean>;
  columnNames: List<string>;
  columnTypes: List<number>;

  // columnsToInclude: IMMap<string, boolean>;
  // columnNames: IMMap<string, string>;
  // columnTypes: IMMap<string, number>;

  previewTransform: any;
  // curPreviewRows: List<List<string>>;
}

class FileImportPreview extends PureClasss<Props>
{
  public state: {
    curRenameTransform: {
      name: string,
      args: {
        oldName?: string | string[],
        newName?: string | string[],
      },
    }
  } = {
    curRenameTransform: {
      name: '',
      args: {
      },
    }
  };

  public handleRenameTransform(name: string, oldName: string, newName: string)
  {
    if (this.state.curRenameTransform.name && this.state.curRenameTransform.args.oldName !== oldName)
    {
      console.log('adding transform rename: ', this.state.curRenameTransform.args);
      Actions.addTransform(this.state.curRenameTransform);
    }
    console.log('setting current rename transform: ' + oldName + ', ' + newName);
    this.setState({
      curRenameTransform: {
        name,
        args: {
          oldName,
          newName,
        }
      }
    });
  }

  public addCurRenameTransform()
  {
    if (this.state.curRenameTransform.name)
    {
      console.log('adding transform rename: ', this.state.curRenameTransform.args);
      Actions.addTransform(this.state.curRenameTransform);
      this.setState({
        curRenameTransform: {
          name: '',
          args: {
          },
        }
      });
    }
  }

  public stringTransform(item: string): string
  {
    if (this.props.previewTransform.name === 'append')
    {
      return item + this.props.previewTransform.args.text;
    }
    else if (this.props.previewTransform.name === 'prepend')
    {
      return this.props.previewTransform.args.text + item;
    }
  }

  public handleUploadFile()
  {
    // TODO: error checking from FileImportInfo
    if (this.state.curRenameTransform.name)
    {
      Actions.addTransform(this.state.curRenameTransform);
    }

    // if (this.props.curRenameTransform.name)
    // Actions.addCurTransform();
    Actions.uploadFile();
  }

  // public componentWillReceiveProps(nextProps: Props)
  // {
  //   // if (nextProps.previewTransform.name)
  //   // {
  //   //   this.props.previewRows.map((row, i) =>
  //   //   {
  //   //     row.map((item, j) =>
  //   //     {
  //   //       if (this.props.columnNames.indexOf(this.props.previewTransform.args.colName) === i)
  //   //       {
  //   //         Actions.updatePreviewRows(i, j, this.stringTransform(item));
  //   //       }
  //   //     });
  //   //   });
  //   // }
  //
  //   if (nextProps.previewTransform.name !== '')
  //   {
  //     console.log('updatePreviewRows, transform: ', nextProps.previewTransform);
  //     Actions.updatePreviewRows(nextProps.previewTransform);
  //     Actions.clearPreviewTransform();
  //   }
  //
  //   // if (nextProps.previewTransform.name === 'append' || nextProps.previewTransform.name === 'prepend')
  //   // {
  //   //   Actions.updatePreviewRows(name, transformCol, text);
  //   // }
  //   // else if (nextProps.previewTransform.name === 'split')
  //   // {
  //   //   Actions.splitPreviewRows();
  //   // }
  //   // else if (nextProps.previewTransform.name === 'merge')
  //   // {
  //   //   Actions.mergePreviewRows();
  //   // }
  // }

  public render()
  {
    console.log('render previewRows: ', this.props.previewRows);
    return (
      <div>
        <table>
          <thead>
            <tr>
              {
                this.props.columnNames.map((value, key) =>
                  <FileImportPreviewColumn
                    key={key}
                    id={key}
                    isIncluded={this.props.columnsToInclude.get(key)}
                    name={this.props.columnNames.get(key)}
                    typeIndex={this.props.columnTypes.get(key)}
                    isPrimaryKey={this.props.primaryKey === value}
                    oldNames={this.props.oldNames}
                    canSelectType={true}
                    canSelectColumn={true}
                    datatypes={List(FileImportTypes.ELASTIC_TYPES)}
                    transformTypes={List(FileImportTypes.TRANSFORM_TYPES)}
                    handleRenameTransform={this.handleRenameTransform}
                    addCurRenameTransform={this.addCurRenameTransform}
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
