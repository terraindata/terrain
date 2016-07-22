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

require('./AccountDropdown.less')
import * as $ from 'jquery';
import * as React from 'react';
import Actions from "../../builder/data/BuilderActions.tsx";
import Util from '../../util/Util.tsx';
import Classs from '../../common/components/Classs.tsx';
import UserThumbnail from '../../users/components/UserThumbnail.tsx';
import AuthStore from '../../auth/data/AuthStore.tsx';
import UserTypes from '../../users/UserTypes.tsx';
import { Link } from 'react-router';

var ArrowIcon = require("./../../../images/icon_arrow_8x5.svg?name=ArrowIcon");

var LogoutIcon = require("./../../../images/icon_close_8x8.svg");
var EditIcon = require("./../../../images/icon_close_8x8.svg");

interface Props {
  onLogout: () => void;
}

class AccountDropdown extends Classs<Props>
{
  state: {
    open: boolean,
    username: string,
  } = {
    open: false,
    username: null,
  };
  
  unsubscribe = null;
  
  constructor(props:Props)
  {
    super(props);
  }
  
  componentWillMount()
  {
    this.unsubscribe = AuthStore.subscribe(this.updateUser)
    this.updateUser();
  }
  
  componentWillUnmount()
  {
    $("body").unbind('click', this.close); 
    this.unsubscribe && this.unsubscribe();
  }
  
  updateUser()
  {
    let state = AuthStore.getState();
    if(state)
    {
      this.setState({
        username: state.get('username'),
      })
    }
  }
  
  close(event)
  {
    if(event.target !== this.refs['accountDropdownButton'])
    {
      this.setState({
        open: false,
      });
    }
    event.stopPropagation();
    
    $("body").unbind('click', this.close);
  }
  
  toggleOpen(event)
  {
    this.setState({
      open: !this.state.open,
    });
    
    if(!this.state.open)
    {
      $("body").click(this.close);
    }
  }
  
  editProfile() 
  {
    //Is this the right way to change page location?
    window.location.replace('/account/profile/edit');
  }

  renderDropdown()
  {
    if(!this.state.open)
    {
      return null;
    }
  
    return (
      <div className="account-dropdown-content">
        <div className="account-dropdown-row" onMouseDown={this.editProfile}>
          <div className = 'account-dropdown-icon account-dropdown-icon-red'>
            <EditIcon/>
          </div>
          <Link to={'/account/profile/edit'} className='account-dropdown-link'>
             Edit
          </Link>        
        </div>
        <div className="account-dropdown-row" onMouseDown={this.props.onLogout}>
          <div className='account-dropdown-icon account-dropdown-icon-blue'>
            <LogoutIcon/>
          </div>
          Logout
        </div>
      </div>
    );
  }
  
  renderTopBar()
  {
    return (
      <div className="account-dropdown-top-bar" onClick={this.toggleOpen} ref='accountDropdownButton'>
        <UserThumbnail
          showName={true}
          username={this.state.username}
          hideAdmin={true}
        />
        <ArrowIcon className="account-arrow-icon" />
      </div>
    );
  }
  
  render()
  {
    var classes = Util.objToClassname({
      "account-dropdown-wrapper": true,
      "account-dropdown-open": this.state.open,
    });
    
    return (
      <div className={classes}>
        { this.renderTopBar() }
        { this.renderDropdown() }
      </div>
   );
  }
};

export default AccountDropdown;