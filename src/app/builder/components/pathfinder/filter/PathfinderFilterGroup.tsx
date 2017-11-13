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

// tslint:disable:no-var-requires restrict-plus-operands strict-boolean-expressions

import * as classNames from 'classnames';
import * as Immutable from 'immutable';
import * as $ from 'jquery';
import * as React from 'react';
import { altStyle, backgroundColor, borderColor, Colors, fontColor } from '../../../../colors/Colors';
import TerrainComponent from './../../../../common/components/TerrainComponent';
const { List, Map } = Immutable;
import PathfinderText from 'app/builder/components/pathfinder/PathfinderText';
import Dropdown from 'app/common/components/Dropdown';
import { FilterGroup, FilterLine, Path, Source } from '../PathfinderTypes';

export interface Props
{
  filterGroup: FilterGroup;
  source: Source;
  canEdit: boolean;
  depth: number;
  keyPath: KeyPath;
  onChange(keyPath: KeyPath, filterGroup: FilterGroup | FilterLine);
}

const filterDropdownOptions = List([
  'all',
  'any',
  2,
  3,
  4,
  5,
]);

class PathfinderFilterGroup extends TerrainComponent<Props>
{
  public state: {

  } = {

  };

  public render()
  {

    const { source, filterGroup, canEdit } = this.props;
    return (
      <div
        className='pf-line'
      >
        <div
          className='pf-piece'
        >
          {
            this.props.depth === 0 ? PathfinderText.firstFilterIntro : PathfinderText.nestedFilterIntro
          }
        </div>
        <div
          className='pf-piece'
        >
          <Dropdown
            options={filterDropdownOptions}
            selectedIndex={this.getDropdownSelectedIndex()}
            canEdit={canEdit}
            onChange={this.handleDropdownChange}
          />
        </div>
        <div
          className='pf-piece'
        >
          {
            PathfinderText.filterGroupPost
          }
        </div>

      </div>
    );
  }

  private handleDropdownChange(index: number)
  {
    let value = filterDropdownOptions[index];

    if (value === 'any')
    {
      value = 1;
    }
    this.props.onChange(this.props.keyPath, this.props.filterGroup.set('minMatches', value));
  }

  private getDropdownSelectedIndex(): number
  {
    const value = this.props.filterGroup.minMatches;

    if (value === 1)
    {
      return filterDropdownOptions.indexOf('any');
    }

    return filterDropdownOptions.indexOf(value);
  }
}

export default PathfinderFilterGroup;
