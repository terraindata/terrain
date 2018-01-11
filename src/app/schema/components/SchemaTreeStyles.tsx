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

// tslint:disable:no-var-requires

import * as _ from 'lodash';
import Colors from '../../colors/Colors';
import Styles from '../../Styles';

const arrowSvgStyles = {
  'width': '12px',
  'height': '12px',
  'fill': Colors().text3,
  'cursor': 'pointer',
  'marginLeft': 5.5,
  'marginTop': 4,
  ':hover': {
    fill: Colors().text2,
  },
};

const starSvgStyles = {
  height: '17px',
  width: '15px',
  marginLeft: '3px',
  strokeWidth: '2px',
  stroke: Colors().active
}

const SchemaTreeStyles =
  {
    schemaView: {
      height: '100%',
      overflow: 'auto',
    },

    schemaHeading: [
      Styles.font.big,
    ],

    label: Styles.font.semiBoldNormal,

    none: {

    },

    treeItem: [
      Styles.transition,
    ],

    unselectedStarIcon: _.extend({},
      starSvgStyles,
      {
        fill: 'none',
      }),

    selectedStarIcon: _.extend({},
      starSvgStyles,
      {
        fill: Colors().active,
      }),

    arrow: _.extend(
      {
        width: '12px',
        height: '12px',
      },
      arrowSvgStyles,
      Styles.rotate90,
      Styles.transition,
    ),

    arrowOpen: _.extend(
      {},
      arrowSvgStyles,
      {
        width: '12px',
        height: '12px',
        fill: Colors().active,
      },
      Styles.rotate180,
      Styles.transition,
    ),

    treeItemHeader: [{
      'display': 'flex',
      'cursor': 'pointer',
      'borderRadius': 4,

      ':hover': {
        background: Colors().inactiveHover,
      },
    },
    Styles.transition,
    ],

    treeItemHeaderSelected:
      {
        'background': Colors().inactiveHover,
        ':hover': {
          background: Colors().inactiveHover,
        },
      },

    treeItemHeaderHighlighted:
      {
        background: Colors().inactiveHover,
      },

    name: {
      marginRight: Styles.margin * 3,
      marginLeft: Styles.margin,
      fontSize: 16,
    },

    itemInfoRow: {
      flexGrow: '1',
    },

    childrenWrapper: {
      normal: [
        {
          paddingLeft: 11,
        },
        Styles.transition,
      ],

      search: Styles.transition,
    },

    childSection: {

    },

    // SchemaTreeInfo
    infoPieces: {
      display: 'flex',
      paddingTop: '2px',
    },

    infoPiece: {
      marginRight: Styles.margin * 2,
    },

    infoPieceNumber: {
      fontWeight: 1000,
    },

    searchTextEmphasis: {
      fontWeight: 1000,
      color: Colors().active,
    },

    link: {
      'color': Colors().active,
      'cursor': 'pointer',

      ':hover':
        {
          color: Colors().activeText,
        },

      'float': 'left',
      'width': '100px',
    },

    margin: Styles.margin,
  };

export default SchemaTreeStyles;
