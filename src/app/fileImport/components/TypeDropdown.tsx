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
import * as React from 'react';
import * as _ from 'underscore';
import Util from '../../util/Util';
import Dropdown from './../../common/components/Dropdown';
import TerrainComponent from './../../common/components/TerrainComponent';
import Actions from './../data/FileImportActions';
import * as FileImportTypes from './../FileImportTypes';
const { List } = Immutable;

const DATATYPES = List(FileImportTypes.ELASTIC_TYPES);

export interface Props
{
  columnId: number;
  recursionDepth: number;
  columnType: FileImportTypes.ColumnTypesTree;
  editing: boolean;
}

class TypeDropdown extends TerrainComponent<Props>
{
  public handleTypeChange(typeIndex)
  {
    Actions.setColumnType(this.props.columnId, this.props.recursionDepth, typeIndex);
  }

  public componentWillUnmount()
  {
    if (!this.props.editing)
    {
      Actions.deleteColumnType(this.props.columnId, this.props.recursionDepth);
    }
  }

  public shouldComponentUpdate(nextProps: Props)
  {
    return JSON.stringify(this.props.columnType) === JSON.stringify(nextProps.columnType);
  }

  public render()
  {
    return (
      <div>
        <Dropdown
          selectedIndex={Number(this.props.columnType.type)}
          options={DATATYPES}
          onChange={this.handleTypeChange}
          canEdit={true}
        />
        {
          FileImportTypes.ELASTIC_TYPES[this.props.columnType.type] === 'array' &&
          <TypeDropdown
            columnId={this.props.columnId}
            recursionDepth={this.props.recursionDepth + 1}
            columnType={this.props.columnType.innerType}
            editing={this.props.editing}
          />
        }
      </div>
    );
  }
}

export default TypeDropdown;
