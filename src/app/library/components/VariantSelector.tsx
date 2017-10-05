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
import * as Immutable from 'immutable';
import memoizeOne from 'memoize-one';
import * as React from 'react';

import Dropdown from 'common/components/Dropdown';
import TerrainComponent from 'common/components/TerrainComponent';
import { LibraryState } from 'library/data/LibraryStore';
import * as LibraryTypes from 'library/LibraryTypes';

import './VariantSelector.less';

const Color = require('color');
const { List } = Immutable;

type Variant = LibraryTypes.Variant;
type Group = LibraryTypes.Group;
type Algorithm = LibraryTypes.Algorithm;

export interface Props
{
  libraryState: LibraryState;
  ids: List<number>; // [group id, algorithm id, variant id]
  onChangeSelection: (ids: List<number>) => void;
  dropdownWidth?: string;
}

type LibraryItem = Group | Variant | Algorithm;
type AvailableItemsType = [List<LibraryItem>, List<string>, number];

class VariantSelector extends TerrainComponent<Props>
{
  public constructor(props)
  {
    super(props);
    this.getAvailableGroups = memoizeOne(this.getAvailableGroups);
    this.getAvailableAlgorithms = memoizeOne(this.getAvailableAlgorithms);
    this.getAvailableVariants = memoizeOne(this.getAvailableVariants);
  }

  public handleGroupChange(index, event)
  {
    const [groups, groupNames, groupIndex] =
      this.getAvailableGroups(this.props.libraryState, this.props.ids.get(0));
    const id = groups.get(index).id;
    if (id === this.props.ids.get(0)) // nothing changed
    {
      return;
    }
    this.props.onChangeSelection(List([id as number, -1, -1]));
  }

  public handleAlgorithmChange(index, event)
  {
    const [algorithms, algorithmNames, algorithmIndex] =
      this.getAvailableAlgorithms(this.props.libraryState, this.props.ids.get(0), this.props.ids.get(1));
    const id = algorithms.get(index).id;
    if (id === this.props.ids.get(1)) // nothing changed
    {
      return;
    }
    this.props.onChangeSelection(List([this.props.ids.get(0), id as number, -1]));
  }

  public handleVariantChange(index, event)
  {
    const [variants, variantNames, variantIndex] =
      this.getAvailableVariants(this.props.libraryState, this.props.ids.get(1), this.props.ids.get(2));
    const id = variants.get(index).id;
    if (id === this.props.ids.get(2)) // nothing changed
    {
      return;
    }
    this.props.onChangeSelection(List([this.props.ids.get(0), this.props.ids.get(1), id as number]));
  }

  public getAvailableGroups(libraryState: LibraryState, groupId: ID): AvailableItemsType
  {
    const items = libraryState.groups.toList();
    const index = items.findIndex((v, i) => v.id === groupId);
    return [items, this.itemsToText(items), index];
  }

  public getAvailableAlgorithms(libraryState: LibraryState, groupId: ID, algorithmId: ID): AvailableItemsType
  {
    const items = libraryState.algorithms.filter(
      (v, k) => v.groupId === groupId,
    ).toList();
    const index = items.findIndex((v, i) => v.id === algorithmId);
    return [items, this.itemsToText(items), index];
  }

  public getAvailableVariants(libraryState: LibraryState, algorithmId: ID, variantId: ID): AvailableItemsType
  {
    const items = libraryState.variants.filter((v, k) => v.algorithmId === algorithmId).toList();
    const index = items.findIndex((v, i) => v.id === variantId);
    return [items, this.itemsToText(items), index];
  }

  public itemsToText(items: List<LibraryItem>): List<string>
  {
    return items.map((item, index) => item.name).toList();
  }

  public render()
  {
    const [groups, groupNames, groupIndex] =
      this.getAvailableGroups(this.props.libraryState, this.props.ids.get(0));
    const [algorithms, algorithmNames, algorithmIndex] =
      this.getAvailableAlgorithms(this.props.libraryState, this.props.ids.get(0), this.props.ids.get(1));
    const [variants, variantNames, variantIndex] =
      this.getAvailableVariants(this.props.libraryState, this.props.ids.get(1), this.props.ids.get(2));

    return (
      <div className='variant-selector-wrapper'>
        <div className='variant-selector-column'>
          <div className='variant-selector-label'>
            Group
          </div>
          <div className='variant-selector-input'>
            <Dropdown
              options={groupNames.size !== 0 ? groupNames : undefined}
              selectedIndex={groupIndex}
              canEdit={true}
              onChange={this.handleGroupChange}
              openDown={true}
              width={this.props.dropdownWidth}
            />
          </div>
        </div>
        <div className='variant-selector-column'>
          <div className='variant-selector-label'>
            Algorithm
          </div>
          <div className='variant-selector-input'>
            <Dropdown
              options={algorithmNames.size !== 0 ? algorithmNames : undefined}
              selectedIndex={algorithmIndex}
              canEdit={true}
              onChange={this.handleAlgorithmChange}
              openDown={true}
              width={this.props.dropdownWidth}
            />
          </div>
        </div>
        <div className='variant-selector-column'>
          <div className='variant-selector-label'>
            Variant
          </div>
          <div className='variant-selector-input'>
            <Dropdown
              options={variantNames.size !== 0 ? variantNames : undefined}
              selectedIndex={variantIndex}
              canEdit={true}
              onChange={this.handleVariantChange}
              openDown={true}
              width={this.props.dropdownWidth}
            />
          </div>
        </div>
      </div>

    );
  }
}

export default VariantSelector;
