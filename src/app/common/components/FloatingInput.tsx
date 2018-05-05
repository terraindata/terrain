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

// tslint:disable:strict-boolean-expressions member-access restrict-plus-operands no-var-requires

import './FloatingInputStyle.less';

import * as classNames from 'classnames';
import { tooltip, TooltipProps } from 'common/components/tooltip/Tooltips';
import * as _ from 'lodash';
import * as Radium from 'radium';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { altStyle, backgroundColor, borderColor, Colors, fontColor, getStyle } from '../../colors/Colors';
import TerrainComponent from './../../common/components/TerrainComponent';
const InfoIcon = require('images/icon_info.svg');

export let LARGE_FONT_SIZE = '52px';
export let SEMI_LARGE_FONT_SIZE = '38px';
export let FONT_SIZE = '18px';
export let SMALL_FONT_SIZE = '16px';
export let SMALL_LABEL_FLOATING_FONT_SIZE = '10px';
export let LARGE_LABEL_FLOATING_FONT_SIZE = '16px';
export let LABEL_FLOATING_FONT_SIZE = '12px';

const containerStyle = {
  borderColor: Colors().inputBorder,

  color: Colors().active, // used for hover / focus color
};

const labelStyle = fontColor(Colors().text3);

export interface Props
{
  label: string;
  isTextInput: boolean;
  value: any;

  useTooltip?: boolean; // show full value in tooltip (might get cut off otherwise)
  id?: any; // a unique identifier, pass to props handlers
  onChange?: (value: any, id: any) => void;
  onClick?: (id: any) => void;
  onFocus?: (id: any) => void;
  canEdit?: boolean;
  noBorder?: boolean;
  noBg?: boolean;
  large?: boolean;
  semilarge?: boolean;
  forceFloat?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  autoFocus?: boolean;
  getValueRef?: (ref) => void;
  className?: string;
  debounce?: boolean;
  extendRight?: boolean;
  small?: boolean;
  showEllipsis?: boolean;
  showWarning?: boolean;
  warningText?: string;
}

@Radium
export class FloatingInput extends TerrainComponent<Props>
{
  static defaultProps = {
    semilarge: false,
    showEllipsis: false,
  };

  state = {
    isFocused: false,
    myId: String(Math.random()) + '-floatinginput',
    valueRef: null,
    value: this.props.value, // for debouncing
  };

  private debouncedExecuteChange;

  constructor(props)
  {
    super(props);

    this.debouncedExecuteChange = _.debounce(this.executeChange, 750);
  }

  public componentWillReceiveProps(nextProps: Props)
  {
    if (nextProps.autoFocus && !this.props.autoFocus)
    {
      // needed because the autoFocus prop is only checked on mount
      this.autoFocus();
    }

    if (nextProps.value !== this.props.value)
    {
      // update local state value
      if (!nextProps.debounce || !this.state.isFocused)
      {
        // don't update the value if we're debouncing & we're currently focused
        this.setState({
          value: nextProps.value,
        });
      }
    }
  }

  public render()
  {
    const { props, state } = this;
    const { value, onClick, useTooltip } = props;

    const isFloating = this.isFloating();
    const containerFullStyle = _.extend(
      {},
      containerStyle, backgroundColor(props.noBg ? '' : Colors().fontWhite),
    );
    return (
      <div
        className={classNames({
          'floating-input-container': true,
          'floating-input-container-isFloating': isFloating,
          'floating-input-container-extendRight': props.extendRight,
          'floating-input-container-large': props.large,
          'floating-input-container-semilarge': props.semilarge,
          'floating-input-container-small': props.small,
          'floating-input-container-noBorder': props.noBorder,
          'floating-input-container-noBg': props.noBg,
          'floating-input-container-showEllipsis': props.showEllipsis,
          [props.className]: props.className !== undefined,
        })}
        style={containerFullStyle}
        onClick={this._fn(props.onClick)}
      >
        {
          useTooltip
            ?
            tooltip(this.renderValue(), value)
            :
            this.renderValue()
        }
        <label
          className='floating-input-label'
          htmlFor={state.myId}
          style={[
            labelStyle,
            {
              fontSize: this.getLabelFontSize(),
            },
          ]}
        >
          {
            props.label
          }
        </label>
      </div>
    );
  }

  private isFloating()
  {
    const { value, forceFloat } = this.props;

    if (this.state.isFocused || forceFloat)
    {
      return true;
    }

    if (value === undefined || value === null)
    {
      return false;
    }

    if (('' + value).length > 0)
    {
      return true;
    }

    return false;
  }

  private renderValue()
  {
    const { props, state } = this;
    const { value } = state;

    const style = [
      fontColor(Colors().active),
      {
        fontSize: this.getFontSize(),
      },
    ];

    if (props.isTextInput)
    {
      // Return a text input
      return (
        <div>
          <input
            type='text'
            className='floating-input-input'
            value={value === null || value === undefined ? '' : value}
            title={value === null || value === undefined ? '' : value}
            onChange={this.handleChange}
            autoFocus={props.autoFocus}
            onFocus={this.handleFocus}
            onBlur={this.handleBlur}
            id={state.myId}
            ref={this.getValueRef}
            onKeyDown={this.handleKeyDown}
            disabled={!props.canEdit}
            style={style}
          />
          {
            props.showWarning ?
              <div className='pf-more-nested-name-input-warning'>
                {
                  tooltip(
                    <InfoIcon
                      className='tooltip-icon tooltip-is-error'
                    />,
                    {
                      title: props.warningText,
                      position: 'top-end',
                      theme: 'error',
                    },
                  )
                }
              </div> : null
          }
        </div>
      );
    }

    // Return a normal div, uneditable
    return (
      <div
        className='floating-input-div'
        ref={props.getValueRef}
        onClick={this.handleClick}
        style={style}
      >
        {
          value
        }
      </div>
    );
  }

  private handleClick()
  {
    if (this.props.onClick)
    {
      this.props.onClick(this.props.id);
    }
  }

  private handleChange(e)
  {
    const value = e.target.value;

    this.setState({
      value,
    });

    if (this.props.debounce)
    {
      this.debouncedExecuteChange(value);
    }
    else
    {
      this.executeChange(value);
    }
  }

  private executeChange(value)
  {
    this.props.onChange(value, this.props.id);
  }

  private handleFocus()
  {
    this.setState({
      isFocused: true,
    });

    const { props } = this;
    if (props.onFocus)
    {
      props.onFocus(props.id);
    }
  }

  private handleBlur()
  {
    this.setState({
      isFocused: false,
    });
    this.debouncedExecuteChange.flush();
  }

  private getValueRef(ref)
  {
    this.setState({
      valueRef: ref,
    });
    if (this.props.getValueRef)
    {
      this.props.getValueRef(ref);
    }
  }

  private handleKeyDown(e)
  {
    switch (e.keyCode)
    {
      case 9: // tab
      case 13: // enter
        ReactDOM.findDOMNode(this.state.valueRef)['blur']();
        break;
      default:
        break;
    }
    if (this.props.onKeyDown)
    {
      this.props.onKeyDown(e);
    }
  }

  private autoFocus()
  {
    // force focus, needed if component has mounted and autoFocus flag changes
    const { valueRef } = this.state;
    if (valueRef)
    {
      const valueEl = ReactDOM.findDOMNode(valueRef);
      if (valueEl && valueEl['focus'])
      {
        valueEl['focus']();
      }
    }
  }

  private getLabelFontSize()
  {
    const { props } = this;

    if (this.isFloating())
    {
      return props.large || props.semilarge ? LARGE_LABEL_FLOATING_FONT_SIZE
        : props.small ? SMALL_LABEL_FLOATING_FONT_SIZE :
          LABEL_FLOATING_FONT_SIZE;
    }

    return this.getFontSize();
  }

  private getFontSize()
  {
    const { props } = this;

    return props.large ? LARGE_FONT_SIZE : props.semilarge ? SEMI_LARGE_FONT_SIZE :
      props.small ? SMALL_FONT_SIZE : FONT_SIZE;
  }

}

export default FloatingInput;
