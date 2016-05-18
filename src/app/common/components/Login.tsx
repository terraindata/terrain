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
import * as React from 'react';
import Util from '../../util/Util.tsx';
import Actions from "../../builder/data/BuilderActions.tsx";

var ArrowIcon = require("./../../../images/icon_arrow_8x5.svg?name=ArrowIcon");
var TerrainIcon = require("./../../../images/icon_terrain_108x17.svg?name=TerrainIcon");

interface Props {
}

class Login extends React.Component<Props, any>
{
  constructor(props:Props)
  {
    super(props);
    Util.bind(this, 'handleKeyDown');
    this.state = {
      username: '',
      password: '',
    }
  }
  
  handleKeyDown = (event) =>
  {
    if(event.keyCode === 13)
    {
      this.handleLogin();
    }
  }
  
  handleUsernameChange = (ev:any) =>
  {
    this.setState({ username: ev.target.value });
  }
  
  handlePasswordChange = (ev:any) =>
  {
    this.setState({ password: ev.target.value });
  }
  
  handleLogin = () =>
  {
    let login = (token: string) => {
      Actions.authentication.login(token);
    };
    
    if (DEV === true) {
      login("DEV mode free pass.");
      return
    }
    
    let xhr = new XMLHttpRequest();
    xhr.onerror = (ev:Event) => {
      alert("Error logging in: " + ev);
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
      username: this.state.username,
      password: this.state.password,
    }));
  }
  
  render() {
    return (
      <div className='login'>
        <div className='login-wrapper'>
          <div className='login-logo'>
            <TerrainIcon />
          </div>
          <div className='login-info'>
            <input type='text' id='login-username' placeholder='username' onChange={this.handleUsernameChange} />
            <input type='password' id='login-password' placeholder='password' onKeyDown={this.handleKeyDown} onChange={this.handlePasswordChange} />
          </div>
          <a className='login-submit' onClick={this.handleLogin}>
            Login
          </a>
        </div>
      </div>
   );
  }
};

export default Login;