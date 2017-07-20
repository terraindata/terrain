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
import * as Immutable from 'immutable';
import * as $ from 'jquery';
import * as Radium from 'radium';
import * as React from 'react';
import * as _ from 'underscore';
import { backgroundColor, buttonColors, Colors, fontColor, link } from '../../common/Colors';
import Util from '../../util/Util';
import Autocomplete from './../../common/components/Autocomplete';
import CheckBox from './../../common/components/CheckBox';
import Dropdown from './../../common/components/Dropdown';
import TerrainComponent from './../../common/components/TerrainComponent';
import TransformBox from './../components/TransformBox';
import TypeDropdown from './../components/TypeDropdown';
import Actions from './../data/FileImportActions';
import * as FileImportTypes from './../FileImportTypes';
import './FileImportPreviewColumn.less';

export interface Props
{
  columnId: number;
  isIncluded: boolean;
  columnType: FileImportTypes.ColumnTypesTree;
  isPrimaryKey: boolean;
  columnNames: List<string>;
  columnOptions: List<string>;
  editing: boolean;
  handleEditColumnChange(editColumnId: number);
}

@Radium
class FileImportPreviewColumn extends TerrainComponent<Props>
{
  public handleEditClick()
  {
    this.props.handleEditColumnChange(this.props.columnId);
  }

  public handleIncludedChange()
  {
    Actions.setColumnToInclude(this.props.columnId);
  }

  public handlePrimaryKeyChange()
  {
    Actions.changePrimaryKey(this.props.columnId);
  }

  public handleAutocompleteHeaderChange(newColumnName: string)
  {
    Actions.setColumnName(this.props.columnId, this.props.columnNames.get(this.props.columnId), newColumnName);
  }

  public shouldComponentUpdate(nextProps: Props)
  {
    return JSON.stringify(this.props.columnType) === JSON.stringify(nextProps.columnType);
  }

  public render()
  {
    if (this.props.editing)
    {
      return (
        <div
          className='fi-preview-column'
          style={backgroundColor(Colors().fileimport.preview.column)}
        >
          include
          <CheckBox
            checked={this.props.isIncluded}
            onChange={this.handleIncludedChange}
          />
          primary key
          <CheckBox
            checked={this.props.isPrimaryKey}
            onChange={this.handlePrimaryKeyChange}
          />
          <Autocomplete
            value={this.props.columnNames.get(this.props.columnId)}
            options={this.props.columnOptions}
            onChange={this.handleAutocompleteHeaderChange}
            placeholder={''}
            disabled={false}
          />
          <TypeDropdown
            columnId={this.props.columnId}
            recursionDepth={0}
            columnType={this.props.columnType}
            editing={this.props.editing}
          />
          <TransformBox
            datatype={FileImportTypes.ELASTIC_TYPES[this.props.columnType.type]}
            colName={this.props.columnNames.get(this.props.columnId)}
            columnNames={this.props.columnNames}
          />
        </div>
      );
    }

    return (
      <div
        className='fi-preview-column'
        style={backgroundColor(Colors().fileimport.preview.column)}
      >
        <div
          className='fi-preview-column-title'
        >
          <div className='fi-preview-column-title-name'>
            {this.props.columnNames.get(this.props.columnId)}
          </div>
          <div className='fi-preview-column-title-type'>
            {FileImportTypes.ELASTIC_TYPES[this.props.columnType.type]}
          </div>
          <div
            className='fi-preview-column-edit-button'
            onClick={this.handleEditClick}
          >
            Edit
          </div>
        </div>
      </div>
    );
  }
}

export default FileImportPreviewColumn;
