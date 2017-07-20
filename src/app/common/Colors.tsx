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

// tslint:disable:no-var-requires strict-boolean-expressions max-line-length comment-format

import { extend } from 'underscore';
const Color = require('color');

interface Theme
{

  // main background color
  base: string;

  // text
  text: {
    baseDark: string,
    secondaryDark: string,
    baseLight: string,
    secondaryLight: string,
    thirdLight: string,

    link: string, // TODO
    linkHover: string,
  };

  button: {
    text: string,
    background: string,
    backgroundHover: string,
  };

  // main title bar
  titleBar:
  {
    base: string,
  };
  // side bar
  sideBar:
  {
    base: string,
    selectedSquare: string,
    arrowBg: string,
  };

  // Library ------

  library:
  {
    // title bar
    titleBar: {
      base: string,
    },

    // item
    item: {
      title: string,
      body: string,
      activeBody: string,
    },

    // info panel
    infoColumn: {
      baseUpper: string,
      baseLower: string,
    },

    // info graph selection btn
    infoGraphBtn: {
      btnBase: string,
      btnRoll: string,
      btnSelected: string,
      btnRadioBase: string,
      btnRadioSelected: string,
    },

    //text box
    textbox: {
      base: string,
    },
  };

  // Builder -----------------------------

  builder: {
    // tab area
    tabs: {
      background: string,
      tabActive: string,
      tabTopRibbon: string,
      tabInactive: string,
      tabTopRibbonInactive: string,
    },

    // title bar
    titleBar: {
      base: string,
    }

    // deck
    deck: {
      background: string,
    },

    // deck cards --temporary values, colors will be grouped. Inactive on deck all cards are at 70% opacity. Bullet circle is 100% Opacity. When rolled over Opacity is 90%.
    cards: {
      cardBase: string,

      card1: string,
      card2: string,
      card3: string,
      card4: string,
      card5: string,
      card6: string,
      card7: string,
      card8: string,
      card9: string,
      card10: string,
      card11: string,
      card12: string,
      card13: string,
      card14: string,
      card15: string,
      card16: string,
      card17: string,
      card18: string,
      card19: string,
      card20: string,
      card21: string,

      card1BG: string,
      card2BG: string,
      card3BG: string,
      card4BG: string,
      card5BG: string,
      card6BG: string,
      card7BG: string,
      card8BG: string,
      card9BG: string,
      card10BG: string,
      card11BG: string,
      card12BG: string,
      card13BG: string,
      card14BG: string,
      card15BG: string,
      card16BG: string,
      card17BG: string,
      card18BG: string,
      card19BG: string,
      card20BG: string,
      card21BG: string,
    },

    //builder column
    builderColumn: {
      background: string,
    },

    results:
    {
      background: string,
      lines: string,
    },

    inputs:
    {
      background: string,
    },
  };
}

const DARK: Theme =
  {
    // Universal Elements------------------------------

    // main background color
    base: '#2F2F2F',

    // text
    text:
    {
      baseDark: '#000000',
      secondaryDark: 'rgba(0,0,0,0.50)',
      baseLight: '#FFFFFF',
      secondaryLight: 'rgba(255,255,255,0.80)',
      thirdLight: 'rgba(255,255,255,0.5)',

      link: Color('#4C7C9C').lighten(0.25).saturate(0.15).string(),
      linkHover: Color('#4C7C9C').lighten(0.5).saturate(0.15).string(),
    },

    button:
    {
      text: '#FFFFFF',
      background: Color('#4C7C9C').lighten(0.15).saturate(0.15).string(),
      backgroundHover: Color('#4C7C9C').saturate(0.15).string(),
    },

    // main title bar
    titleBar:
    {
      base: '#3E3C3C',
    },
    // side bar
    sideBar:
    {
      base: '#646464',
      selectedSquare: '#CAD847',
      arrowBg: '#474747',
    },

    // Library ------

    library:
    {
      // title bar
      titleBar: {
        base: '#272727',
      },

      // item
      item: {
        title: '#424242',
        body: '#4B4B4B',
        activeBody: '#4C7C9C',
      },

      // info panel
      infoColumn: {
        baseUpper: '#656363',
        baseLower: '#545252',
      },

      // info graph selection btn
      infoGraphBtn: {
        btnBase: '#696666',
        btnRoll: '#6E6B6B',
        btnSelected: '#828080',
        btnRadioBase: 'rgba(0,0,0,0.50)',
        btnRadioSelected: '#80CCFF',
      },

      //text box
      textbox: {
        base: '#FFFFFF',
      },
    },

    // Builder -----------------------------

    builder: {
      // tab area
      tabs: {
        background: '#151515',
        tabActive: '#272727',
        tabTopRibbon: '#4C7C9C',
        tabInactive: 'rgba(39,39,39,50)',
        tabTopRibbonInactive: 'rgba(76, 124, 156, 0.5)',
      },

      // title bar
      titleBar: {
        base: '#272727',
      },

      // deck
      deck: {
        background: '#2B2A2A',
      },

      // deck cards --temporary values, colors will be grouped. Inactive on deck all cards are at 70% opacity. Bullet circle is 100% Opacity. When rolled over Opacity is 90%.
      cards: {
        cardBase: '#2F2F2F', // '#424242', // TODO

        card1: '#559DCE',
        card2: '#397DD0',
        card3: '#D14F42',
        card4: '#D55A44',
        card5: '#DA6846',
        card6: '#DD7547',
        card7: '#DD8846',
        card8: '#DAA043',
        card9: '#D9B540',
        card10: '#86A760',
        card11: '#659F72',
        card12: '#4B977F',
        card13: '#39908B',
        card14: '#2E8C9A',
        card15: '#2589AA',
        card16: '#466AA3',
        card17: '#824BA0',
        card18: '#B161BC',
        card19: '#319AA9',
        card20: '#4A979A',
        card21: '#3A91A5',

        card1BG: Color('#559DCE').alpha(0.7).string(),
        card2BG: Color('#397DD0').alpha(0.7).string(),
        card3BG: Color('#D14F42').alpha(0.7).string(),
        card4BG: Color('#D55A44').alpha(0.7).string(),
        card5BG: Color('#DA6846').alpha(0.7).string(),
        card6BG: Color('#DD7547').alpha(0.7).string(),
        card7BG: Color('#DD8846').alpha(0.7).string(),
        card8BG: Color('#DAA043').alpha(0.7).string(),
        card9BG: Color('#D9B540').alpha(0.7).string(),
        card10BG: Color('#86A760').alpha(0.7).string(),
        card11BG: Color('#659F72').alpha(0.7).string(),
        card12BG: Color('#4B977F').alpha(0.7).string(),
        card13BG: Color('#39908B').alpha(0.7).string(),
        card14BG: Color('#2E8C9A').alpha(0.7).string(),
        card15BG: Color('#2589AA').alpha(0.7).string(),
        card16BG: Color('#466AA3').alpha(0.7).string(),
        card17BG: Color('#824BA0').alpha(0.7).string(),
        card18BG: Color('#B161BC').alpha(0.7).string(),
        card19BG: Color('#319AA9').alpha(0.7).string(),
        card20BG: Color('#4A979A').alpha(0.7).string(),
        card21BG: Color('#3A91A5').alpha(0.7).string(),
      },

      //builder column
      builderColumn: {
        background: '#2F2F2F',
      },

      results:
      {
        background: '#151515',
        lines: 'rgba(255,255,255,0.25)',
      },

      inputs:
      {
        background: '#626262',
      },
    },
  };

const Themes = {
  DARK,
};

const curTheme = 'DARK';

export function Colors()
{
  // in the future, you will switch out the theme here.
  return Themes[curTheme];
}

const dynamicMap: any = {
  DARK: {},
};

export function backgroundColor(color: string, hoverColor?: string)
{
  return getStyle(color, 'backgroundColor', hoverColor);
}

export function fontColor(color: string, hoverColor?: string)
{
  return getStyle(color, 'color', hoverColor);
}

export function borderColor(color: string, hoverColor?: string)
{
  return getStyle(color, 'borderColor', hoverColor);
}

export function link()
{
  return fontColor(Colors().text.link, Colors().text.linkHover);
}

export function buttonColors()
{
  return extend({},
    backgroundColor(Colors().button.background, Colors().button.backgroundHover),
    fontColor(Colors().button.text),
  );
}

export function getStyle(color: string, style: string, hoverColor?: string)
{
  if (!dynamicMap[curTheme])
  {
    dynamicMap[curTheme] = {};
  }
  if (!dynamicMap[curTheme][color])
  {
    dynamicMap[curTheme][color] = {};
  }
  if (!dynamicMap[curTheme][color][style])
  {
    dynamicMap[curTheme][color][style] = {};
  }
  if (!dynamicMap[curTheme][color][style][hoverColor])
  {
    dynamicMap[curTheme][color][style][hoverColor] = {
      [style]: color,
    };
    if (hoverColor)
    {
      dynamicMap[curTheme][color][style][hoverColor][':hover'] = {
        [style]: hoverColor,
      };
    }
  }

  return dynamicMap[curTheme][color][style][hoverColor];
}

export default Colors;
