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

import * as React from 'react';
import { Link } from 'react-router';
import AuthStore from './../../auth/data/AuthStore';
import Classs from './../../common/components/Classs';
import InfoArea from './../../common/components/InfoArea';
import Modal from './../../common/components/Modal';
import Ajax from './../../util/Ajax';
import Actions from './../data/UserActions';
import UserStore from './../data/UserStore';
import LibraryTypes from './../UserTypes';
import UserTypes from './../UserTypes';
const CameraIcon = require('./../../../images/icon_camera.svg');
const CloseIcon = require('./../../../images/icon_close_8x8_gray.svg');
const {browserHistory} = require('react-router');

export interface Props
{
  params?: any;
  children?: any;
}

class Profile extends Classs<Props>
{
  userUnsubscribe = null;
  authUnsubscribe = null;

  state: {
    user: UserTypes.User,
    loading: boolean,
    saving: boolean,
    savingReq: any,
    showDropDown: boolean,
    errorModalOpen: boolean,
    errorModalMessage: string,
  } = {
    user: null,
    loading: false,
    saving: false,
    savingReq: null,
    showDropDown: false,
    errorModalOpen: false,
    errorModalMessage: '',
  };

  infoKeys = [
    {
      key: 'firstName',
      label: 'First Name',
      subText: '',
    },
    {
      key: 'lastName',
      label: 'Last Name',
      subText: '',
    },
    {
      key: 'whatIDo',
      label: 'What I Do',
      subText: 'Let people know your role',
    },
    {
      key: 'phone',
      label: 'Phone',
      subText: 'This will be displayed on your internal profile',
    },
    {
      key: 'skype',
      label: 'Skype',
      subText: 'This will be displayed on your internal profile',
    },
  ];

  constructor(props: Props)
  {
    super(props);

    this.userUnsubscribe =
      UserStore.subscribe(() => this.updateUser(this.props));
    this.authUnsubscribe =
      AuthStore.subscribe(() => this.updateUser(this.props));
  }

  updateUser(props: Props)
  {
    const userState: UserTypes.UserState = UserStore.getState();
    const authState = AuthStore.getState();
    this.setState({
      user: userState.getIn(['users', authState.get('username')]),
      loading: userState.get('loading'),
    });
  }

  componentWillMount()
  {
    Actions.fetch();
    this.updateUser(this.props);
  }

  componentWillUnmount()
  {
    this.userUnsubscribe && this.userUnsubscribe();
    this.authUnsubscribe && this.authUnsubscribe();
    this.state.savingReq && this.state.savingReq.abort();
  }

  handleSave()
  {
    let newUser = this.state.user;
    this.infoKeys.map((infoKey) => {
      newUser = newUser.set(infoKey.key, this.refs[infoKey.key]['value']) as UserTypes.User;
    });

    Actions.change(newUser as UserTypes.User);

    this.setState({
      saving: true,
      savingReq: Ajax.saveUser(newUser, this.onSave, this.onSaveError),
    });
  }

  onSave()
  {
    this.setState({
      saving: false,
      savingReq: null,
    });
    browserHistory.push('/account/profile');
  }

  onSaveError(response)
  {
    this.setState({
      errorModalMessage: 'Error saving: ' + JSON.stringify(response),
    });
    this.toggleErrorModal();

    this.setState({
      saving: false,
      savingReq: null,
    });
  }

  renderInfoItem(infoKey: { key: string, label: string, subText: string })
  {
    return (
      <div className="profile-info-item-edit" key={infoKey.key}>
        <div className="profile-info-item-name">
          { infoKey.label }
        </div>
        <div className="profile-info-item-value">
          <input
            type="text"
            defaultValue={this.state.user[infoKey.key]}
            ref={infoKey.key}
            />
        </div>
        <div className="profile-info-item-subtext">
          { infoKey.subText }
        </div>
      </div>
    );
  }

  handleProfilePicClick(event)
  {
    this.setState({
      showDropDown: !this.state.showDropDown,
    });
  }

  handleUploadImage(event)
  {
    this.refs['imageInput']['click']();
  }

  removeProfilePicture()
  {
    const user = this.state.user.set('imgSrc', null) as UserTypes.User;
    this.setState({
      user,
    });
    this.refs['profilePicImg']['src'] = UserTypes.profileUrlFor(user);
  }

  handleProfilePicChange(event)
  {
    const reader  = new FileReader();

    reader.addEventListener('load', () => {
      this.refs['profilePicImg']['src'] = reader.result;
      this.setState({
        user: this.state.user.set('imgSrc', reader.result),
      });
    }, false);

    const file = event.target.files[0];

    if (file) {
      if (file.size > 3000000)
      {
        this.setState({
          errorModalMessage: 'Maximum allowed file size is 3MB',
        });
        this.toggleErrorModal();
        return;
      }

      reader.readAsDataURL(file);
    }
  }

  hidePictureMenu()
  {
    if (this.state.showDropDown)
    {
      this.setState({
        showDropDown: false,
      });
    }
  }

  renderProfilePicture()
  {
    return(
      <div
        className="edit-profile-pic"
        onClick={this.handleProfilePicClick}
      >
        <div className={this.state.showDropDown ? 'dropdown' : 'dropdown-hidden'}>
          <div
            onClick={this.handleUploadImage}
            className="menu-item"
          >
            Upload an image
          </div>
          <div
            onClick={this.removeProfilePicture}
            className="menu-item"
          >
            Remove photo
          </div>
        </div>
        <img
          className="profile-pic-image"
          src={UserTypes.profileUrlFor(this.state.user)}
          ref="profilePicImg"
        />
        <div className="profile-pic-overlay">
          <div className="profile-pic-overlay-message">
            <div className="camera-icon">
              <CameraIcon />
            </div>
            Change your profile picture
          </div>
        </div>
        <input
          ref="imageInput"
          type="file"
          className="profile-pic-upload"
          onChange={this.handleProfilePicChange}
          id="profile-image-input"
        />
      </div>
    );
  }

  toggleErrorModal()
  {
    this.setState ({
      errorModalOpen: !this.state.errorModalOpen,
    });
  }

  render()
  {
    if (this.state.loading)
    {
      return <InfoArea large="Loading..." />;
    }

    if (!this.state.user)
    {
      return <InfoArea large="No such user found." />;
    }

    return (
      <div className="profile profile-edit" onClick={this.hidePictureMenu}>
        <div className="profile-save-row">
          <div className="edit-profile-title">
            Edit your profile
          </div>
          <div className="edit-profile-close-icon" onClick={this.handleSave}>
            <CloseIcon />
          </div>
        </div>
        <div className="profile-edit-container">
          <div className="profile-info">
            {
              this.infoKeys.map(this.renderInfoItem)
            }
          </div>
          <div className="profile-pic-column">
            <div className="profile-pic-name"> Profile Picture </div>
            {this.renderProfilePicture()}
          </div>
        </div>
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

export default Profile;
