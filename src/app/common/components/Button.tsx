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

// tslint:disable:no-var-requires strict-boolean-expressions

import './ButtonStyle.less';

import * as classNames from 'classnames';
import StyleTag from 'common/components/StyleTag';
import { tooltip } from 'common/components/tooltip/Tooltips';
import { noop } from 'lodash';
import * as Radium from 'radium';
import * as React from 'react';
import { buttonColors, Colors, disabledButtonColors } from '../../colors/Colors';
import TerrainComponent from './../../common/components/TerrainComponent';

const CheckMark = require('./../../../images/icon_checkMark.svg');
const ArrowIcon = require('./../../../images/icon_carrot.svg');

export interface Props
{
  text: string;
  onClick: () => void;

  icon?: 'next' | 'back' | 'check' | El;
  iconComesAfter?: boolean;
  size?: 'small' | 'normal' | 'large';
  disabled?: boolean;
  hidden?: boolean;
  theme?: 'active' | 'disabled'; // other ideas: | 'alt' | 'important' | 'warning';
  tooltip?: string;
}

const iconConfig: {
  [icon: string]: {
    element: El,
    after?: boolean,
  }
} =
  {
    next: {
      element: <ArrowIcon />,
      after: true,
    },
    back: {
      element: <ArrowIcon className='rotate180' />,
    },
    check: {
      element: <CheckMark />,
    },
  };

@Radium
class Button extends TerrainComponent<Props>
{
  public render()
  {
    const { text, size, disabled, hidden } = this.props;
    let { onClick, theme, iconComesAfter, icon } = this.props;

    if (disabled)
    {
      theme = 'disabled';
      onClick = noop;
    }
    const style = buttonColors(theme);

    if (typeof icon === 'string')
    {
      if (!iconConfig[icon])
      {
        throw new Error('Unrecognized icon type in Button: ' + icon);
      }

      iconComesAfter = iconConfig[icon].after;
      icon = iconConfig[icon].element;
    }

    const content = (
      <div
        className={classNames({
          'button': true,
          'button-disabled': disabled,
          'button-hidden': hidden,
          'button-small': size === 'small',
          'button-large': size === 'large',
          'button-with-icon-before': icon && !iconComesAfter,
          'button-with-icon-after': icon && iconComesAfter,
        })}
        style={style}
        onClick={onClick}
      >
        <div className='button-inner'>
          {
            !iconComesAfter && icon
          }
          <div className='button-text'>
            {
              text
            }
          </div>
          {
            iconComesAfter && icon
          }
        </div>
      </div>
    );

    const tooltipText = this.props.tooltip;
    if (tooltipText !== undefined && tooltipText !== null)
    {
      return tooltip(content, this.props.tooltip);
    }

    return content;
  }
}

export default Button;
