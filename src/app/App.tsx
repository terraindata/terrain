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

require('babel-polyfill');

// Style
require("./App.less");

// Libraries
import * as $ from 'jquery';
import * as React from 'react';
import * as ReactDOM from "react-dom";
import * as Perf from 'react-addons-perf';
window['PerfStart'] = Perf.start;
window['PerfEnd'] = () => { Perf.stop(); setTimeout(() => Perf.printWasted(Perf.getLastMeasurements()), 250); }

// Components
import LayoutManager from "./builder/components/layout/LayoutManager.tsx";
import Builder from "./builder/components/Builder.tsx";
import Browser from './browser/components/Browser.tsx';
import X from './x/components/X.tsx';
import Account from './users/components/Account.tsx';
import Settings from './users/components/Settings.tsx';
import Notifications from './users/components/Notifications.tsx';
import Profile from './users/components/Profile.tsx';
import EditProfile from './users/components/EditProfile.tsx';
import Team from './users/components/Team.tsx';
import Sidebar from "./common/components/Sidebar.tsx";
import AccountDropdown from "./common/components/AccountDropdown.tsx";
import Login from "./auth/components/Login.tsx";
import InfoArea from "./common/components/InfoArea.tsx";
import Placeholder from "./common/components/Placeholder.tsx";
import Redirect from "./common/components/Redirect.tsx";
import ManualWrapper from "./manual/components/ManualWrapper.tsx";
var ReactTooltip = require("./common/components/tooltip/react-tooltip.js");
import { Router, Route, IndexRoute } from 'react-router';
import { createHistory } from 'history';
let history = createHistory();

// Icons
var TerrainIcon = require("./../images/icon_terrain_108x17.svg?name=TerrainIcon");
var HomeIcon = require("./../images/icon_profile_16x16.svg?name=HomeIcon");
var BrowserIcon = require("./../images/icon_browser_20x16.svg?name=BrowserIcon");
var BuilderIcon = require("./../images/icon_reporting_18x18.svg?name=BuilderIcon");
var ReportingIcon = require("./../images/icon_builder_18x18.svg?name=ReportingIcon");
var TQLIcon = require("./../images/icon_tql_17x14.svg?name=TQLIcon");
var ManualIcon = require ("./../images/icon_info.svg")

import AuthActions from "./auth/data/AuthActions.tsx";
import BuilderActions from "./builder/data/BuilderActions.tsx";
import AuthStore from "./auth/data/AuthStore.tsx";
import UserActions from "./users/data/UserActions.tsx";
import { InAppNotification } from './common/components/InAppNotification.tsx';


var links = 
[
  // {
  //   icon: <HomeIcon />,
  //   text: 'Account',
  //   route: '/account',
  // },
  // {
  //   icon: <ReportingIcon />,
  //   text: 'Reporting',
  //   route: '/reporting',
  // },
  {
    icon: <BrowserIcon />,
    text: 'Library',
    route: '/browser',
  },
  {
    icon: <BuilderIcon />,
    text: 'Builder',
    route: '/builder',
  },
  {
    icon: <ManualIcon />,
    text: 'Manual',
    route: '/manual',
  }
];

var App = React.createClass({
  componentDidMount() {
    // Respond to authentication state changes.
    AuthStore.subscribe(() => {
      let token = AuthStore.getState().get('authenticationToken');
      let loggedIn = token !== null;
      this.setState({
        loggedIn,
      });
      
      if(loggedIn)
      {
        setTimeout(() => this.setState({ loaded: true }), 500);
      }
      else
      {
        this.setState({
          loaded: false,
        });
      }
      
      if(token !== null)
      {
        UserActions.fetch();
      }
    });
    
    // Retrieve logged-in state from persistent storage.
    let token = localStorage['authenticationToken'];
    let username = localStorage['username'];
    if (token !== undefined && token !== null) {
      AuthActions.login(token, username);
    }
  },
  
  getInitialState()
  {
    return {
      selectedPage: 3,
      loggedIn: false,
      loaded: false,
    };
  },
  
  selectPage(index)
  {
  },
  
  toggleSidebar()
  {
    this.setState({
      sidebarExpanded: !this.state.sidebarExpanded,
    })
  },
  
  handleLogout()
  {
    AuthActions.logout();
  },
  
  renderApp()
  {
    if(!this.state.loggedIn)
    {
      return <Login />;
    }
    
    if(!this.state.loaded)
    {
      return null;
    }
    
    var sidebarWidth = this.state.sidebarExpanded ? 130 : 36;
    var selectedIndex = links.findIndex(link => this.props.location.pathname.indexOf(link.route) === 0 );
    
    var layout =
      {
        fullHeight: true,
        columns:
        [
          {
            width: sidebarWidth,
            content: <Sidebar 
              links={links}
              selectedIndex={selectedIndex}
              onChange={this.selectPage}
              expandable={true}
              expanded={this.state.sidebarExpanded}
              onExpand={this.toggleSidebar}
            />
          },
          {
            content: this.props.children,
          }
        ],
      };
     
    return <LayoutManager layout={layout} />;
  },
  
  handleMouseMove(e:Event)
  {
    BuilderActions.hoverCard(null);
  },

  render ()
  {
    return (
      <div
        className='app'
        onMouseMove={this.handleMouseMove}
      >
        { 
          this.state.loggedIn &&
            <div className='app-top-bar'>
              <TerrainIcon className='app-top-bar-icon' />
               <AccountDropdown 
                 onLogout={this.handleLogout} 
                 history={this.props.history} 
               />
            </div>
        }
        <div className='app-wrapper'>
          { 
            this.renderApp()
          }
        </div>
        
        <ReactTooltip
          place="bottom"
          effect="solid"
          class="tooltip"
          hideOnClick={true}
        />

        <InAppNotification />
        
      </div>
    );
  },
});


var router = (
  <Router history={history}>
    <Route path="/" component={App}>
      <IndexRoute component={Redirect} />
    
      <Route path="/builder" component={Builder} />
      <Route path="/builder/:config" component={Builder} />
      <Route path="/builder/:config/:splitConfig" component={Builder} />
      
      <Route path="/browser" component={Browser} />
      <Route path="/browser/:groupId" component={Browser} />
      <Route path="/browser/:groupId/:algorithmId" component={Browser} />
      <Route path="/browser/:groupId/:algorithmId/:variantId" component={Browser} />
      
      <Route path="/account" component={Account}>
        <IndexRoute component={Profile} />
        <Route path="/account/profile" component={Profile} />
        <Route path="/account/profile/edit" component={EditProfile} />
        <Route path="/account/settings" component={Settings} />
        <Route path="/account/notifications" component={Notifications} />
        <Route path="/account/team" component={Team} />
      </Route>
      
      <Route path="/manual" component={ManualWrapper} />
      <Route path="/manual/:term" component={ManualWrapper} />
      
      <Route path="/users/:username" component={Profile} />
      
      <Route path="/reporting" component={Placeholder} />
      
      <Route path="/x" component={X} />
      <Route path="/x/:x" component={X} />

    </Route>
  </Router>
);

ReactDOM.render(router, document.getElementById('app'), function () {
  // tests can go here
});