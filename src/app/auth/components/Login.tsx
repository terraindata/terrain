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
require('./Login.less');
import * as classNames from 'classnames';
import * as $ from 'jquery';
import * as React from 'react';
import * as _ from 'underscore';
import PureClasss from '../../common/components/PureClasss';
import Ajax from '../../util/Ajax';
import Util from '../../util/Util';
import Actions from '../data/AuthActions';
import Loading from './../../common/components/Loading';
import Modal from './../../common/components/Modal';

const TerrainIcon = require('./../../../images/logo_mountainCircle.svg?name=TerrainIcon');

export interface Props
{
  appStateLoaded: boolean;
  loggedIn: boolean;
  onLoadComplete: () => void;
}

class Login extends PureClasss<Props>
{
  state = {
    shifted: false,
    email: '',
    password: '',
    token: '',
    loginErrorModalOpen: false,
    errorModalMessage: '',
    showingLogo: false,
    opened: false,
    loggingIn: false,
    xhr: null,
  };

  componentDidMount()
  {
    $('body').on('keydown', this.handleBodyKeyDown);

    setTimeout(() =>
      this.setState({
        showingLogo: true,
      }),
      250,
    );
    setTimeout(() =>
      this.setState({
        opened: true,
      }),
      1250,
    );
  }

  componentWillUnmount()
  {
    $('body').off('keydown', this.handleBodyKeyDown);
  }

  handleBodyKeyDown(event)
  {
    // delay it, because for some reason, the page does
    //  not pick up on auto-filled values in the password
    //  field until after the enter key is pressed
    setTimeout(() => this.handleKeyDown(event), 100);
  }

  handleKeyDown(event)
  {
    if (event.keyCode === 13)
    {
      this.handleLogin();
    }
  }

  handleEmailChange(ev: any)
  {
    const { value } = ev.target;
    this.setState({
      email: value,
    });

    if (value.length)
    {
      this.setState({
        shifted: true,
      });
    }
  }

  handlePasswordChange(ev: any)
  {
    const { value } = ev.target;
    this.setState({
      password: value,
    });

    if (value.length)
    {
      this.setState({
        shifted: true,
      });
    }
  }

  handleFocus()
  {
    this.setState({
      shifted: true,
    });
  }

  handleBlur()
  {
    if (!this.state.email && !this.state.password)
    {
      this.setState({
        shifted: false,
      });
    }
  }

  handleAnimationEnded()
  {
    this.props.onLoadComplete();
  }

  handleLogin()
  {
    if (this.state.loggingIn)
    {
      // already logging in
      return;
    }

    this.state.xhr && this.state.xhr.abort();

    this.setState({
      loggingIn: true,
      xhr: Ajax.login(
        this.state.email,
        this.state.password,

        (userData: { accessToken: string, id: number }) =>
        {
          Actions.login(userData.accessToken, userData.id);
        },

        (ev: Event) =>
        {
          this.setState({
            errorModalMessage: 'Error logging in:' + JSON.stringify(ev),
            loggingIn: false,
            xhr: null,
          });
          this.toggleErrorModal();
        },
      ),
    });
  }

  handleForgotPassword()
  {
    alert("Sorry, resetting your password hasn't been implemented yet.");
  }

  registerNewUser()
  {
    alert('Signing up for Terraformer has not been implemented yet');
  }

  toggleErrorModal()
  {
    this.setState({
      loginErrorModalOpen: !this.state.loginErrorModalOpen,
    });
  }

  // <TerrainIcon className='login-logo'/>
  render()
  {
    // show loading if you are logging in, or if you are already logged in
    //  but the app state is still loading
    const loading = (this.state.loggingIn && !this.props.loggedIn) ||
      (this.props.loggedIn && !this.props.appStateLoaded);
    return (
      <div
        className={classNames({
          'login-wrapper': true,
          'login-wrapper-shifted': this.state.shifted,
          'login-wrapper-open': this.state.opened && !this.state.loggingIn && !this.props.loggedIn,
        })}
      >
        <div className='login-logo-container'>
          {
            this.state.showingLogo &&
            <Loading
              width={150}
              height={150}
              loading={loading}
              loaded={this.props.loggedIn && this.props.appStateLoaded}
              onLoadedEnd={this.handleAnimationEnded}
            />
          }
        </div>
        <div
          className='login-container'
          ref='container'
        >
          <div className='login-info'>
            <div className='login-row'>
              <input
                id='login-email'
                type='text'
                onChange={this.handleEmailChange}
                className='login-input-field'
                placeholder=''
                onFocus={this.handleFocus}
                onBlur={this.handleBlur}
              />
              <label
                htmlFor='login-email'
                className='login-label'
              >
                Email
              </label>
            </div>
            <div className='login-row'>
              <input
                className='login-input-field'
                type='password'
                id='login-password'
                placeholder=''
                onKeyDown={this.handleKeyDown}
                onChange={this.handlePasswordChange}
                onFocus={this.handleFocus}
                onBlur={this.handleBlur}
              />
              <label
                className='login-label'
                htmlFor='login-password'
              >
                Password
              </label>
            </div>
          </div>
          <div className='login-submit-button-wrapper' >
            <div className='login-submit-button button' onClick={this.handleLogin}>
              Login
            </div>
          </div>
          <Modal
            message={this.state.errorModalMessage}
            onClose={this.toggleErrorModal}
            open={this.state.loginErrorModalOpen}
            error={true}
          />
        </div>
      </div>
    );
  }
}
// <div className='login-bottom-toolbar'>
//   <div
//     className='login-forgot-password'
//     onClick={this.handleForgotPassword}
//   >
//     Forgot Password?
//   </div>
//   <div className='login-no-account'>
//     Don't have an account yet? &nbsp;
//       <span
//         className='login-green'
//         onClick={this.registerNewUser}
//       >
//          Sign Up
//       </span>
//   </div>
// </div>

export default Login;
