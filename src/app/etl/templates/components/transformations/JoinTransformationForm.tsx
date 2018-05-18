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
// tslint:disable:no-var-requires no-empty-interface max-classes-per-file
import TerrainComponent from 'common/components/TerrainComponent';
import * as _ from 'lodash';
import memoizeOne from 'memoize-one';
import * as Radium from 'radium';
import * as React from 'react';

import { instanceFnDecorator } from 'shared/util/Classes';

import { DynamicForm } from 'common/components/DynamicForm';
import { DisplayState, DisplayType, InputDeclarationMap } from 'common/components/DynamicFormTypes';
import { FieldPicker } from 'etl/common/components/FieldPicker.tsx';
import { TransformationNode } from 'etl/templates/FieldTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import TransformationNodeType from 'shared/transformations/TransformationNodeType';
import { NodeOptionsType } from 'shared/transformations/TransformationNodeType';
import { areFieldsLocal } from 'shared/transformations/util/TransformationsUtil';
import { KeyPath as EnginePath } from 'shared/util/KeyPath';
import { TransformationArgs, TransformationForm, TransformationFormProps } from './TransformationFormBase';

import * as Immutable from 'immutable';
const { List, Map } = Immutable;

interface JoinOptions
{
  otherFieldIds: List<number>;
  outputName: string;
  preserveOldFields: boolean;
  delimiter: any;
}

export class JoinTFF extends TransformationForm<JoinOptions, TransformationNodeType.JoinNode>
{
  protected readonly inputMap: InputDeclarationMap<JoinOptions> = {
    otherFieldIds: {
      type: DisplayType.Custom,
      displayName: 'Fields to Join',
      widthFactor: 4,
      options: {
        render: this.renderFieldPicker,
      },
    },
    outputName: {
      type: DisplayType.TextBox,
      displayName: 'Output Field',
    },
    delimiter: {
      type: DisplayType.TextBox,
      displayName: 'Delimiter',
      group: 'row2',
      widthFactor: 2,
    },
    preserveOldFields: {
      type: DisplayType.CheckBox,
      displayName: 'Keep Original Field',
      group: 'row2',
      widthFactor: 3,
    },
  };
  protected readonly initialState = {
    otherFieldIds: List([-1]),
    outputName: 'Joined Field',
    preserveOldFields: false,
    delimiter: '-',
  };
  protected readonly type = TransformationNodeType.JoinNode; // lack of type safety here

  public renderFieldPicker()
  {
    const { fieldId, engine } = this.props;
    const { otherFieldIds } = this.state;

    return (
      <FieldPicker
        selectedIds={this.state.otherFieldIds}
        labelText={'Field to Join'}
        onChange={this._setStateWrapper('otherFieldIds')}
        engine={engine}
        availableFields={this.computeAvailableFields(fieldId)}
      />
    );
  }

  @instanceFnDecorator(memoizeOne)
  public computeAvailableFields(fieldId: number): List<number>
  {
    const { engine } = this.props;
    const currentKP = engine.getOutputKeyPath(fieldId);
    return engine.getAllFieldIDs().filter((id, i) => fieldId !== id
      && areFieldsLocal(currentKP, engine.getOutputKeyPath(id))
      && engine.getFieldType(id) === 'string',
    ).toList();
  }

  protected isStructuralChange()
  {
    return true;
  }

  protected computeArgs()
  {
    const { engine, fieldId } = this.props;
    const { otherFieldIds, outputName, delimiter, preserveOldFields } = this.state;

    const currentKeyPath = engine.getOutputKeyPath(fieldId);
    const changeIndex = currentKeyPath.size - 1;
    const newFieldKeyPaths = List([
      currentKeyPath.set(changeIndex, outputName),
    ]);

    const inputFields = List([fieldId])
      .concat(otherFieldIds)
      .map((id) => engine.getInputKeyPath(id))
      .toList();

    return {
      options: {
        newFieldKeyPaths,
        delimiter,
        preserveOldFields,
      },
      fields: inputFields,
    };
  }
}
