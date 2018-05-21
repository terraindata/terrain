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

// Copyright 2018 Terrain Data, Inc.

// tslint:disable:no-var-requires

const color = require('color');
const active = '#00A7F7';
const lighterActive = color(active).lighten(0.25).string();

export const Styles =
  {
    margin: 6,

    colors:
      {
        text:
          {
            light: '#aaa',
            white: '#fff',
            black: 'rgba(0,0,0,0.8)',

            loading: '#aaa',
          },

        active,

        transBlack: 'rgba(0,0,0,0.75)',
      },

    link:
      {
        'color': active,
        'cursor': 'pointer',

        ':hover':
          {
            color: lighterActive,
          },
      },

    font:
      {
        title: {
          fontWeight: 1000,
          fontSize: '16px',
        },
        semiBoldBig: {
          fontWeight: 600,
          fontSize: '14px',
        },
        big: {
          fontWeight: 400,
          fontSize: '14px',
        },
        boldNormal: {
          fontWeight: 1000,
          fontSize: '12px',
        },
        semiBoldNormal: {
          fontWeight: 500,
          fontSize: '12px',
        },
        normal: {
          fontWeight: 400,
          fontSize: '12px',
        },
        smallBold: {
          fontWeight: 1000,
          fontSize: '10px',
        },
        small: {
          fontWeight: 400,
          fontSize: '10px',
        },
        smallest: {
          fontWeight: 400,
          fontSize: '9px',
        },
      },

    rotate90neg:
      {
        MozTransform: 'rotate(-90deg)',
        WebkitTransform: 'rotate(-90deg)',
        OTransform: 'rotate(-90deg)',
        msTransform: 'rotate(-90deg)',
        transform: 'rotate(-90deg)',
      },

    rotate90:
      {
        MozTransform: 'rotate(90deg)',
        WebkitTransform: 'rotate(90deg)',
        OTransform: 'rotate(90deg)',
        msTransform: 'rotate(90deg)',
        transform: 'rotate(90deg)',
      },

    rotate180: {
      MozTransform: 'rotate(180deg)',
      WebkitTransform: 'rotate(180deg)',
      OTransform: 'rotate(180deg)',
      msTransform: 'rotate(180deg)',
      transform: 'rotate(180deg)',
    },

    transition:
      {
        WebkitTransition: 'all 0.15s',
        transition: 'all 0.15s',
      },
  };

export default Styles;
