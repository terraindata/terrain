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

// tslint:disable:no-var-requires restrict-plus-operands no-unused-expression

import * as React from 'react';
import * as UserTypes from '../UserTypes';
import CheckBox from './../../common/components/CheckBox';
import Modal from './../../common/components/Modal';
import RadioButtons from './../../common/components/RadioButtons';
import TerrainComponent from './../../common/components/TerrainComponent';
import Ajax from './../../util/Ajax';
import Actions from './../data/UserActions';
import Store from './../data/UserStore';
import AccountEntry from './AccountEntry';
import './Notifications.less';
import './Select.less';

const Select = require('react-select');
const SoundIcon = require('./../../../images/icon_audio.svg');

export interface Props
{
  params?: any;
  history?: any;
  children?: any;
}

class Notifications extends TerrainComponent<Props>
{
  public cancelSubscription = null;

  public emailNotificationOptions = [
    {
      value: 'Once every 15 minutes',
      onClick: this.changeEmailNotifications_15Min,
    },
    {
      value: 'Once an hour at most',
      onClick: this.changeEmailNotifications_Hour,
    },
    {
      value: 'Never',
      onClick: this.changeEmailNotifications_Never,
    },
  ];

  public notificationTypes = [
    {
      value: 'Activities of any kind',
      label: 'Activities of any kind',
    },
    {
      value: 'Certain activities',
      label: 'Certain activities',
    },
    {
      value: 'None',
      label: 'None',
    },
  ];

  public desktopNotificationSounds = [
    {
      value: 'chime',
      label: 'chime',
    },
    {
      value: 'doorbell',
      label: 'doorbell',
    },
    {
      value: 'whistle',
      label: 'whistle',
    },
    {
      value: 'none',
      label: 'none',
    },
  ];

  public sounds = {
    chime: 'http://lukeknepper.com/upload/chime.wav',
    doorbell: 'http://lukeknepper.com/upload/doorbell_x.wav',
    whistle: 'http://lukeknepper.com/upload/slide_whistle_up.wav',
  };

  constructor(props)
  {
    super(props);

    this.state = {
      istate: Store.getState(),
      saving: false,
      savingReq: null,
      errorModalOpen: false,
      errorModalMessage: '',
    };

    this.cancelSubscription =
      Store.subscribe(() => this.setState({
        istate: Store.getState(),
      }));
  }

  public componentWillMount()
  {
    Actions.fetch();
  }

  public componentWillUnmount()
  {
    this.cancelSubscription && this.cancelSubscription();
  }

  public changeUserField(field: string, value: string)
  {
    let newUser = this.state.istate.currentUser;
    newUser = newUser.set(field, value);
    Actions.change(newUser as UserTypes.User);

    this.setState({
      saving: true,
      savingReq: Ajax.saveUser(newUser as UserTypes.User, this.onSave, this.onSaveError),
    });
  }

  public onDesktopNotificationChange(val)
  {
    const { value } = val;
    this.changeUserField('desktopNotificationType', value);
  }

  public onSave()
  {
    this.setState({
      saving: false,
      savingReq: null,
    });
  }

  public onSaveError(response)
  {
    this.setState({
      errorModalMessage: 'Error saving: ' + JSON.stringify(response),
    });
    this._toggle('errorModalOpen')();

  }

  public onDesktopNotificationsSoundChange(val)
  {
    const { value } = val;
    this.changeUserField('sound', value);
  }

  public async playSound()
  {
    if (this.state.istate.currentUser)
    {
      const soundName = this.state.istate.currentUser.sound;
      if (soundName !== 'none')
      {
        const sound = new Audio();
        sound.src = this.sounds[soundName];
        sound.load();
        await sound.play();
      }
    }
  }

  public renderDesktopNotificationsContent()
  {
    let desktopNotification: any;
    let sound: any;

    if (this.state.istate.currentUser)
    {
      desktopNotification = this.state.istate.currentUser.desktopNotificationType;
      sound = this.state.istate.currentUser.sound;
    }

    return (
      <div className='notification-expansion'>
        <div className='notification-subtitle'>
          Send me desktop notifications for:
       </div>
        <Select
          clearable={false}
          name='desktop-notification'
          value={desktopNotification}
          options={this.notificationTypes}
          onChange={this.onDesktopNotificationChange}
          className='notifications-select'
          searchable={false}
        />
        <div className='notification-subtitle'>
          Desktop notifications use this sound:
       </div>
        <div className='notification-row'>
          <Select
            name='desktop-notification-sound'
            value={sound}
            clearable={false}
            options={this.desktopNotificationSounds}
            onChange={this.onDesktopNotificationsSoundChange}
            className='notifications-select'
            searchable={false}
          />
          <div
            className={sound === 'none' ? 'disabled' : 'preview-button'}
            onClick={sound === 'none' ? null : this.playSound}
          >
            <div className='notification-sound-icon'>
              <SoundIcon />
            </div>
            <div className='notification-preview-button-text'>
              Preview
          </div>
          </div>
        </div>
      </div>
    );
  }

  public changeEmailNotifications_15Min()
  {
    this.changeUserField('emailNotificationTiming', this.emailNotificationOptions[0].value);
  }

  public changeEmailNotifications_Hour()
  {
    this.changeUserField('emailNotificationTiming', this.emailNotificationOptions[1].value);
  }

  public changeEmailNotifications_Never()
  {
    this.changeUserField('emailNotificationTiming', this.emailNotificationOptions[2].value);
  }

  public onEmailNotificationTypeChange(val)
  {
    const { value } = val;
    this.changeUserField('emailNotificationType', value);
  }

  public renderEmailNotificationsContent()
  {
    let emailNotification: any;
    let emailTiming: any;

    if (this.state.istate.currentUser)
    {
      emailNotification = this.state.istate.currentUser.emailNotificationType;
      emailTiming = this.state.istate.currentUser.emailNotificationTiming;
    }

    return (
      <div className='notification-expansion'>
        <div>Send me email notifications:</div>
        <br />
        <div className='expanded-section-indent'>
        </div>
        <div className='notification-subtitle-small'>
          Send me email notifications for:
       </div>
        <Select
          clearable={false}
          name='email-notification'
          value={emailNotification}
          options={this.notificationTypes}
          onChange={this.onEmailNotificationTypeChange}
          className='notifications-select'
          searchable={false}
        />
        {this.renderEmail()}
      </div>
    );
  }

  public toggleEmailNews()
  {
    const emailNewsSetting = (this.state.istate.currentUser.emailNews) === 'on';
    const newEmailNewsSetting = emailNewsSetting ? 'off' : 'on';
    this.changeUserField('emailNews', newEmailNewsSetting);
  }

  public renderEmailNewsContent()
  {
    let emailNewsOn: boolean;

    if (this.state.istate.currentUser)
    {
      emailNewsOn = this.state.istate.currentUser.emailNews === 'on';
    }

    return (
      <div className='notification-expansion'>
        <div>You can choose which of these updates you'd like to receive:</div>
        <br />
        <span className='expanded-section-indent'>
          <CheckBox
            checked={emailNewsOn}
            onChange={this.toggleEmailNews}
          />
          Send me emails with Terrain news and tips <br /><br />
        </span>
        <div>If you opt out of the above, note that we we'll still send you important
        adminstrative emails, such as password resets. <br />
        </div>
        {
          this.renderEmail()
        }
      </div>
    );
  }

  public renderEmail()
  {
    if (this.state.istate.currentUser && this.state.istate.currentUser.email)
    {
      return (
        <div>
          Your email is currently set to
        <span className='notification-email-blue'>
            {this.state.istate.currentUser.email}
          </span>
          .
        </div>
      );
    }
    return <div>Your email adddress has not been set yet.</div>;
  }

  public renderDesktopDescription()
  {
    let desktopNotification: any;

    if (this.state.istate.currentUser)
    {
      desktopNotification = this.state.istate.currentUser.desktopNotificationType;
    }

    return (
      <div>
        Terrain can send push notifications to your desktop when someone
        updates an algorithm. You are currently recieving updates for
        <span><b>{' ' + desktopNotification}.</b></span>
      </div>
    );

  }

  public renderEmailDescription()
  {
    let emailTiming: string;

    if (this.state.istate.currentUser)
    {
      emailTiming = this.state.istate.currentUser.emailNotificationTiming;
    }

    return (
      <div>
        When you're busy or not online, Terrain can send you
        emails so you don't miss a beat. You are currently receiving emails
        <span><b>{' ' + emailTiming}.</b></span>
      </div>
    );
  }

  public renderEmailNewsDescription()
  {
    let emailNewsOn: boolean;

    if (this.state.istate.currentUser)
    {
      emailNewsOn = (this.state.istate.currentUser.emailNews) === 'on';
    }

    return (
      <div>
        From time to time we'd like to send you emails with interesting
        news from the Terrain team. You are set up to
        <span><b>{emailNewsOn ? ' ' : ' not '}</b></span>
        recieve emails with Terrain news and tips.
      </div>
    );
  }

  public render()
  {
    return (
      <div>
        <div className='notifications-page-title'>Update your notifications</div>
        <AccountEntry
          title='Desktop Notifications'
          description={this.renderDesktopDescription()}
          content={this.renderDesktopNotificationsContent()}
        />
        <AccountEntry
          title='Email Notifications'
          description={this.renderEmailDescription()}
          content={this.renderEmailNotificationsContent()}
        />
        <AccountEntry
          title='Email News & Updates'
          description={this.renderEmailNewsDescription()}
          content={this.renderEmailNewsContent()}
          lastEntry={true}
        />
        <Modal
          message={this.state.errorModalMessage}
          onClose={this._toggle('errorModalOpen')}
          open={this.state.errorModalOpen}
          error={true}
        />
      </div>
    );
  }
}

export default Notifications;
