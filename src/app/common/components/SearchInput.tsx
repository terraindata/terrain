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

import * as classNames from 'classnames';
import { tooltip, TooltipProps } from 'common/components/tooltip/Tooltips';
import * as _ from 'lodash';
import * as Radium from 'radium';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { altStyle, backgroundColor, borderColor, Colors, fontColor, getStyle } from '../../colors/Colors';
import TerrainComponent from './../../common/components/TerrainComponent';
import './SearchInputStyle.less';
const SearchIcon = require('./../../../images/icon_search.svg');

export interface Props
{
  value: any;

  id?: any; // a unique identifier, pass to props handlers
  onChange?: (value: any, id: any) => void;
  onClick?: (id: any) => void;
  onFocus?: (id: any) => void;
  canEdit?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  autoFocus?: boolean;
  getValueRef?: (ref) => void;
  className?: string;
}

@Radium
export class SearchInput extends TerrainComponent<Props>
{
  state = {
    isFocused: false,
    myId: String(Math.random()) + '-searchinput',
  };

  valueRef = null;

  public componentWillReceiveProps(nextProps: Props)
  {
    if (nextProps.autoFocus && !this.props.autoFocus)
    {
      // needed because the autoFocus prop is only checked on mount
      this.autoFocus();
    }
  }

  public componentDidMount()
  {
    // strategy recommended by https://stackoverflow.com/questions/28889826/react-set-focus-on-input-after-render
    // (read the comments for why -- autoFocus prop is unreliable)
    if (this.props.autoFocus)
    {
      this.autoFocus();
      setTimeout(this.autoFocus.bind(this), 100);
    }
  }

  public render()
  {
    const { props, state } = this;
    const { value, onClick } = props;

    return (
      <div
        onClick={props.onClick}
        className={'search-input-wrapper ' + props.className}
        style={state.isFocused ? FOCUSED_WRAPPER_STYLE : WRAPPER_STYLE}
        key={'wrapper' + state.myId}
      >
        <label
          htmlFor={state.myId}
          className='search-input-label'
        >
          <SearchIcon />
        </label>
        <input
          className='search-input'
          style={state.isFocused ? FOCUSED_INPUT_STYLE : INPUT_STYLE}
          type='text'
          value={value === null || value === undefined ? '' : value}
          onChange={this.handleChange}
          onFocus={this.handleFocus}
          onBlur={this.handleBlur}
          id={state.myId}
          ref={this.getValueRef}
          onKeyDown={this.handleKeyDown}
          key={'input' + state.myId}
        />
      </div>
    );
  }

  private handleClick()
  {
    this.props.onClick(this.props.id);
  }

  private handleChange(e)
  {
    this.props.onChange(e.target.value, this.props.id);
  }

  private handleFocus()
  {
    this.setState({
      isFocused: true,
    });

    const { props } = this;
    if (props.onFocus !== undefined)
    {
      props.onFocus(props.id);
    }
  }

  private handleBlur()
  {
    this.setState({
      isFocused: false,
    });
  }

  private getValueRef(ref)
  {
    this.valueRef = ref;

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
        ReactDOM.findDOMNode(this.valueRef)['blur']();
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
    const { valueRef } = this;
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

const FOCUSED_INPUT_STYLE = {
  color: Colors().active,
  borderColor: Colors().active,
  background: Colors().bg,
};

const INPUT_STYLE = {
  color: Colors().fontColor,
  background: Colors().blockBg,
  borderColor: Colors().blockBg,

  // hover sometimes get stuck; also, I'm not sure if we want that
  // ':hover': FOCUSED_INPUT_STYLE,
};

const FOCUSED_WRAPPER_STYLE = {
  // color needed to trigger the fill: currentColor for SVG
  color: Colors().active,
};

const WRAPPER_STYLE = {
  color: Colors().fontColorLightest,

  // ':hover': FOCUSED_WRAPPER_STYLE,
};

export default SearchInput;
