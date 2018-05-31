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
// tslint:disable:no-empty

import { DynamicForm } from 'app/common/components/DynamicForm';
import { AlgorithmSelectorUncontained as AlgorithmSelector } from 'app/library/components/AlgorithmSelector';
import Util from 'app/util/Util';
import { mount, shallow } from 'enzyme';
import * as Immutable from 'immutable';
import { List, Map } from 'immutable';
import * as LibraryTypes from 'library/LibraryTypes';
import { _LibraryState, LibraryState } from 'library/LibraryTypes';
import * as React from 'react';
import LibraryHelper from 'test-helpers/LibraryHelper';

describe('AlgorithmSelector', () =>
{
  let selectorComponent = null;
  const libraryStateMock = LibraryHelper.mockState();
  const library = libraryStateMock
    .addCategory(1, 'Category 1')
    .addCategory(2, 'Category 2')
    .addGroup(1, 3, 'Group 1')
    .addGroup(2, 4, 'Group 2')
    .addAlgorithm(3, 5, 'Algorithm 1')
    .addAlgorithm(4, 6, 'Algorithm 1')
    .getState();
  const selectorState =
    {
      ids: List([-1, -1, -1]),
      onChangeSelection: (ids) => { },
      library,
    };

  beforeEach(() =>
  {
    selectorComponent =
      shallow(<AlgorithmSelector
        {...selectorState}
      />);
  });
  describe('#componentDidMount', () =>
  {
    it('should create valid state from library and ids', async () =>
    {
      const state = selectorComponent.state();
      expect(state.categories).toEqual(List([1, 2]));
      // no algorithms or groups because category isn't chosen
      expect(state.groups).toEqual(List([]));
      expect(state.algorithms).toEqual(List([]));
      const categoryNames = Map();
      expect(state.categoryNames).toEqual(categoryNames.set(1, 'Category 1').set(2, 'Category 2'));
      expect(state.groupNames).toEqual(Map());
      expect(state.algorithmNames).toEqual(Map());
    });
  });

  describe('#componentWillReceiveProps', () =>
  {
    it('should update available groups based on category', () =>
    {
      selectorComponent.setProps({ ids: List([1, -1, -1]) });
      const state = selectorComponent.state();
      expect(state.categories).toEqual(List([1, 2]));
      expect(state.groups).toEqual(List([3]));
      expect(state.algorithms).toEqual(List([]));
      const categoryNames = Map();
      expect(state.categoryNames).toEqual(categoryNames.set(1, 'Category 1').set(2, 'Category 2'));
      const groupNames = Map();
      expect(state.groupNames).toEqual(groupNames.set(3, 'Group 1'));
      expect(state.algorithmNames).toEqual(Map());
    });
    it('should update available algorithms based on group', () =>
    {
      selectorComponent.setProps({ ids: List([1, 3, -1]) });
      const state = selectorComponent.state();
      expect(state.categories).toEqual(List([1, 2]));
      expect(state.groups).toEqual(List([3]));
      expect(state.algorithms).toEqual(List([5]));
      const categoryNames = Map();
      expect(state.categoryNames).toEqual(categoryNames.set(1, 'Category 1').set(2, 'Category 2'));
      const groupNames = Map();
      expect(state.groupNames).toEqual(groupNames.set(3, 'Group 1'));
      const algorithmNames = Map();
      expect(state.algorithmNames).toEqual(algorithmNames.set(5: 'Algorithm 1'));
    });
  });

  describe('#render', () =>
  {
    it('should render a dynamic form', () =>
    {
      expect(selectorComponent.find(DynamicForm)).toHaveLength(1);
    });
  });
});
