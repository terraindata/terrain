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

// tslint:disable:member-ordering switch-default member-access

import * as React from 'react';
import TerrainComponent from '../../common/components/TerrainComponent';

export interface Props
{
  onFocus();
  onFocusLost();
  index: number; // currently selected
  length: number; // number possible to select
  onIndexChange(index: number);
  onSelect(index: number);
  focusOverride?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const STYLE: {
  [key: string]: any,
} = {
    opacity: 0,
    height: 0,
    width: 0,
    position: 'absolute', // vodka
  };

class KeyboardFocus extends TerrainComponent<Props>
{
  
  handleKeyDown(e)
  {
    const { onIndexChange, onSelect, onKeyDown, index, length } = this.props;
    
    switch (e.keyCode)
    {
      case 40:
        // down
        onIndexChange(Math.min(index + 1, length - 1));
        break;
      case 38:
        // up
        onIndexChange(Math.max(index - 1, 0));
        break;
      case 13:
        onSelect(index);
    }
    
    if (onKeyDown !== undefined)
    {
      onKeyDown(e);
    }
  }

  componentWillReceiveProps(nextProps: Props)
  {
    // this is necessary because autofocus only triggers on initial render
    if (nextProps.focusOverride && !this.props.focusOverride)
    {
      this.refs['select']['focus']();
      this.props.onFocus();
    }
    else if (this.props.focusOverride && !nextProps.focusOverride)
    {
      this.refs['select']['blur']();
      this.props.onFocusLost();
    }
  }

  render()
  {
    return (
      <select
        style={STYLE}
        onFocus={this.props.onFocus}
        onBlur={this.props.onFocusLost}
        onKeyDown={this.handleKeyDown}
        ref='select'
        autoFocus={this.props.focusOverride}
      >
      </select>
    );
  }
}
export default KeyboardFocus;
