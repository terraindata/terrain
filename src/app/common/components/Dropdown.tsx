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

// tslint:disable:strict-boolean-expressions member-access

import * as classNames from 'classnames';
import * as $ from 'jquery';
import * as Radium from 'radium';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as _ from 'underscore';
import Actions from '../../builder/data/BuilderActions';
import { altStyle, backgroundColor, Colors, fontColor, link } from '../../common/Colors';
import Util from '../../util/Util';
import KeyboardFocus from './../../common/components/KeyboardFocus';
import TerrainComponent from './../../common/components/TerrainComponent';
import './Dropdown.less';
import StyleTag from './StyleTag';

export interface Props
{
  options: List<string | El>;
  selectedIndex: number;
  keyPath?: KeyPath; // TODO required?
  onChange?: (index: number, event?: any) => void; // TODO remove?
  values?: List<any>; // maps indices to values, otherwise index will be used as the value
  canEdit?: boolean;
  className?: string;
  centerAlign?: boolean;
  optionsDisplayName?: Map<any, string>; // maps value to display name
  textColor?: string | ((index: number) => string);
  width?: string;
  directionBias?: number; // bias for determining whether or not dropdown opens up or down
}

@Radium
class Dropdown extends TerrainComponent<Props>
{
  public _clickHandlers: { [index: number]: () => void } = {};

  constructor(props: Props)
  {
    super(props);

    this.state =
      {
        up: false,
        open: false,
        focusedIndex: -1,
      };
  }

  public clickHandler(index)
  {
    if (!this._clickHandlers[index])
    {
      this._clickHandlers[index] = () =>
      {
        const pr = this.props;
        if (pr.keyPath)
        {
          Actions.change(pr.keyPath, pr.values ? pr.values.get(index) : index);
        }
        if (pr.onChange)
        {
          pr.onChange(index, {
            target: ReactDOM.findDOMNode(this),
          });
        }
      };
    }

    return this._clickHandlers[index];
  }

  public colorForOption(index): string
  {
    const { textColor } = this.props;

    if (typeof textColor === 'function')
    {
      return textColor(index);
    }

    if (typeof textColor === 'string')
    {
      return textColor;
    }

    return undefined;
  }

  public renderOption(option, index)
  {
    const focused = index === this.state.focusedIndex;
    const selected = index === this.props.selectedIndex;
    const customColor = this.colorForOption(index);

    const style = {
      'color': customColor,
      ':hover': {
        backgroundColor: Colors().inactiveHover,
        color: Colors().text1,
      },
    };

    if (focused)
    {
      _.extend(style, {
        borderColor: Colors().inactiveHover,
        // color: Colors().text1,
      });
    }

    if (selected)
    {
      _.extend(style, {
        'backgroundColor': customColor || Colors().active,
        'color': Colors().text1,
        ':hover': {
          backgroundColor: customColor || Colors().active,
          color: Colors().text1,
        },
      });
    }

    return (
      <div
        className={classNames({
          'dropdown-option': true,
          'dropdown-option-selected': selected,
          'dropdown-option-focused': focused,
        })}
        key={index}
        onClick={this.clickHandler(index)}
        style={style}
      >
        <div className='dropdown-option-inner'>
          {
            this.getOptionName(option, index)
          }
        </div>
      </div>
    );
  }

  public close()
  {
    this.setState({
      open: false,
    });
    $(document).off('click', this.close);
  }

  public toggleOpen()
  {
    if (!this.props.canEdit)
    {
      return;
    }

    if (!this.state.open)
    {
      $(document).on('click', this.close);
    }

    const cr = this.refs['value']['getBoundingClientRect']();
    const windowBottom = window.innerHeight;

    this.setState({
      open: !this.state.open,
      up: cr.bottom > windowBottom / 2 + (this.props.directionBias || 0),
    });
  }

  public getOptionName(option, index: number): string
  {
    if (this.props.optionsDisplayName)
    {
      return this.props.optionsDisplayName.get(option);
    }
    return option;
  }

  handleFocus()
  {
    this.setState({
      focusedIndex: -1,
    });
  }

  handleFocusLost()
  {
    this.setState({
      focusedIndex: -1,
    });
  }

  handleFocusedIndexChange(focusedIndex: number)
  {
    this.setState({
      focusedIndex,
    });
  }

  handleKeyboardSelect(index: number)
  {
    this.clickHandler(index)();
    this.close();
  }

  public render()
  {
    // Element with options, rendered at the top or bottom of the dropdown
    const scrollbarStyle = {
      '::-webkit-scrollbar-track': {
        background: Colors().scrollbarBG,
      },
      '::-webkit-scrollbar-thumb': {
        background: Colors().altScrollbarPiece,
      },
    };

    let optionsEl: El = null;
    if (this.state.open)
    {
      optionsEl =
        <div
          className='dropdown-options-wrapper'
          style={altStyle()}
        >
          <StyleTag style={scrollbarStyle} />
          {
            this.props.options ?
              this.props.options.map(this.renderOption)
              :
              'No options available'
          }
        </div>;
    }

    const { selectedIndex, textColor, options } = this.props;
    const customColor = this.colorForOption(selectedIndex);

    return (
      <div
        onClick={this.toggleOpen}
        className={classNames({
          'dropdown-wrapper': true,
          'dropdown-up': this.state.up,
          'dropdown-open': this.state.open,
          'dropdown-disabled': !this.props.canEdit,
          'dropdown-center': this.props.centerAlign,
          [this.props.className]: !!this.props.className,
        })}
        key='dropdown-body'
      >

        {
          this.state.up && this.state.open
          && optionsEl
        }
        <div
          className='dropdown-value'
          ref='value'
          style={{
            'width': this.props.width,
            'backgroundColor': !this.state.open ? Colors().inputBg :
              customColor || Colors().active,
            'color': !this.state.open ? customColor || Colors().text1
              : Colors().text1,

            ':hover': {
              backgroundColor: customColor || Colors().inactiveHover,
              color: Colors().text1,
            },
          }}
          key='dropdown-value'
        >
          {
            // map through all of the options so that the dropdown takes the width of the longest one
            //  CSS hides all but the selected option
            options && options.map((option, index) =>
              <div
                key={index}
                className={classNames({
                  'dropdown-option-inner': true,
                  'dropdown-option-value-selected': index === selectedIndex,
                })}
              >
                {
                  this.getOptionName(option, index)
                }
              </div>,
            )
          }
        </div>
        {
          !this.state.up && this.state.open
          && optionsEl
        }
        <KeyboardFocus
          onFocus={this.handleFocus}
          onFocusLost={this.handleFocusLost}
          index={this.state.focusedIndex}
          onIndexChange={this.handleFocusedIndexChange}
          length={options && options.size}
          onSelect={this.handleKeyboardSelect}
          focusOverride={this.state.open}
        />
      </div>
    );
  }
}

export default Dropdown;
