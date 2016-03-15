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
import Actions from "../../data/Actions.tsx";
import Util from '../../util/Util.tsx';

var ArrowIcon = require("./../../../images/icon_arrow_8x5.svg?name=ArrowIcon");

interface Props {
  onLogout: () => void;
}

class AccountDropdown extends React.Component<Props, any>
{
  constructor(props:Props)
  {
    super(props);
    this.state = {
      open: false,
    };
    
    Util.bind(this, 'toggleOpen', 'close');
  }
  
  close(event)
  {
    if(event.target !== this.refs['accountDropdownButton'])
    {
      this.setState({
        open: false,
      });
    }
    
    $("body").unbind('click', this.close);
  }
  
  componentWillUnmount()
  {
    $("body").unbind('click', this.close); 
  }
  
  toggleOpen()
  {
    if(!this.state.open)
    {
      $("body").click(this.close);
    }
    
    this.setState({
      open: !this.state.open,
    });
  }
  
  renderDropdown()
  {
    if(!this.state.open)
    {
      return null;
    }
  
    return (
      <div className="account-dropdown-content">
        <div className="account-dropdown-row" onMouseDown={this.props.onLogout}>
          Logout
        </div>
      </div>
    );
  }
  
  renderTopBar()
  {
    return (
      <div className="account-dropdown-top-bar" onClick={this.toggleOpen} ref='accountDropdownButton'>
        <div className="account-photo"></div>
        <div className="account-name">Jack Murphy</div>
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