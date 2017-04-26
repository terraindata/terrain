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
import Util from '../../util/Util';
import * as classNames from 'classnames';
import PureClasss from './../../common/components/PureClasss';
var MoreIcon = require("./../../../images/icon_more_12x3.svg?name=MoreIcon");

var optionHeight = 30; // coordinate with Menu.less

export interface MenuOption {
  text: string;
  onClick: (index:number, id: string) => void;
  disabled?: boolean;
  icon?: any;
  iconColor?: string;
}

export interface Props
{
  options: List<MenuOption>;
  small?: boolean;
  style?: any;
  id?: ID;
}

export class Menu extends PureClasss<Props>
{
  state: {
    open: boolean;
  };

  constructor(props: Props) {
    super(props);
    this.state =
    {
      open: false,
    }
  }

  renderOption(option, index)
  {
    if(option.spacer)
    {
      return <div className='menu-option menu-option-spacer' key={index} />;
    }

    if(!option.disabled)
    {
      // TODO
      var onClick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        option.onClick(index, this.props.id);
      };
    }
    return (
      <div
        className={"menu-option" + (option.disabled ? " menu-option-disabled" : "")}
        key={index}
        onClick={onClick}
      >
        <div
          className="menu-option-icon"
          style={{
            fill: option.iconColor || 'black',
          }}>
          {option.icon}
        </div>
        <div
          className={option.icon ? "menu-text-padding" : "menu-text-padding-no-icon"}
        >
          { option.text }
        </div>
      </div>
    );
  }

  close()
  {
    this.setState({
      open: false,
    });
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

  render()
  {
    let {options} = this.props;
    if(!options || !options.size)
    {
      return null;
    }

    var multiplier = 10;
    if(options.get(0).icon)
    {
      multiplier = 14;
    }
    var width = multiplier * options.reduce((max, option) =>
        option.text && (option.text.length > max) ? option.text.length : max, 1);

    var style = {
      width: width,
      height: options.size * optionHeight,
    };

    return (
    <div
      className={classNames({
        "menu-wrapper": true,
        "menu-wrapper-small": this.props.small,
        "menu-open": this.state.open,
      })}
      style={this.props.style ? this.props.style : null}
    >
      <div
        className="menu-icon-wrapper"
        onClick={this.toggleOpen}
      >
        <MoreIcon className="menu-icon" />
       </div>
        {
          this.state.open &&
            <div
              className="menu-options-wrapper"
              style={style}
              onClick={this.toggleOpen}
            >
              {
                options.map(this.renderOption)
              }
            </div>
        }
      </div>
    );
  }
}
export default Menu;
