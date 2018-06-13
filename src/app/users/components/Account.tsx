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

// tslint:disable:no-var-requires switch-default

import * as classNames from 'classnames';
import * as React from 'react';
import { Link, Route, Switch } from 'react-router-dom';

import TerrainComponent from './../../common/components/TerrainComponent';
import './Account.less';

import Connections from './Connections';
import EditProfile from './EditProfile';
import Notifications from './Notifications';
import Profile from './Profile';
import Settings from './Settings';
import Team from './Team';

const HomeIcon = require('./../../../images/icon_profile_16x16.svg?name=HomeIcon');

export interface Props
{
  location?: any;
  children?: any;
}

class Account extends TerrainComponent<Props>
{
  public render()
  {

    let title = 'Account';
    let selected = '298px';
    const linkWidth = -144;
    let profileActive: boolean;
    let notificationsActive: boolean;
    let teamActive: boolean;
    let settingsActive: boolean;
    let connectionsActive: boolean;

    switch (this.props.location.pathname)
    {
      case '/account/profile':
      case '/account/profile/edit':
        profileActive = true;
        title = 'Profile';
        // selected = '298px'; // use this when we add notifications back in
        selected = '154px';
        break;
      case '/account/notifications':
        notificationsActive = true;
        title = 'Notifications';
        selected = '154px';
        break;
      case '/account/connections':
        connectionsActive = true;
        title = 'Connections';
        selected = '298px';
        break;
      case '/account/team':
        teamActive = true;
        title = 'Team';
        selected = 'calc(100% - 10px - 144px)';
        break;
      case '/account/settings':
        settingsActive = true;
        title = 'Settings';
        selected = '10px';
        break;
    }

    // add this back in when ready
    // <Link
    //   to={'/account/notifications'}
    //   className={classNames({
    //     'account-link': true,
    //     'active': notificationsActive,
    //   })}  >
    //   Notifications
    // </Link>
    return (
      <div className='account'>
        <div className='account-wrapper'>
          <div className='account-title'>
            <HomeIcon />
            {
              title
            }
          </div>
          <div className='account-links'>
            <div
              className='selected-link-marker'
              style={{
                left: selected,
              }}
            />
            <Link
              to={'/account/settings'}
              className={classNames({
                'account-link': true,
                'active': settingsActive,
              })}
            >
              Settings
            </Link>
            <Link
              to={'/account/profile'}
              className={classNames({
                'account-link': true,
                'active': profileActive,
              })}  >
              Profile
            </Link>
            <Link
              to={'/account/connections'}
              className={classNames({
                'account-link': true,
                'active': connectionsActive,
              })}
            >
              Connections
            </Link>
            <Link
              to={'/account/team'}
              className={classNames({
                'account-link': true,
                'active': teamActive,
              })}  >
              Team
            </Link>
          </div>
          <div className='account-inner'>
            <Switch>
              <Route exact path='/' component={Profile} />
              <Route exact path='/account/profile' component={Profile} />
              <Route exact path='/account/profile/edit' component={EditProfile} />
              <Route exact path='/account/settings' component={Settings} />
              <Route exact path='/account/notifications' component={Notifications} />
              <Route exact path='/account/connections' component={Connections} />
              <Route exact path='/account/team' component={Team} />
            </Switch>
          </div>
        </div>
      </div>
    );
  }
}

export default Account;
