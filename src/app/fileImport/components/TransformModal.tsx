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

import * as Immutable from 'immutable';
import * as Radium from 'radium';
import * as React from 'react';
import { backgroundColor, buttonColors, Colors } from '../../common/Colors';
import Autocomplete from './../../common/components/Autocomplete';
import CheckBox from './../../common/components/CheckBox';
import Dropdown from './../../common/components/Dropdown';
import Modal from './../../common/components/Modal';
import TerrainComponent from './../../common/components/TerrainComponent';
import Actions from './../data/FileImportActions';
import * as FileImportTypes from './../FileImportTypes';
import './TransformModal.less';
const { List } = Immutable;

type Transform = FileImportTypes.Transform;
const ELASTIC_TYPES = FileImportTypes.ELASTIC_TYPES;
const TRANSFORM_TYPES = FileImportTypes.TRANSFORM_TYPES;

export interface Props
{
  open: boolean;
  columnId: number;
  columnName: string;
  columnNames: List<string>;
  datatype: string;
  onClose: () => void;
}

@Radium
class TransformModal extends TerrainComponent<Props>
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

  public handleClose()
  {
    this.setState({
      transformTypeIndex: -1,
      mergeIndex: -1,
      transformText: '',
      splitNames: List(['', '']),
      mergeName: '',
      mergeNewName: '',
      duplicateNewName: '',
    });
    this.props.onClose();
  }

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
    const mergeName = this.props.columnNames.delete(this.props.columnId).get(mergeIndex);
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

    switch (transformName)
    {
      case 'duplicate':
        if (!this.state.duplicateNewName)
        {
          return 'Enter duplicate column name';
        }
        if (this.props.columnNames.contains(this.state.duplicateNewName))
        {
          return 'Column name: ' + this.state.duplicateNewName + ' already exists, duplicate column names are not allowed';
        }
        break;

      case 'append':
        if (!this.state.transformText)
        {
          return 'Enter text to append';
        }
        break;

      case 'prepend':
        if (!this.state.transformText)
        {
          return 'Enter text to prepend';
        }
        break;

      case 'split':
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
        if (this.state.splitNames.get(0) === this.state.splitNames.get(1))
        {
          return 'Split names cannot be identical';
        }
        if (this.props.columnNames.delete(this.props.columnId).contains(this.state.splitNames.get(0)))
        {
          return 'Column name: ' + this.state.splitNames.get(0) + ' already exists, duplicate column names are not allowed';
        }
        if (this.props.columnNames.delete(this.props.columnId).contains(this.state.splitNames.get(1)))
        {
          return 'Column name: ' + this.state.splitNames.get(1) + ' already exists, duplicate column names are not allowed';
        }
        break;

      case 'merge':
        if (this.props.columnNames.delete(this.props.columnId).delete(this.state.mergeIndex).contains(this.state.mergeNewName))
        {
          return 'Column name: ' + this.state.mergeNewName + ' already exists, duplicate column names are not allowed';
        }
        break;
      default:
    }
    return '';
  }

  public getTransform(transformName: string): Transform
  {
    let transformArgsConfig = {};
    switch (transformName)
    {
      case 'duplicate':
        transformArgsConfig = {
          newName: this.state.duplicateNewName,
        };
        break;

      case 'append':
        transformArgsConfig = {
          text: this.state.transformText,
        };
        break;

      case 'prepend':
        transformArgsConfig = {
          text: this.state.transformText,
        };
        break;

      case 'split':
        transformArgsConfig = {
          newName: this.state.splitNames.toArray(),
          text: this.state.transformText,
        };
        // this.props.setLocalColumnName(this.state.splitNames.toArray()[0]);
        break;

      case 'merge':
        transformArgsConfig = {
          mergeName: this.state.mergeName,
          newName: this.state.mergeNewName,
          text: this.state.transformText,
        };
        // this.props.setLocalColumnName(this.state.mergeNewName);
        break;
      default:
    }
    const transformConfig = {
      name: transformName,
      colName: this.props.columnName,
      args: FileImportTypes._TransformArgs(transformArgsConfig),
    };
    return FileImportTypes._Transform(transformConfig);
  }

  public handleTransform()
  {
    const datatypeId: number = ELASTIC_TYPES.indexOf(this.props.datatype);
    const transformName: string = TRANSFORM_TYPES[datatypeId][this.state.transformTypeIndex];
    const msg: string = this.transformErrorCheck(transformName);
    if (msg)
    {
      Actions.setErrorMsg(msg);
      return;
    }

    const transform: Transform = this.getTransform(transformName);
    Actions.updatePreviewRows(transform);
    Actions.addTransform(transform);
    this.props.onClose();
  }

  public renderText(transformType: string)
  {
    let components;
    switch (transformType)
    {
      case 'duplicate':
        components =
          <Autocomplete
            value={this.state.duplicateNewName}
            options={null}
            onChange={this.handleDuplicateNewNameChange}
            placeholder={'duplicate column name'}
            disabled={false}
          />;
        break;
      case 'append':
        components =
          <Autocomplete
            value={this.state.transformText}
            options={null}
            onChange={this.handleAutocompleteTransformTextChange}
            placeholder={'text'}
            disabled={false}
          />;
        break;
      case 'prepend':
        components =
          <Autocomplete
            value={this.state.transformText}
            options={null}
            onChange={this.handleAutocompleteTransformTextChange}
            placeholder={'text'}
            disabled={false}
          />;
        break;
      case 'split':
        components = [
          <Autocomplete
            value={this.state.splitNames.get(0)}
            options={null}
            onChange={this.handleSplitNameAChange}
            placeholder={'new column 1'}
            disabled={false}
            key={'fi-transform-split-name1'}
          />,
          <Autocomplete
            value={this.state.splitNames.get(1)}
            options={null}
            onChange={this.handleSplitNameBChange}
            placeholder={'new column 2'}
            disabled={false}
            key={'fi-transform-split-name2'}
          />,
          <Autocomplete
            value={this.state.transformText}
            options={null}
            onChange={this.handleAutocompleteTransformTextChange}
            placeholder={'text'}
            disabled={false}
            key={'fi-transform-split-text'}
          />,
        ];
        break;
      case 'merge':
        components = [
          <Dropdown
            selectedIndex={this.state.mergeIndex}
            options={this.props.columnNames.delete(this.props.columnId)}
            onChange={this.handleMergeIndexChange}
            canEdit={true}
            key={'fi-transform-merge-index'}
          />,
          <Autocomplete
            value={this.state.mergeNewName}
            options={null}
            onChange={this.handleMergeNewNameChange}
            placeholder={'new column name'}
            disabled={false}
            key={'fi-transform-merge-name'}
          />,
          <Autocomplete
            value={this.state.transformText}
            options={null}
            onChange={this.handleAutocompleteTransformTextChange}
            placeholder={'text'}
            disabled={false}
            key={'fi-transform-merge-text'}
          />,
        ];
        break;
      default:
    }
    return (
      <div
        className='fi-transform-components'
      >
        {
          components
        }
      </div>
    );
  }

  public renderDefault(transformType: string)
  {
    if (transformType === 'duplicate')
    {
      return (
        <div
          className='fi-transform-components'
        >
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
    const datatypeId: number = ELASTIC_TYPES.indexOf(this.props.datatype);
    switch (this.props.datatype)
    {
      case 'text': // currently only strings have transform operations besides duplicate
        return this.renderText(TRANSFORM_TYPES[datatypeId][this.state.transformTypeIndex]);
      default:
        return this.renderDefault(TRANSFORM_TYPES[datatypeId][this.state.transformTypeIndex]);
    }
  }

  public renderContent()
  {
    const datatypeId: number = ELASTIC_TYPES.indexOf(this.props.datatype);
    return (
      <div
        className='fi-transform-content'
      >
        {
          TRANSFORM_TYPES[datatypeId].map((type, index) =>
            <div
              className='flex-container fi-transform-option'
              style={{
                color: Colors().text1,
              }}
              key={index}
            >
              <CheckBox
                checked={this.state.transformTypeIndex === index}
                onChange={this._fn(this.handleTransformTypeChange, index)}
              />
              <span
                className='fi-transform-option-name clickable'
                onClick={this._fn(this.handleTransformTypeChange, index)}
              >
                {
                  type
                }
              </span>
            </div>,
          )
        }
        {
          this.state.transformTypeIndex !== -1 &&
          <div
            className='fi-transform-text'
            style={{
              color: Colors().text1,
            }}
          >
            {
              FileImportTypes.TRANSFORM_TEXT[TRANSFORM_TYPES[datatypeId][this.state.transformTypeIndex].toUpperCase()]
            }
          </div>
        }
        {this.renderTransform()}
      </div>
    );
  }

  public render()
  {
    const { columnName } = this.props;
    const transformChildren =
      <div
        className='flex-container fi-transform'
        style={backgroundColor(Colors().bg1)}
      >
        {
          this.renderContent()
        }
      </div>;

    return (
      <Modal
        open={this.props.open}
        onClose={this.handleClose}
        title={'Apply a Transformation to ' + columnName}
        message={'Choose a transformation that will be applied to every row in ' + columnName + ' before data are imported'}
        children={transformChildren}
        noFooterPadding={true}
        confirm={true}
        confirmButtonText={'Apply Transformation'}
        onConfirm={this.handleTransform}
      />
    );
  }
}

export default TransformModal;