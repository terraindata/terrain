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

// tslint:disable:no-var-requires

import * as classNames from 'classnames';
import * as Radium from 'radium';
import * as React from 'react';
import { backgroundColor, Colors, fontColor, link } from '../../colors/Colors';
import { tooltip } from '../../common/components/tooltip/Tooltips';
import Autocomplete from './../../common/components/Autocomplete';
import CheckBox from './../../common/components/CheckBox';
import TerrainComponent from './../../common/components/TerrainComponent';
import TypeDropdown from './../components/TypeDropdown';
import Actions from './../data/FileImportActions';
import * as FileImportTypes from './../FileImportTypes';
import './FileImportPreviewColumn.less';

const KeyIcon = require('./../../../images/icon_key-1.svg');
type ColumnTypesTree = FileImportTypes.ColumnTypesTree;

export interface Props
{
  items: List<string>;
  columnId: number;
  columnName: string;
  columnNames: List<string>; // TODO: move to parent component while preserving split/merge functionality
  isIncluded: boolean;
  columnType: ColumnTypesTree;
  isPrimaryKey: boolean;
  columnOptions: List<string>;
  exporting: boolean;
  onColumnNameChange(columnId: number, localColumnName: string);
  onTransform(columnId: number);
}

@Radium
class FileImportPreviewColumn extends TerrainComponent<Props>
{
  public state: {
    localColumnName: string;
  } = {
    localColumnName: this.props.columnName,
  };

  public handleIncludedChange()
  {
    if (this.props.isIncluded && this.props.isPrimaryKey)
    {
      Actions.changePrimaryKey(this.props.columnId);
    }
    Actions.setColumnToInclude(this.props.columnId);
  }

  public handleCheckboxChange()
  {
    return;
  }

  public handlePrimaryKeyChange()
  {
    if (!this.props.isIncluded && !this.props.isPrimaryKey)
    {
      Actions.setErrorMsg('Cannot set a column not included as a primary key');
      return;
    }
    Actions.changePrimaryKey(this.props.columnId);
  }

  public handleLocalColumnNameChange(localColumnName: string)
  {
    this.setState({
      localColumnName,
    });
  }

  public handleRename()
  {
    const success: boolean = this.props.onColumnNameChange(this.props.columnId, this.state.localColumnName);
    if (!success)
    {
      this.setState({
        localColumnName: this.props.columnName,
      });
    }
  }

  public componentWillReceiveProps(nextProps: Props)
  {
    if (this.props.columnName !== nextProps.columnName)
    {
      this.setState({
        localColumnName: nextProps.columnName,
      });
    }
  }

  public renderHeader()
  {
    return (
      <div
        className='flex-container fi-preview-column-header'
        style={{
          border: this.props.isIncluded ? 'solid 1px ' + Colors().active : 'solid 1px ' + Colors().border3,
        }}
      >
        <div
          className='flex-container fi-preview-column-header-include clickable'
          onClick={this.handleIncludedChange}
        >
          <CheckBox
            checked={this.props.isIncluded}
            onChange={this.handleCheckboxChange}
          />
          <span
            className='fi-preview-column-header-include-text clickable'
            style={fontColor(this.props.isIncluded ? Colors().active : Colors().border3)}
          >
            Include
          </span>
        </div>
        {
          !this.props.exporting &&
          tooltip(
            <div
              className={classNames({
                'fi-preview-column-header-key clickable': true,
                'fi-preview-column-header-key-selected': this.props.isPrimaryKey,
              })}
              onClick={this.handlePrimaryKeyChange}
              style={backgroundColor(this.props.isPrimaryKey ? Colors().active : Colors().bg2)}
            >
              <KeyIcon />
            </div>,
            !this.props.isIncluded ?
              'Include this column to set it as a primary key'
              :
              this.props.isPrimaryKey ? 'Remove this column as a primary key' : 'Make this column a primary key',
          )
        }
      </div>
    );
  }

  public renderName()
  {
    return (
      <div
        className='flex-container fi-preview-column-field'
      >
        <div
          className='fi-preview-column-field-content'
        >
          <Autocomplete
            value={this.state.localColumnName}
            options={this.props.columnOptions}
            onChange={this.handleLocalColumnNameChange}
            placeholder={''}
            disabled={false}
            onEnter={this.handleRename}
            onSelectOption={this.handleRename}
            onBlur={this.handleRename}
          />
        </div>
      </div>
    );
  }

  public renderType()
  {
    if (!this.props.exporting)
    {
      return (
        <div
          className='flex-container fi-preview-column-field flex-grow'
        >
          <div
            className='fi-preview-column-field-content'
          >
            <TypeDropdown
              columnId={this.props.columnId}
              recursionDepth={0}
              columnType={this.props.columnType}
            />
          </div>
        </div>
      );
    }
  }

  public renderTransform()
  {
    return (
      <div
        className='flex-container fi-preview-column-field'
      >
        {
          tooltip(
            <div
              className='fi-preview-column-field-content clickable'
              onClick={this._fn(this.props.onTransform, this.props.columnId)}
              style={link()}
            >
              Transform
            </div>,
            'Use transformations to modify the data in this column before importing',
          )
        }
      </div>
    );
  }

  public render()
  {
    return (
      <div
        className={classNames({
          'fi-preview-column': true,
          'fi-preview-column-excluded': !this.props.isIncluded,
        })}
        style={fontColor(Colors().text1)}
      >
        <div
          style={backgroundColor(Colors().bg2)}
        >
          {
            this.renderHeader()
          }
          {
            this.renderName()
          }
          <div
            className='flex-container-center'
          >
            {
              this.renderType()
            }
            {
              this.renderTransform()
            }
          </div>
        </div>
        {
          this.props.items.map((item, key) =>
            <div
              key={key}
              className={classNames({
                'fi-preview-column-cell': true,
              })}
              style={[
                fontColor(Colors().text1),
                backgroundColor(Colors().bg2),
              ]}
            >
              <div
                className='fi-preview-column-cell-text'
              >
                {
                  item
                }
              </div>
            </div>,
          )
        }
      </div>
    );
  }
}

export default FileImportPreviewColumn;
