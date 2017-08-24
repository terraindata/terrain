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
// See https://github.com/tvkhoa/react-tippy for information on the props and usage
import * as _ from 'lodash';
import * as React from 'react';
import {Tooltip} from 'react-tippy';
import 'react-tippy/dist/tippy.css';

import {backgroundColor, borderColor, Colors, fontColor} from 'common/Colors';
import TerrainComponent from 'common/components/TerrainComponent';

import 'common/components/tooltip/Tooltip.less';

export interface ThemeInfo {
  name: string;
  backgroundColor: () => string;
  fontColor: () => string;
}

export interface Themes {
  Main: ThemeInfo;
  Alt: ThemeInfo;
  Error: ThemeInfo;
}

export const TOOLTIP_THEMES: Themes = {
  Main: {
    name: 'main',
    backgroundColor: () => Colors().bg1,
    fontColor: () => Colors().text2,
  },
  Alt: {
    name: 'alt',
    backgroundColor: () => Colors().altBg2,
    fontColor: () => Colors().altText2,
  },
  Error: {
    name: 'error',
    backgroundColor: () => Colors().error,
    fontColor: () => Colors().text1,
  },
}

// https://stackoverflow.com/questions/12303989/cartesian-product-of-multiple-arrays-in-javascript
function cartesianProductOf(... vars: any[]) {
    return _.reduce(arguments, (a, b) => {
        return _.flatten(_.map(a, (x) => {
            return _.map(b, (y) => {
                return x.concat([y]);
            });
        }), true);
    }, [ [] ]);
};

type arrowModifier = 'regular' | 'small' | 'big' | 'circle';
type showDirection = 'top' | 'bottom' | 'left' | 'right';

class TooltipStyleGenerator
{
  public static generateStyle(theme: string, bgColor: string, textColor: string): object
  {
    const combinations = cartesianProductOf(['regular', 'small', 'big', 'circle'], ['top', 'bottom', 'left', 'right']);
    let classes = {};
    for (const combination of combinations)
    {
      const modifier: arrowModifier = combination[0];
      const direction: showDirection = combination[1];
      const className = TooltipStyleGenerator.getClassName(theme, modifier, direction);
      const objToAdd = {[className]: TooltipStyleGenerator.styleForArrow(modifier, direction, bgColor)};
      classes = _.extend(classes, objToAdd);
    }
    const bodyClass = {
      [TooltipStyleGenerator.getSimpleClassName(theme)]: TooltipStyleGenerator.styleForBody(bgColor, textColor),
    }
    const bodyAnimateFillClass = {
      [TooltipStyleGenerator.getSimpleClassName(theme) + '[data-animatefill]']: {
        'background-color': 'transparent',
      }
    }
    classes = _.extend(classes, bodyClass, bodyAnimateFillClass);
    return classes;
  }

  private static styleForBody(bgColor: string, textColor: string): object
  {
    return {
      'color': textColor,
      'box-shadow': `0 4px 20px 4px ${Colors().boxShadow}, 0 4px 80px -8px ${Colors().boxShadow}`,
      'background-color': bgColor,
    }
  }

  private static styleForArrow(modifier: arrowModifier, direction: showDirection, color: string): object
  {
    let size: string;
    let suffix: string;
    switch (modifier)
    {
      case 'small':
        size = '5px';
        suffix = '.arrow-small';
        break;
      case 'regular':
        size = '7px';
        suffix = '';
        break;
      case 'big':
        size = '10px';
        suffix = '.arrow-big';
        break;
      default: // circle
        return {
          'background-color': color,
        }
    }
    switch (direction)
    {
      case 'top':
        return {
          'border-top': `${size} solid ${color}`,
          'border-right': `${size} solid transparent`,
          'border-left': `${size} solid transparent`,
        }
      case 'bottom':
        return {
          'border-bottom': `${size} solid ${color}`,
          'border-right': `${size} solid transparent`,
          'border-left': `${size} solid transparent`,
        }
      case 'left':
        return {
          'border-left': `${size} solid ${color}`,
          'border-top': `${size} solid transparent`,
          'border-bottom': `${size} solid transparent`,
        }
      default: // right
        return {
          'border-right': `${size} solid ${color}`,
          'border-top': `${size} solid transparent`,
          'border-bottom': `${size} solid transparent`,
        }
    }
  }

  private static getClassName(theme: string, modifier: arrowModifier, direction: showDirection): string
  {
    const bracketText = modifier === 'circle' ? 'x-circle' : 'x-arrow';
    let suffix: string;
    switch (modifier)
    {
      case 'small':
        suffix = '.arrow-small';
        break;
      case 'big':
        suffix = '.arrow-big';
        break;
      default:
        suffix = '';
    }
    return `.tippy-popper[x-placement^=${direction}] .tippy-tooltip.${theme}-theme [${bracketText}]${suffix}`;
  }

  private static getSimpleClassName(name): string
  {
    return `.tippy-popper .tippy-tooltip.${name}-theme`;
  }
}

export function generateThemeStyles()
{
  let allClasses = {};
  for (const themeKey of Object.keys(TOOLTIP_THEMES))
  {
    const theme: ThemeInfo = TOOLTIP_THEMES[themeKey];
    const bgColor = theme.backgroundColor();
    const textColor = theme.fontColor();
    const classes = TooltipStyleGenerator.generateStyle(theme.name, bgColor, textColor);
    allClasses = _.extend(allClasses, classes);
  }
  return allClasses;
}

export interface TooltipProps
{
  title?: string;
  disabled?: boolean;
  open?: boolean;
  useContext?: boolean;
  onRequestClose?: () => void;
  position?: 'top' | 'bottom' | 'left' | 'right';
  trigger?: 'mouseenter' | 'focus' | 'clickmanual';
  tabIndex?: number;
  interactive?: boolean;
  interactiveBorder?: number;
  delay?: number;
  hideDelay?: number
  animation?: 'shift'| 'perspective' | 'fade' | 'scale' | 'none';
  arrow?: boolean
  arrowSize?: 'small' | 'regular' | 'big';
  animateFill?: boolean;
  duration?: number;
  hideDuration?: number;
  distance?: number;
  offset?: number;
  hideOnClick?: boolean | 'persistent';
  multiple?: boolean;
  followCursor?: boolean;
  inertia?: boolean;
  transitionFlip?: boolean;
  popperOptions?: object;
  html?: any;
  unmountHTMLWhenHide?: boolean;
  size?: 'small' | 'regular' | 'big';
  sticky?: boolean;
  stickyDuration?: number
  beforeShown?: () => void;
  shown?: () => void;
  beforeHidden?: () => void;
  hidden?: () => void;
  theme?: string;
  className?: string;
  style?: any;
}

const defaultProps: TooltipProps = {
  arrow: true,
  size: 'small',
  theme: TOOLTIP_THEMES.Alt.name,
}

export function simpleTooltip(tip: string, component: any)
{
  const options: TooltipProps = defaultProps;
  options.title = tip;
  return <Tooltip children={component} {...options}/>
}
