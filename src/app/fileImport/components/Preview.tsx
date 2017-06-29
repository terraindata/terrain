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
import Classs from './../../common/components/Classs';
import Actions from './../data/FileImportActions';
import PreviewColumn from './PreviewColumn';
import PreviewRow from './PreviewRow';
import './Preview.less';
const { Map, List } = Immutable;

export interface Props
{
  previewRows: object[];
  columnsCount: number;
  primaryKey: string;
  columnNames: List<string>;
  columnsToInclude: List<boolean>;
  columnTypes: List<number>;
  oldNames: List<string>;
  previewTransform: any;
}

const DATATYPES = Immutable.List(['string', 'number', 'boolean', 'date']);
const TRANSFORM_TYPES = Immutable.List(['append', 'prepend', 'split', 'merge']);

class Preview extends Classs<Props>
{
  public state: {
    curRenameTransform: {
      name: string,
      args: {
        oldName?: string | string[],
        newName?: string | string[],
        colName?: string,
        text?: string,
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

  public shouldComponentUpdate(nextProps: Props)
  {
    const { previewRows, columnNames, columnsToInclude, columnTypes } = this.props;
    return previewRows !== nextProps.previewRows || columnNames !== nextProps.columnNames || columnsToInclude !== nextProps.columnsToInclude ||
      columnTypes !== nextProps.columnTypes || this.props.primaryKey !== nextProps.primaryKey || nextProps.previewTransform.name !== '';
  }

  public render()
  {
    // console.log('columnNames', this.props.columnNames);
    // console.log('columnsToInclude', this.props.columnsToInclude);
    // console.log('columnTypes', this.props.columnTypes);
    // console.log('current transform: ', this.state.curRenameTransform);
    console.log('previewTransform: ', this.props.previewTransform);

    const previewCols = [];
    this.props.columnNames.forEach((value, key) =>
    {
      previewCols.push(
        <PreviewColumn
          key={key}
          id={key}
          isIncluded={this.props.columnsToInclude.get(key)}
          name={this.props.columnNames.get(key)}
          typeIndex={this.props.columnTypes.get(key)}
          types={DATATYPES}
          canSelectType={true}
          canSelectColumn={true}
          isPrimaryKey={this.props.columnNames.get(key) === this.props.primaryKey}
          oldNames={this.props.oldNames}
          datatypes={DATATYPES}
          transformTypes={TRANSFORM_TYPES}
          handleRenameTransform={this.handleRenameTransform}
          addCurRenameTransform={this.addCurRenameTransform}
        />
      );
    });

    const previewRows = Object.keys(this.props.previewRows).map((key) =>
      <PreviewRow
        key={key}
        items={this.props.previewRows[key]}
        transformCol={this.props.previewTransform.args.colName}
        transformType={this.props.previewTransform.name}
        transformText={this.props.previewTransform.args.text}
      />
    );

    return (
      <div>
        <table>
          <thead>
            <tr>
              {previewCols}
            </tr>
          </thead>
          <tbody>
            {previewRows}
          </tbody>
        </table>
        <button onClick={this.handleUploadFile}>
          Import
        </button>
      </div>
    );
  }
}

export default Preview;
