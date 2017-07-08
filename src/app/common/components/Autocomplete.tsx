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
import './Autocomplete.less';

import * as classNames from 'classnames';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as _ from 'underscore';
import Util from '../../util/Util';
import TerrainComponent from './../../common/components/TerrainComponent';
import { Colors, backgroundColor, fontColor } from '../../common/Colors';

export interface Props
{
  value: string;
  onChange: (value: string) => void;
  options: List<string>;

  placeholder?: string;
  help?: string;
  ref?: string;
  className?: string;
  disabled?: boolean;

  onFocus?: (event: React.FocusEvent<any>) => void;
  onBlur?: (event: React.FocusEvent<any>, value: string) => void;
}

class Autocomplete extends TerrainComponent<Props>
{
  public value: string;

  public state: {
    value: string;
    open: boolean;
    selectedIndex: number;
  };

  public blurValue: string = '';

  constructor(props: Props)
  {
    super(props);
    this.value = props.value;
    this.state =
      {
        value: props.value,
        open: false,
        selectedIndex: -1,
      };
  }

  public componentWillReceiveProps(nextProps)
  {
    this.value = nextProps.value;
    this.setState({
      value: nextProps.value,
    });
  }

  public handleChange(event)
  {
    let { target } = event;
    while (target && target.value === undefined)
    {
      target = target.parentNode;
    }

    const { value } = target;
    this.value = value;
    this.props.onChange(value);
    this.setState({
      value,
    });
  }

  public handleFocus(event: React.FocusEvent<any>)
  {
    this.setState({
      open: true,
      selectedIndex: -1,
    });

    this.props.onFocus && this.props.onFocus(event);
  }

  public handleBlur(event: React.FocusEvent<any>)
  {
    this.setState({
      open: false,
      selectedIndex: -1,
    });
    this.props.onBlur && this.props.onBlur(event, this.blurValue || this.state.value);
    this.blurValue = '';
  }

  public handleSelect(value)
  {
    this.props.onChange(value);
    this.setState({
      value,
      open: false,
      selectedIndex: -1,
    });
  }

  public selectIndex(index: number)
  {
    // scroll option into view if necessary
    const ac = ReactDOM.findDOMNode(this.refs['ac']);
    const opt = ReactDOM.findDOMNode(this.refs['opt' + index]);
    if (ac && opt)
    {
      const acMin = ac.scrollTop;
      const acMax = ac.scrollTop + ac.clientHeight;
      const oMin = opt['offsetTop'];
      const oMax = opt['offsetTop'] + opt.clientHeight;

      if (oMin < acMin)
      {
        ac.scrollTop = oMin;
      }
      if (oMax > acMax)
      {
        ac.scrollTop += (oMax - acMax);
      }
    }

    this.setState({
      selectedIndex: index,
    });
  }

  public handleKeydown(event)
  {
    if (!this.props.options)
    {
      return;
    }
    const visibleOptions = this.props.options && this.props.options.filter(this.showOption);
    switch (event.keyCode)
    {
      case 38:
        // up
        this.selectIndex(Math.max(this.state.selectedIndex - 1, -1));
        break;
      case 40:
        // down
        this.selectIndex(Math.min(this.state.selectedIndex + 1, visibleOptions.size - 1));
        break;
      case 13:
      case 9:
        // enter or tab
        let value = visibleOptions.get(this.state.selectedIndex);
        if (!value || this.state.selectedIndex === -1)
        {
          value = event.target.value;
        }
        this.setState({
          open: false,
          selectedIndex: -1,
          value,
        });
        this.blurValue = value;
        this.props.onChange(value);
        this.refs['input']['blur']();
        break;
      case 27:
        // esc
        this.refs['input']['blur']();
        break;
      default:
      // nada
      // this.setState({
      //   selectedIndex: 0,
      // })
    }
  }

  public showOption(option: string): boolean
  {
    if (!option)
    {
      return false;
    }

    if (!this.state.value)
    {
      return true;
    }

    const haystack = option.toLowerCase();
    const needle = typeof this.state.value === 'string' ? this.state.value.toLowerCase() : '';

    return haystack.indexOf(needle) === 0
      || haystack.indexOf(' ' + needle) !== -1
      || haystack.indexOf('.' + needle) !== -1;
  }

  public renderOption(option: string, index: number)
  {
    let first = option;
    let second = '';
    let third = '';

    if (this.state.value && this.state.value.length)
    {
      const i = option.toLowerCase().indexOf(this.state.value.toLowerCase());
      first = option.substr(0, i);
      second = option.substr(i, this.state.value.length);
      third = option.substr(this.state.value.length + i);
    }

    return (
      <div
        className={classNames({
          'ac-option': true,
          'ac-option-selected': index === this.state.selectedIndex,
        })}
        onMouseDown={this._fn(this.handleSelect, option)}
        value={option}
        key={option}
        ref={'opt' + index}
      >
        {first}<b>{second}</b>{third}
      </div>
    );
  }

  public render()
  {
    const options = this.props.options && this.props.options.filter(this.showOption);
    const inputClassName = 'ac-input ' + (this.props.className || '');
    return (
      <div className='autocomplete'>
        <input
          ref='input'
          type='text'
          className={inputClassName}
          value={this.state.value}
          onChange={this.handleChange}
          onFocus={this.handleFocus}
          onBlur={this.handleBlur}
          onKeyDown={this.handleKeydown}
          disabled={this.props.disabled}
          placeholder={this.props.placeholder}
          data-tip={this.props.help}
          data-html={true}
        />
        {!options || !this.state.open ? null :
          <div
            className={classNames({
              'ac-options': true,
              'ac-options-open': this.state.open,
            })}
            ref='ac'
            style={fontColor(Colors().text.baseDark)}
          >
            {
              options.map(this.renderOption)
            }
            {
              options.size ? null : null && <div className='ac-no-options'>No matches</div>
            }
          </div>
        }
      </div>
    );
  }
  // {
  //   !options.size ? null :
  //     this.renderOption("", -1)
  // }
}
export default Autocomplete;
