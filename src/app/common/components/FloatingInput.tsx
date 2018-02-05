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
import * as _ from 'lodash';
import * as Radium from 'radium';
import * as React from 'react';
import styled from 'styled-components';
import { altStyle, backgroundColor, borderColor, Colors, fontColor, getStyle } from '../../colors/Colors';
import TerrainComponent from './../../common/components/TerrainComponent';

const Container = styled.div`
  position: relative;
  flex-grow: 1;
  margin: 0px 12px;
`;

const LEFT = '12px';

const Label = styled.label`
  position: absolute;
  left: ${LEFT};
  top: 14px;
  font-size: 16px;
  transition: all 0.15s;
  color: @grey-text;
`;

const floatingLabelStyle = {
  fontSize: 10,
  top: 6,
};

const Input = styled.input`
  padding-right: 6px;
  padding-left: ${LEFT};
  padding-top: 20px;
  padding-bottom: 4px;
  border-radius: 3px;
  width: 100%;
  border: 1px solid @grey;
  outline: none;
  font-size: 18px;
`;

export interface Props
{
  label: string;
  isTextInput: boolean;
  value: any;

  onChange?: (value: any) => void;
  canEdit?: boolean;
}

class FloatingInput extends TerrainComponent<Props>
{
  state = {
    isFocused: false,
    myId: Math.random() + '-floatinginput',
  };

  componentWillReceiveProps(nextProps: Props)
  {
  }

  public componentDidUpdate(prevProps: Props, prevState)
  {
  }

  public render()
  {
    const { props, state } = this;
    const { value } = props;

    const isFloating = state.isFocused || (value !== undefined && value !== null && value.length > 0);

    return (
      <Container>
        <Input
          value={value}
          id={state.myId}
          onChange={this.handleChange}
          onFocus={this.handleFocus}
          onBlur={this.handleBlur}
        />
        <Label
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

  public handleChange(e)
  {
    this.props.onChange(e.target.value);
  }

  public handleFocus()
  {
    this.setState({
      isFocused: true,
    });
  }

  public handleBlur()
  {
    this.setState({
      isFocused: false,
    });
  }

}

export default FloatingInput;
