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

// tslint:disable:no-var-requires strict-boolean-expressions

import * as classNames from 'classnames';
import { List } from 'immutable';
import memoizeOne from 'memoize-one';
import * as React from 'react';

import Dropdown from 'common/components/Dropdown';
import TerrainComponent from 'common/components/TerrainComponent';
import { LibraryState } from 'library/LibraryTypes';
import { LibraryItem } from 'library/LibraryTypes';
import Util from 'util/Util';

import './AlgorithmSelector.less';

const Color = require('color');

export interface Props
{
  ids: List<number>; // [category id, group id, algorithm id]
  onChangeSelection: (ids: List<number>) => void;
  dropdownWidth?: string;
  // injected props
  library?: LibraryState;
}

type AvailableItemsType = [List<LibraryItem>, List<string>, number];

class AlgorithmSelector extends TerrainComponent<Props>
{
  public constructor(props)
  {
    super(props);
    this.getAvailableCategories = memoizeOne(this.getAvailableCategories);
    this.getAvailableGroups = memoizeOne(this.getAvailableGroups);
    this.getAvailableAlgorithms = memoizeOne(this.getAvailableAlgorithms);
  }

  public handleCategoryChange(index, event)
  {
    const [categories, categoryNames, categoryIndex] =
      this.getAvailableCategories(this.props.library, this.props.ids.get(0));
    const id = categories.get(index).id;
    if (id === this.props.ids.get(0)) // nothing changed
    {
      return;
    }
    this.props.onChangeSelection(List([id as number, -1, -1]));
  }

  public handleGroupChange(index, event)
  {
    const [groups, groupNames, groupIndex] =
      this.getAvailableGroups(this.props.library, this.props.ids.get(0), this.props.ids.get(1));
    const id = groups.get(index).id;
    if (id === this.props.ids.get(1)) // nothing changed
    {
      return;
    }
    this.props.onChangeSelection(List([this.props.ids.get(0), id as number, -1]));
  }

  public handleAlgorithmChange(index, event)
  {
    const [algorithms, algorithmNames, algorithmIndex] =
      this.getAvailableAlgorithms(this.props.library, this.props.ids.get(1), this.props.ids.get(2));
    const id = algorithms.get(index).id;
    if (id === this.props.ids.get(2)) // nothing changed
    {
      return;
    }
    this.props.onChangeSelection(List([this.props.ids.get(0), this.props.ids.get(1), id as number]));
  }

  public getAvailableCategories(libraryState: LibraryState, categoryId: ID): AvailableItemsType
  {
    const items = libraryState.categories.toList();
    const index = items.findIndex((v, i) => v.id === categoryId);
    return [items, this.itemsToText(items), index];
  }

  public getAvailableGroups(libraryState: LibraryState, categoryId: ID, groupId: ID): AvailableItemsType
  {
    const items = libraryState.groups.filter(
      (v, k) => v.categoryId === categoryId,
    ).toList();
    const index = items.findIndex((v, i) => v.id === groupId);
    return [items, this.itemsToText(items), index];
  }

  public getAvailableAlgorithms(libraryState: LibraryState, groupId: ID, algorithmId: ID): AvailableItemsType
  {
    const items = libraryState.algorithms.filter((v, k) => v.groupId === groupId).toList();
    const index = items.findIndex((v, i) => v.id === algorithmId);
    return [items, this.itemsToText(items), index];
  }

  public itemsToText(items: List<LibraryItem>): List<string>
  {
    return items.map((item, index) => item.name).toList();
  }

  public render()
  {
    const [categories, categoryNames, categoryIndex] =
      this.getAvailableCategories(this.props.library, this.props.ids.get(0));
    const [groups, groupNames, groupIndex] =
      this.getAvailableGroups(this.props.library, this.props.ids.get(0), this.props.ids.get(1));
    const [algorithms, algorithmNames, algorithmIndex] =
      this.getAvailableAlgorithms(this.props.library, this.props.ids.get(1), this.props.ids.get(2));
    return (
      <div className='algorithm-selector-wrapper'>
        <div className='algorithm-selector-column'>
          <div className='algorithm-selector-label'>
            Category
          </div>
          <div className='algorithm-selector-input'>
            <Dropdown
              options={categoryNames.size !== 0 ? categoryNames : undefined}
              selectedIndex={categoryIndex}
              canEdit={true}
              onChange={this.handleCategoryChange}
              openDown={true}
              className='alg-selector-grow-to-fit'
            />
          </div>
        </div>
        <div className='algorithm-selector-column'>
          <div className='algorithm-selector-label'>
            Group
          </div>
          <div className='algorithm-selector-input'>
            <Dropdown
              options={groupNames.size !== 0 ? groupNames : undefined}
              selectedIndex={groupIndex}
              canEdit={true}
              onChange={this.handleGroupChange}
              openDown={true}
              className='alg-selector-grow-to-fit'
            />
          </div>
        </div>
        <div className='algorithm-selector-column'>
          <div className='algorithm-selector-label'>
            Algorithm
          </div>
          <div className='algorithm-selector-input'>
            <Dropdown
              options={algorithmNames.size !== 0 ? algorithmNames : undefined}
              selectedIndex={algorithmIndex}
              canEdit={true}
              onChange={this.handleAlgorithmChange}
              openDown={true}
              className='alg-selector-grow-to-fit'
            />
          </div>
        </div>
      </div>

    );
  }
}

export default Util.createTypedContainer(
  AlgorithmSelector,
  ['library'],
  {},
);
