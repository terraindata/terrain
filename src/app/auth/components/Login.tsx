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

require('./Login.less')
import * as $ from 'jquery';
import * as classNames from 'classnames';
import * as React from 'react';
import Util from '../../util/Util.tsx';
import Actions from "../data/AuthActions.tsx";
import PureClasss from '../../common/components/PureClasss.tsx';
import Modal from './../../common/components/Modal.tsx';

var ArrowIcon = require("./../../../images/icon_arrow_8x5.svg?name=ArrowIcon");
var TerrainIcon = require("./../../../images/logo_mountainCircle.svg?name=TerrainIcon");

interface Props {
}

class Login extends PureClasss<Props>
{
  state = {
    shifted: false,
    username: '',
    password: '',
    loginErrorModalOpen: false,
    errorModalMessage: '',
    opened: false,
  };
  
  componentDidMount()
  {
    $('body').on('keydown', this.handleBodyKeyDown);
    
    setTimeout(() =>
      Util.animateToAutoHeight(this.refs['container'], 
        () => this.setState({
          opened: true,
        }),
        500
      ),
      1000
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
    if(event.keyCode === 13)
    {
      this.handleLogin();
    }
  }
  
  handleUsernameChange(ev:any)
  {
    let {value} = ev.target;
    this.setState({ 
      username: value
    });
    
    if(value.length)
    {
      this.setState({
        shifted: true,
      })
    }
  }
  
  handlePasswordChange(ev:any)
  {
    let {value} = ev.target;
    this.setState({ 
      password: value
    });
    
    if(value.length)
    {
      this.setState({
        shifted: true,
      })
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
    if(!this.state.username && !this.state.password)
    {
      this.setState({
        shifted: false,
      });
    }
  }
  
  handleLogin()
  {
    let { username } = this.state;
    let login = (token: string) => {
      Actions.login(token, username);
    };
    
    let xhr = new XMLHttpRequest();
    xhr.onerror = (ev:Event) => {
      this.setState({
          errorModalMessage: 'Error logging in:' + ev,
        });
        this.toggleErrorModal();
    }
    xhr.onload = (ev:Event) => {
      if (xhr.status != 200) {
        this.setState({
          errorModalMessage: 'Failed to log in: ' + xhr.responseText,
        });
        this.toggleErrorModal();
        return;
      }
      login(xhr.responseText);
    }
    // NOTE: MIDWAY_HOST will be replaced by the build process.
    xhr.open("POST", MIDWAY_HOST + "/auth", true);
    xhr.send(JSON.stringify({
      username,
      password: this.state.password,
    }));
  }  

  handleForgotPassword()
  {
    alert("Sorry, resetting your password hasn't been implemented yet.");
  }

  registerNewUser()
  {
    alert("Signing up for Terraformer has not been implemented yet");
  }

  toggleErrorModal()
  {
    this.setState ({
      loginErrorModalOpen: !this.state.loginErrorModalOpen
    });
  }

  render() {
    return (
      <div
        className={classNames({
          'login-wrapper': true,
          'login-wrapper-shifted': this.state.shifted,
          'login-wrapper-opened': this.state.opened,
        })}
        onKeyDown={this.handleKeyDown} 
      >
        <div className='login-logo-container'>
          <TerrainIcon className='login-logo'/>
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
                onChange={this.handleUsernameChange}
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
};
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