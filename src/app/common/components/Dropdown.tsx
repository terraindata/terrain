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
import Actions from "../../builder/data/BuilderActions.tsx";
import PureClasss from './../../common/components/PureClasss.tsx';

interface Props
{
  options: List<string | El>;
  selectedIndex: number;
  keyPath?: KeyPath; // TODO required?
  onChange?: (index: number, event?: any) => void; // TODO remove?
  values?: List<any>; // maps indices to values, otherwise index will be used as the value
  canEdit?: boolean;
  className?: string;
  centerAlign?: boolean;
}

class Dropdown extends PureClasss<Props>
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
        if(pr.keyPath)
        {
          Actions.change(pr.keyPath, pr.values ? pr.values[index] : index);
        }
        if(pr.onChange)
        {
          pr.onChange(index, {
            target: ReactDOM.findDOMNode(this)
          });
        }
      }
    }
    
    return this._clickHandlers[index];
  }
  
  renderOption(option, index)
  {
    return (
      <div
        className={classNames({
          "dropdown-option": true,
          "dropdown-option-selected": index === this.props.selectedIndex,
        })}
        key={index} 
        onClick={this.clickHandler(index)}
      >
        <div className="dropdown-option-inner">
          { 
            option
          }
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
    if(!this.props.canEdit)
    {
      return;
    }
    
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
  
  render()
  {
    // Element with options, rendered at the top or bottom of the dropdown
    
    let optionsEl: El = null;
    if(this.state.open)
    {
      optionsEl = 
        <div className="dropdown-options-wrapper">
          {
            this.props.options.map(this.renderOption)
          }
        </div>
    }
    
    return (
      <div
        onClick={this.toggleOpen}
        className={classNames({
          "dropdown-wrapper": true,
          "dropdown-up": this.state.up,
          "dropdown-open": this.state.open,
          "dropdown-disabled": !this.props.canEdit,
          "dropdown-center": this.props.centerAlign,
          [this.props.className]: !!this.props.className,
        })}
      >
        { 
          this.state.up && this.state.open 
            && optionsEl
        }
        <div
          className="dropdown-value"
          ref="value"
        >
          {
            // map through all of the options so that the dropdown takes the width of the longest one
            //  CSS hides all but the selected option
            this.props.options.map((option, index) => 
              <div
                key={index}
                className={classNames({
                  "dropdown-option-inner": true,
                  "dropdown-option-value-selected": index === this.props.selectedIndex,
                })}
              >
                { 
                  option
                }
              </div>
            )
          }
        </div>
        { 
          !this.state.up && this.state.open 
            && optionsEl 
        }
      </div>
    );
  }
};

export default Dropdown;