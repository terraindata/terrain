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

require('./AccountDropdown.less');
import * as $ from 'jquery';
import * as React from 'react';
import { Link } from 'react-router';
import Actions from '../../builder/data/BuilderActions';
import PureClasss from '../../common/components/PureClasss';
import UserThumbnail from '../../users/components/UserThumbnail';
import UserStore from '../../users/data/UserStore';
import UserTypes from '../../users/UserTypes';
import Util from '../../util/Util';
const { browserHistory } = require('react-router');
import Modal from './Modal';
const CommitLog = require('../../../commitlog.txt');

const ArrowIcon = require('./../../../images/icon_arrow_8x5.svg?name=ArrowIcon');

const LogoutIcon = require('./../../../images/icon_logout.svg');
const EditIcon = require('./../../../images/icon_edit.svg');
const HomeIcon = require('./../../../images/icon_profile_16x16.svg?name=HomeIcon');
const InfoIcon = require('../../../images/icon_info.svg?name=InfoIcon');

export interface Props
{
}

class AccountDropdown extends PureClasss<Props>
{
  state: {
    open?: boolean,
    user?: UserTypes.User,
    commitLogOpen?: boolean,
  } = {
  };

  unsubscribe = null;

  constructor(props: Props)
  {
    super(props);
    this._subscribe(
      UserStore,
      {
        storeKeyPath: ['currentUser'],
        stateKey: 'user',
      },
    );
  }

  componentWillUnmount()
  {
    $('body').unbind('click', this.close);
  }

  close(event)
  {
    this.setState({
      open: false,
    });
    $('body').unbind('click', this.close);
    event.stopPropagation();
  }

  open(event)
  {
    this.setState({
      open: true,
    });
    $('body').click(this.close);
    event.stopPropagation();
  }

  editProfile()
  {
    this.go('/account/profile/edit');
  }

  goTeamGoTeamGo()
  {
    this.go('/account/team');
  }

  go(url: string)
  {
    browserHistory.push(url);
  }

  handleLogout()
  {
    this.go('/logout');
  }

  renderDropdown()
  {
    if (!this.state.open)
    {
      return null;
    }

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
        {
          this.state.user && this.state.user.isSuperUser &&
          <div className='account-dropdown-row' onMouseDown={this._toggle('commitLogOpen')}>
            <div className='account-dropdown-icon account-dropdown-icon-blue'>
              <InfoIcon />
            </div>
            <div className='account-dropdown-link'>
              Commit Log
              </div>
          </div>
        }
        <div className='account-dropdown-row' onMouseDown={this.handleLogout}>
          <div className='account-dropdown-icon account-dropdown-icon-blue'>
            <LogoutIcon />
          </div>
          Logout
        </div>
      </div>
    );
  }

  renderTopBar()
  {
    return (
      <div className='account-dropdown-top-bar' onClick={this.open} ref='accountDropdownButton'>
        <UserThumbnail
          showName={true}
          userId={this.state.user && this.state.user.id}
          hideAdmin={true}
        />
        <ArrowIcon className='account-arrow-icon' />
      </div>
    );
  }

  render()
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
          message={CommitLog}
          open={this.state.commitLogOpen}
          title={'Commit Log'}
          onClose={this._toggle('commitLogOpen')}
          pre={true}
        />
      </div>
    );
  }
}
export default AccountDropdown;
