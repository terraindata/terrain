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
import PureClasss from './common/components/PureClasss.tsx';
import LayoutManager from "./builder/components/layout/LayoutManager.tsx";
import Builder from "./builder/components/Builder.tsx";
import Library from './library/components/Library.tsx';
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
import Logout from "./common/components/Logout.tsx";
import ManualWrapper from "./manual/components/ManualWrapper.tsx";
import InfoArea from './common/components/InfoArea.tsx';
var ReactTooltip = require("./common/components/tooltip/react-tooltip.js");
import { Router, Route, IndexRoute } from 'react-router';
const {browserHistory} = require('react-router');
// import { createHistory } from 'history';
// let history = createHistory();
import Ajax from './util/Ajax.tsx';

import BuilderStore from './builder/data/BuilderStore.tsx';
import LibraryStore from './library/data/LibraryStore.tsx';
import LibraryActions from './library/data/LibraryActions.tsx';
import UserStore from './users/data/UserStore.tsx';
import RolesStore from './roles/data/RolesStore.tsx';

// Icons
var TerrainIcon = require("./../images/icon_terrain_108x17.svg?name=TerrainIcon");
var HomeIcon = require("./../images/icon_profile_16x16.svg?name=HomeIcon");
var LibraryIcon = require("./../images/icon_library_20x16.svg?name=LibraryIcon");
var BuilderIcon = require("./../images/icon_reporting_18x18.svg?name=BuilderIcon");
var ReportingIcon = require("./../images/icon_builder_18x18.svg?name=ReportingIcon");
var TQLIcon = require("./../images/icon_tql_17x14.svg?name=TQLIcon");
var ManualIcon = require ("./../images/icon_info.svg")

import AuthActions from "./auth/data/AuthActions.tsx";
import BuilderActions from "./builder/data/BuilderActions.tsx";
import AuthStore from "./auth/data/AuthStore.tsx";
import UserActions from "./users/data/UserActions.tsx";
import RolesActions from "./roles/data/RolesActions.tsx";
import { InAppNotification } from './common/components/InAppNotification.tsx';
import DeployModal from './deploy/components/DeployModal.tsx';
import EasterEggs from './x/components/EasterEggs.tsx';

const links = 
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
    icon: <LibraryIcon />,
    text: 'Library',
    route: '/library',
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

interface Props
{
  location: {
    pathname: string,
  };
  children: any;
}

class App extends PureClasss<Props>
{
  state = {
    selectedPage: 3,
    loggedIn: false,
    sidebarExpanded: false,
    loggedInAndLoaded: false,
    
    libraryLoaded: false,
    usersLoaded: false,
    rolesLoaded: false,
    
    noLocalStorage: false,
  };
  
  constructor(props:Props)
  {
    super(props);
    
    try {
      // check to see if we can use localStorage
      localStorage['test'] = 'test';
    } catch(e)
    {
      this.state.noLocalStorage = true;
      return;
    }
    
    // Respond to authentication state changes.
    this._subscribe(AuthStore, {
      updater: (state) => {
        let token = AuthStore.getState().get('authenticationToken');
        let loggedIn = token !== null;
        let loggedInAndLoaded = loggedIn && this.state.loggedInAndLoaded;
        
        this.setState({
          loggedIn,
          loggedInAndLoaded,
        });
        
        if(token !== null)
        {
          this.fetchData();
        }
      }
    });
    
    this._subscribe(LibraryStore, {
      stateKey: 'libraryLoaded',
      storeKeyPath: ['loaded'],
    });
    
    this._subscribe(UserStore, {
      stateKey: 'usersLoaded',
      storeKeyPath: ['loaded'],
    });
    
    this._subscribe(RolesStore, {
      stateKey: 'rolesLoaded',
      storeKeyPath: ['loaded'],
    });
    
    // Retrieve logged-in state from persistent storage.
    let token = localStorage['authenticationToken'];
    let username = localStorage['username'];
    if (token !== undefined && token !== null) {
      AuthActions.login(token, username);
    }
  }
  
  fetchData()
  {
    UserActions.fetch();
    LibraryActions.fetch();
    RolesActions.fetch();
  }
  
  toggleSidebar()
  {
    this.setState({
      sidebarExpanded: !this.state.sidebarExpanded,
    })
  }
  
  handleLoginLoadComplete()
  {
    this.setState({
      loggedInAndLoaded: true,
    });
  }
  
  isAppStateLoaded(): boolean
  {
    return this.state.libraryLoaded 
      && this.state.rolesLoaded 
      && this.state.usersLoaded;
  }
  
  renderApp()
  {
    if(!this.state.loggedInAndLoaded)
    {
      return (
        <Login
          loggedIn={this.state.loggedIn}
          appStateLoaded={this.isAppStateLoaded()}
          onLoadComplete={this.handleLoginLoadComplete}
        />
      );
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
              expandable={true}
              expanded={this.state.sidebarExpanded}
              onExpand={this.toggleSidebar}
            />
          },
          {
            content: 
              <div
                className='app-inner'
              >
                {
                  this.props.children
                }
              </div>
            ,
          }
        ],
      };
     
    return <LayoutManager layout={layout} />;
  }
  
  handleMouseMove(e:MEvent)
  {
    BuilderActions.hoverCard(null);
  }

  render()
  {
    if(this.state.noLocalStorage)
    {
      return (
        <InfoArea
          large="Terraformer cannot be used successfully on this browser in 'private' / 'icognito' mode. Plesae switch to another browser or turn off incognito mode."
        />
      );
    }
    
    return (
      <div
        className='app'
        onMouseMove={this.handleMouseMove}
      >
        { 
          this.state.loggedInAndLoaded &&
            <div 
              className='app-top-bar'
            >
              <TerrainIcon 
                className='app-top-bar-icon'
              />
               <AccountDropdown />
            </div>
        }
        <div 
          className='app-wrapper'
        >
          { 
            this.renderApp()
          }
        </div>
        
        <DeployModal />
        
        <ReactTooltip
          place="bottom"
          effect="solid"
          class="tooltip"
          hideOnClick={true}
        />

        <InAppNotification />
        
        <EasterEggs />
      </div>
    );
  }
}


var router = (
  <Router history={browserHistory}>
    <Route path="/" component={App}>
      <IndexRoute component={Redirect} />
    
      <Route path="/builder" component={Builder} />
      <Route path="/builder/:config" component={Builder} />
      <Route path="/builder/:config/:splitConfig" component={Builder} />
      
      <Route path="/library">
        <IndexRoute component={Library} />
        <Route path=":groupId" component={Library}>
          <IndexRoute component={Library} />
          <Route path=":algorithmId" component={Library}>
            <IndexRoute component={Library} />
            <Route path=":variantId" component={Library}>
              <IndexRoute component={Library} />
            </Route>
          </Route>
        </Route>
      </Route>
      
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
      
      <Route path="/logout" component={Logout} />
      
      <Route path="/x" component={X} />
      <Route path="/x/:x" component={X} />
      
      <Route path='/browser' component={Redirect} />
      <Route path='/browser/:a' component={Redirect} />
      <Route path='/browser/:a/:b' component={Redirect} />
      <Route path='/browser/:a/:b/:c' component={Redirect} />

    </Route>
  </Router>
);

if(!DEV)
{
  // report uncaught errors in production
  window.onerror = function (errorMsg, url, lineNo, columnNo, error) {
    
    let user = UserStore.getState().get('currentUser');
    let username = user && user.username;
    let libraryState = JSON.stringify(LibraryStore.getState().toJS());
    let builderState = JSON.stringify(BuilderStore.getState().toJS());
    let location = JSON.stringify(window.location);
    
    let msg = `${errorMsg} by ${username}
      Location:
      ${location}
      
      Library State:
      ${libraryState}
      
      Builder State:
      ${builderState}
      
      Error Stack:
      ${error && error.stack}
    `;
    
    $.post('http://lukeknepper.com/email.php', {
        secret: '11235813',
        msg: msg
      });

    return false;
  }
}

ReactDOM.render(router, document.getElementById('app'), function () {
  // tests can go here
});