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
  const categoryId = 1;
  const algorithmId = 2;
  const variantId = 3;

  let library: LibraryState = _LibraryState({
    categories: Immutable.Map<number, LibraryTypes.Category>({}),
    algorithms: Immutable.Map<number, LibraryTypes.Algorithm>({}),
    variants: Immutable.Map<number, LibraryTypes.Variant>({}),
  });

  library = library.set('categories', library.categories.set(categoryId, LibraryTypes._Category({
    type: ItemType.Category,
    id: categoryId,
    name: 'Category 1',
    algorithmsOrder: Immutable.List<number>([2]),
    lastEdited: '',
    lastUserId: '',
    userIds: Immutable.List([]),
    defaultLanguage: 'elastic',
    parent: 0,
  })));

  library = library.set('algorithms', library.algorithms.set(algorithmId, LibraryTypes._Algorithm({
    id: algorithmId,
    name: 'Algorithm 1',
    variantsOrder: Immutable.List<number>([3]),
    lastEdited: '',
    lastUserId: '',
    userIds: Immutable.List([]),
    defaultLanguage: 'elastic',
    parent: 0,
  })));

  library = library.set('variants', library.variants.set(variantId, LibraryTypes._Variant({
    id: variantId,
    name: 'Variant 1',
  })));

  const analytics: AnalyticsState = _AnalyticsState({
    loaded: true,
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

  const analyticsActions = {
    selectAnalyticsConnection: (connectionName) => { return; },
    fetch: () => { return; },
  };

  let libraryComponent = null;

  describe('when props.canPinVariants is true', () =>
  {
    beforeEach(() =>
    {
      libraryComponent = shallow(
        <Library
          library={library}
          analytics={analytics}
          analyticsActions={analyticsActions}
          schema={schema}
          canPinVariants={true}
          router={{ params: { categoryId: '1' } }}
        />,
      );
    });

    describe('and neither props.selectedVariant nor analytics.pinnedVariants are set', () =>
    {
      it('should have 3 columns', () =>
      {
        expect(libraryComponent.find('CategoriesColumn')).toHaveLength(1);
        expect(libraryComponent.find('AlgorithmsColumn')).toHaveLength(1);
        expect(libraryComponent.find('VariantsColumn')).toHaveLength(1);
        expect(libraryComponent.find('LibraryInfoColumn')).toHaveLength(0);
        expect(libraryComponent.find('MultipleAreaChart')).toHaveLength(0);
      });
    });

    describe('and props.selectedVariant is set', () =>
    {
      it('should have 3 columns and display the analytics chart', () =>
      {
        const selectedVariants = library.get('selectedVariants');
        const nextLibrary = library.set('selectedVariant', 1);
        libraryComponent.setProps({
          library: nextLibrary,
        });

        expect(libraryComponent.find('CategoriesColumn')).toHaveLength(1);
        expect(libraryComponent.find('AlgorithmsColumn')).toHaveLength(1);
        expect(libraryComponent.find('VariantsColumn')).toHaveLength(1);
        expect(libraryComponent.find('LibraryInfoColumn')).toHaveLength(0);
        expect(libraryComponent.find('MultipleAreaChart')).toHaveLength(1);
        expect(libraryComponent.find('AnalyticsSelector')).toHaveLength(1);
      });
    });

    describe('and props.analytics.pinnedVariants is set', () =>
    {
      it('should have 3 columns and display the analytics chart', () =>
      {
        const selectedVariants = library.get('selectedVariants');
        const nextAnalytics = analytics.setIn(
          ['pinnedVariants', 1], true,
        );
        libraryComponent.setProps({
          analytics: nextAnalytics,
        });

        expect(libraryComponent.find('CategoriesColumn')).toHaveLength(1);
        expect(libraryComponent.find('AlgorithmsColumn')).toHaveLength(1);
        expect(libraryComponent.find('VariantsColumn')).toHaveLength(1);
        expect(libraryComponent.find('LibraryInfoColumn')).toHaveLength(0);
        expect(libraryComponent.find('MultipleAreaChart')).toHaveLength(1);
        expect(libraryComponent.find('AnalyticsSelector')).toHaveLength(1);
      });
    });
  });

  describe('when props.canPinVariants is false', () =>
  {
    beforeEach(() =>
    {
      libraryComponent = shallow(
        <Library
          library={library}
          analytics={analytics}
          analyticsActions={analyticsActions}
          schema={schema}
          canPinVariants={false}
          router={{ params: { categoryId: '1' } }}
        />,
      );
    });

    it('should have 4 columns', () =>
    {
      expect(libraryComponent.find('CategoriesColumn')).toHaveLength(1);
      expect(libraryComponent.find('AlgorithmsColumn')).toHaveLength(1);
      expect(libraryComponent.find('VariantsColumn')).toHaveLength(1);
      expect(libraryComponent.find('LibraryInfoColumn')).toHaveLength(1);
    });
  });

  describe('when props.singleColumn is true', () =>
  {
    beforeEach(() =>
    {
      libraryComponent = shallow(
        <Library
          library={library}
          analytics={analytics}
          analyticsActions={analyticsActions}
          schema={schema}
          singleColumn={true}
          router={{ params: {} }}
        />,
      );
    });

    describe('and the active column is null', () =>
    {
      describe('and the URL has no categoryId, algorithmId or variantId specified', () =>
      {
        it('should only display the categories column by default', () =>
        {
          expect(libraryComponent.find('CategoriesColumn')).toHaveLength(1);
          expect(libraryComponent.find('AlgorithmsColumn')).toHaveLength(0);
          expect(libraryComponent.find('VariantsColumn')).toHaveLength(0);
        });
      });

      describe('and the URL has a categoryId, and no algorithmId or variantId specified', () =>
      {
        it('should only display the algorithms column', () =>
        {
          libraryComponent = shallow(
            <Library
              library={library}
              analytics={analytics}
              analyticsActions={analyticsActions}
              schema={schema}
              singleColumn={true}
              router={{ params: { categoryId } }}
            />,
          );
          expect(libraryComponent.find('CategoriesColumn')).toHaveLength(0);
          expect(libraryComponent.find('AlgorithmsColumn')).toHaveLength(1);
          expect(libraryComponent.find('VariantsColumn')).toHaveLength(0);
        });
      });

      describe('and the URL has a categoryId and algorithmId but no variantId specified', () =>
      {
        it('should only display the variants column', () =>
        {
          libraryComponent = shallow(
            <Library
              library={library}
              analytics={analytics}
              analyticsActions={analyticsActions}
              schema={schema}
              singleColumn={true}
              router={{ params: { categoryId, algorithmId } }}
            />,
          );
          expect(libraryComponent.find('CategoriesColumn')).toHaveLength(0);
          expect(libraryComponent.find('AlgorithmsColumn')).toHaveLength(0);
          expect(libraryComponent.find('VariantsColumn')).toHaveLength(1);
        });
      });

      describe('and the URL has a categoryId, an algorithmId and a variantId specified', () =>
      {
        it('should only display the algorithms column', () =>
        {
          libraryComponent = shallow(
            <Library
              library={library}
              analytics={analytics}
              analyticsActions={analyticsActions}
              schema={schema}
              singleColumn={true}
              router={{ params: { categoryId, algorithmId, variantId: variantId.toString() } }}
            />,
          );
          expect(libraryComponent.find('CategoriesColumn')).toHaveLength(0);
          expect(libraryComponent.find('AlgorithmsColumn')).toHaveLength(0);
          expect(libraryComponent.find('VariantsColumn')).toHaveLength(1);
        });
      });
    });
  });
});
