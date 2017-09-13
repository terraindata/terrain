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
import * as React from 'react';

// import * as SchemaTypes from '../schema/SchemaTypes';
// const ManualConfig = require('./../manual/ManualConfig.json');

export enum DisplayType
{
  TEXT,
  CARDTEXT, // textbox that can be cards, must be coupled with:
  CARDSFORTEXT, // cards that are associated with a textbox
  NUM,
  ROWS,
  CARDS,
  DROPDOWN,
  FLEX, // a single row, doesn't require a key
  COMPONENT,
  LABEL, // strict text to paste in to HTML
  EXPANDABLE,
  MAP,
}

export interface RowDisplay
{ // this defines each row
  inner: Display | Display[];
  above?: Display | Display[];
  below?: Display | Display[];
  hideToolsWhenNotString?: boolean;
  noDataPadding?: boolean; // don't add extra padding to first row when data
}
const { TEXT, NUM, ROWS, CARDS, CARDTEXT, CARDSFORTEXT, DROPDOWN, LABEL, FLEX, COMPONENT } = DisplayType;

export interface Display
{
  displayType: DisplayType;
  key: string;
  // key can be null for FLEX but nothing else

  // Manual information
  help?: string | string[];

  className?: string | ((data: any) => string);

  // for dropdown
  options?: List<(string | El)>;
  centerDropdown?: boolean;
  optionsDisplayName?: Immutable.Map<any, string>; // maps value to display name
  dropdownUsesRawValues?: boolean; // use the raw values, instead of the indices
  dropdownTooltips?: List<any>;

  // for labels
  label?: string;

  // for textboxes
  placeholder?: string;
  defaultValue?: string;
  // for textboxes with cards
  top?: boolean;
  getAutoTerms?: (schemaState) => List<string>; // overrides standard terms
  autoDisabled?: boolean;
  showWhenCards?: boolean;
  onFocus?: (comp: React.Component<any, any>, value: string, event: React.FocusEvent<any>) => void;
  onBlur?: (comp: React.Component<any, any>, value: string, event: React.FocusEvent<any>) => void;

  // for rows and FLEX, content to display above/below,
  above?: Display;
  below?: Display;

  // for rows:
  english?: string; // English term defining each row
  factoryType?: string; // string referencing which BLOCK to create
  row?: RowDisplay;

  // for FLEX, its content
  flex?: Display | Display[];

  style?: React.CSSProperties;

  // for components and map
  component?: any; // TerrainComponent?

  // for cards areas
  singleChild?: boolean;
  accepts?: List<string>;
  hideCreateCardTool?: boolean;

  provideParentData?: boolean;
  // if true, it passes the parent data down
  // this will cause unnecessary re-rendering, so avoid if possible

  // the transform card currently requires the full builder state
  //  let's change that in the future by having the histogram bars be
  //  computed at a higher level
  requiresBuilderState?: boolean;

  handleCardDrop?: (type: string) => any;

  // for expandable sections of display
  // section that toggles whether or not expanded section is visible
  expandToggle?: Display | Display[];
  // section shown or hidden by the toggle
  expandContent?: Display | Display[];
}

// Section: Re-useable displays

export const valueDisplay: Display =
  {
    displayType: NUM,
    // help: ManualConfig.help['value'],
    key: 'value',
    placeholder: 'value',
  };

export const stringValueDisplay: Display =
  {
    displayType: TEXT,
    key: 'value',
    placeholder: 'value',
  };

export const getCardStringDisplay =
  (config: { accepts?: List<string>, defaultValue?: string } = {}): Display[] =>
    [
      {
        displayType: CARDSFORTEXT,
        key: 'value',
        className: 'nested-cards-content',
        accepts: config.accepts,
      },
      {
        displayType: CARDTEXT,
        key: 'value',
        defaultValue: config.defaultValue,
        accepts: config.accepts,
      },
    ];

export const firstSecondDisplay = (middle: Display, accepts: List<string>): Display =>
  ({
    displayType: FLEX,
    key: null,

    above:
    {
      displayType: CARDSFORTEXT,
      key: 'first',
      className: 'card-double-first',
      accepts,
    },

    below:
    {
      displayType: CARDSFORTEXT,
      key: 'second',
      accepts,
    },

    flex:
    [
      {
        displayType: CARDTEXT,
        key: 'first',
        top: true,
        showWhenCards: true,
        // help: ManualConfig.help['first'],
        accepts,
      },

      middle,

      {
        displayType: CARDTEXT,
        key: 'second',
        showWhenCards: true,
        // help: ManualConfig.help['second'],
        accepts,
      },
    ],
  });

export const wrapperDisplay: Display =
  {
    displayType: CARDS,
    key: 'cards',
    className: 'nested-cards-content',
  };

export const wrapperSingleChildDisplay: Display =
  {
    displayType: CARDS,
    key: 'cards',
    className: 'nested-cards-content',
    singleChild: true,
  };

export const letVarDisplay =
  {
    displayType: FLEX,
    key: null,
    flex:
    [
      {
        displayType: TEXT,
        // help: ManualConfig.help['let-var-field'],
        key: 'field',
      },
      {
        displayType: LABEL,
        label: '=',
        key: null,
      },
      {
        displayType: CARDTEXT,
        // help: ManualConfig.help['expression'],
        key: 'expression',
      },
    ],
    below:
    {
      key: 'expression',
      displayType: CARDSFORTEXT,
    },
  };
