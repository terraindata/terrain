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

const color = require('color');

interface Theme
{

  // main background color
  base: string,

  // text
  text: {
    baseDark: string,
    secondaryDark: string,
    baseLight: string,
    secondaryLight: string,
    
    link: string, // TODO
    linkHover: string,
  },

  // main title bar
  titleBar:
  {
    base: string,
  },
  // side bar
  sideBar:
  {
    base: string,
    selectedSquare: string,
  },

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
  },


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
      
      card01: string,
      card02: string,
      card03: string,
      card04: string,
      card05: string,
      card06: string,
      card07: string,
      card08: string,
      card09: string,
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
    },

    //builder column
    builderColumn: {
      background: string,
    },
  },
}


const DARK: Theme =
  {
    // Universal Elements------------------------------

    // main background color
    base: '#2F2F2F',

    // text
    text: {
      baseDark: '#000000',
      secondaryDark: 'rgba(0,0,0,0.50)',
      baseLight: '#FFFFFF',
      secondaryLight: 'rgba(255,255,255,0.80)',
      
      link: color('#4C7C9C').lighten(0.25).saturate(0.15).string(),
      linkHover: color('#4C7C9C').lighten(0.5).saturate(0.15).string()
    },

    // main title bar
    titleBar:
    {
      base: '#3E3C3C',
    },
    // side bar
    sideBar:
    {
      base: '#303030',
      selectedSquare: '#CAD847',
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
        cardBase: '#424242', // TODO
        
        card01: '#559DCE',
        card02: '#397DD0',
        card03: '#D14F42',
        card04: '#D55A44',
        card05: '#DA6846',
        card06: '#DD7547',
        card07: '#DD8846',
        card08: '#DAA043',
        card09: '#D9B540',
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
      },

      //builder column
      builderColumn: {
        background: '#2F2F2F',
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
};

const dynamicMap: any = {
  DARK: {}
};

export function backgroundColor(color: string, hoverColor?: string)
{
  return getStyle(color, 'backgroundColor', hoverColor);
}

export function fontColor(color: string, hoverColor?: string)
{
  return getStyle(color, 'color', hoverColor);
}

export function link()
{
  return fontColor(Colors().text.link, Colors().text.linkHover);
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
    if(hoverColor)
    {
      dynamicMap[curTheme][color][style][hoverColor][':hover'] = {
        [style]: hoverColor,
      };
    }
  }

  return dynamicMap[curTheme][color][style][hoverColor];
}
