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
import * as classNames from 'classnames';
import * as _ from 'lodash';
import * as Radium from 'radium';
import * as React from 'react';
import { backgroundColor, Colors } from '../../colors/Colors';
import TerrainComponent from './../../common/components/TerrainComponent';
import './Switch.less';

export interface Props
{
  first: string;
  second: string;
  selected: number;
  onChange: (selected: number) => void;
  small?: boolean;
  medium?: boolean;
  darker?: boolean;
}

@Radium
class Switch extends TerrainComponent<Props>
{
  public handleSwitch()
  {
    this.props.onChange((this.props.selected + 1) % 2);
  }

  public render()
  {
    const classes = classNames({
      'switch': true,
      'switch-on-first': this.props.selected === 1,
      'switch-on-second': this.props.selected !== 1,
      'switch-small': this.props.small,
      'switch-medium': this.props.medium,
      'noselect': true,
    });

    return (
      <div
        className={classes}
        onClick={this.handleSwitch}
        style={this.props.darker ? SWITCH_DARKER_STYLE : SWITCH_STYLE}
      >
        <div
          className='switch-on'
          style={backgroundColor(Colors().active)}
        />
        <div
          className='switch-first'
          style={this.props.selected === 1 ? ACTIVE_SECTION_STYLE : undefined}
        >
          {
            this.props.first
          }
        </div>
        <div
          className='switch-second'
          style={this.props.selected !== 1 ? ACTIVE_SECTION_STYLE : undefined}
        >
          {
            this.props.second
          }
        </div>
      </div>
    );
  }
}

const SWITCH_STYLE = {
  'backgroundColor': Colors().bg3,
  'color': Colors().text2,

  ':hover': {
    color: Colors().text1,
  },
};

const SWITCH_DARKER_STYLE = _.extend({}, SWITCH_STYLE, {
  backgroundColor: Colors().bg1,
});

const ACTIVE_SECTION_STYLE = {
  color: '#fff',
};

export default Switch;
