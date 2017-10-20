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
import { _AnalyticsState, AnalyticsState } from 'analytics/data/AnalyticsStore';
import { shallow } from 'enzyme';
import * as Immutable from 'immutable';
import Library from 'library/components/Library';
import { _LibraryState, LibraryState } from 'library/data/LibraryStore';
import * as LibraryTypes from 'library/LibraryTypes';
import * as React from 'react';
import configureStore from 'redux-mock-store';
import { _SchemaState, SchemaState } from 'schema/SchemaTypes';
import { ItemType } from '../../../items/types/Item';

describe('Library', () =>
{
  let library: LibraryState = _LibraryState({
    groups: Immutable.Map<number, LibraryTypes.Group>({}),
    variants: Immutable.Map<number, LibraryTypes.Variant>({}),
  });

  library = library.set('groups', library.groups.set(1, LibraryTypes._Group({
    type: ItemType.Group,
    id: 1,
    name: 'Group 1',
    algorithmsOrder: Immutable.List<number>([2]),
    lastEdited: '',
    lastUserId: '',
    userIds: Immutable.List([]),
    defaultLanguage: 'elastic',
    parent: 0,
  })));

  library = library.set('variants', library.variants.set(3, LibraryTypes._Variant({
    id: 3,
    name: 'Variant 1',
  })));

  const analytics: AnalyticsState = _AnalyticsState({
    loaded: false,
    data: Immutable.Map({}),
    selectedMetric: 1,
  });

  const schema: SchemaState = _SchemaState({
    servers: Immutable.Map({
      'My ElasticSearch Instance': {
        id: 'My ElasticSearch Instance',
        type: 'server',
        name: 'My ElasticSearch Instance',
        connectionId: 1,
        isAnalytics: true,
        analyticsIndex: 'terrain-analytics',
        analyticsType: 'events',
      },
    }),
  });

  let libraryComponent = null;

  beforeEach(() =>
  {
    libraryComponent = shallow(
      <Library
        library={library}
        analytics={analytics}
        schema={schema}
        router={{ params: { groupId: '1' } }}
      />,
    );
  });

  describe('when props.variantsMultiselect is true', () =>
  {
    beforeEach(() =>
    {
      libraryComponent.setProps({ variantsMultiselect: true });
    });

    describe('and props.selectedVariants is empty', () =>
    {
      it('should have 3 columns', () =>
      {
        expect(libraryComponent.find('GroupsColumn')).toHaveLength(1);
        expect(libraryComponent.find('AlgorithmsColumn')).toHaveLength(1);
        expect(libraryComponent.find('VariantsColumn')).toHaveLength(1);
        expect(libraryComponent.find('LibraryInfoColumn')).toHaveLength(0);
        expect(libraryComponent.find('MultipleAreaChart')).toHaveLength(0);
      });
    });

    describe('and props.selectedVariants is NOT empty', () =>
    {
      it('should have 3 columns and display the analytics chart', () =>
      {
        const selectedVariants = library.get('selectedVariants');
        const nextLibrary = library.set('selectedVariants', selectedVariants.push(1));
        libraryComponent.setProps({
          library: nextLibrary,
        });

        expect(libraryComponent.find('GroupsColumn')).toHaveLength(1);
        expect(libraryComponent.find('AlgorithmsColumn')).toHaveLength(1);
        expect(libraryComponent.find('VariantsColumn')).toHaveLength(1);
        expect(libraryComponent.find('LibraryInfoColumn')).toHaveLength(0);
        expect(libraryComponent.find('AnalyticsSelector')).toHaveLength(1);
      });
    });
  });

  describe('when variantsMultiselect prop is false', () =>
  {
    it('should have 4 columns', () =>
    {
      expect(libraryComponent.find('GroupsColumn')).toHaveLength(1);
      expect(libraryComponent.find('AlgorithmsColumn')).toHaveLength(1);
      expect(libraryComponent.find('VariantsColumn')).toHaveLength(1);
      expect(libraryComponent.find('LibraryInfoColumn')).toHaveLength(1);
    });
  });
});
