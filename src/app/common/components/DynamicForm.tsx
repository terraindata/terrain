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
// tslint:disable:no-var-requires import-spacing max-classes-per-file no-invalid-this no-unused-expression

import * as classNames from 'classnames';
import TerrainComponent from 'common/components/TerrainComponent';
import * as _ from 'lodash';
import memoizeOne from 'memoize-one';
import * as Radium from 'radium';
import * as React from 'react';
import { backgroundColor, borderColor, buttonColors, Colors, fontColor, getStyle } from 'src/app/colors/Colors';
import Util from 'util/Util';

import * as Immutable from 'immutable';
const { List, Map } = Immutable;
import Autocomplete from 'common/components/Autocomplete';
import CheckBox from 'common/components/CheckBox';
import Dropdown from 'common/components/Dropdown';

export interface InputInfo
{
  type: 'string'
}

export interface Props<FState>
{
  inputMap: any;
  inputState: FState;
  onStateChange: (newState: FState) => void;
  handleConfirm: () => void;
}

export default class DynamicForm<FState> extends TerrainComponent<Props<FState>>
{

}

export enum DisplayState
{
  ACTIVE,
  INACTIVE,
  HIDDEN,
}

export enum DisplayType
{
  TextBox = 'TextBox',
  NumberBox = 'NumberBox',
  CheckBox = 'CheckBox',
  NumberRange = 'NumberRange',
}

type DisplayTypeKeys = keyof typeof DisplayType;

type AssertEnumValuesEqualKeys = {
  [K in DisplayTypeKeys]: K
};
DisplayType as AssertEnumValuesEqualKeys;

type AssertOptionTypesExhaustive = {
  [K in DisplayType]: InputDeclarationOptionTypes[K]
}

// important
interface InputDeclarationOptionTypes
{
  TextBox: {
    __acceptedTypes?: string;
    randomThing: string;
  };
  NumberBox: {
    __acceptedTypes?: number;
  };
  NumberRange: {
    __acceptedTypes?: number;
    from: number;
    to: number;
  };
  CheckBox: {
    __acceptedTypes?: boolean;

  };
}

// important
export interface AllowableState
{
  [k: string]: PossibleTypes;
}

// important
interface InputDeclarationHelper<K extends DisplayTypeKeys, TypeInState extends GetHiddenType<K>>
{
  type: K;
  options: InputDeclarationOptionTypes[K];
}

type PossibleTypes = GetHiddenType<keyof InputDeclarationOptionTypes>;

type GetHiddenType<K extends keyof InputDeclarationOptionTypes> =
  InputDeclarationOptionTypes[K]['__acceptedTypes']

type DeclarationOptionTypeUnion = InputDeclarationOptionTypes[DisplayTypeKeys];

type InputDeclarationMap<State extends {[k: string]: PossibleTypes}> =
{
  [key in keyof State]: InputDeclaration<State[key]>;
}

type InputDeclarationBundle<TypeInState extends PossibleTypes> = {
  [K in DisplayTypeKeys]: InputDeclarationHelper<K, TypeInState>
}

type InputDeclaration<TypeInState extends PossibleTypes> = InputDeclarationBundle<TypeInState>[keyof InputDeclarationBundle<TypeInState>];

type InputDeclarationOptionType<K extends keyof InputDeclarationOptionTypes> = InputDeclarationOptionTypes[K];

interface FormState extends AllowableState
{
  from: number;
  length: number;
  textField: string;
  flag: boolean;
}

const DeclarationMap: InputDeclarationMap<FormState> =
{
  from: {
    type: DisplayType.NumberBox,
    options: {}
  },
  length: {
    type: DisplayType.NumberRange,
    options: {
      from: 0,
      to: -1,
    }
  },
  textField: {
    type: DisplayType.TextBox,
    options: {
      randomThing: 'test',
    }
  },
  flag: {
    type: DisplayType.CheckBox,
    options: {}
  }
}

// const x: InputDeclaration<string> = {
//   type: DisplayType.TextBox,
//   options: {
//     randomThing: 'hi'
//   }
// }

// interface TestState
// {
//   Foo: string;
// }
// type z = {
//   [K in keyof InputDeclarationHelper<DisplayType.TextBox, TestState>]: InputDeclarationHelper<DisplayType.TextBox>[K]
// }

// interface InputDeclaration<FormState> {
//   type: DisplayType;
//   group?: string | number;
//   displayName?: string;
//   shouldShow?: (state: FormState) => DisplayState;
// }

// interface TestFormState
// {
//   from: number;
//   length: number;
//   textField: string;
//   flag: boolean;
// }

// const TestDeclarationMap: InputDeclarationMap<TestFormState> = {
//   from: {
//     displayName: 'From Position',
//     type: DisplayType.NUMBER,
//   },
//   length: {
//     displayName: 'Length',
//     type: DisplayType.Textbox,
//   },
//   textField: {
//     displayName: '',
//     type: DisplayType.Textbox,
//   },
//   flag: {
//     displayName: 'Would you like to do a thing?',
//     type: DisplayType.BOOLEAN,
//   }
// };
