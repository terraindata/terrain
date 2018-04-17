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

// tslint:disable:restrict-plus-operands strict-boolean-expressions no-unused-expression no-var-requires

// TODO consider showing all options, even when a search text has been entered
//  so that they can easily change it
// and different labels for user inputs, fields, etc.

import './Autocomplete.less';

import * as classNames from 'classnames';
import * as _ from 'lodash';
import * as Radium from 'radium';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { tooltip } from 'common/components/tooltip/Tooltips';
import { altStyle, backgroundColor, borderColor, Colors, couldHover } from '../../colors/Colors';
import TerrainComponent from './../../common/components/TerrainComponent';

const InfoIcon = require('./../../../images/icon_info.svg');

export interface Props
{
  value: string | number;
  onChange: (value: string) => void;
  options: List<string>;
  style?: React.CSSProperties;

  placeholder?: string;
  help?: string;
  helpIsError?: boolean;

  ref?: string;
  className?: string;
  disabled?: boolean;

  onFocus?: (event: React.FocusEvent<any>) => void;
  onBlur?: (event: React.FocusEvent<any>, value: string | number) => void;
  onEnter?: (value: string) => void;
  onSelectOption?: (value: string) => void;

  autoFocus?: boolean;
  moveCursorToEnd?: boolean;

  onKeyDown?: (e) => void;
  onMouseUp?: (e) => void;
}

@Radium
class Autocomplete extends TerrainComponent<Props>
{
  public value: string | number; // this is used by parent components

  public state: {
    open: boolean;
    selectedIndex: number;
    hoveredIndex: number;
  };

  public blurValue: string = '';

  constructor(props: Props)
  {
    super(props);
    this.value = String(props.value);
    this.state =
      {
        open: false,
        selectedIndex: -1,
        hoveredIndex: -1,
      };
  }

  public componentWillMount()
  {
    this.value = this.props.value;
  }

  public componentWillReceiveProps(nextProps)
  {
    this.value = nextProps.value;
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

    if (this.props.onChange)
    {
      this.props.onChange(value);
    }
  }

  public handleFocus(event: React.FocusEvent<any>)
  {
    this.setState({
      open: true,
      selectedIndex: -1,
    });

    // On initial focus, make sure that the cursor is at the end of the text box (for map component text inputs)
    if (this.props.moveCursorToEnd)
    {
      (event.target as any).selectionStart = (event.target as any).selectionEnd = (event.target as any).selectionStart + 1;
    }

    this.props.onFocus && this.props.onFocus(event);
  }

  public handleBlur(event: React.FocusEvent<any>)
  {
    this.setState({
      open: false,
      selectedIndex: -1,
    });
    this.props.onBlur && this.props.onBlur(event, this.blurValue || this.props.value);
    this.blurValue = '';
  }

  public handleSelect(value)
  {
    this.props.onChange(value);
    if (this.props.onSelectOption !== undefined)
    {
      this.props.onSelectOption(value);
    }
    this.setState({
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
    if (this.props.onKeyDown)
    {
      this.props.onKeyDown(event);
    }
    if (!this.props.options)
    {
      // still be able to hit enter when there are no options
      if (event.keyCode === 13)
      {
        const value = event.target.value;
        this.setState({
          open: false,
        });
        this.blurValue = value;
        this.props.onChange(value);
        this.props.onEnter && this.props.onEnter(value);
        this.refs['input']['blur']();
      }
      return;
    }

    const firstOptions = this.props.options.filter((o) => this.showOption(o, 'first')).toList();
    const secondOptions = this.props.options.filter((o) =>
      this.showOption(o, 'second') && firstOptions.indexOf(o) === -1);
    const visibleOptions = firstOptions.concat(secondOptions).toList();
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
        let value = event.target.value;
        if (this.state.selectedIndex !== -1)
        {
          value = visibleOptions.get(this.state.selectedIndex);
        }
        else if (this.state.hoveredIndex !== -1)
        {
          value = visibleOptions.get(this.state.hoveredIndex);
        }

        this.setState({
          open: false,
          selectedIndex: -1,
        });
        this.blurValue = value;
        this.props.onChange(value);
        this.props.onEnter && this.props.onEnter(value);
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

  public showOption(option: string | number, level: 'any' | 'first' | 'second' = 'any'): boolean
  {
    // "first" level means the word starts with the term
    // "second" level means the word contains the term
    // "any" level accepts both first and second
    if (typeof option === 'number')
    {
      option = String(option);
    }
    if (option === null || option === undefined)
    {
      return false;
    }

    if (!this.props.value)
    {
      return true;
    }

    const haystack = option.toLowerCase();
    const needle = typeof this.props.value === 'string' ? this.props.value.toLowerCase() : '';

    const isFirst =
      haystack.indexOf(needle) === 0
      || haystack.indexOf(' ' + needle) !== -1
      || haystack.indexOf('.' + needle) !== -1;

    const isSecond = haystack.indexOf(needle) !== -1;

    if (level === 'first')
    {
      return isFirst;
    }

    if (level === 'second')
    {
      return isSecond;
    }

    return isFirst || isSecond;
  }

  public mouseOverOption(index)
  {
    this.setState({
      hoveredIndex: index,
    });
  }

  public mouseLeaveOption(value)
  {
    this.setState({
      hoveredIndex: -1,
    });
  }

  public renderOption(option: string | number, index: number)
  {
    option = String(option);
    let first = option;
    let second = '';
    let third = '';

    const { value } = this.props;
    if (value && typeof value === 'string' && value.length && this.showOption(option))
    {
      // if this was part of the found set, show a highlight
      const i = option.toLowerCase().indexOf(value.toLowerCase());
      first = option.substr(0, i);
      second = option.substr(i, value.length);
      third = option.substr(value.length + i);
    }

    return (
      <div
        className={classNames({
          'ac-option': true,
          'ac-option-selected': index === this.state.selectedIndex,
        })}
        onMouseDown={this._fn(this.handleSelect, option)}
        onMouseEnter={this._fn(this.mouseOverOption, index)}
        onMouseLeave={this.mouseLeaveOption}
        data-value={option}
        key={option + String(index)}
        ref={'opt' + index}
        style={couldHover(index === this.state.selectedIndex)}
      >
        {first}<b>{second}</b>{third}
      </div>
    );
  }

  public getOptions(): List<string>
  {
    const { options } = this.props;

    if (!options)
    {
      return null;
    }

    const firstOptions = options.filter((o) => this.showOption(o, 'first')).toList();
    const secondOptions = options.filter((o) => this.showOption(o, 'second') && firstOptions.indexOf(o) === -1);
    return firstOptions.concat(secondOptions).toList();
  }

  public render()
  {
    const options = this.getOptions();
    const inputClassName = 'ac-input ' + (this.props.className || '');

    const open = this.state.open && !!options && options.size > 0;

    let { value } = this.props;
    if (value === null || value === undefined)
    {
      // HTML inputs should not have null/undefined value
      value = '';
    }

    return (
      <div
        className='autocomplete'
        onMouseUp={this.props.onMouseUp}
      >
        <input
          style={[
            this.props.disabled ? DISABLED_STYLE : ENABLED_STYLE,
            this.props.style,
          ]}
          ref='input'
          type='text'
          className={classNames({
            [inputClassName]: true,
            'ac-input-disabled': this.props.disabled,
            'ac-input-has-tooltip': this.props.help !== undefined,
          })}
          value={value}
          onChange={this.handleChange}
          onFocus={this.handleFocus}
          onBlur={this.handleBlur}
          onKeyDown={this.handleKeydown}
          disabled={this.props.disabled}
          placeholder={this.props.placeholder}
          autoFocus={this.props.autoFocus}
        />
        {
          this.props.help &&
          <div className='tooltip-icon-positioning'>
            {
              tooltip(
                <InfoIcon
                  className={classNames({
                    'tooltip-icon': true,
                    'tooltip-is-error': this.props.helpIsError,
                  })}
                />,
                {
                  title: this.props.help,
                  position: 'top-end',
                  theme: this.props.helpIsError ? 'error' : undefined,
                },
              )
            }
          </div>
        }

        {!open ? null :
          <div
            className={classNames({
              'ac-options': true,
              'ac-options-open': this.state.open,
            })}
            ref='ac'
            style={altStyle()}
          >
            {
              options.map(this.renderOption)
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

const DISABLED_STYLE = _.extend({},
  backgroundColor(Colors().darkerHighlight, Colors().highlight),
  borderColor(Colors().inputBorder, Colors().inputBorder),
);

const ENABLED_STYLE = {
  ':focus': borderColor(Colors().active),
};

export default Autocomplete;
