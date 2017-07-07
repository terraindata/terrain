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
import Actions from './../data/FileImportActions';
import PureClasss from './../../common/components/PureClasss';
import Dropdown from './../../common/components/Dropdown';

export interface Props
{
  columnId: number,
  recursionId: number;
  colType: any;
  datatypes: List<string>;
}

class TypeDropdown extends PureClasss<Props>
{
  public handleTypeChange(typeIndex)
  {
    Actions.setColType(this.props.columnId, this.props.recursionId, typeIndex);
  }

  public componentWillReceiveProps(nextProps: Props)
  {
    if (this.props.colType.type !== 4 && nextProps.colType.type === 4)
    {
      Actions.addColType(this.props.columnId);
    }
  }

  // add columnType object at recursion depth, components will mount in ascending order
  public componentWillMount()
  {

  }

  // remove columnType object at recursionId depth (thereby removing all levels below) if it exists
  public componentWillUnmount()
  {

  }

  public render()
  {
    console.log('col id: ', this.props.columnId);
    console.log('recursion id: ', this.props.recursionId);
    return (
      <div>
        <Dropdown
          selectedIndex={this.props.colType.type}
          options={this.props.datatypes}
          onChange={this.handleTypeChange}
          canEdit={true}
        />
        {
          this.props.colType.type === 4 &&
          <TypeDropdown
            columnId={this.props.columnId}
            recursionId={this.props.recursionId + 1}
            colType={this.props.colType.colType}
            datatypes={this.props.datatypes}
          />
        }
      </div>
    );
  }
}

export default TypeDropdown;
