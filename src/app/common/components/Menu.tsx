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

require('./Menu.less');
import * as $ from 'jquery';
import * as _ from 'underscore';
import * as React from 'react';
import Util from '../../util/Util.tsx';
import * as classNames from 'classnames';
import Classs from './../../common/components/Classs.tsx';
var MoreIcon = require("./../../../images/icon_more_12x3.svg?name=MoreIcon");

var optionHeight = 30; // coordinate with Menu.less

export interface MenuOption {
  text: string;
  onClick: () => void;
  disabled?: boolean;
};

interface Props
{
  options: MenuOption[];
  small?: boolean;
}

class Menu extends Classs<Props>
{
  constructor(props: Props) {
    super(props);
    this.state =
    {
      open: false,
    }
  }
  
  shouldComponentUpdate(nextProps, nextState)
  {
    return !_.isEqual(this.props, nextProps) || !_.isEqual(this.state, nextState);
  }
  
  renderOption(option, index)
  {
    if(!option.disabled)
    {
      var onClick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        option.onClick(index);
      };
    }
    
    return (
      <div className={"menu-option" + (option.disabled ? " menu-option-disabled" : "")} key={index} onClick={onClick}>
        <div className="dead-center">
          { option.text }
        </div>
      </div>
    );
  }
  
  close()
  {
    this.setState({
      open: false,
    })
    $(document).off('click', this.close);
  }
  
  componentWillUnmount()
  {
    $(document).off('click', this.close);
  }
  
  toggleOpen()
  {
    this.setState({
      open: !this.state.open,
    });
    
    if(!this.state.open)
    {
      $(document).on('click', this.close);
    }
  }

  render() {
    var style = {
      width: 14 * this.props.options.reduce((max, option) => 
        option.text.length > max ? option.text.length : max, 1),
      height: this.props.options.length * optionHeight,
    };
    
    return (
      <div
        className={classNames({
          "menu-wrapper": true,
          "menu-wrapper-small": this.props.small,
          "menu-open": this.state.open,        
        })}
        style={style}
        onClick={this.toggleOpen}
      >
        <MoreIcon className="menu-icon" />
        { !this.state.open ? null :
          <div className="menu-options-wrapper">
            {
              this.props.options.map(this.renderOption)
            }
          </div>
        }
      </div>
    );
  }
};

export default Menu;