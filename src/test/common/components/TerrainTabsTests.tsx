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

// Copyright 2018 Terrain Data, Inc.
// tslint:disable:no-empty

import TerrainTabs from 'common/components/TerrainTabs';
import { shallow } from 'enzyme';
import * as React from 'react';
import * as router from 'react-router';

describe('TerrainTabs', () =>
{
  let tabsComponent = null;
  const tabs = [
    {
      key: 'tab1',
      label: 'Tab 1',
    },
    {
      key: 'tab2',
      label: 'Tab 2',
    },
    {
      key: 'tab3',
      label: 'Tab 3',
    },
  ];

  beforeEach(() =>
  {
    tabsComponent = shallow(
      <TerrainTabs tabs={tabs}>
        <div id="tab-content-1" />
        <div id="tab-content-2" />
        <div id="tab-content-3" />
      </TerrainTabs>,
    );
  });

  it('should display the tabbed layout', () =>
  {
    expect(tabsComponent.find('Tabs')).toHaveLength(1);
    expect(tabsComponent.find('Tabs').props().selectedIndex).toEqual(0);
    expect(tabsComponent.find('TabList')).toHaveLength(1);
    expect(tabsComponent.find('Tab')).toHaveLength(tabs.length);
    expect(tabsComponent.find('TabList').find('Tab').at(0).childAt(0).text()).toEqual('Tab 1');
    expect(tabsComponent.find('TabList').find('Tab').at(1).childAt(0).text()).toEqual('Tab 2');

    expect(tabsComponent.find('TabPanel')).toHaveLength(tabs.length);
    expect(tabsComponent.find('TabPanel').at(0).find('#tab-content-1')).toHaveLength(1);
    expect(tabsComponent.find('TabPanel').at(1).find('#tab-content-2')).toHaveLength(1);
    expect(tabsComponent.find('TabPanel').at(2).find('#tab-content-3')).toHaveLength(1);
  });

  describe('when there is no specified selectedTab', () =>
  {
    it('should activate the tab matching the browser route by default', () => {
      expect(tabsComponent.find('Tabs').props().selectedIndex).toEqual(0);
    });
  });

  describe('when a selectedTab is specified', () =>
  {
    it('should activate the tab matching the browser route by default', () => {
      tabsComponent = shallow(
        <TerrainTabs tabs={tabs} selectedTab={'tab2'}>
          <div id="tab-content-1" />
          <div id="tab-content-2" />
          <div id="tab-content-3" />
        </TerrainTabs>,
      );

      expect(tabsComponent.find('Tabs').props().selectedIndex).toEqual(1);
    });
  });

  describe('#getTabIndex', () =>
  {
    it('should return the tab index', () =>
    {
      expect(tabsComponent.instance().getTabIndex('tab1')).toEqual(0);
      expect(tabsComponent.instance().getTabIndex('tab3')).toEqual(2);
    });
  });

  describe('#handleSelect', () =>
  {
    describe('when there is no tabToRouteMap specified', () =>
    {
      it('should update the selected tab index', () =>
      {
        tabsComponent.instance().handleSelect(1);

        expect(tabsComponent.state().tabIndex).toEqual(1);
      });
    });

    describe('when tabToRouteMap is specified', () =>
    {
      it('should update the selected tab index and update the browser address bar', () =>
      {
        router.browserHistory.replace = jest.fn();
        tabsComponent = shallow(
          <TerrainTabs
            tabs={tabs}
            tabToRouteMap={{ 'tab1': '/path/to/tab1', 'tab2': '/path/to/tab2' }}
          >
            <div id="tab-content-1" />
            <div id="tab-content-2" />
            <div id="tab-content-3" />
          </TerrainTabs>,
        );

        tabsComponent.instance().handleSelect(1);

        expect(tabsComponent.state().tabIndex).toEqual(1);
        expect(router.browserHistory.replace).toHaveBeenCalledTimes(1);
      });
    });
  });
});
