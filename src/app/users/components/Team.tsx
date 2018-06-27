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

// tslint:disable:strict-boolean-expressions no-unused-expression

import PathfinderCreateLine from 'app/builder/components/pathfinder/PathfinderCreateLine';
import { AuthState } from 'auth/AuthTypes';
import { Colors, fontColor } from 'colors/Colors';
import { List } from 'immutable';
import * as React from 'react';
import { Link } from 'react-router-dom';
import Util from 'util/Util';
import CreateItem from '../../common/components/CreateItem';
import Ajax from '../../util/Ajax';
import * as UserTypes from '../UserTypes';
import InfoArea from './../../common/components/InfoArea';
import Modal from './../../common/components/Modal';
import TerrainComponent from './../../common/components/TerrainComponent';
import { UserActions as Actions } from './../data/UserRedux';
import Section from './AccountSection';
import './Team.less';
import UserThumbnail from './UserThumbnail';

type User = UserTypes.User;
type UserMap = UserTypes.UserMap;

export interface Props
{
  params?: any;
  history?: any;
  children?: any;
  auth?: AuthState;
  users?: UserTypes.UserState;
  userActions?: typeof Actions;
}

export interface State
{
  addingUser: boolean;
  showDisabledUsers: boolean;
  errorModalOpen: boolean;
  errorModalMessage: string;
}

class Team extends TerrainComponent<Props>
{
  public unsub = null;

  public state: State = {
    addingUser: false,
    showDisabledUsers: false,
    errorModalOpen: false,
    errorModalMessage: '',
  };

  public componentWillMount()
  {
    this.props.userActions({
      actionType: 'fetch',
    });
  }

  public componentWillUnmount()
  {
    this.unsub && this.unsub();
  }

  public toggleAddingUser()
  {
    this.setState({
      addingUser: !this.state.addingUser,
    });
  }

  public toggleShowDisabledUsers()
  {
    this.setState({
      showDisabledUsers: !this.state.showDisabledUsers,
    });
  }

  public renderShowDisabledUsers()
  {
    if (!this.props.users.users.some((user) => user.isDisabled))
    {
      // no disabled users
      return null;
    }

    return (
      <div className='team-show-disabled' onClick={this.toggleShowDisabledUsers}>
        {this.state.showDisabledUsers ? 'Hide Disabled Users' : 'Show Disabled Users'}
      </div>
    );
  }

  public createNewUser(editingSections)
  {
    const name: string = editingSections.newName;
    const email: string = editingSections.newEmail;
    const password: string = editingSections.newPassword;
    const confirmPassword: string = editingSections.confirmPassword;
    // console.log(name + ' ' + email + ' ' + password + ' ' + confirmPassword);

    const emailCheck = email.length >= 5 && email.indexOf('@') > 0;
    if (!emailCheck)
    {
      this.setState({
        errorModalMessage: 'Not a valid email address.',
      });
      this.toggleErrorModal();
      return;
    }

    // TODO check that a user with that email does not already exist
    // if (this.state.users.get(username))
    // {
    //   this.setState({
    //     errorModalMessage: 'That username is already taken',
    //   });
    //   this.toggleErrorModal();
    //   return;
    // }

    if (password.length < 6)
    {
      this.setState({
        errorModalMessage: 'Passwords should be at least six characters long',
      });
      this.toggleErrorModal();
      return;
    }

    if (password !== confirmPassword)
    {
      this.setState({
        errorModalMessage: 'Passwords do not match',
      });
      this.toggleErrorModal();
      return;
    }

    this.setState({
      addingUser: false,
    });

    Ajax.createUser(name, email, password, () =>
    {
      this.props.userActions({
        actionType: 'fetch',
      });
    }, (error) =>
      {
        this.setState({
          errorModalMessage: 'Error creating user: ' + JSON.stringify(error),
        });
        this.toggleErrorModal();
      });
  }

  public renderAddUser()
  {
    const userId = this.props.auth.id;
    const user = this.props.users.getIn(['users', userId]) as User;

    if (user && user.isSuperUser)
    {
      if (this.state.addingUser)
      {
        return (
          <Section
            isEditing={true}
            sectionTitle='Create New User'
            sectionType='password'
            sectionBoxes={
              List([
                { key: 'newName', header: 'Name', info: '', type: 'Input' },
                { key: 'newEmail', header: 'Email', info: '', type: 'Input' },
                { key: 'newPassword', header: 'Temporary Password', info: '', type: 'Password' },
                { key: 'confirmPassword', header: 'Confirm Password', info: '', type: 'Password' },
              ])
            }
            hasPhoto={false}
            columnNum={0}
            onChange={this.createNewUser}
            onCancel={this.toggleAddingUser}
            canEdit={true}
            canDisable={false}
            addingUser={true}
          />
        );
      }

      return (
        <PathfinderCreateLine
          text='Create new user'
          canEdit={true}
          onCreate={this.toggleAddingUser}
          showText={true}
        />
      );
    }
    return null;
  }

  public toggleErrorModal()
  {
    this.setState({
      errorModalOpen: !this.state.errorModalOpen,
    });
  }

  public disableUser(user, editingSections)
  {
    this.props.userActions({
      actionType: 'change',
      user: user.set('isDisabled', editingSections.isDisabledFlag),
    });
  }

  public renderUser(user: User)
  {
    if (user.isDisabled && !this.state.showDisabledUsers)
    {
      return null;
    }
    return (
      <Section
        user={user.id}
        key={user.id}
        isDisabled={user.isDisabled}
        sectionTitle={user.name}
        sectionType='profile'
        sectionBoxes={
          List([
            { key: 'email', header: 'Email', info: user.email, type: 'Text' },
            { key: 'phone', header: 'Phone', info: user.phone, type: 'Text' },
            { key: 'skype', header: 'Skype', info: user.name, type: 'Text' },
          ])
        }
        hasPhoto={true}
        userImage={<UserThumbnail large={true} userId={user.id} square={true} />}
        columnNum={0}
        onChange={this._fn(this.disableUser, user)}
        canEdit={false}
        canDisable={true}
        addingUser={false}
      />
    );
  }

  public render()
  {
    const { users, loading } = this.props.users;

    return (
      <div className='team-main-container'>
        <div className='team-page-title' style={{ color: Colors().mainSectionTitle }}>
          Team Directory
        </div>
        {users &&
          users.keySeq().sort().map((userId) => this.renderUser(users.get(userId)))
        }
        {this.renderAddUser()}
        {this.renderShowDisabledUsers()}
        <Modal
          message={this.state.errorModalMessage}
          onClose={this.toggleErrorModal}
          open={this.state.errorModalOpen}
          error={true}
        />
      </div>
    );
  }
}

export default Util.createContainer(
  Team,
  ['auth', 'users'],
  { userActions: Actions },
);
