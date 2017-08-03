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

// tslint:disable:strict-boolean-expressions

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
import Actions from './../data/FileImportActions';
import * as FileImportTypes from './../FileImportTypes';
import './TransformBox.less';
const { List } = Immutable;

export interface Props
{
  datatype: string;
  colName: string;
  columnNames: List<string>;
  setLocalColumnName(columnName: string);
}

@Radium
class TransformBox extends TerrainComponent<Props>
{
  public state: {
    transformTypeIndex: number;
    mergeIndex: number;
    transformText: string;
    splitNames: List<string>;
    mergeName: string;
    mergeNewName: string;
    duplicateNewName: string;
  } = {
    transformTypeIndex: -1,
    mergeIndex: -1,
    transformText: '',
    splitNames: List(['', '']),
    mergeName: '',
    mergeNewName: '',
    duplicateNewName: '',
  };

  public handleDuplicateNewNameChange(duplicateNewName: string)
  {
    this.setState({
      duplicateNewName,
    });
  }

  public handleAutocompleteTransformTextChange(transformText: string)
  {
    this.setState({
      transformText,
    });
  }

  public handleTransformTypeChange(transformTypeIndex: number)
  {
    this.setState({
      transformTypeIndex,
      mergeIndex: -1,
      transformText: '',
      splitNames: List(['', '']),
      mergeName: '',
      mergeNewName: '',
      duplicateNewName: '',
    });
  }

  public handleSplitNameAChange(splitNameA: string)
  {
    this.setState({
      splitNames: this.state.splitNames.set(0, splitNameA),
    });
  }

  public handleSplitNameBChange(splitNameB: string)
  {
    this.setState({
      splitNames: this.state.splitNames.set(1, splitNameB),
    });
  }

  public handleMergeIndexChange(mergeIndex: number)
  {
    const mergeName = this.props.columnNames.delete(this.props.columnNames.indexOf(this.props.colName)).get(mergeIndex);
    this.setState({
      mergeIndex,
      mergeName,
    });
  }

  public handleMergeNewNameChange(mergeNewName: string)
  {
    this.setState({
      mergeNewName,
    });
  }

  public transformErrorCheck(transformName: string)
  {
    if (!transformName)
    {
      return 'Select a transformation';
    }
    if (transformName === 'duplicate' && !this.state.duplicateNewName)
    {
      return 'Enter duplicate column name';
    }
    if (transformName === 'append' && !this.state.transformText)
    {
      return 'Enter text to append';
    }
    if (transformName === 'prepend' && !this.state.transformText)
    {
      return 'Enter text to prepend';
    }
    if (transformName === 'split')
    {
      if (!this.state.transformText)
      {
        return 'Enter split text';
      }
      if (!this.state.splitNames.get(0))
      {
        return 'Enter new column 1 name';
      }
      if (!this.state.splitNames.get(1))
      {
        return 'Enter new column 2 name';
      }
    }
    if (transformName === 'merge')
    {
      if (!this.state.mergeName)
      {
        return 'Select column to merge';
      }
      if (!this.state.mergeNewName)
      {
        return 'Enter new column name';
      }
    }
    return '';
  }

  public setTransform(transformName: string)
  {
    const transform: FileImportTypes.Transform = {
      name: transformName,
      colName: this.props.colName,
      args: {},
    };

    switch (transformName)
    {
      case 'duplicate':
        transform.args = {
          newName: this.state.duplicateNewName,
        };
        break;

      case 'append':
        transform.args = {
          text: this.state.transformText,
        };
        break;

      case 'prepend':
        transform.args = {
          text: this.state.transformText,
        };
        break;

      case 'split':
        transform.args = {
          newName: this.state.splitNames.toArray(),
          text: this.state.transformText,
        };
        this.props.setLocalColumnName(this.state.splitNames.toArray()[0]);
        break;

      case 'merge':
        transform.args = {
          mergeName: this.state.mergeName,
          newName: this.state.mergeNewName,
          text: this.state.transformText,
        };
        this.props.setLocalColumnName(this.state.mergeNewName);
        break;
      default:
    }
    return transform;
  }

  public handleTransformClick()
  {
    const datatype = FileImportTypes.ELASTIC_TYPES.indexOf(this.props.datatype);
    const transformName = FileImportTypes.TRANSFORM_TYPES[datatype][this.state.transformTypeIndex];
    const msg = this.transformErrorCheck(transformName);
    if (msg)
    {
      alert(msg);
      return;
    }

    const transform = this.setTransform(transformName);
    Actions.updatePreviewRows(transform);
    Actions.addTransform(transform);

    this.setState({
      transformTypeIndex: -1,
      mergeIndex: -1,
      transformText: '',
      splitNames: List(['', '']),
      mergeName: '',
      mergeNewName: '',
      duplicateNewName: '',
    });
  }

  public renderText(transformType: string)
  {
    switch (transformType)
    {
      case 'duplicate':
        return (
          <div>
            <Autocomplete
              value={this.state.duplicateNewName}
              options={null}
              onChange={this.handleDuplicateNewNameChange}
              placeholder={'duplicate column name'}
              disabled={false}
            />
          </div>
        );
      case 'append':
        return (
          <div>
            <Autocomplete
              value={this.state.transformText}
              options={null}
              onChange={this.handleAutocompleteTransformTextChange}
              placeholder={'text'}
              disabled={false}
            />
          </div>
        );
      case 'prepend':
        return (
          <div>
            <Autocomplete
              value={this.state.transformText}
              options={null}
              onChange={this.handleAutocompleteTransformTextChange}
              placeholder={'text'}
              disabled={false}
            />
          </div>
        );
      case 'split':
        return (
          <div>
            <Autocomplete
              value={this.state.splitNames.get(0)}
              options={null}
              onChange={this.handleSplitNameAChange}
              placeholder={'new column 1'}
              disabled={false}
            />
            <Autocomplete
              value={this.state.splitNames.get(1)}
              options={null}
              onChange={this.handleSplitNameBChange}
              placeholder={'new column 2'}
              disabled={false}
            />
            <Autocomplete
              value={this.state.transformText}
              options={null}
              onChange={this.handleAutocompleteTransformTextChange}
              placeholder={'text'}
              disabled={false}
            />
          </div>
        );
      case 'merge':
        return (
          <div>
            {
              this.state.mergeIndex === -1 &&
              <p>column to merge</p>
            }
            <Dropdown
              selectedIndex={this.state.mergeIndex}
              options={this.props.columnNames.delete(this.props.columnNames.indexOf(this.props.colName))}
              onChange={this.handleMergeIndexChange}
              canEdit={true}
            />
            <Autocomplete
              value={this.state.mergeNewName}
              options={null}
              onChange={this.handleMergeNewNameChange}
              placeholder={'new column name'}
              disabled={false}
            />
            <Autocomplete
              value={this.state.transformText}
              options={null}
              onChange={this.handleAutocompleteTransformTextChange}
              placeholder={'text'}
              disabled={false}
            />
          </div>
        );
      default:
    }
  }

  public renderDefault(transformType: string)
  {
    if (transformType === 'duplicate')
    {
      return (
        <div>
          <Autocomplete
            value={this.state.duplicateNewName}
            options={null}
            onChange={this.handleDuplicateNewNameChange}
            placeholder={'duplicate column name'}
            disabled={false}
          />
        </div>
      );
    }
  }

  public renderTransform()
  {
    const datatype = FileImportTypes.ELASTIC_TYPES.indexOf(this.props.datatype);
    switch (this.props.datatype)
    {
      case 'text':            // currently only strings have transform operations besides duplicate
        return this.renderText(FileImportTypes.TRANSFORM_TYPES[datatype][this.state.transformTypeIndex]);
      default:
        return this.renderDefault(FileImportTypes.TRANSFORM_TYPES[datatype][this.state.transformTypeIndex]);
    }
  }

  public render()
  {
    const datatype = FileImportTypes.ELASTIC_TYPES.indexOf(this.props.datatype);
    return (
      <div
        className='fi-transform-box'
        style={backgroundColor(Colors().fileimport.preview.column.transform)}
      >
        <Dropdown
          selectedIndex={this.state.transformTypeIndex}
          options={List(FileImportTypes.TRANSFORM_TYPES[datatype])}
          onChange={this.handleTransformTypeChange}
          canEdit={true}
        />
        {this.renderTransform()}
        <div
          className='fi-transform-button'
          onClick={this.handleTransformClick}
        >
          Transform
        </div>
      </div>
    );
  }
}

export default TransformBox;