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
import { List, Map } from 'immutable';
import * as _ from 'lodash';
import memoizeOne from 'memoize-one';
import * as React from 'react';

import { DynamicForm } from 'app/common/components/DynamicForm';
import Dropdown from 'common/components/Dropdown';
import { DisplayState, DisplayType, InputDeclarationMap } from 'common/components/DynamicFormTypes';
import TerrainComponent from 'common/components/TerrainComponent';
import { LibraryState } from 'library/LibraryTypes';
import { LibraryItem } from 'library/LibraryTypes';
import Util from 'util/Util';
import { ItemStatus } from '../../../items/types/Item';
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

interface State
{
  categories: List<ID>;
  categoryNames: Map<ID, string>;
  groups: List<ID>;
  groupNames: Map<ID, string>;
  algorithms: List<ID>;
  algorithmNames: Map<ID, string>;
}

type AvailableItemsType = [List<ID>, Map<ID, string>];

class AlgorithmSelector extends TerrainComponent<Props>
{
  public state: State = {
    categories: List(),
    categoryNames: Map(),
    groups: List(),
    groupNames: Map(),
    algorithms: List(),
    algorithmNames: Map(),
  };

  public selectorMap = {
    category: {
      type: DisplayType.Pick,
      displayName: 'Category',
      options: {
        pickOptions: (state) => this.state.categories,
        displayNames: (state) => this.state.categoryNames,
        indexResolver: (state) => this.state.categories.indexOf(state),
      },
    },
    group: {
      type: DisplayType.Pick,
      displayName: 'Group',
      options: {
        pickOptions: (state) => this.state.groups,
        displayNames: (state) => this.state.groupNames,
        indexResolver: (state) => this.state.groups.indexOf(state),
      },
    },
    algorithm: {
      type: DisplayType.Pick,
      displayName: 'Algorithm',
      options: {
        pickOptions: (state) => this.state.algorithms,
        displayNames: (state) => this.state.algorithmNames,
        indexResolver: (state) => this.state.algorithms.indexOf(state),
      },
    },
  };

  public componentDidMount()
  {
    if (this.props.library)
    {
      this.setItems(this.props.library, this.props.ids);
    }
  }

  public componentWillReceiveProps(nextProps: Props)
  {
    if (Util.didStateChange(this.props.library, nextProps.library, ['categories', 'groups', 'algorithms'])
      || this.props.ids !== nextProps.ids)
    {
      if (nextProps.library)
      {
        this.setItems(nextProps.library, nextProps.ids);
      }
    }
  }

  public setItems(library: LibraryState, ids: List<ID>)
  {
    const [categories, categoryNames] = this.getAvailableItems(
      library,
      'categories',
      (item) => item.status !== ItemStatus.Archive,
    );
    const [groups, groupNames] = this.getAvailableItems(
      library,
      'groups',
      (item) => item.status !== ItemStatus.Archive && item.categoryId === ids.get(0),
    );
    const [algorithms, algorithmNames] = this.getAvailableItems(
      library,
      'algorithms',
      (item) => item.status !== ItemStatus.Archive && item.groupId === ids.get(1),
    );
    this.setState({
      categories,
      categoryNames,
      groups,
      groupNames,
      algorithms,
      algorithmNames,
    });
  }

  public getAvailableItems(libraryState: LibraryState, key: string, filterFn: (item) => boolean): AvailableItemsType
  {
    const items = libraryState[key].filter(filterFn).toList();
    return [items.map((item) => item.id), this.itemsToMap(items)];
  }

  public itemsToMap(items: List<LibraryItem>): Map<ID, string>
  {
    let displayNames: Map<ID, string> = Map();
    items.forEach((item) =>
      displayNames = displayNames.set(item.id, item.name),
    );
    return displayNames;
  }

  public handleSelectorChange(newState)
  {
    let newIds = List(_.values(newState));
    const { ids } = this.props;
    // If category changes, reset group + algorithm
    if (newIds.get(0) !== ids.get(0))
    {
      newIds = newIds.set(1, -1).set(2, -1);
    }
    // If group changes, reset algorithm
    else if (newIds.get(1) !== ids.get(1))
    {
      newIds = newIds.set(2, -1);
    }
    this.props.onChangeSelection(newIds);
  }

  public render()
  {
    const { library, ids } = this.props;
    const selectorState = { category: ids.get(0), group: ids.get(1), algorithm: ids.get(2) };
    return (
      <DynamicForm
        inputMap={this.selectorMap}
        inputState={selectorState}
        onStateChange={this.handleSelectorChange}
      />
    );
  }
}

export default Util.createTypedContainer(
  AlgorithmSelector,
  ['library'],
  {},
);
