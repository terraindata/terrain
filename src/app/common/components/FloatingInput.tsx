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

// tslint:disable:strict-boolean-expressions member-access restrict-plus-operands

import * as classNames from 'classnames';
import { tooltip, TooltipProps } from 'common/components/tooltip/Tooltips';
import * as _ from 'lodash';
import * as Radium from 'radium';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import styled, { StyledFunction } from 'styled-components';
import { altStyle, backgroundColor, borderColor, Colors, fontColor, getStyle } from '../../colors/Colors';
import TerrainComponent from './../../common/components/TerrainComponent';

export let LARGE_FONT_SIZE = '52px';
export let SEMI_LARGE_FONT_SIZE = '38px';
export let FONT_SIZE = '18px';
export let SMALL_FONT_SIZE = '16px';
export let SMALL_LABEL_FLOATING_FONT_SIZE = '10px';
export let LARGE_LABEL_FLOATING_FONT_SIZE = '16px';
export let LABEL_FLOATING_FONT_SIZE = '12px';

const ContainerC: StyledFunction<InputDivProps & React.HTMLProps<HTMLInputElement>> = styled.div;
const Container = ContainerC`
  position: relative;
  flex-grow: 1;
  line-height: normal;
  border: 1px solid ${Colors().inputBorder};
  border-radius: 3px;
  height: ${(props) => props.large ? '86px' : props.semilarge ? '56px' : '48px'};
  width: 100%;
  box-sizing: border-box;
  min-width: 100px;
  background: ${Colors().textboxBg};

  &:hover {
    border-color: ${Colors().active};
  }

  ${(props) => props['noBorder'] && (`
    border: none !important;
    background: none;
  `)}

  ${(props) => props['noBg'] && (`
    background: transparent;
    border: none !important;
  `)}
`;

const LEFT = (props) => props.large ? '18px' : '12px';
const RIGHT = (props) => props.extendRight ? '0px' : props.large ? '18px' : '12px';

const LabelC: StyledFunction<InputProps & React.HTMLProps<HTMLInputElement>> = styled.label;
const Label = LabelC`
  position: absolute;
  left: ${LEFT};
  top: 14px;
  font-size: 16px;
  transition: all 0.15s;
  color: ${Colors().text3};
  cursor: pointer;
  text-transform: uppercase;

  font-size: ${(props) =>
  {
    if (props.isFloating)
    {
      return props.large || props.semilarge ? LARGE_LABEL_FLOATING_FONT_SIZE
        : props.small ? SMALL_LABEL_FLOATING_FONT_SIZE :
          LABEL_FLOATING_FONT_SIZE;
    }

    return props.large ? LARGE_FONT_SIZE : props.semilarge ? SEMI_LARGE_FONT_SIZE :
      props.small ? SMALL_FONT_SIZE : FONT_SIZE;
  }};
`;

const floatingLabelStyle = {
  top: 4,
};

const inputStyle = `
  padding-top: 20px;
  padding-bottom: 4px;
  border-radius: 3px;
  width: 100%;
  box-sizing: border-box;
  border: none;
  outline: none;
  color: ${Colors().text1};
  transition: all 0.15s;
  color: ${Colors().active};

  // &:hover {
  //   background-color: transparent;
  // }
`;

const fontSizeFn = (props) => props.large ? LARGE_FONT_SIZE : props.semilarge ? SEMI_LARGE_FONT_SIZE :
  props.small ? SMALL_FONT_SIZE : FONT_SIZE;

// duplication of code because the functions don't work if you put them
//  in inputStyle
const InputC: StyledFunction<InputProps & React.HTMLProps<HTMLInputElement>> = styled.input;
const Input = InputC`
  ${inputStyle}
  padding-left: ${LEFT};
  padding-right: ${RIGHT};
  font-size: ${fontSizeFn};
  ${(props) => props['noBg'] && (`
    background-color: transparent;
  `)}
  &:focus {
    ${(props) => props['noBg'] && (`
      background-color: transparent;
    `)}
  }
`;

const InputDivC: StyledFunction<InputDivProps & React.HTMLProps<HTMLInputElement>> = styled.div;
const InputDiv = InputDivC`
  ${inputStyle}
  padding-left: ${LEFT};
  padding-right: ${RIGHT};
  font-size: ${fontSizeFn};
  cursor: pointer;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
`;

interface InputProps
{
  noBorder?: boolean;
  noBg?: boolean;
  id?: string;
  onChange?: (value) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  value?: any;
  large?: boolean;
  small?: boolean;
  semilarge?: boolean;
  isFloating?: boolean;
  extendRight?: boolean;
}

interface InputDivProps
{
  noBorder?: boolean;
  noBg?: boolean;
  onClick?: () => void;
  large?: boolean;
  semilarge?: boolean;
  small?: boolean;
  isFloating?: boolean;
  extendRight?: boolean;
}

export interface Props
{
  label: string;
  isTextInput: boolean;
  value: any;

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
}

export class FloatingInput extends TerrainComponent<Props>
{
  static defaultProps = {
    semilarge: false,
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

  public componentDidMount()
  {
    //
  }

  public componentDidUpdate(prevProps: Props, prevState)
  {
    //
  }

  public render()
  {
    const { props, state } = this;
    const { value, onClick } = props;

    const isFloating = this.isFloating();

    return (
      <Container
        large={props.large}
        semilarge={props.semilarge}
        noBorder={props.noBorder}
        noBg={props.noBg}
        onClick={this._fn(props.onClick)}
        className={props.className}
      >
        {
          this.renderValue()
        }
        <Label
          large={props.large}
          semilarge={props.semilarge}
          small={props.small}
          noBorder={props.noBorder}
          noBg={props.noBg}
          isFloating={isFloating}
          htmlFor={state.myId}
          style={isFloating ? floatingLabelStyle : undefined}
        >
          {
            props.label
          }
        </Label>
      </Container>
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

    if (props.isTextInput)
    {
      // Return a text input
      return (
        <Input
          type='text'
          large={props.large}
          semilarge={props.semilarge}
          value={value === null || value === undefined ? '' : value}
          onChange={this.handleChange}
          autoFocus={props.autoFocus}
          noBorder={props.noBorder}
          noBg={props.noBg}
          onFocus={this.handleFocus}
          onBlur={this.handleBlur}
          id={state.myId}
          ref={this.getValueRef}
          onKeyDown={this.handleKeyDown}
          extendRight={props.extendRight}
          small={props.small}
          disabled={!props.canEdit}
        />
      );
    }

    // Return a normal div, uneditable
    return (
      <InputDiv
        {...props as any}
        ref={props.getValueRef}
        onClick={this.handleClick}
        noBorder={props.noBorder}
        noBg={props.noBg}
        extendRight={props.extendRight}
      >
        {
          value
        }
      </InputDiv>
    );
  }

  private handleClick()
  {
    this.props.onClick(this.props.id);
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
}

export default FloatingInput;
