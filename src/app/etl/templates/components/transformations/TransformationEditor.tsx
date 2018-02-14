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
// tslint:disable:no-var-requires import-spacing

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

import { DisplayState, DisplayType, DynamicForm, InputDeclarationMap } from 'common/components/DynamicForm';
import { TransformationNode } from 'etl/templates/FieldTypes';
import TransformationNodeType from 'shared/transformations/TransformationNodeType';
import TransformationsInfo from 'shared/transformations/TransformationsInfo';

import './TransformationEditor.less';

// import { TestClass } from './TransformationEditorFactory';

export interface Props
{
  transformation?: TransformationNode;
  editTransformation: (transformationID, fieldNamesOrIDs?, options?) => void;
  deleteTransformation?: () => void;
}

@Radium
export class TransformationEditor extends TerrainComponent<Props>
{
  public state: {
    formState: TestFormState,
  } = {
    formState: {
      from: 0,
      to: 5,
      flag: true,
      text: 'once upon a time...',
    },
  };

  public getChildComponent(type: TransformationNodeType)
  {
    // switch (type)
    // {
    //   case TransformationNodeType.CapitalizeNode:
    //     return CapitalizeNodeEditor;
    //   case TransformationNodeType.SubstringNode:
    //     return SubstringNodeEditor;
    //   default:
    //     return DefaultNodeEditor;
    // }
  }

  public render()
  {
    return (
      <DynamicForm
        inputMap={TestMap}
        inputState={this.state.formState}
        onStateChange={this._setStateWrapper('formState')}
        onConfirm={() => null}
      />
    );
  }
}

interface TestFormState
{
  from: number;
  to: number;
  flag: boolean;
  text: string;
}

const TestMap: InputDeclarationMap<TestFormState> =
{
  from: {
    type: DisplayType.NumberBox,
    displayName: 'From position',
    group: 'numberRow',
    options: {},
  },
  to: {
    type: DisplayType.NumberBox,
    displayName: 'To Position',
    group: 'numberRow',
    options: {},
  },
  flag: {
    type: DisplayType.CheckBox,
    displayName: 'Would you like Fries?',
    options: {},
  },
  text: {
    type: DisplayType.TextBox,
    displayName: 'Tell us a story',
    options: {},
  },
};
