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

// tslint:disable:no-var-requires no-reference strict-boolean-expressions max-line-length no-console

/// <reference path="../typings/tsd.d.ts" />

require('babel-polyfill');

// Style
import './App.less';

// Libraries
import * as Immutable from 'immutable';
import * as _ from 'lodash';
import * as React from 'react';

const Perf = require('react-addons-perf');

require('velocity-animate');
require('velocity-animate/velocity.ui');
window['PerfStart'] = Perf.start;
window['PerfEnd'] = () => { Perf.stop(); setTimeout(() => Perf.printWasted(Perf.getLastMeasurements()), 250); };

// Components
import { generateThemeStyles } from 'common/components/tooltip/Tooltips';
import Login from './auth/components/Login';
import LayoutManager from './builder/components/layout/LayoutManager';
import AccountDropdown from './common/components/AccountDropdown';
import InfoArea from './common/components/InfoArea';
import Sidebar from './common/components/Sidebar';
import TerrainComponent from './common/components/TerrainComponent';

import { backgroundColor, Colors, fontColor } from './colors/Colors';
import { InAppNotification } from './common/components/InAppNotification';
import StyleTag from './common/components/StyleTag';
import DeployModal from './deploy/components/DeployModal';
import Ajax from './util/Ajax';
import Util from './util/Util';
import EasterEggs from './x/components/EasterEggs';

import BuilderActions from './builder/data/BuilderActions'; // for card hovering
// for error reporting

// data that needs to be loaded
import AuthActions from './auth/data/AuthActions';
import AuthStore from './auth/data/AuthStore';
import ColorsActions from './colors/data/ColorsActions';
import ColorsStore from './colors/data/ColorsStore';
import LibraryActions from './library/data/LibraryActions';
import LibraryStore from './library/data/LibraryStore';
// import RolesActions from './roles/data/RolesActions';
// import RolesStore from './roles/data/RolesStore';
import { SchemaActions, SchemaStore } from './schema/data/SchemaStore';
import TerrainStore from './store/TerrainStore';
import UserActions from './users/data/UserActions';
import UserStore from './users/data/UserStore';

// Icons
const TerrainIcon = require('./../images/logo_terrainLong_blue@2x.png');
const HomeIcon = require('./../images/icon_profile_16x16.svg?name=HomeIcon');
const LibraryIcon = require('./../images/icon_library_20x16.svg?name=LibraryIcon');
const BuilderIcon = require('./../images/icon_bldr-3.svg');
const ReportingIcon = require('./../images/icon_builder_18x18.svg?name=ReportingIcon');
const SchemaIcon = require('./../images/icon_schema.svg?name=SchemaIcon');
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
      text: 'Manage',
      route: '/library',
    },
    {
      icon: <BuilderIcon />,
      text: 'Build',
      route: '/builder',
    },
    {
      icon: <SchemaIcon />,
      text: 'Schema',
      route: '/schema',
    },
    {
      icon: <ImportIcon />,
      text: 'Import',
      route: '/import',
    },
    // {
    //   icon: <ReportingIcon />,
    //   text: 'Analytics',
    //   route: '/analytics',
    // },
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

const APP_STYLE = _.extend({},
  fontColor(Colors().text.baseLight),
  backgroundColor(Colors().bg1),
);

class App extends TerrainComponent<Props>
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

    stylesTag: Immutable.Map<string, React.CSSProperties>(),
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

    this._subscribe(ColorsStore, {
      stateKey: 'stylesTag',
      storeKeyPath: ['styles'],
    });

    // Retrieve logged-in state from persistent storage.
    const accessToken = localStorage['accessToken'];
    const id = localStorage['id'];
    if (accessToken !== undefined && id !== undefined)
    {
      AuthActions.login(accessToken, id);
    }
  }

  public componentWillMount()
  {
    ColorsActions.setStyle('input', { background: Colors().inputBg, color: Colors().text1, border: Colors().inputBorder });
    ColorsActions.setStyle('input:hover', { background: Colors().inputBg + ' !important', border: Colors().inputBorder + ' !important' });
    ColorsActions.setStyle('input:focus', { background: Colors().inputBg + ' !important', border: Colors().inputBorder + ' !important' });
    ColorsActions.setStyle('::-webkit-scrollbar-track', { background: Colors().scrollbarBG });
    ColorsActions.setStyle('::-webkit-scrollbar-thumb', { background: Colors().scrollbarPiece });
    ColorsActions.setStyle('.altBg ::-webkit-scrollbar-thumb', { background: Colors().altScrollbarPiece });
    ColorsActions.setStyle('.card-muted-input input:hover', { background: Colors().inputBg + ' !important', border: Colors().inputBorder });
    ColorsActions.setStyle('.close', { fill: Colors().altBg1 });
    ColorsActions.setStyle('.dropdown-value', { border: Colors().inputBorder});
    ColorsActions.setStyle('.dropdown-value:before', { 'border-top': 'red'});


    const tooltipStyles = generateThemeStyles();
    _.map(tooltipStyles, (value, key) =>
    {
      ColorsActions.setStyle(key, value);
    });
  }

  public fetchData()
  {
    UserActions.fetch();
    TerrainStore.dispatch(LibraryActions.fetch());
    LibraryStore.dispatch(LibraryActions.fetch());
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
        key='app'
        style={APP_STYLE}
      >
        {
          this.state.loggedInAndLoaded &&
          <div
            className='app-top-bar'
            style={backgroundColor(Colors().bg2)}
          >
            <img
              src={TerrainIcon}
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
        <StyleTag
          style={this.state.stylesTag}
        />

        <InAppNotification />

        <EasterEggs />
      </div>
    );
  }
}

export default App;
