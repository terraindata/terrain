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
import { Link } from 'react-router';
import UserTypes from '../UserTypes';
import AuthActions from './../../auth/data/AuthActions';
import AuthStore from './../../auth/data/AuthStore';
import CheckBox from './../../common/components/CheckBox';
import Classs from './../../common/components/Classs';
import InfoArea from './../../common/components/InfoArea';
import UserStore from './../../users/data/UserStore';
import Ajax from './../../util/Ajax';
import Actions from './../data/UserActions';
import Store from './../data/UserStore';
import AccountEntry from './AccountEntry';
type User = UserTypes.User;
import Modal from './../../common/components/Modal';
import PasswordStrengthInput from './PasswordStrengthInput';

const Select = require('react-select');
const TimeZones = require('./timezones.json');
const LogoutIcon = require('./../../../images/icon_logout.svg');

export interface Props
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

    const authState = AuthStore.getState();

    this.state = {
      istate: Store.getState(),
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      showPassword: false,
      saving: false,
      savingReq: null,
      newEmail: '',
      modalOpen: false,
      modalMessage: '',
      errorModal: false,
    };

    this.cancelSubscription =
      Store.subscribe(() => this.setState({
        istate: Store.getState(),
      }));
  }

  componentWillMount()
  {
    Actions.fetch();
  }

  componentWillUnmount()
  {
    this.cancelSubscription && this.cancelSubscription();
  }

  changeUserField(field: string, value: string)
  {
    let newUser = this.state.istate.currentUser;
    newUser = newUser.set(field, value);
    Actions.change(newUser as UserTypes.User);

    this.setState({
      saving: true,
      savingReq: Ajax.saveUser(newUser as UserTypes.User, this.onSave, this.onSaveError),
    });
  }

  handleCurrentPasswordChange(ev)
  {
    this.setState({
      currentPassword: ev.target.value,
    });
  }

  handleNewPasswordChange(ev)
  {
    this.setState({
      newPassword: ev.target.value,
    });
  }

  handleConfirmPasswordChange(ev)
  {
    this.setState({
      confirmPassword: ev.target.value,
    });
  }

  createNewPassword()
  {
    const userId: number = localStorage['id'];
    const currentPassword: string = this.state.currentPassword;
    const newPassword: string = this.state.newPassword;
    const confirmPassword: string = this.state.confirmPassword;

    if (newPassword.length < 6)
    {
      this.setState({
        modalMessage: 'Passwords should be at least six characters long',
        errorModal: true,
      });
      this.toggleModal();
      return;
    }

    if (newPassword !== confirmPassword)
    {
      this.setState({
        modalMessage: 'You entered two different passwords for your new password. \
        Change one so that they match',
        errorModal: true,
      });
      this.toggleModal();
      return;
    }

    this.setState({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });

    Ajax.changePassword(+userId, currentPassword, newPassword, () =>
    {
      Actions.fetch();
      this.setState({
        modalMessage: 'Your password has been changed.',
        errorModal: false,
      });
      this.toggleModal();
    }, (error) =>
      {
        this.setState({
          modalMessage: 'Error changing your password: ' + JSON.stringify(error.error),
          errorModal: true,
        });
        this.toggleModal();
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
          <CheckBox checked={this.state.showPassword} onChange={this.toggleShowPassword} />
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
    this.setState({
      modalMessage: 'This button has not been implemented yet',
      errorModal: true,
    });
    this.toggleModal();
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
    if (this.state.istate.currentUser && this.state.istate.currentUser.email)
    {
      const email = this.state.istate.currentUser.email;
      return (
        <div>
          Your email is <b>{email}</b>.
        </div>
      );
    }
    return <div>Your email adddress has not been set yet.</div>;
  }

  changeEmail()
  {
    this.changeUserField('email', this.state.newEmail);

    this.setState({
      newEmail: '',
    });
  }

  onSave()
  {
    this.setState({
      saving: false,
      savingReq: null,
    });
  }

  onSaveError(response)
  {
    this.setState({
      modalMessage: 'Error saving: ' + JSON.stringify(response),
      errorModal: true,
    });
    this.toggleModal();
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
    let timeZone: number;

    if (this.state.istate.currentUser)
    {
      timeZone = this.state.istate.currentUser.timeZone || 158;
    }
    else
    {
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
    const timeZonesList = TimeZones.map((tz, i) =>
    {
      return {
        value: i,
        label: tz.DisplayName,
      };
    });
    return timeZonesList;
  }

  changeTimeZone(val)
  {
    this.changeUserField('timeZone', val.value);
    this.setState({
      timeZone: val.value,
    });
  }

  renderTimeZoneContent()
  {
    const timeZonesList = this.getTimeZonesList();
    let timeZone: number;

    if (this.state.istate.currentUser)
    {
      timeZone = this.state.istate.currentUser.timeZone || 158;
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
        everywhere except your current library? This is for you.
      </div>
    );
  }

  signOut()
  {
    this.setState({
      modalMessage: 'This button has not been implemented.',
      errorModal: true,
    });
    this.toggleModal();
  }

  renderSignOutButton()
  {
    return (
      <div className='settings-yellow-button button' onClick={this.signOut}>
        <div className='settings-logout-button'>
          <div className='settings-logout-icon'>
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
          address </span>.
        </span>
      </div>
    );
  }

  deactivate()
  {
    this.setState({
      modalMessage: 'This button has not been implemented.',
      errorModal: true,
    });
    this.toggleModal();
  }

  renderDeactivateButton()
  {
    return (
      <div className='settings-gray-button button' onClick={this.deactivate}>
        Deactivate your account
      </div>
    );
  }

  toggleModal()
  {
    this.setState({
      modalOpen: !this.state.modalOpen,
    });
  }

  // add these back when ready
  // <AccountEntry
  //   title='UserId'
  //   content= {this.renderUserIdContent()}
  // />
  // <AccountEntry
  //   title='Two-Factor Authentication'
  //   description={this.renderAuthenticationDescription()}
  //   content={this.renderAuthenticationContent()}
  //  />
  // <AccountEntry
  //   title='Sign out all other sessions'
  //   description={this.renderSignOutDescription()}
  //   buttonText={this.renderSignOutButton()}
  //   />
  // <AccountEntry
  //   title='Deactivate your account'
  //   description={this.renderDeactivateDescription()}
  //   buttonText={this.renderDeactivateButton()}
  //   lastEntry={true}
  //   />
  render()
  {
    return (
      <div>
        <div className='settings-page-title'>Update your settings</div>
        <AccountEntry
          title='Password'
          content={this.renderPasswordContent()}
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
        <Modal
          message={this.state.modalMessage}
          onClose={this.toggleModal}
          open={this.state.modalOpen}
          error={this.state.errorModal}
        />
      </div >
    );
  }
}

export default Settings;
