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

// Used for calculations
var defaultWidth = 300;
var defaultColors = {
  success: {
    rgb: '94, 164, 0',
    hex: '#5ea400'
  },
  error: {
    rgb: '236, 61, 61',
    hex: '#ec3d3d'
  },
  warning: {
    rgb: '235, 173, 23',
    hex: '#ebad1a'
  },
  info: {
    rgb: '256, 256, 256',
    hex: '#fff'
  }
};
var defaultShadowOpacity = '0.9';

var STYLES = {

  Wrapper: {},
  Containers: {
    DefaultStyle: {
      fontFamily: 'inherit',
      position: 'fixed',
      width: defaultWidth,
      padding: '0 10px 10px 10px',
      zIndex: 999999999,
      WebkitBoxSizing: 'border-box',
      MozBoxSizing: 'border-box',
      boxSizing: 'border-box',
      height: 'auto',
    },

    tl: {
      top: '0px',
      bottom: 'auto',
      left: '0px',
      right: 'auto'
    },

    tr: {
      top: '41px',
      bottom: 'auto',
      left: 'auto',
      right: '5px'
    },

    tc: {
      top: '0px',
      bottom: 'auto',
      margin: '0 auto',
      left: '50%',
      marginLeft: -(defaultWidth / 2)
    },

    bl: {
      top: 'auto',
      bottom: '0px',
      left: '0px',
      right: 'auto'
    },

    br: {
      top: 'auto',
      bottom: '0px',
      left: 'auto',
      right: '0px'
    },

    bc: {
      top: 'auto',
      bottom: '0px',
      margin: '0 auto',
      left: '50%',
      marginLeft: -(defaultWidth / 2)
    }

  },

  NotificationItem: {
    DefaultStyle: {
      position: 'relative',
      width: '100%',
      cursor: 'pointer',
      borderRadius: '6px',
      fontSize: '12px',
      margin: '10px 0 0',
      padding: '10px',
      display: 'block',
      fontWeight: '200',
      WebkitBoxSizing: 'border-box',
      MozBoxSizing: 'border-box',
      boxSizing: 'border-box',
      opacity: 0,
      transition: '.3s ease-in-out',
      height: 0,
      isHidden: {
        opacity: 0
      },
      isVisible: {
        opacity: .95
      }
    },

    success: {
      borderTop: '2px solid ' + defaultColors.success.hex,
      backgroundColor: '#f0f5ea',
      color: '#4b583a',
      WebkitBoxShadow: '0 0 1px rgba(' + defaultColors.success.rgb + ',' + defaultShadowOpacity + ')',
      MozBoxShadow: '0 0 1px rgba(' + defaultColors.success.rgb + ',' + defaultShadowOpacity + ')',
      boxShadow: '0 0 1px rgba(' + defaultColors.success.rgb + ',' + defaultShadowOpacity + ')'
    },

    error: {
      borderTop: '2px solid ' + defaultColors.error.hex,
      backgroundColor: '#f4e9e9',
      color: '#412f2f',
      WebkitBoxShadow: '0 0 1px rgba(' + defaultColors.error.rgb + ',' + defaultShadowOpacity + ')',
      MozBoxShadow: '0 0 1px rgba(' + defaultColors.error.rgb + ',' + defaultShadowOpacity + ')',
      boxShadow: '0 0 1px rgba(' + defaultColors.error.rgb + ',' + defaultShadowOpacity + ')'
    },

    warning: {
      borderTop: '2px solid ' + defaultColors.warning.hex,
      backgroundColor: '#f9f6f0',
      color: '#5a5343',
      WebkitBoxShadow: '0 0 1px rgba(' + defaultColors.warning.rgb + ',' + defaultShadowOpacity + ')',
      MozBoxShadow: '0 0 1px rgba(' + defaultColors.warning.rgb + ',' + defaultShadowOpacity + ')',
      boxShadow: '0 0 1px rgba(' + defaultColors.warning.rgb + ',' + defaultShadowOpacity + ')'
    },

    info: {
      //borderTop: '2px solid ' + defaultColors.info.hex,
      backgroundColor: '#3e3c3c',
      color: '#fff',
      WebkitBoxShadow: '0 0 1px rgba(62, 60, 60, ' + defaultShadowOpacity + ')',
      MozBoxShadow: '0 0 1px rgba(62, 60, 60, ' + defaultShadowOpacity + ')',
      boxShadow: '0 0 1px rgba(62, 60, 60, ' + defaultShadowOpacity + ')'
    }
  },

  // TerrainIcon: {
  //   DefaultStyle: {
  //     opacity: '0',
  //     width: '48px',
  //     transition: '.1s ease-in-out',
  //     position: 'relative',
  //     isVisible: {
  //       opacity: '.95'
  //     }
  //   }
  // },

  Title: {
    DefaultStyle: {
      fontSize: '14px',
      margin: '0px',
      padding: 0,
      fontWeight: '500'
    },

    success: {
      color: defaultColors.success.hex
    },

    error: {
      color: defaultColors.error.hex
    },

    warning: {
      color: defaultColors.warning.hex
    },

    info: {
      color: defaultColors.info.hex
    }

  },

  MessageWrapper: {
    DefaultStyle: {
      margin: 0,
      padding: 0,
      overflowY: 'auto',
      maxHeight: '48px',
      paddingTop: '2px',
    }
  },

  Dismiss: {
    DefaultStyle: {
      fontFamily: 'Arial',
      fontSize: '17px',
      position: 'absolute',
      top: '8px',
      right: '8px',
      lineHeight: '15px',
      backgroundColor: '#dededf',
      color: '#ffffff',
      borderRadius: '50%',
      width: '12px',
      height: '12px',
      fontWeight: 'bold',
      textAlign: 'center',
    },

    success: {
      color: '#f0f5ea',
      backgroundColor: '#b0ca92'
    },

    error: {
      color: '#f4e9e9',
      backgroundColor: '#e4bebe'
    },

    warning: {
      color: '#f9f6f0',
      backgroundColor: '#e1cfac'
    },

    info: {
      fill: '#fff',
      backgroundColor: 'red'
    },
  },

  Action: {
    DefaultStyle: {
      background: '#ffffff',
      borderRadius: '2px',
      padding: '6px 20px',
      fontWeight: 'bold',
      margin: '10px 0 0 0',
      border: 0
    },

    success: {
      backgroundColor: defaultColors.success.hex,
      color: '#ffffff'
    },

    error: {
      backgroundColor: defaultColors.error.hex,
      color: '#ffffff'
    },

    warning: {
      backgroundColor: defaultColors.warning.hex,
      color: '#ffffff'
    },

    info: {
      backgroundColor: defaultColors.info.hex,
      color: '#ffffff'
    }
  },

  ActionWrapper: {
    DefaultStyle: {
      margin: 0,
      padding: 0
    }
  }
};

module.exports = STYLES;
