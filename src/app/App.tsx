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

/// <reference path="../typings/tsd.d.ts" />

// Style
require("./GeneralStyle.less");

// Libraries
import * as React from 'react';
import * as ReactDOM from "react-dom";
import * as Perf from 'react-addons-perf';
window['PerfStart'] = Perf.start;
window['PerfEnd'] = () => { Perf.stop(); setTimeout(() => Perf.printWasted(Perf.getLastMeasurements()), 250); }

// Components
import LayoutManager from "./components/layout/LayoutManager.tsx";
import Builder from "./components/builder/Builder.tsx";
import Sidebar from "./components/layout/Sidebar.tsx";
import AccountDropdown from "./components/common/AccountDropdown.tsx";
import Login from "./components/common/Login.tsx";
import InfoArea from "./components/common/InfoArea.tsx";

// Icons
var TerrainIcon = require("./../images/icon_terrain_108x17.svg?name=TerrainIcon");
var HomeIcon = require("./../images/icon_profile_16x16.svg?name=HomeIcon");
var BrowserIcon = require("./../images/icon_browser_20x16.svg?name=BrowserIcon");
var BuilderIcon = require("./../images/icon_reporting_18x18.svg?name=BuilderIcon");
var ReportingIcon = require("./../images/icon_builder_18x18.svg?name=ReportingIcon");
var TQLIcon = require("./../images/icon_tql_17x14.svg?name=TQLIcon");

import Actions from "./data/Actions.tsx";
import Store from "./data/Store.tsx";

var App = React.createClass({
  componentDidMount() {
    // Respond to authentication state changes.
    Store.subscribe(() => {
      let token = Store.getState().get('authenticationToken');
      this.setState({
        loggedIn: token !== null
      });
    });
    
    // Retrieve logged-in state from persistent storage.
    let token = localStorage['authenticationToken'];
    if (token !== undefined && token !== null) {
      Actions.authentication.login(token);
    }
  },
  
  getInitialState()
  {
    return {
      selectedPage: 3,
      loggedIn: false,
    };
  },
  
  selectPage(index)
  {
    this.setState({
      selectedPage: index,
      sidebarExpanded: false,
    });
  },
  
  toggleSidebar()
  {
    this.setState({
      sidebarExpanded: !this.state.sidebarExpanded,
    })
  },
  
  handleLogout()
  {
    Actions.authentication.logout();
  },
  
  renderApp()
  {
    if(!this.state.loggedIn)
    {
      return <Login />;
    }
    
    var links = 
    [
      {
        icon: <HomeIcon />,
        text: 'Home',
      },
      {
        icon: <ReportingIcon />,
        text: 'Reporting',
      },
      {
        icon: <BrowserIcon />,
        text: 'Browser',
      },
      {
        icon: <BuilderIcon />,
        text: 'Builder',
      },
      {
        icon: <TQLIcon />,
        text: 'TQL',
      },
    ];
    
    var content = (
      <InfoArea large="This page is still in progress." />
    );
    
    switch(this.state.selectedPage) {
      case 3:
        content = <Builder />;
      // New pages added here
    }
    
    var sidebarWidth = this.state.sidebarExpanded ? 130 : 36;
    
    var layout =
      {
        fullHeight: true,
        columns:
        [
          {
            width: sidebarWidth,
            content: <Sidebar 
              links={links}
              selectedIndex={this.state.selectedPage}
              onChange={this.selectPage}
              expandable={true}
              expanded={this.state.sidebarExpanded}
              onExpand={this.toggleSidebar} />
          },
          {
            content: content
          }
        ],
      };
     
    return <LayoutManager layout={layout} />;
  },
  
  render ()
  {
    return (
      <div className='app'>
        <div className='app-top-bar'>
          <TerrainIcon className='app-top-bar-icon' />
          { this.state.loggedIn ? <AccountDropdown onLogout={this.handleLogout} /> : null }
        </div>
        <div className='app-wrapper'>
          { this.renderApp() }
        </div>
      </div>
    );
  }

});

ReactDOM.render(<App />, document.getElementById('app'), function () {
  // require('./tests').run(this);
  // TODO: tests here.
});