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

require('./Notifications.less');
require('./Select.less');
import * as React from 'react';
import Classs from './../../common/components/Classs.tsx';
import Store from './../data/UserStore.tsx';
import Actions from './../data/UserActions.tsx';
import BrowserTypes from './../UserTypes.tsx';
import InfoArea from './../../common/components/InfoArea.tsx';
import { Link } from 'react-router';
import AccountEntry from './../../common/components/AccountEntry.tsx';
import CheckBox from './../../common/components/CheckBox.tsx';
import RadioButtons from './../../common/components/RadioButtons.tsx';
var Select = require('react-select');
var SoundIcon = require("./../../../images/icon_camera.svg");

interface Props
{
  params?: any;
  history?: any;
  children?: any;
}

class Notifications extends Classs<Props>
{
  cancelSubscription = null;
  
  emailNotificationOptions = [
    {
      value: 'Once every 15 minutes', 
      handler: this.changeEmailNotifications_15Min
    },
    {
      value: 'Once an hour at most',
      handler: this.changeEmailNotifications_Hour
    },
    {
      value: 'Never',
      handler: this.changeEmailNotifications_Never
    }
  ]

  notificationTypes = [
    {
      value: 'Activities of any kind',
      label: 'Activities of any kind'
    },
    {
      value: 'Certain activities',
      label: 'Certain activities'
    }
  ]

  desktopNotificationSounds = [
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
    }
  ]

  sounds = {
    chime: 'http://www.wavsource.com/snds_2016-06-26_4317323406379653/sfx/chime.wav',
    doorbell: 'http://www.wavsource.com/snds_2016-06-26_4317323406379653/sfx/doorbell_x.wav',
    whistle: 'http://www.wavsource.com/snds_2016-06-26_4317323406379653/sfx/slide_whistle_up.wav'
  };

  constructor(props)
  {
    super(props);
    
    this.state = {
      istate: Store.getState(),
      emailNotificationSetting: 'Never',
      emailNewsOn: true,
      desktopNotificationType: 'Activities of any kind',
      desktopNotificationSound: 'chime',
      emailNotificationType: 'Activities of any kind',
      playSound: false,
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

  onDesktopNotificationChange(val) 
  {
    this.setState ({
      desktopNotificationType: val.value,
    })
  }

  onDesktopNotificationsSoundChange(val) 
  {
    this.setState ({
      desktopNotificationSound: val.value,
    })
  }

  playSound() 
  {
    var sound = new Audio();
    sound.src = this.sounds[this.state.desktopNotificationSound];
    sound.play();
  }

  expandDesktopNotifications()
  {
   return (
     <div className='notification-expansion'>
       <div className='notification-subtitle'>
         Send me desktop notifications for:
       </div>
       <Select
         clearable={false}
         name='desktop-notification'
         value={this.state.desktopNotificationType}
         options={this.notificationTypes}
         onChange={this.onDesktopNotificationChange}
         className='notifications-select'
       />
       <div className='notification-subtitle'>
         Desktop notifications use this sound:
       </div>
         <Select
            name='desktop-notification-sound'
            value={this.state.desktopNotificationSound}
            clearable={false}
            options={this.desktopNotificationSounds}
            onChange={this.onDesktopNotificationsSoundChange}
            className='notifications-select'
         />
         <div 
           className='preview-button'
           onClick={this.playSound}
         >
           <div className='sound-icon'>
             <SoundIcon/>
           </div>
           <div className='preview-button-text'>
           Preview
           </div>
         </div>
     </div>
   );
  }
  
  changeEmailNotifications_15Min()
  {
    this.setState ({
      emailNotificationSetting: this.emailNotificationOptions[0].value
    })
  }

  changeEmailNotifications_Hour()
  {
    this.setState ({
      emailNotificationSetting: this.emailNotificationOptions[1].value
    })
  }

    changeEmailNotifications_Never()
  {
    this.setState ({
      emailNotificationSetting: this.emailNotificationOptions[2].value
    })
  }

  onEmailNotificationTypeChange(val)
  {
    this.setState({
      emailNotificationType: val.value,
    })
  }

  expandEmailNotifications() 
  {
    return (
      <div className='notification-expansion'>
        <div>Send me email notifications:</div>
        <br/>
        <div className='expanded-section-indent'>
          <RadioButtons
            selected={this.state.emailNotificationSetting}
            options={this.emailNotificationOptions}
          />
        </div>
        <div className='notification-subtitle-small'>
         Send me email notifications for:
       </div>
       <Select
         clearable={false}
         name='email-notification'
         value={this.state.emailNotificationType}
         options={this.notificationTypes}
         onChange={this.onEmailNotificationTypeChange}
         className='notifications-select'
       />
      </div>
    );
  }

  toggleEmailNews() 
  {
    this.setState({
      emailNewsOn: !this.state.emailNewsOn,
    });
  }

  expandEmailNews() 
  {
    return (
      <div className='notification-expansion'>
        <div>You can choose which of these updates you'd like to receive:</div>
        <br/>
        <span className='expanded-section-indent'>
          <CheckBox 
            checked={this.state.emailNewsOn} 
            onChange={this.toggleEmailNews}
          />
          Send me emails with Terrain news and tips <br/><br/>
        </span>
        <div>If you opt out of the above, note that we we'll still send you important
        adminstrative emails, such as password resets. <br/>
        </div>
        {this.renderEmail()}
      </div>
      );
  }

  renderEmail() 
  {
    if(this.state.istate.currentUser && this.state.istate.currentUser.email) 
    {
      return(
        <div>
        Your email is currently set to
        <span className='email-blue'>
        {this.state.istate.currentUser.email}
        </span>
        .
        </div>
      );
    } 
    return <div>Your email adddress has not been set yet.</div>
  }

  renderDesktopDescription() 
  {
    return(
      <div>
        Terrain can send push notifications to your desktop when someone 
        updates an algorithm. You are currently recieving updates for 
        <span><b>{' ' + this.state.desktopNotificationType}.</b></span>
      </div>  
    );

  }

  renderEmailDescription()
  {
    return(
      <div>
        When you're busy or not online, Terrain can send you 
        emails so you don't miss a beat.You are currently receiving emails 
        <span><b>{' ' + this.state.emailNotificationSetting}.</b></span>
      </div>
    );
  }

  renderEmailNewsDescription() 
  {
    return(
      <div>
        From time to time we'd like to send you emails with interesting 
        news from the Terrain team. You are set up to 
        <span><b>{this.state.emailNewsOn ? ' ' : ' not '}</b></span>
        recieve emails with Terrain news and tips.
      </div>
    );
  }

  render()
  {
    return (
      <div>
      <div className='notifications-page-title'>Update your notifications</div>
      <AccountEntry
        title='Desktop Notifications'
        description={this.renderDesktopDescription}
        onClick={this.expandDesktopNotifications}
      />
      <AccountEntry
        title='Email Notifications'
        description={this.renderEmailDescription}
        onClick={this.expandEmailNotifications}
      />
      <AccountEntry
        title='Email News & Updates'
        description={this.renderEmailNewsDescription}
        onClick={this.expandEmailNews}
      />

      </div>
    );
  }
}

export default Notifications;
