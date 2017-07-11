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
import * as FileImportTypes from './../FileImportTypes';
import Util from '../../util/Util';
import Classs from './../../common/components/Classs';
import Autocomplete from './../../common/components/Autocomplete';
import CheckBox from './../../common/components/CheckBox';
import Dropdown from './../../common/components/Dropdown';
import Actions from './../data/FileImportActions';
const { List } = Immutable;

export interface Props
{
  datatype: string;
  colName: string;
  columnNames: List<string>;
  addRenameTransform();
}

class TransformBox extends Classs<Props>
{
  public state: {
    transformTypeIndex: number;
    mergeIndex: number;
    transformText: string;
    splitNames: string[];
    mergeNames: string[];
  } = {
    transformTypeIndex: -1,
    mergeIndex: -1,
    transformText: '',
    splitNames: ['', ''],         // 0: new col 1 name   , 1: new col 2 name
    mergeNames: ['', ''],         // 0: col to merge name, 1: merged col name
  };

  public handleAutocompleteTransformTextChange(transformText)
  {
    this.setState({
      transformText,
    })
  }

  public handleTransformTypeChange(transformTypeIndex: number)
  {
    this.setState({
      transformTypeIndex,
      mergeIndex: -1,
      transformText: '',
      splitNames: ['', ''],
      mergeNames: ['', ''],
    })
  }

  public handleMergeIndexChange(mergeIndex: number)
  {
    const names = this.state.mergeNames.slice();
    names[0] = this.props.columnNames.delete(this.props.columnNames.indexOf(this.props.colName)).get(mergeIndex);
    this.setState({
      mergeIndex,
      mergeNames: names,
    })
  }

  public handleSplitNameAChange(splitNameA)
  {
    const names = this.state.splitNames.slice();
    names[0] = splitNameA;
    this.setState({
      splitNames: names,
    });
  }

  public handleSplitNameBChange(splitNameB)
  {
    const names = this.state.splitNames.slice();
    names[1] = splitNameB;
    this.setState({
      splitNames: names,
    });
  }

  public handleMergeNewNameChange(mergeNewName)
  {
    const names = this.state.mergeNames.slice();
    names[1] = mergeNewName;
    this.setState({
      mergeNames: names,
    })
  }

  public transformErrorCheck()
  {
    const transformName = FileImportTypes.ELASTIC_TYPES[this.state.transformTypeIndex];
    if (!transformName)
    {
      return 'Select a transformation';
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
      if (!this.state.splitNames[0])
      {
        return 'Enter new column 1 name'
      }
      if (!this.state.splitNames[1])
      {
        return 'Enter new column 2 name'
      }
    }
    if (transformName === 'merge')
    {
      if (!this.state.mergeNames[0])
      {
        return 'Select column to merge'
      }
      if (!this.state.mergeNames[1])
      {
        return 'Enter new column name'
      }
    }
    return '';
  }

  public handleTransformClick()
  {
    const msg = this.transformErrorCheck();
    if (msg)
    {
      alert(msg);
      return;
    }

    this.props.addRenameTransform();

    const transformName = FileImportTypes.ELASTIC_TYPES[this.state.transformTypeIndex];
    Actions.updatePreviewRows({
      name: transformName,
      args: {
        transformCol: this.props.colName,
        text: this.state.transformText,
        splitNames: this.state.splitNames,
        mergeNames: this.state.mergeNames,
      }
    });

    console.log('adding transform: ' + transformName + ' / colName: ' + this.props.colName + ' / text: ' + this.state.transformText);

    if (transformName === 'append' || transformName === 'prepend')
    {
      Actions.addTransform(
        {
          name: transformName,
          args: {
            colName: this.props.colName,
            text: this.state.transformText,
          }
        }
      );
    }
    else if (transformName === 'split')
    {
      Actions.addTransform(
        {
          name: transformName,
          args: {
            oldName: this.props.colName,
            newName: this.state.splitNames,
            text: this.state.transformText,
          }
        }
      );
    }
    else if (transformName === 'merge')
    {
      Actions.addTransform(
        {
          name: transformName,
          args: {
            oldName: [this.props.colName, this.state.mergeNames[0]],
            newName: this.state.mergeNames[1],
            text: this.state.transformText,
          }
        }
      );
    }

    this.setState({
      transformTypeIndex: -1,
      mergeIndex: -1,
      transformText: '',
      splitNames: ['', ''],
      mergeNames: ['', ''],
    })
  }

  public render()
  {
    return (
      <div>
        {
          this.props.datatype === 'text' &&
          <div>
            select transformation
            <Dropdown
              selectedIndex={this.state.transformTypeIndex}
              options={List(FileImportTypes.TRANSFORM_TYPES)}
              onChange={this.handleTransformTypeChange}
              canEdit={true}
            />
            {
              FileImportTypes.TRANSFORM_TYPES[this.state.transformTypeIndex] === 'split' &&
              <div>
                <Autocomplete
                  value={this.state.splitNames[0]}
                  options={null}
                  onChange={this.handleSplitNameAChange}
                  placeholder={'new column 1'}
                  disabled={false}
                />
                <Autocomplete
                  value={this.state.splitNames[1]}
                  options={null}
                  onChange={this.handleSplitNameBChange}
                  placeholder={'new column 2'}
                  disabled={false}
                />
              </div>
            }
            {
              FileImportTypes.TRANSFORM_TYPES[this.state.transformTypeIndex] === 'merge' &&
              <div>
                select column to merge
                <Dropdown
                  selectedIndex={this.state.mergeIndex}
                  options={this.props.columnNames.delete(this.props.columnNames.indexOf(this.props.colName))}
                  onChange={this.handleMergeIndexChange}
                  canEdit={true}
                />
                <Autocomplete
                  value={this.state.mergeNames[1]}
                  options={null}
                  onChange={this.handleMergeNewNameChange}
                  placeholder={'new column name'}
                  disabled={false}
                />
              </div>
            }
            {
              this.state.transformTypeIndex !== -1 &&
              <Autocomplete
                value={this.state.transformText}
                options={null}
                onChange={this.handleAutocompleteTransformTextChange}
                placeholder={'text'}
                disabled={false}
              />
            }
            <button onClick={this.handleTransformClick}>
              Transform
            </button>
          </div>
        }
      </div>
    )
  }
}

export default TransformBox;
