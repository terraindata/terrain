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
import { tooltip, TooltipProps } from 'common/components/tooltip/Tooltips';
import * as $ from 'jquery';
import * as _ from 'lodash';
import * as Radium from 'radium';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import Actions from '../../builder/data/BuilderActions';
import { altStyle, backgroundColor, borderColor, Colors, fontColor } from '../../colors/Colors';
import KeyboardFocus from './../../common/components/KeyboardFocus';
import TerrainComponent from './../../common/components/TerrainComponent';

import './Dropdown.less';

export interface Props
{
  options: List<string | number | El>;
  selectedIndex: number;
  keyPath?: KeyPath; // TODO required?
  onChange?: (index: number, event?: any) => void; // TODO remove?
  values?: List<any>; // maps indices to values, otherwise index will be used as the value
  canEdit?: boolean;
  className?: string;
  centerAlign?: boolean;
  optionsDisplayName?: Immutable.Map<any, string>; // maps value to display name
  textColor?: string | ((index: number) => string);
  width?: string;
  directionBias?: number; // bias for determining whether or not dropdown opens up or down
  unmountOnChange?: boolean;
  openDown?: boolean;
  tooltips?: List<any>;
  wrapperTooltip?: string;
  placeholder?: string;
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

  public componentWillUnmount()
  {
    $('body').unbind('click', this.close);
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
          Actions.change(pr.keyPath, pr.values ? pr.values.get(index) : pr.options.get(index));
        }
        if (pr.onChange)
        {
          pr.onChange(index, {
            target: ReactDOM.findDOMNode(this),
          });
        }
      };
      $('body').click(this.close);
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

  public onMouseDown(event)
  {
    event.stopPropagation();
    $('body').unbind('click', this.close);
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
        color: Colors().activeText,
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
        'color': Colors().activeText,
        ':hover': {
          backgroundColor: customColor || Colors().active,
          color: Colors().activeText,
        },
      });
    }

    let tooltipProps: TooltipProps;
    if (this.props.tooltips !== undefined && this.props.tooltips.get(index) !== undefined)
    {
      if (typeof (this.props.tooltips.get(index)) === 'string')
      {
        tooltipProps = {
          key: index,
          title: this.props.tooltips.get(index),
          position: 'left',
        };
      }
      else
      {
        tooltipProps = this.props.tooltips.get(index);
        tooltipProps.key = index;
        if (tooltipProps.position === undefined)
        {
          tooltipProps.position = 'left';
        }

      }
    }
    else
    {
      tooltipProps = {
        key: index,
        title: '',
      };
    }

    return (
      tooltip(<div
        className={classNames({
          'dropdown-option': true,
          'dropdown-option-selected': selected,
          'dropdown-option-focused': focused,
        })}
        key={index}
        onMouseDown={this.onMouseDown}
        onClick={this.clickHandler(index)}
        style={style}
      >
        <div className='dropdown-option-inner'>
          {
            this.getOptionName(option, index)
          }
        </div>
      </div>,
        tooltipProps,
      )
    );
  }

  public close()
  {
    this.setState({
      open: false,
    });
    $('body').unbind('click', this.close);
  }

  public toggleOpen()
  {
    if (!this.props.canEdit)
    {
      return;
    }

    if (!this.state.open)
    {
      $('body').click(this.close);

      const cr = this.refs['value']['getBoundingClientRect']();
      const windowBottom = window.innerHeight;

      let up;
      if (this.props.openDown !== undefined)
      {
        up = !this.props.openDown;
      }
      else
      {
        up = cr.bottom > windowBottom / 2 + (this.props.directionBias || 0);
      }
      this.setState({
        open: true,
        up,
      });
    }
    else
    {
      this.close();
    }
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
    let optionsEl: El = null;
    if (this.state.open)
    {
      optionsEl =
        <div
          className='dropdown-options-wrapper'
        >
          {
            (this.props.options && this.props.options.size > 0) ?
              this.props.options.map(this.renderOption)
              :
              'No options available'
          }
        </div>;
    }

    const { selectedIndex, textColor, options } = this.props;
    const customColor = this.colorForOption(selectedIndex);

    const dropdownValueStyle = [
      this.props.canEdit ?
        backgroundColor(
          !this.state.open ? Colors().inputBg : customColor || Colors().active,
          customColor || Colors().inactiveHover,
        )
        :
        backgroundColor(Colors().darkerHighlight)
      ,
      this.state.open ?
        fontColor(Colors().activeText) :
        fontColor(
          customColor || Colors().text1,
          this.props.canEdit ? Colors().activeText : (customColor || Colors().text1),
        ),
      borderColor(Colors().inputBorder),
    ];

    return (
      <div
        onClick={this.toggleOpen}
        onMouseDown={this.onMouseDown}
        className={classNames({
          'dropdown-wrapper': true,
          'altBg': true,
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
        {tooltip(
          <div
            className='dropdown-value'
            ref='value'
            style={[
              { width: this.props.width },
              ...dropdownValueStyle,
            ]}
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
            {
              this.props.placeholder &&
                <div
                  key={-1}
                  className={classNames({
                    'dropdown-option-inner': true,
                    'dropdown-option-value-selected': -1 === selectedIndex,
                    'dropdown-option-placeholder': true,
                  })}
                  style={fontColor(Colors().text3)}
                >
                  {
                    this.props.placeholder
                  }
                </div> 
            }
          </div>,
          {
            title: this.props.wrapperTooltip,
            position: 'right',
          },
        )}
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
