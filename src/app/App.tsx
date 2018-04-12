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

// tslint:disable:no-var-requires no-reference no-unused-expression strict-boolean-expressions max-line-length no-console

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
import { ColorsActions } from 'app/colors/data/ColorsRedux';
import { _ColorsState, ColorsState } from 'app/colors/data/ColorsTypes';
import { AuthState } from 'auth/AuthTypes';
import { LibraryState } from 'library/LibraryTypes';
import ContainerDimensions from 'react-container-dimensions';
import { SchemaActions } from 'schema/data/SchemaRedux';
import { injectGlobal } from 'styled-components';
import { UserState } from 'users/UserTypes';
import TerrainTools from 'util/TerrainTools';
import { AuthActions } from './auth/data/AuthRedux';
import LibraryActions from './library/data/LibraryActions';
// import RolesActions from './roles/data/RolesActions';
// import RolesStore from './roles/data/RolesStore';
import TerrainStore from './store/TerrainStore';
import { UserActions } from './users/data/UserRedux';
const GilroySrc = require('app/common/fonts/Gilroy-Regular.woff');
const GilroyLightSrc = require('app/common/fonts/Gilroy-Light.woff');
const GilroyLightItalicSrc = require('app/common/fonts/Gilroy-LightItalic.woff');
const GilroyBoldSrc = require('app/common/fonts/Gilroy-Bold.woff');
const GilroySemiBoldSrc = require('app/common/fonts/Gilroy-SemiBold.woff');

// Icons
const HomeIcon = require('./../images/icon_profile_16x16.svg?name=HomeIcon');
const LibraryIcon = require('./../images/icon-manage.svg?name=LibraryIcon');
const BuilderIcon = require('./../images/icon-build.svg');
const ReportingIcon = require('./../images/icon-analytics?name=ReportingIcon');
const SchemaIcon = require('./../images/icon-schema.svg?name=SchemaIcon');
const ImportIcon = require('./../images/icon-import.svg?name=ImportIcon');
const ControlIcon = require('./../images/icon-control.svg');
const TQLIcon = require('./../images/icon_tql_17x14.svg?name=TQLIcon');
const ManualIcon = require('./../images/icon_info.svg');
const BackgroundImage = require('./../images/background.png');

injectGlobal`
  @font-face {
    font-family: 'Gilroy';
    src: url(${GilroySrc}) format('woff');
    font-weight: normal;
    font-style: normal;
  }

@font-face {
    font-family: 'Gilroy-Light-Italic';
    src: url(${GilroyLightItalicSrc}) format('woff');
    font-weight: 300;
    font-style: italic;
}

@font-face {
    font-family: 'Gilroy-Light';
    src: url(${GilroyLightSrc}) format('woff');
    font-weight: 300;
    font-style: normal;
}

@font-face {
    font-family: 'Gilroy-Bold';
    src: url(${GilroyBoldSrc}) format('woff');
    font-weight: bold;
    font-style: normal;
}

  @font-face {
      font-family: 'Gilroy-Semi-Bold';
      src: url(${GilroySemiBoldSrc}) format('woff');
      font-weight: 600;
      font-style: normal;
  }
`;

const RESOLUTION_BREAKPOINT_1 = 980; // First resolution breakpoint is 980px

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
    {
      icon: <ReportingIcon />,
      text: 'Analytics',
      route: '/analytics',
      enabled: TerrainTools.isFeatureEnabled(TerrainTools.ANALYTICS),
    },
    {
      icon: <ControlIcon />,
      text: 'Control',
      route: '/control',
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
  schemaActions: typeof SchemaActions;
  colorsActions: typeof ColorsActions;
  colors: ColorsState;
  users?: UserState;
  userActions?: typeof UserActions;
  auth?: AuthState;
  authActions?: typeof AuthActions;
  library?: LibraryState;
  libraryActions?: typeof LibraryActions;
  builderActions?: typeof BuilderActions;
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
    sidebarExpanded: true,
    loggedInAndLoaded: false,

    schemaLoaded: false,

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
      alert('Terrain is not meant to work in Internet Explorer. Please try another browser.');
    }

    // this._subscribe(RolesStore, {
    //   stateKey: 'rolesLoaded',
    //   storeKeyPath: ['loaded'],
    // });

    // Retrieve logged-in state from persistent storage.
    const accessToken = localStorage['accessToken'];
    const id = localStorage['id'];
    if (accessToken !== undefined && id !== undefined)
    {
      this.props.authActions({
        actionType: 'login',
        accessToken,
        id,
      });
    }
  }

  public componentWillMount()
  {
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: 'input',
      style: { 'background': Colors().inputBg, 'color': Colors().text1, 'border-color': Colors().inputBorder },
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: 'input:hover &:not(input:disabled)',
      style: { 'background': Colors().inputFocusBg, 'border-color': Colors().inactiveHover },
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: 'input:focus',
      style: { 'background': Colors().inputFocusBg, 'border-color': Colors().inputBorder },
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '::-webkit-scrollbar-track',
      style: { background: Colors().scrollbarBG },
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '::-webkit-scrollbar-thumb',
      style: { background: Colors().scrollbarPiece },
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.altBg ::-webkit-scrollbar-thumb',
      style: { background: Colors().altScrollbarPiece },
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.altBg',
      style: { color: Colors().altText1 },
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.card-muted-input input:hover',
      style: { 'background': Colors().inputBg + ' !important', 'border-color': Colors().inputBorder },
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.close svg, svg.close',
      style: { fill: Colors().iconColor },
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.close:hover svg, svg.close:hover',
      style: { fill: Colors().activeText },
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.dropdown-value',
      style: { 'border-color': Colors().inputBorder },
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.dropdown-value:before',
      style: { 'border-top': '7px solid ' + Colors().text1 },
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.dropdown-wrapper:not(.dropdown-disabled):hover .dropdown-value:before',
      style: { 'border-top': '7px solid ' + Colors().active },
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.button',
      style: { backgroundColor: Colors().active, color: Colors().activeText },
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.link',
      style: { color: Colors().active },
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.link:hover',
      style: { color: Colors().import },
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.link:active',
      style: { color: Colors().active },
    });

    const tooltipStyles = generateThemeStyles();
    _.map(tooltipStyles, (value, key) =>
    {
      this.props.colorsActions({
        actionType: 'setStyle',
        selector: key,
        style: value,
      });
    });
  }

  public componentWillReceiveProps(nextProps)
  {
    if (this.props.auth !== nextProps.auth)
    {
      const token = nextProps.auth.accessToken;
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
    }
  }

  public fetchData()
  {
    this.props.userActions({
      actionType: 'fetch',
    });
    TerrainStore.dispatch(LibraryActions.fetch());
    this.props.libraryActions.fetch();
    this.props.schemaActions({
      actionType: 'fetch',
    });
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
    return this.props.library.loaded
      && (this.props.users && this.props.users.get('loaded'));
    // && this.state.rolessLoaded
  }

  public renderApp(width)
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

    const sidebarWidth = this.state.sidebarExpanded && width > RESOLUTION_BREAKPOINT_1 ? 205 : 36;
    const sidebarExpanded = this.state.sidebarExpanded && width > RESOLUTION_BREAKPOINT_1;
    const selectedIndex = links.findIndex((link) => this.props.location.pathname.indexOf(link.route) === 0);
    const style = {
      backgroundImage: `url(${BackgroundImage})`,
    };
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
                expanded={sidebarExpanded}
                onExpand={this.toggleSidebar}
              />,
            },
            {
              noProps: true,
              content:
                <div
                  className='app-inner'
                  style={style}
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
    this.props.builderActions.hoverCard(null);
  }

  public render()
  {
    if (this.state.noLocalStorage)
    {
      return (
        <InfoArea
          large="Terrain cannot be used successfully on this browser in 'private' / 'incognito' mode. Please switch to another browser or turn off incognito mode."
        />
      );
    }

    return (
      <ContainerDimensions>
        {({ width, height }) => (
          <div
            className='app'
            onMouseMove={this.handleMouseMove}
            key='app'
            style={APP_STYLE}
          >

            <div
              className='app-wrapper'
            >
              {
                this.renderApp(width)
              }
            </div>

            <DeployModal />
            <StyleTag
              style={this.props.colors.styles}
            />

            <InAppNotification />

            <EasterEggs />
          </div>
        )}
      </ContainerDimensions>

    );
  }
}

export default Util.createContainer(
  App,
  ['users', 'auth', 'colors', 'library'],
  {
    authActions: AuthActions,
    schemaActions: SchemaActions,
    userActions: UserActions,
    colorsActions: ColorsActions,
    libraryActions: LibraryActions,
    builderActions: BuilderActions,
  },
);
