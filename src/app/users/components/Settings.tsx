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
import AccountEntry from './AccountEntry.tsx';
import CheckBox from './../../common/components/CheckBox.tsx';
import UserTypes from '../UserTypes.tsx';
import UserStore from './../../users/data/UserStore.tsx';
import Ajax from './../../util/Ajax.tsx';
type User = UserTypes.User;
import PasswordStrengthInput from './PasswordStrengthInput.tsx';

var Select = require('react-select');
var TimeZones = require('./Timezones.json');
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
      saving: false,
      savingReq: null,
      newEmail: ''
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

  changeUserField(field:string, value:string)
  {
     var newUser = this.state.istate.currentUser;
     newUser = newUser.set(field, value);
     Actions.change(newUser as UserTypes.User);

     this.setState({
       saving: true,
       savingReq: Ajax.saveUser(newUser as UserTypes.User, this.onSave, this.onSaveError),
     });
  }
  
  saveUsername()
  {
    alert("Can not create a new username at this time");
  }

  renderUsernameContent()
  {
    return (
      <div>
        <div className='username-topbar'>
          <input 
            type='text'
            defaultValue={'@' + this.state.username}
            className='settings-input'
            disabled={true}
          />
          <div className='button settings-save-button' onClick={this.saveUsername}>
            Save
          </div>
        </div>
        <div className='settings-field-info'>
          Usernames must be all lowercase.They cannot be longer than 21 characters and can only contain letters, periods, hyphens, and underscores.
          Most people choose to use their first name, last name, nickname, or some combination of those with initials.
          <br />
          <b>
            Note that you can only change your username twice per hour. 
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

    if(newPassword.length < 6)
    {
      alert('Passwords should be at least six characters long');
      return;
    }
    
    if(newPassword !== confirmPassword)
    {
      alert('You entered two different passwords for your new password. \
       Change one so that they match');
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
      alert('Error changing your password: ' + JSON.stringify(error))
    });

  }

  toggleShowPassword()
  {
    this.setState({
      showPassword: !this.state.showPassword,
    });
  }

  renderPasswordContent()
  {
    return (
      <div className='settings-expand-field'>
        <div className='settings-field-title'>
          Current Password
        </div>
        <input
          type={this.state.showPassword ? 'text' : 'password'}
          onChange={this.handleCurrentPasswordChange}
          className='settings-input password-input'
          value={this.state.currentPassword}
         />
        <div className='settings-field-title'>
          New Password
        </div>
        <div className='settings-row'> 
         <div className='settings-password-container'>
          <PasswordStrengthInput 
            onChange={this.handleNewPasswordChange}
            value={this.state.newPassword}
            type={this.state.showPassword ? 'text' : 'password'}
          />
      </div>
          <div className='settings-white-space' />
        </div>
        <div className='settings-field-title'>
          Confirm Password
        </div>
        <div className='settings-row'>
          <input
            type={this.state.showPassword ? 'text' : 'password'}
            value={this.state.confirmPassword}
            onChange={this.handleConfirmPasswordChange}
            className='settings-input password-input'
            />
          <div className='settings-white-space' />
        </div>
        <div className='settings-row settings-bottom-margin'> 
          <CheckBox checked={this.state.showPassword} onChange={this.toggleShowPassword}/>
          <div className='settings-field-info settings-left-shift' onClick={this.toggleShowPassword}>Show password</div>
        </div>
        <div className='settings-row'>
          <div className='button settings-save-button' onClick={this.createNewPassword} >
            Save
          </div>
          <div className='settings-white-space' />
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

  renderAuthenticationContent()
  {
    return (
      <div className='settings-expand-field'> 
       <div className='settings-authentication-field'>
       Protect your Terrain account with an extra layer of security by
       requiring access to your phone. Once configured you'll be required
       to enter <b>both your password and an authentication code from your
       mobile phone</b> in order to sign into your Terrain account. 
       </div>
       <div className='settings-row'>
        <div className='button settings-gray-button' onClick={this.setupAuthentication}>
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
    this.changeUserField('email', this.state.newEmail);

    this.setState({
      newEmail: ''
    });
  }

  onSave() {
    this.setState({
      saving: false,
      savingReq: null,
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

  renderEmailContent()
  {
    return (
      <div className='settings-expand-field'> 
        <div className='settings-field-title'>
          New Email Address
        </div>
        <div className='settings-row'>
          <input
            type='text'
            value={this.state.newEmail}
            onChange={this.updateNewEmail}
            className='settings-input password-input'
            />
          <div className='settings-white-space' />
        </div>
        <div className='button settings-save-button' onClick={this.changeEmail}>
            Update Email
         </div>
      </div>
    );
  }

  renderTimeZoneDescription()
  {  
    if(this.state.istate.currentUser)
    {
      var timeZone = this.state.istate.currentUser.timeZone || 158;
    } 
    else {
      timeZone = 158;
    }

    return (
      <div> 
        Terrain uses your time zone to send summary and notification emails, for times in your activity feeds, and for reminders.
        Your time zone is currently set to: <b>{TimeZones[timeZone].DisplayName}</b>.
      </div>
    );
  }

  getTimeZonesList()
  {
    let timeZonesList = TimeZones.map( (tz, i) => { 
      return {
        value: i, 
        label: tz.DisplayName, 
      };
    });
    return timeZonesList;
  }

  changeTimeZone(val)
  { 
    this.changeUserField( 'timeZone', val.value);
    this.setState({
      timeZone: val.value,
    });
  }

  renderTimeZoneContent()
  {
    var timeZonesList = this.getTimeZonesList();
    
    if(this.state.istate.currentUser)
    {
      var timeZone = this.state.istate.currentUser.timeZone || 158;
    } 
    else 
    {
       timeZone = 158;
    }

    return (
      <div className='settings-row'>
        <Select
           clearable={false}
           value={timeZone}
           options={timeZonesList}
           onChange={this.changeTimeZone}
           className='settings-timezone-dropdown'
           searchable={false}
       />
       </div>
    );
  }

  renderSignOutDescription()
  {
    return (
      <div className='settings-shifted-text'> 
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
        <div className='settings-yellow-button button' onClick={this.signOut}> 
          <div className='settings-logout-button'>
          <div className ='settings-logout-icon'>
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
      <div className='settings-shifted-text'>
        If you no longer need your <b>Terrain</b> account you can deactivate it here. 
        <br /> 
        <span className='settings-font-small'>
          <b>Note:</b> Don't deactivate your account if you just want to change your <span className='settings-blue-font'>email 
          address </span> or <span className='settings-blue-font'>username</span>.
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
      <div className='settings-gray-button button' onClick={this.deactivate}>
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
        content= {this.renderUsernameContent()}
      /> 
      <AccountEntry 
        title='Password'
        content={this.renderPasswordContent()}
      /> 
      <AccountEntry 
        title='Two-Factor Authentication' 
        description={this.renderAuthenticationDescription()}
        content={this.renderAuthenticationContent()}
       /> 
      <AccountEntry
        title='Email'
        description={this.renderEmailDescription()}
        content={this.renderEmailContent()}
        /> 
      <AccountEntry
        title='Time Zone'
        description={this.renderTimeZoneDescription()}
        content={this.renderTimeZoneContent()}
        /> 
      <AccountEntry
        title='Sign out all other sessions'
        description={this.renderSignOutDescription()}
        buttonText={this.renderSignOutButton()}
        /> 
      <AccountEntry
        title='Deactivate your account'
        description={this.renderDeactivateDescription()}
        buttonText={this.renderDeactivateButton()}
        lastEntry={true}
        /> 
      </div >
    );
  }
}

export default Settings;
