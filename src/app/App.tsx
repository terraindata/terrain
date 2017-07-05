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
/// <reference path="../typings/tsd.d.ts" />

require('babel-polyfill');

// Style
import './App.less';

// Libraries
import * as $ from 'jquery';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
const Perf = require('react-addons-perf');
import { IndexRoute, Route, Router } from 'react-router';
import { browserHistory } from 'react-router';
require('velocity-animate');
require('velocity-animate/velocity.ui');
window['PerfStart'] = Perf.start;
window['PerfEnd'] = () => { Perf.stop(); setTimeout(() => Perf.printWasted(Perf.getLastMeasurements()), 250); };

// Components
import Login from './auth/components/Login';
import Builder from './builder/components/Builder';
import LayoutManager from './builder/components/layout/LayoutManager';
import AccountDropdown from './common/components/AccountDropdown';
import InfoArea from './common/components/InfoArea';
import Logout from './common/components/Logout';
import Placeholder from './common/components/Placeholder';
import PureClasss from './common/components/PureClasss';
import Redirect from './common/components/Redirect';
import Sidebar from './common/components/Sidebar';
import FileImport from './fileImport/components/FileImport';
import Library from './library/components/Library';
import ManualWrapper from './manual/components/ManualWrapper';
import SchemaPage from './schema/components/SchemaPage';
import Account from './users/components/Account';
import EditProfile from './users/components/EditProfile';
import Notifications from './users/components/Notifications';
import Profile from './users/components/Profile';
import Settings from './users/components/Settings';
import Team from './users/components/Team';
import X from './x/components/X';
const ReactTooltip = require('./common/components/tooltip/react-tooltip.js');
import { InAppNotification } from './common/components/InAppNotification';
import DeployModal from './deploy/components/DeployModal';
import Ajax from './util/Ajax';
import Util from './util/Util';
import EasterEggs from './x/components/EasterEggs';

import BuilderActions from './builder/data/BuilderActions'; // for card hovering
import BuilderStore from './builder/data/BuilderStore'; // for error reporting

// data that needs to be loaded
import AuthActions from './auth/data/AuthActions';
import AuthStore from './auth/data/AuthStore';
import FileImportActions from './fileImport/data/FileImportActions';
import FileImportStore from './fileImport/data/FileImportStore';
import LibraryActions from './library/data/LibraryActions';
import LibraryStore from './library/data/LibraryStore';
// import RolesActions from './roles/data/RolesActions';
// import RolesStore from './roles/data/RolesStore';
import { SchemaActions, SchemaStore } from './schema/data/SchemaStore';
import UserActions from './users/data/UserActions';
import UserStore from './users/data/UserStore';

// Icons
const TerrainIcon = require('./../images/icon_terrain_108x17.svg?name=TerrainIcon');
const HomeIcon = require('./../images/icon_profile_16x16.svg?name=HomeIcon');
const LibraryIcon = require('./../images/icon_library_20x16.svg?name=LibraryIcon');
const BuilderIcon = require('./../images/icon_reporting_18x18.svg?name=BuilderIcon');
const ReportingIcon = require('./../images/icon_builder_18x18.svg?name=ReportingIcon');
const ImportIcon = require('./../images/icon_import.svg?name=ImportIcon');
const TQLIcon = require('./../images/icon_tql_17x14.svg?name=TQLIcon');
const ManualIcon = require('./../images/icon_info.svg');

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
      icon: <ReportingIcon />,
      text: 'Schema',
      route: '/schema',
    },
    {
      icon: <ImportIcon />,
      text: 'Import',
      route: '/import',
    },
    // {
    //   icon: <ManualIcon />,
    //   text: 'Manual',
    //   route: '/manual',
    // }
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
  public state = {
    selectedPage: 3,
    loggedIn: false,
    sidebarExpanded: false,
    loggedInAndLoaded: false,

    libraryLoaded: false,
    schemaLoaded: false,

    usersLoaded: false,

    noLocalStorage: false,
  };

  constructor(props: Props)
  {
    super(props);

    Ajax.midwayStatus(
      () => console.log('Midway is running'),
      () => console.log('Midway 2 is not running.'),
    );

    try
    {
      // check to see if we can use localStorage
      localStorage['test'] = 'test';
    } catch (e)
    {
      this.state.noLocalStorage = true;
      return;
    }

    if (Util.getIEVersion())
    {
      alert('Terraformer is not meant to work in Internet Explorer. Please try another browser.');
    }

    // Respond to authentication state changes.
    this._subscribe(AuthStore, {
      updater: (state) =>
      {
        const token = AuthStore.getState().accessToken;
        const loggedIn = !!token;
        const loggedInAndLoaded = loggedIn && this.state.loggedInAndLoaded;

        this.setState({
          loggedIn,
          loggedInAndLoaded,
        });

        if (token !== null)
        {
          this.fetchData();
        }
      },
    });

    this._subscribe(LibraryStore, {
      stateKey: 'libraryLoaded',
      storeKeyPath: ['loaded'],
    });

    this._subscribe(UserStore, {
      stateKey: 'usersLoaded',
      storeKeyPath: ['loaded'],
    });

    // this._subscribe(RolesStore, {
    //   stateKey: 'rolesLoaded',
    //   storeKeyPath: ['loaded'],
    // });

    this._subscribe(SchemaStore, {
      stateKey: 'schemaLoaded',
      storeKeyPath: ['loaded'],
    });

    // Retrieve logged-in state from persistent storage.
    const accessToken = localStorage['accessToken'];
    const id = localStorage['id'];
    if (accessToken !== undefined && id !== undefined)
    {
      AuthActions.login(accessToken, id);
    }
  }

  public fetchData()
  {
    UserActions.fetch();
    LibraryActions.fetch();
    SchemaActions.fetch();
    // RolesActions.fetch();
  }

  public toggleSidebar()
  {
    this.setState({
      sidebarExpanded: !this.state.sidebarExpanded,
    });
  }

  public handleLoginLoadComplete()
  {
    this.setState({
      loggedInAndLoaded: true,
    });
  }

  public isAppStateLoaded(): boolean
  {
    return this.state.libraryLoaded
      && this.state.usersLoaded;
    // && this.state.rolesLoaded
  }

  public renderApp()
  {
    if (!this.state.loggedInAndLoaded)
    {
      return (
        <Login
          loggedIn={this.state.loggedIn}
          appStateLoaded={this.isAppStateLoaded()}
          onLoadComplete={this.handleLoginLoadComplete}
        />
      );
    }

    const sidebarWidth = this.state.sidebarExpanded ? 130 : 36;
    const selectedIndex = links.findIndex((link) => this.props.location.pathname.indexOf(link.route) === 0);

    const layout =
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
            />,
          },
          {
            noProps: true,
            content:
            <div
              className='app-inner'
            >
              {
                this.props.children
              }
            </div>
            ,
          },
        ],
      };

    return <LayoutManager layout={layout} />;
  }

  public handleMouseMove(e: MEvent)
  {
    BuilderActions.hoverCard(null);
  }

  public render()
  {
    if (this.state.noLocalStorage)
    {
      return (
        <InfoArea
          large="Terraformer cannot be used successfully on this browser in 'private' / 'incognito' mode. Please switch to another browser or turn off incognito mode."
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
          place='bottom'
          effect='solid'
          class='tooltip'
          hideOnClick={true}
        />

        <InAppNotification />

        <EasterEggs />
      </div>
    );
  }
}

const router = (
  <Router history={browserHistory}>
    <Route path='/' component={App}>rsv E`
      <IndexRoute component={Redirect} />

      <Route path='/builder' component={Builder} />
      <Route path='/builder/:config' component={Builder} />
      <Route path='/builder/:config/:splitConfig' component={Builder} />

      <Route path='/library'>
        <IndexRoute component={Library} />
        <Route path=':groupId' component={Library}>
          <IndexRoute component={Library} />
          <Route path=':algorithmId' component={Library}>
            <IndexRoute component={Library} />
            <Route path=':variantId' component={Library}>
              <IndexRoute component={Library} />
            </Route>
          </Route>
        </Route>
      </Route>

      <Route path='/account' component={Account}>
        <IndexRoute component={Profile} />
        <Route path='/account/profile' component={Profile} />
        <Route path='/account/profile/edit' component={EditProfile} />
        <Route path='/account/settings' component={Settings} />
        <Route path='/account/notifications' component={Notifications} />
        <Route path='/account/team' component={Team} />
      </Route>

      <Route path='/manual' component={ManualWrapper} />
      <Route path='/manual/:term' component={ManualWrapper} />

      <Route path='/users/:userId' component={Profile} />

      <Route path='/reporting' component={Placeholder} />

      <Route path='/logout' component={Logout} />

      <Route path='/x' component={X} />
      <Route path='/x/:x' component={X} />

      <Route path='/browser' component={Redirect} />
      <Route path='/browser/:a' component={Redirect} />
      <Route path='/browser/:a/:b' component={Redirect} />
      <Route path='/browser/:a/:b/:c' component={Redirect} />

      <Route path='/schema' component={SchemaPage} />

      <Route path='/import' component={FileImport} />
    </Route>
  </Router>
);

if (!DEV)
{
  // report uncaught errors in production
  window.onerror = (errorMsg, url, lineNo, columnNo, error) =>
  {

    const user = UserStore.getState().get('currentUser');
    const userId = user && user.id;
    const libraryState = JSON.stringify(LibraryStore.getState().toJS());
    const builderState = JSON.stringify(BuilderStore.getState().toJS());
    const location = JSON.stringify(window.location);

    const msg = `${errorMsg} by ${userId}
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
      msg,
      secret: '11235813',
    });

    return false;
  };
}

ReactDOM.render(router, document.getElementById('app'), () =>
{
  // tests can go here
});
