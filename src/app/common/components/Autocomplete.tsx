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

require('./Autocomplete.less');

import * as _ from 'underscore';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import Util from '../../util/Util';
import * as classNames from 'classnames';
import PureClasss from './../../common/components/PureClasss';

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
  
  onFocus?: (event:React.FocusEvent<any>) => void;
  onBlur?: (event:React.FocusEvent<any>, value: string) => void;
}

class Autocomplete extends PureClasss<Props>
{
  value: string;

  state: {
    value: string;
    open: boolean;
    selectedIndex: number;
  };

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

  componentWillReceiveProps(nextProps)
  {
    this.value = nextProps.value;
    this.setState({
      value: nextProps.value,
    });
  }

  handleChange(event)
  {
    var {target} = event;
    while(target && target.value === undefined)
    {
      target = target.parentNode;
    }

    var {value} = target;
    this.value = value;
    this.props.onChange(value);
    this.setState({
      value,
    });
  }
<<<<<<< HEAD
  
  handleFocus(event:React.FocusEvent<any>)
=======

  handleFocus(event:React.FocusEvent)
>>>>>>> master
  {
    this.setState({
      open: true,
      selectedIndex: -1,
    });

    this.props.onFocus && this.props.onFocus(event);
  }

  blurValue: string = '';
  handleBlur(event:React.FocusEvent<any>)
  {
    this.setState({
      open: false,
      selectedIndex: -1,
    });
    this.props.onBlur && this.props.onBlur(event, this.blurValue || this.state.value);
    this.blurValue = '';
  }

  handleSelect(value)
  {
    this.props.onChange(value);
    this.setState({
      value,
      open: false,
      selectedIndex: -1,
    });
  }

  selectIndex(index: number)
  {
    // scroll option into view if necessary
    let ac = ReactDOM.findDOMNode(this.refs['ac']);
    let opt = ReactDOM.findDOMNode(this.refs['opt' + index]);
    if(ac && opt)
    {
      let acMin = ac.scrollTop;
      let acMax = ac.scrollTop +  ac.clientHeight;
      let oMin = opt['offsetTop'];
      let oMax = opt['offsetTop'] + opt.clientHeight;

      if(oMin < acMin)
      {
        ac.scrollTop = oMin;
      }
      if(oMax > acMax)
      {
        ac.scrollTop += (oMax - acMax);
      }
    }

    this.setState({
      selectedIndex: index,
    });
  }

  handleKeydown(event)
  {
    if(!this.props.options)
    {
      return;
    }
    var visibleOptions = this.props.options && this.props.options.filter(this.showOption);
    switch(event.keyCode)
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
        var value = visibleOptions.get(this.state.selectedIndex);
        if(!value || this.state.selectedIndex === -1)
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

  showOption(option: string): boolean
  {
    if(!option)
    {
      return false;
    }

    if(!this.state.value)
    {
      return true;
    }

    let haystack = option.toLowerCase();
    let needle = typeof this.state.value === 'string' ? this.state.value.toLowerCase() : '';

    return haystack.indexOf(needle) === 0
      || haystack.indexOf(" " + needle) !== -1
      || haystack.indexOf("." + needle) !== -1;
  }

  renderOption(option: string, index: number)
  {
    var first = option, second = "", third = "";
    if(this.state.value && this.state.value.length)
    {
      const i = option.toLowerCase().indexOf(this.state.value.toLowerCase());
      var first = option.substr(0, i);
      var second = option.substr(i, this.state.value.length);
      var third = option.substr(this.state.value.length + i);
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
        { first }<b>{ second }</b>{ third }
      </div>
    );
  }

  render()
  {
    var options = this.props.options && this.props.options.filter(this.showOption);
    var inputClassName = 'ac-input ' + (this.props.className || '');
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
        { !options || !this.state.open ? null :
          <div
            className={classNames({
              'ac-options': true,
              'ac-options-open': this.state.open,
            })}
            ref='ac'
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
