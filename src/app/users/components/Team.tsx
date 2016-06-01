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

require('./Team.less');
import * as React from 'react';
import Classs from './../../common/components/Classs.tsx';
import Store from './../data/UserStore.tsx';
import AuthStore from './../../auth/data/AuthStore.tsx';
import Actions from './../data/UserActions.tsx';
import BrowserTypes from './../UserTypes.tsx';
import InfoArea from './../../common/components/InfoArea.tsx';
import { Link } from 'react-router';
import UserTypes from '../UserTypes.tsx';
import UserThumbnail from './UserThumbnail.tsx';
import CreateItem from '../../common/components/CreateItem.tsx';
import Ajax from '../../util/Ajax.tsx';
type User = UserTypes.User;
type UserMap = UserTypes.UserMap;

interface Props
{
  params?: any;
  history?: any;
  children?: any;
}

class Team extends Classs<Props>
{
  unsub = null;
  
  state: {
    loading: boolean,
    users: UserMap,
    addingUser: boolean,
  } = {
    users: null,
    loading: true,
    addingUser: false,
  };
  
  constructor(props)
  {
    super(props);
    
    this.unsub = Store.subscribe(this.updateState);
  }
  
  componentWillMount()
  {
    Actions.fetch();
    this.updateState();
  }
  
  componentWillUnmount()
  {
    this.unsub && this.unsub();
  }
  
  updateState()
  {
    this.setState({
      users: Store.getState().get('users'),
      loading: Store.getState().get('loading'),
    });
  }
  
  renderUser(user:User)
  {
    return (
      <Link to={`/users/${user.username}`} className='team-link' key={user.username}>
        <div className='team-row'>
          <div>
            <UserThumbnail
              large={true}
              username={user.username}
              square={true}
            />
          </div>
          <div className='team-item-names'>
            <div className='team-name'>
              { user.name() }
            </div>
            <div className='team-role'>
              { user.whatIDo }
            </div>
            <div className='team-username'>
              @{ user.username }
            </div>
          </div>
          <div className='team-item-info'>
            <div className='team-item-info-row'>
              <div className='team-item-info-label'>
                Phone Number
              </div>
              <div className='team-item-info-value'>
                { user.phone }
              </div>
            </div>
            <div className='team-item-info-row'>
              <div className='team-item-info-label'>
                Email
              </div>
              <div className='team-item-info-value'>
                { user.email }
              </div>
            </div>
            <div className='team-item-info-row'>
              <div className='team-item-info-label'>
                Skype
              </div>
              <div className='team-item-info-value'>
                { user.skype }
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  }
  
  toggleAddingUser()
  {
    this.setState({
      addingUser: !this.state.addingUser,
    })
  }
  
  createNewUser()
  {
    let username:string = this.refs['newUsername']['value'];
    let password:string = this.refs['newPassword']['value'];
    let confirmPassword:string = this.refs['confirmPassword']['value'];
    
    let usernameCheck = username.replace(/[a-zA-Z]/g, "");
    if(usernameCheck.length)
    {
      alert('Only letters are allowed in the username');
      return;
    }
    
    if(this.state.users.get(username))
    {
      alert('That username is already taken');
      return;
    }
    
    if(password.length < 6)
    {
      alert('Passwords should be at least six characters long');
      return;
    }
    
    if(password !== confirmPassword)
    {
      alert('Passwords do not match');
      return;
    }
    
    this.refs['newUsername']['value'] = '';
    this.refs['newPassword']['value'] = '';
    this.refs['confirmPassword']['value'] = '';
    this.setState({
      addingUser: false,
    });
    
    Ajax.createUser(username, password, () => {
      Actions.fetch();
    }, (error) => {
      alert('Error creating user: ' + JSON.stringify(error))
    });
  }
  
  renderAddUser()
  {
    let username = AuthStore.getState().get('username');
    let user = Store.getState().getIn(['users', username]) as User;
    
    if(user && user.isAdmin)
    {
      if(this.state.addingUser)
      {
        return (
          <div className='create-user'>
            <div className='create-user-cancel' onClick={this.toggleAddingUser} data-tip='Cancel'>
              x
            </div>
            <h3>Create a new user</h3>
            
            <div className='flex-container'>
              <div className='flex-grow'>
                <b>Username</b> (this cannot be changed)
                <div>
                  <input ref='newUsername' placeholder='Username' />
                </div>
              </div>
              <div className='flex-grow'>
                <b>Temporary Password</b>
                <div>
                  <input ref='newPassword' placeholder='Password' type='password' />
                </div>
              </div>
              <div className='flex-grow'>
                <b>Confirm Password</b>
                <div>
                  <input ref='confirmPassword' placeholder='Confirm password' type='password' />
                </div>
              </div>
            </div>
            <div className='button' onClick={this.createNewUser}>
              Create
            </div>
          </div>
        );
      }
      
      return (
        <CreateItem
          name='New User'
          onCreate={this.toggleAddingUser}
        />
      );
    }
    
    return null;
  }
  
  render()
  {
    let { users, loading } = this.state;

    return (
      <div className='team'>
        {
          loading ?
            <InfoArea large='Loading...' />
          :
            users.toArray().map(this.renderUser)
        }
        { this.renderAddUser() }
      </div>
    );
  }
}

export default Team;