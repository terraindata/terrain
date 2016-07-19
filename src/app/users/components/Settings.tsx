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
import Ajax from './../../util/Ajax.tsx';
type User = UserTypes.User;
var Select = require('react-select');
var TimeZones = require('./Timezones.json');
var PasswordStrengthMeter = require('./password-strength.js');
var LogoutIcon = require("./../../../images/icon_logout.svg");


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
      newEmail: '',
      saving: false,
      savingReq: null,
      user: null,
      timeZone: null,
    };
    
    this.cancelSubscription = 
      Store.subscribe(() => this.setState({
        istate: Store.getState()
      }))
  }
  
  componentWillMount()
  {
    Actions.fetch();
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

  handleCurrentPasswordChange(ev)
  {
    this.setState({ 
      currentPassword: ev.target.value 
    });
  }

  handleNewPasswordChange(ev)
  {
    this.setState({ 
      newPassword: ev.target.value 
    });
  }

  handleConfirmPasswordChange(ev)
  {
    this.setState({ 
      confirmPassword: ev.target.value 
    });
  }

  createNewPassword()
  {
    let username:string = localStorage['username'];
    let currentPassword:string = this.state.currentPassword;
    let newPassword:string = this.state.newPassword;
    let confirmPassword:string = this.state.confirmPassword;

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
      password: currentPassword,
    }));

    if(newPassword.length < 6)
    {
      alert('Passwords should be at least six characters long');
      return;
    }
    
    if(newPassword !== confirmPassword)
    {
      alert('Passwords do not match');
      return;
    }

    this.setState({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });

    Ajax.changePassword(username, currentPassword, newPassword, () => {
      Actions.fetch();
      alert('Your password has been changed.');
    }, (error) => {
      alert('Error creating user: ' + JSON.stringify(error))
    });

  }

  toggleShowPassword()
  {
    this.setState({
      showPassword: !this.state.showPassword,
    });
  }

  resetPasswordByEmail()
  {
    alert('This button has not been implemented yet.'); 
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
          onChange={this.handleCurrentPasswordChange}
          key='current-password'
          className='settings-input password-input'
          value={this.state.currentPassword}
         />
        <div className='field-title'>
          New Password
        </div>
        <div className='row'> 
         <div className='password-container'>
        <PasswordStrengthMeter
          onChange={this.handleNewPasswordChange}
          type={this.state.showPassword ? 'text' : 'password'}
          value={this.state.newPassword}
        />   
      </div>
          <div className='white-space' />
        </div>
        <div className='field-title'>
          Confirm Password
        </div>
        <div className='row'>
          <input
            type={this.state.showPassword ? 'text' : 'password'}
            value={this.state.confirmPassword}
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
          <div className='button gray-button' onClick={this.resetPasswordByEmail}>
            Reset your password by email
          </div>
          <div className='white-space' />
        </div>
      </div>
    );
  }

  setupAuthentication()
  {
    alert('This button has not been implemented yet');
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
    return (
      <div className='expand-field'> 
       <div className='authentication-field'>
       Protect your Terrain account with an extra layer of security by
       requiring access to your phone. Once configured you'll be required
       to enter <b>both your password and an authentication code from your
       mobile phone</b> in order to sign into your Terrain account. 
       </div>
       <div className='row'>
        <div className='button gray-button' onClick={this.setupAuthentication}>
          Setup Two-Factor Authentication
        </div>
       </div>
      </div>
    );
  }

  renderEmailDescription()
  {
    if(this.state.istate.currentUser && this.state.istate.currentUser.email) 
    {
      var email = this.state.istate.currentUser.email;
      if(this.state.user) 
      {
        email = this.state.user.email;
      }
      return(
        <div>
          Your email is <b>{email}</b>.
        </div>
      );
    } 
    return <div>Your email adddress has not been set yet.</div>
  }
  
  changeEmail() 
  {
    var newUser = this.state.istate.currentUser;
    newUser = newUser.set('email', this.state.newEmail);

    Actions.change(newUser as UserTypes.User);

    this.setState({
      saving: true,
      savingReq: Ajax.saveUser(newUser as UserTypes.User, this.onSave, this.onSaveError),
      user: newUser,
    });
  }

  onSave() {
    this.setState({
      newEmail: '',
      istate: Store.getState(),
    });
  }

  onSaveError(response) {
    alert("Error saving: " + JSON.stringify(response));
  }

  updateNewEmail(event)
  {
    this.setState({
      newEmail: event.target.value,
    });  
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
            value={this.state.newEmail}
            onChange={this.updateNewEmail}
            key='new-email'
            className='settings-input password-input'
            />
          <div className='white-space' />
        </div>
        <div className='button save-button' onClick={this.changeEmail}>
            Update Email
         </div>
      </div>
    );
  }

  renderTimeZoneDescription()
  {  
    if(this.state.istate.currentUser)
    {
      var timeZone = this.state.timeZone || this.state.istate.currentUser.timeZone || 158;
    }
    else 
    {
      timeZone = this.state.timeZone || 158;
    }
    return (
      <div> 
        Terrain uses your time zone to send summary and notification emails, for times in your activity feeds, and for reminders.
        Your time zone is currently set to: <b>{TimeZones[timeZone].DisplayName}</b>.
      </div>
    );
  }

  renderTimeZonesList()
  {
    var timeZonesList= [TimeZones.length];
    for (var i = 0; i < TimeZones.length; i++){
      timeZonesList[i] = {
        value: i,
        label: TimeZones[i].DisplayName,
      }
    }
    return timeZonesList;
  }

  changeTimeZone(val)
  { 
    this.setState({
      timeZone: val.value,
    });
    
    var newUser = this.state.istate.currentUser;
    newUser = newUser.set('timeZone', val.value);
    Actions.change(newUser as UserTypes.User);

    this.setState({
      saving: true,
      savingReq: Ajax.saveUser(newUser as UserTypes.User, this.onSaveTimeZone, this.onSaveError),
      user: newUser,
    });
  }

  onSaveTimeZone() {
    this.setState({
      istate: Store.getState(),
    });
  }

  expandTimeZone()
  {
    var timeZonesList = this.renderTimeZonesList();
    
    if(this.state.istate.currentUser)
    {
      var timeZone = this.state.timeZone || this.state.istate.currentUser.timeZone || 158;
    }

    return (
      <div className='row'>
        <Select
           clearable={false}
           value={timeZone}
           options={timeZonesList}
           onChange={this.changeTimeZone}
           className='timezone-dropdown'
       />
       </div>
    );
  }

  renderSignOutDescription()
  {
    return (
      <div className='shifted-text'> 
        Lost your computer? Left yourself logged in on a public computer? Need a way to sign out 
        everywhere except your current browser? This is for you.
      </div>
    );
  }

  signOut()
  {
    alert('This button has not been implemented.');
  }

  renderSignOutButton()
  {
    return (
        <div className='yellow-button button' onClick={this.signOut}> 
          <div className='logout-button'>
          <div className ='logout-icon'>
            <LogoutIcon />
          </div>
          Sign out all other sessions
          </div>
        </div>
    );
  }

  renderDeactivateDescription()
  {
    return (
      <div className='shifted-text'>
        If you no longer need your <b>Terrain</b> account you can deactivate it here. 
        <br /> 
        <span className='font-small'>
          <b>Note:</b> Don't deactivate your account if you just want to change your <span className='blue-font'>email 
          address </span> or <span className='blue-font'>username</span>.
        </span>
      </div>
    );
  }

  deactivate()
  {
    alert('This button has not been implemented.');
  }

  renderDeactivateButton()
  {
    return (
      <div className='gray-button button' onClick={this.deactivate}>
        Deactivate your account
      </div>
    );
  }

  render()
  {
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
      <AccountEntry
        title='Time Zone'
        description={this.renderTimeZoneDescription}
        onClick={this.expandTimeZone}
        /> 
      <AccountEntry
        title='Sign out all other sessions'
        description={this.renderSignOutDescription}
        button={this.renderSignOutButton}
        /> 
      <AccountEntry
        title='Deactivate your account'
        description={this.renderDeactivateDescription}
        button={this.renderDeactivateButton}
        /> 
      </div >
    );
  }
}

export default Settings;
