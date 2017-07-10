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
import Autocomplete from './../../common/components/Autocomplete';
import CheckBox from './../../common/components/CheckBox';
import Dropdown from './../../common/components/Dropdown';
import Actions from './../data/FileImportActions';

export interface Props
{
  datatype: string;
  transformTypes: List<string>;
  newName: string;
  newNames: List<string>;
  addCurRenameTransform();
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
    transformTypeIndex: 0,
    mergeIndex: -1,
    transformText: '',
    splitNames: ['', ''],
    mergeNames: ['', ''],
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
    names[0] = this.props.newNames.delete(this.props.newNames.indexOf(this.props.newName)).get(mergeIndex);
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

  // public handleMergeOldNameChange(mergeOldName)
  // {
  //   const names = this.state.mergeNames.slice();
  //   names[0] = mergeOldName;
  //   this.setState({
  //     mergeNames: names,
  //   });
  // }

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
    const transformName = this.props.transformTypes.get(this.state.transformTypeIndex)
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
      if (!this.state.transformText)
      {
        return 'Enter merge text';
      }
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
    // error checking
    const msg = this.transformErrorCheck();
    if (msg)
    {
      alert(msg);
      return;
    }

    // if not empty, add current rename transform and set it to empty string
    this.props.addCurRenameTransform();

    // add this transform to total list, and the transform to be executed on preview rows
    console.log('adding transform: ' + this.props.transformTypes.get(this.state.transformTypeIndex) + ' colName: ' +
      this.props.newName + ', text: ' + this.state.transformText);

    const transformName = this.props.transformTypes.get(this.state.transformTypeIndex);
    Actions.updatePreviewRows({
      name: transformName,
      args: {
        transformCol: this.props.newName,
        text: this.state.transformText,
        splitNames: this.state.splitNames,
        mergeNames: this.state.mergeNames,
      }
    });

    if (transformName === 'append' || transformName === 'prepend')
    {
      Actions.addTransform(
        {
          name: transformName,
          args: {
            colName: this.props.newName,
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
            oldName: this.props.newName,
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
            oldName: [this.props.newName, this.state.mergeNames[0]],
            newName: this.state.mergeNames[1],
            text: this.state.transformText,
          }
        }
      );
    }

    this.setState({
      transformTypeIndex: 0,
      mergeIndex: -1,
      transformText: '',
      splitNames: ['', ''],
      mergeNames: ['', ''],
    })
  }

  public render()
  {
    console.log("newNames: ", this.props.newNames)
    return (
      <div>
        {
          this.props.datatype === 'text' &&
          <div>
            <Dropdown
              selectedIndex={this.state.transformTypeIndex}
              options={this.props.transformTypes}
              onChange={this.handleTransformTypeChange}
              canEdit={true}
            />
            <Autocomplete
              value={this.state.transformText}
              options={null}
              onChange={this.handleAutocompleteTransformTextChange}
              placeholder={'text'}
              disabled={false}
            />
            {
              this.props.transformTypes.get(this.state.transformTypeIndex) === 'split' &&
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
              this.props.transformTypes.get(this.state.transformTypeIndex) === 'merge' &&
              <div>
                <Autocomplete
                  value={this.state.mergeNames[1]}
                  options={null}
                  onChange={this.handleMergeNewNameChange}
                  placeholder={'new column name'}
                  disabled={false}
                />
                select column to merge
                <Dropdown
                  selectedIndex={this.state.mergeIndex}
                  options={this.props.newNames.delete(this.props.newNames.indexOf(this.props.newName))}
                  onChange={this.handleMergeIndexChange}
                  canEdit={true}
                />
              </div>
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
