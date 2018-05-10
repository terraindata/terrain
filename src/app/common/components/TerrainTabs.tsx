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
import TerrainComponent from 'common/components/TerrainComponent';
import 'common/components/TerrainTabs.less';
import * as React from 'react';
import { browserHistory } from 'react-router';
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs';

interface TabConfig
{
  key: string;
  label: string;
}

interface TabsProps
{
  tabs: TabConfig[];
  children: any;
  tabToRouteMap: { [tabKey: string]: string };
  router: any;
}

interface TabsState
{
  tabIndex: number;
}

class TerrainTabs extends TerrainComponent<TabsProps>
{
  public state: TabsState = {
    tabIndex: 0,
  };

  public constructor(props)
  {
    super(props);

    this.state = {
      tabIndex: this.getActiveTabIndex(),
    };
  }

  public handleSelect(tabIndex: number)
  {
    const { tabs, tabToRouteMap } = this.props;

    this.setState({ tabIndex });

    if (tabToRouteMap !== undefined)
    {
      const tabKey = tabs[tabIndex].key;
      browserHistory.replace(tabToRouteMap[tabKey]);
    }
  }

  public getActiveTabIndex()
  {
    const { tabs, router, tabToRouteMap } = this.props;
    const activeTabIndex = tabs.findIndex((tab) =>
    {
      return router.location.pathname.startsWith(tabToRouteMap[tab.key]);
    });

    return activeTabIndex;
  }

  public render()
  {
    const { tabs, children, tabToRouteMap, router } = this.props;
    const { tabIndex } = this.state;

    return (
      <Tabs selectedIndex={tabIndex} onSelect={this.handleSelect}>
        <TabList>
          {
            tabs.map((tab, index) => <Tab key={`tab-${tab.key}`}>{tab.label}</Tab>)
          }
        </TabList>
        {
          tabs.map((tab, index) =>
          {
            const content = router.location.pathname.startsWith(tabToRouteMap[tab.key]) ?
              children : <div />;
            return <TabPanel key={`tab-panel-${tab.key}`}>{content}</TabPanel>;
          })
        }
      </Tabs>
    );
  }
}

export default TerrainTabs;
