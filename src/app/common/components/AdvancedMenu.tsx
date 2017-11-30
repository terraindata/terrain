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

// tslint:disable:no-var-requires strict-boolean-expressions

import * as classNames from 'classnames';
import * as $ from 'jquery';
import * as _ from 'lodash';
import * as Radium from 'radium';
import * as React from 'react';
import TerrainComponent from './../../common/components/TerrainComponent';
import './AdvancedMenu.less';
import { borderColor, Colors, fontColor } from '../../colors/Colors';
import ColorsActions from '../../colors/data/ColorsActions';

const optionHeight = 30; // coordinate with Menu.less
const ArrowIcon = require('images/icon_arrow.svg?name=ArrowIcon');

export interface AdvancedMenuOption
{
  text: string;
  expandedContent?: string | El;
}

export interface Props
{
  options: List<AdvancedMenuOption>;
  title: string;
  canEdit: boolean;
}

@Radium
export class AdvancedMenu extends TerrainComponent<Props>
{
  public state: {
    open: boolean;
    expandedIndex: number;
  } = {
    open: false,
    expandedIndex: -1,
  };

  public showExpandedContent(index, e?)
  {
    this.setState({
      expandedIndex: index,
    });
  }

  public renderOption(option: AdvancedMenuOption, index)
  {
    return (
      <div
        className='advanced-menu-option'
        onClick={this._fn(this.showExpandedContent, index)}
        onMouseEnter={this._fn(this.showExpandedContent, index)}
        // onMouseLeave={this._fn(this.showExpandedContent, -1)}
        key={index}
      >
        <div className='advanced-menu-option-text'>{option.text}</div>
        {
          option.expandedContent !== undefined ?
            <div className='advanced-menu-option-arrow'><ArrowIcon /> </div>
            :
            null
        }
        {
          (this.state.expandedIndex === index && option.expandedContent !== undefined) ?
            <div
              className='advanced-menu-option-expanded'
              onClick={this.preventClose}
            >
              {option.expandedContent}
            </div>
            :
            null
        }
      </div>
    );
  }

  public preventClose(e)
  {
    this.setState({
      open: false,
    });
  }

  public close(e)
  {
    if (e.target.className === 'advanced-menu-option')
    {
      return;
    }
    if (this.state.open)
    {
      $(document).off('click', this.close);
    }
    this.setState({
      open: !this.state.open,
    });
  }

  public componentWillUnmount()
  {
    $(document).off('click', this.close);
  }

  public toggleOpen(e)
  {
    e.preventDefault();
    e.stopPropagation();
    this.setState({
      open: !this.state.open,
    });

    if (!this.state.open)
    {
      $(document).on('click', this.close);
    }
  }

  public render()
  {
    const { options } = this.props;
    if (!options || !options.size)
    {
      return null;
    }

    let multiplier = 14;
    const width = multiplier * options.reduce((max, option) =>
      option.text && (option.text.length > max) ? option.text.length : max, 1);

    const style = {
      width,
      height: options.size * optionHeight,
    };

    return (
      <div
        className={classNames({
          'advanced-menu-wrapper': true,
          'advanced-menu-open': this.state.open,
        })}
        style={borderColor(this.state.open ? Colors().active : Colors().iconColor)}
      >
        <div
          onClick={this.toggleOpen}
          style={{ width }}
        >
          {this.props.title}
        </div>
        {
          this.state.open &&
          <div
            className='advanced-menu-options-wrapper'
            style={style}
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

export default AdvancedMenu;
