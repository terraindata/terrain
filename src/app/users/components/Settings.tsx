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

require('./Settings.less');
import * as React from 'react';
import Classs from './../../common/components/Classs.tsx';
import Store from './../data/UserStore.tsx';
import Actions from './../data/UserActions.tsx';
import BrowserTypes from './../UserTypes.tsx';
import InfoArea from './../../common/components/InfoArea.tsx';
import { Link } from 'react-router';
import AuthStore from './../../auth/data/AuthStore.tsx';
import AuthActions from './../../auth/data/AuthActions.tsx';
import AccountEntry from './../../common/components/AccountEntry.tsx';
import CheckBox from './../../common/components/CheckBox.tsx';
import UserTypes from '../UserTypes.tsx';
import UserStore from './../../users/data/UserStore.tsx';
type User = UserTypes.User;

interface Props
{
  params?: any;
  history?: any;
  children?: any;
}

class Settings extends Classs<Props>
{
  cancelSubscription = null;

  constructor(props)
  {
    super(props);
    
    let authState = AuthStore.getState();
    
    this.state = {
      istate: Store.getState(),
      username: authState.get('username'),
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      showPassword: false,
    };
    
    this.cancelSubscription = 
      Store.subscribe(() => this.setState({
        istate: Store.getState()
      }))
  }
  
  componentWillMount()
  {
    // Actions.fetch();
  }
  
  componentWillUnmount()
  {
    this.cancelSubscription && this.cancelSubscription();
  }
  
  saveUsername()
  {
    alert("Can not create a new username at this time");
  }

  expandUsername()
  {
    return (
      <div>
        <div className='username-topbar'>
          <input 
            type='text'
            defaultValue={'@' + this.state.username}
            key='username' 
            className='settings-input'
            disabled={true}
          />
          <div className='button save-button' onClick={this.saveUsername}>
            Save
          </div>
        </div>
        <div className='field-info'>
          Usernames must be all lowercase.They cannot be longer than 21 characters and can only contain letters, periods, hyphens, and underscores.
          Most people choose to use their first name, last name, nickname, or some combination of those with initials.
          <br />
          <b>
            Note that you can only change your user name twice per hour. 
          </b> Choose wisely.
        </div>
      </div>
    );
  }

  handleCurrentPasswordChange = (ev:any) =>
  {
    this.setState({ 
      currentPassword: ev.target.value 
    });
  }

  handleNewPasswordChange = (ev:any) =>
  {
    this.setState({ 
      newPassword: ev.target.value 
    });
  }

  handleConfirmPasswordChange = (ev:any) =>
  {
    this.setState({ 
      confirmPassword: ev.target.value 
    });
  }

  createNewPassword()
  {
    //check current password with actual current password
    let username = localStorage['username'];
    
    let login = (token: string) => {
      AuthActions.login(token, username);
    };

    let xhr = new XMLHttpRequest();
    xhr.onerror = (ev:Event) => {
      alert("Error logging in: " + ev)
    }
    xhr.onload = (ev:Event) => {
      if (xhr.status != 200) {
        alert("Failed to log in: " + xhr.responseText);
        return;
      }
      login(xhr.responseText);
    }
    // NOTE: $SERVER_URL will be replaced by the build process.
    xhr.open("POST", SERVER_URL + "/auth", true);
    xhr.send(JSON.stringify({
      username,
      password: this.state.currentPassword,
    }));

    if(this.state.newPassword.length < 6)
    {
      alert('Passwords should be at least six characters long');
      return;
    }

    if(this.state.newPassword !== this.state.confirmPassword)
    {
      alert('Passwords do not match');
      return;
    }

    //update to be new password w/ Ajax call? 
  }

  toggleShowPassword()
  {
    this.setState({
      showPassword: !this.state.showPassword,
    });
  }

  expandPassword()
  {
    return (
      <div className='expand-field'>
        <div className='field-title'>
          Current Password
        </div>
        <input
          type={this.state.showPassword ? 'text' : 'password'}
          defaultValue=''
          onChange={this.handleCurrentPasswordChange}
          key='current-password'
          className='settings-input password-input'
         />
        <div className='field-title'>
          New Password
        </div>
        <div className='row'> 
          <input
            type={this.state.showPassword ? 'text' : 'password'}
            defaultValue=''
            key='new-pasword'
            onChange={this.handleNewPasswordChange}
            className='settings-input password-input'
            />
          <div className='white-space' />
        </div>
        <div className='field-title'>
          Confirm Password
        </div>
        <div className='row'>
          <input
            type={this.state.showPassword ? 'text' : 'password'}
            defaultValue=''
            key='confirm-password'
            onChange={this.handleConfirmPasswordChange}
            className='settings-input password-input'
            />
          <div className='white-space' />
        </div>
        <div className='row bottom-margin'> 
          <CheckBox checked={this.state.showPassword} onChange={this.toggleShowPassword}/>
          <div className='field-info'>Show password</div>
        </div>
        <div className='row'>
          <div className='button save-button' onClick={this.createNewPassword} >
            Save
          </div>
          <div className='white-space' />
        </div>
        <div className='row'>
          <div className='field-info center'> 
            Can't remember your current password? 
          </div>
          <div className='button password-button'>
            Reset your password by email
          </div>
          <div className='white-space' />
        </div>
      </div>
    );
  }

  renderAuthenticationDescription()
  {
    return (
      <div> 
      Two-Factor authentication is <b>inactive</b> for your account.
      </div>
    );
  }

  expandAuthentication()
  {
    return <div> None </div>;
  }

  renderEmailDescription()
  {
    let username = AuthStore.getState().get('username');
    // let user = Store.getState().getIn(['users', username]) as User; 
    // console.log(user.email);

    let users: UserTypes.UserMap = UserStore.getState().get('users');
    let user = UserStore.getState().get('currentUser')

    return (
      <div> 
      Your email address is <b>test</b>
      </div>
    );
  }
  
  expandEmail()
  {
    return (
      <div className='expand-field'> 
        <div className='field-title'>
          New Email Address
        </div>
        <div className='row'>
          <input
            type='text'
            defaultValue=''
            key='new-email'
            className='settings-input password-input'
            />
          <div className='white-space' />
        </div>
        <div className='button save-button'>
            Update Email
         </div>
      </div>
    );
  }

  render()
  {
    const state = this.state.istate;
    return (
      <div>
      <div className='settings-page-title'>Update your settings</div>
      <AccountEntry 
        title='Username'
        onClick= {this.expandUsername}
      /> 
      <AccountEntry 
        title='Password'
        onClick={this.expandPassword}
      /> 
      <AccountEntry 
        title='Two-Factor Authentication' 
        description={this.renderAuthenticationDescription}
        onClick={this.expandAuthentication}
       /> 
      <AccountEntry
        title='Email'
        description={this.renderEmailDescription}
        onClick={this.expandEmail}
        /> 
      </div >
    );
  }
}

export default Settings;
