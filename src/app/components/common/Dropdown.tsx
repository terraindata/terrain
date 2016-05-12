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

require('./Dropdown.less');
import * as $ from 'jquery';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as classNames from 'classnames';
import Util from '../../util/Util.tsx';
import Actions from "../../data/Actions.tsx";
import Classs from './../common/Classs.tsx';

interface Props
{
  options: (string | JSX.Element)[];
  selectedIndex: number;
  onChange?: (index: number, event?: any) => void;
  id?: string;
  keyPath?: (string | number)[];
  values?: any[]; // maps indices to values, otherwise index will be used as the value

  ref?: string;
  rel?: string;
  circle?: boolean;
}

class Dropdown extends Classs<Props>
{
  constructor(props: Props) {
    super(props);
    
    this.state =
    {
      up: false,
      open: false,
    };
  }
  
  _clickHandlers: {[index: number]: () => void} = {};
  clickHandler(index)
  {
    if(!this._clickHandlers[index])
    {
      this._clickHandlers[index] = () =>
      {
        var pr = this.props;
        if(pr.id && pr.keyPath)
        {
          Actions.cards.change(pr.id, pr.keyPath, this.props.values ? pr.values[index] : index);
        }
        if(pr.onChange)
        {
          this.props.onChange(index, {
            target: ReactDOM.findDOMNode(this)
          });
        }
      }
    }
    
    return this._clickHandlers[index];
  }
  
  renderOption(option, index)
  {
    if(index === this.props.selectedIndex)
    {
      return null;
    }
    
    return (
      <div
        className="dropdown-option"
        key={index} 
        onClick={this.clickHandler(index)}
      >
        <div className="dropdown-option-inner">
          { option }
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
  
  toggleOpen()
  {
    if(!this.state.open)
    {
      $(document).on('click', this.close);
    }
    
    var cr = this.refs['value']['getBoundingClientRect']();
    var windowBottom = window.innerHeight;
    
    this.setState({
      open: !this.state.open,
      up: cr.bottom > windowBottom / 2,
    });
  }
  
  render() {
    var classes = classNames({
      "dropdown-wrapper": true,
      "dropdown-wrapper-circle": this.props.circle,
      "dropdown-up": this.state.up,
      "dropdown-open": this.state.open,
    });
    
    return (
      <div className={classes} rel={this.props.rel}>
        { this.state.up && this.state.open ? (
          <div className="dropdown-options-wrapper">
            {
              this.props.options.map(this.renderOption)
            }
          </div>
        ) : null }
        <div
          className="dropdown-value"
          ref="value"
          onClick={this.toggleOpen}
        >
          <div className="dropdown-option-inner">
            { this.props.options[this.props.selectedIndex] }
          </div>
        </div>
        { !this.state.up && this.state.open ? (
          <div className="dropdown-options-wrapper">
            {
              this.props.options.map(this.renderOption)
            }
          </div>
        ) : null }
      </div>
    );
  }
};

export default Dropdown;