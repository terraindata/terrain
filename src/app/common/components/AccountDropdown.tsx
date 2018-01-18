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

// tslint:disable:no-empty-interface strict-boolean-expressions no-var-requires

import * as $ from 'jquery';
import * as React from 'react';
import { browserHistory } from 'react-router';
import { Colors } from '../../colors/Colors';
import { ColorsActions } from '../../colors/data/ColorsRedux';
import TerrainComponent from '../../common/components/TerrainComponent';
import UserThumbnail from '../../users/components/UserThumbnail';
import * as UserTypes from '../../users/UserTypes';
import Util from '../../util/Util';
import './AccountDropdown.less';
import Modal from './Modal';
const CommitLog = require('../../../commitlog.txt');
const VersionLog = require('../../../versionlog.txt');

const ArrowIcon = require('./../../../images/icon_arrow_8x5.svg?name=ArrowIcon');

const LogoutIcon = require('./../../../images/icon_logout.svg');
const EditIcon = require('./../../../images/icon_edit.svg');
const HomeIcon = require('./../../../images/icon_profile_16x16.svg?name=HomeIcon');
const ConnectionsIcon = require('./../../../images/icon_gear.svg?name=ConnectionsIcon');
const InfoIcon = require('../../../images/icon_info.svg?name=InfoIcon');
const CreditsIcon = require('../../../images/icon_group.svg?name=CreditsIcon');

export interface Props
{
  colorsActions?: typeof ColorsActions;
  users?: UserTypes.UserState;
}

export interface State
{
  open?: boolean;
  aboutTerrainOpen?: boolean;
  showingCredits?: boolean;
}

class AccountDropdown extends TerrainComponent<Props>
{
  public state: State = {};

  public unsubscribe = null;

  public componentWillMount()
  {
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.account-arrow-icon .st0',
      style: { fill: Colors().text3 },
    });
  }

  public componentWillUnmount()
  {
    $('body').unbind('click', this.close);
  }

  public close(event)
  {
    this.setState({
      open: false,
    });
    $('body').unbind('click', this.close);
    event.stopPropagation();
  }

  public open(event)
  {
    this.setState({
      open: true,
    });
    $('body').click(this.close);
    event.stopPropagation();
  }

  public editProfile()
  {
    this.go('/account/profile/edit');
  }

  public showConnections()
  {
    this.go('/account/connections');
  }

  public goTeamGoTeamGo()
  {
    this.go('/account/team');
  }

  public go(url: string)
  {
    browserHistory.push(url);
  }

  public handleLogout()
  {
    this.go('/logout');
  }

  public renderDropdown()
  {
    if (!this.state.open)
    {
      return null;
    }

    const { users } = this.props;

    return (
      <div className='account-dropdown-content'>
        <div className='account-dropdown-row' onMouseDown={this.editProfile}>
          <div className='account-dropdown-icon account-dropdown-icon-red'>
            <EditIcon />
          </div>
          <div className='account-dropdown-link'>
            Edit Profile
          </div>
        </div>
        <div className='account-dropdown-row' onMouseDown={this.goTeamGoTeamGo}>
          <div className='account-dropdown-icon account-dropdown-icon-blue'>
            <HomeIcon />
          </div>
          <div className='account-dropdown-link'>
            My Team
          </div>
        </div>
        <div className='account-dropdown-row' onMouseDown={this.showConnections}>
          <div className='account-dropdown-icon account-dropdown-icon-green'>
            <ConnectionsIcon />
          </div>
          <div className='account-dropdown-link'>
            Connections
          </div>
        </div>
        {
          users.currentUser && users.currentUser.isSuperUser &&
          <div className='account-dropdown-row' onMouseDown={this._toggle('aboutTerrainOpen')}>
            <div className='account-dropdown-icon account-dropdown-icon-blue'>
              <InfoIcon />
            </div>
            <div className='account-dropdown-link'>
              About Terrain
            </div>
          </div>
        }
        <div className='account-dropdown-row' onMouseDown={this._toggle('showingCredits')}>
          <div className='account-dropdown-icon account-dropdown-icon-green'>
            <CreditsIcon />
          </div>
          <div className='account-dropdown-link'>
            Credits
          </div>
        </div>
        <div className='account-dropdown-row' onMouseDown={this.handleLogout}>
          <div className='account-dropdown-icon account-dropdown-icon-blue'>
            <LogoutIcon />
          </div>
          Logout
        </div>
      </div>
    );
  }

  public renderTopBar()
  {
    const { users } = this.props;
    return (
      <div className='account-dropdown-top-bar' onClick={this.open} ref='accountDropdownButton'>
        <UserThumbnail
          showName={true}
          userId={users.currentUser && users.currentUser.id}
          hideAdmin={true}
        />
        <ArrowIcon className='account-arrow-icon' />
      </div>
    );
  }

  public render()
  {
    const classes = Util.objToClassname({
      'account-dropdown-wrapper': true,
      'account-dropdown-open': this.state.open,
    });

    return (
      <div className={classes}>
        {
          this.renderTopBar()
        }
        {
          this.renderDropdown()
        }

        <Modal
          message={VersionLog.concat("\n \n Commit Log: \n").concat(CommitLog)}
          open={this.state.aboutTerrainOpen}
          title={'Terrain'}
          onClose={this._toggle('aboutTerrainOpen')}
          pre={true}
          noFooterPadding={true}
        />

        <Modal
          message={CREDITS}
          open={this.state.showingCredits}
          title={'Credits'}
          onClose={this._toggle('showingCredits')}
          pre={true}
        />
      </div>
    );
  }
}

const CREDITS = `
Terrain Version 2.0 Created By:
- Abhishek Kulkarni
- Alex Liu
- Ben Grossman-Ponemon
- Ben Smith
- Charles Tripp
- David Hyde
- Dennis Guo
- Jason Lee
- Jonas Lamis
- Juan-Pablo Mansor
- Justin Kirk
- Laura Brouckman
- Leslie Kurt
- Luke Knepper
- Mike Agnich
- Nate Smith
- Phil Tripp
- Sam Pullara
- Victoria Xia
- Xi Yang

Terrain Version 1.0 Created By:
- The Pine Marten
`;

export default Util.createTypedContainer(
  AccountDropdown,
  ['users'],
  {
    colorsActions: ColorsActions,
  },
);
