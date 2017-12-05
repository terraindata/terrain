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
import VariantsColumn from 'library/components/VariantsColumn';
import { _LibraryState, LibraryState } from 'library/data/LibraryStore';
import * as LibraryTypes from 'library/LibraryTypes';
import * as React from 'react';
import { browserHistory } from 'react-router';
import configureStore from 'redux-mock-store';

describe('VariantsColumn', () =>
{
  const categoryId = 1;
  const groupId = 2;
  const variantId = 3;
  let library = _LibraryState({
    categories: Immutable.Map<number, LibraryTypes.Category>({}),
    groups: Immutable.Map<number, LibraryTypes.Category>({}),
    variants: Immutable.Map<number, LibraryTypes.Variant>({}),
  });

  library = library
    .setIn(['categories', categoryId], LibraryTypes._Category({
      id: categoryId,
      name: 'Category 1',
    }))
    .setIn(['groups', groupId], LibraryTypes._Group({
      id: groupId,
      name: 'Group 1',
    }))
    .setIn(['variants', variantId], LibraryTypes._Variant({
      id: variantId,
      name: 'Variant 1',
    }));

  const analytics: AnalyticsState = _AnalyticsState({
    loaded: true,
    data: Immutable.Map({}),
    selectedMetric: 1,
  });

  const analyticsActions = {
    selectAnalyticsConnection: (connectionName) => { return; },
    fetch: () => { return; },
  };

  const selectedVariant = 3;

  let variantsColumnComponent = null;

  beforeEach(() =>
  {
    variantsColumnComponent = shallow(
      <VariantsColumn
        basePath={'/library'}
        variants={library.variants}
        variantsOrder={library.groups.get(groupId).variantsOrder}
        categoryId={categoryId}
        groupId={groupId}
        groups={library.groups}
        selectedVariant={selectedVariant}
        analytics={analytics}
        analyticsActions={analyticsActions}
        canPinItems={false}
        router={{ params: { categoryId: '1' }, location: { query: '' } }}
      />,
    );
  });

  describe('#handleDoubleClick', () =>
  {
    describe('when canPinItems is set to false', () =>
    {
      it('should redirect to the builder', () =>
      {
        browserHistory.push = jest.fn();
        variantsColumnComponent.instance().handleDoubleClick(variantId);

        expect(browserHistory.push).toHaveBeenCalledTimes(1);
        expect(browserHistory.push).toHaveBeenCalledWith(`/builder/?o=${variantId}`);
      });
    });

    describe('when canPinItems is set to true', () =>
    {
      it('should NOT redirect to the builder', () =>
      {
        variantsColumnComponent = shallow(
          <VariantsColumn
            basePath={'/library'}
            variants={library.variants}
            variantsOrder={library.groups.get(groupId).variantsOrder}
            categoryId={categoryId}
            groupId={groupId}
            groups={library.groups}
            selectedVariant={selectedVariant}
            analytics={analytics}
            analyticsActions={analyticsActions}
            canPinItems={true}
            router={{ params: { categoryId: '1' }, location: { query: '' } }}
          />,
        );

        browserHistory.push = jest.fn();
        variantsColumnComponent.instance().handleDoubleClick(variantId);

        expect(browserHistory.push).not.toHaveBeenCalled();
      });
    });
  });
});
