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

import { instanceFnDecorator } from 'src/app/Classes';

import { DisplayState, DisplayType, InputDeclarationMap } from 'common/components/DynamicFormTypes';
import { TransformationNode } from 'etl/templates/FieldTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import TransformationNodeType from 'shared/transformations/TransformationNodeType';
import { NodeOptionsType } from 'shared/transformations/TransformationNodeType';

import { DynamicForm } from 'common/components/DynamicForm';
import { KeyPath as EnginePath } from 'shared/util/KeyPath';

import * as Immutable from 'immutable';
const { List, Map } = Immutable;

export interface TransformationFormProps
{
  isCreate: boolean; // whether or not the transformation is being created or edited
  transformation?: TransformationNode; // must be supplied if isCreate is false
  engine: TransformationEngine;
  fieldId: number;
  onEditOrCreate: (structural: boolean) => void;
  onClose: () => void;
  // calls handler with a bool indicating if transform results in structural changes to the document
}
type TFProps = TransformationFormProps; // short alias

export interface TransformationArgs<Type extends TransformationNodeType>
{
  options: NodeOptionsType<Type>;
  fields: List<EnginePath>;
}

export abstract class TransformationForm<State, Type extends TransformationNodeType>
  extends TerrainComponent<TFProps>
{
  public state: State;
  // override these to configure
  protected readonly abstract inputMap: InputDeclarationMap<State>;
  protected readonly abstract initialState: State;
  protected readonly abstract type: Type;
  protected readonly noEditOptions = false;

  constructor(props)
  {
    super(props);
    this.handleMainAction = this.handleMainAction.bind(this);
    this.handleFormChange = this.handleFormChange.bind(this);
  }

  public componentWillMount()
  {
    try
    {
      this.setState(this.computeInitialState());
    }
    catch (e)
    {
      // todo
    }
  }

  public render()
  {
    const { isCreate } = this.props;
    if (!isCreate && this.noEditOptions)
    {
      return (
        <div
          style={{
            display: 'flex',
            padding: '12px',
            justifyContent: 'center',
          }}
        >
          This Transformation Is Not Editable
        </div>
      );
    }

    return (
      <DynamicForm
        inputMap={this.inputMap}
        inputState={this.state}
        onStateChange={this.handleFormChange}
        style={{
          flexGrow: '1',
        }}
        mainButton={{ // TODO if there are no config options available change the buttons to match
          name: isCreate ? 'Create' : 'Save',
          onClicked: this.handleMainAction,
        }}
        secondButton={{
          name: 'Cancel',
          onClicked: this.props.onClose,
        }}
        actionBarStyle={{
          justifyContent: 'center',
        }}
      />
    );
  }

  // override this to specify if editing / creating the transformation will cause structural changes
  protected isStructuralChange(): boolean
  {
    return false;
  }

  // override this to specify transformation args if they need to be computed from state
  protected computeArgs(): TransformationArgs<Type>
  {
    const { transformation, isCreate, engine, fieldId } = this.props;
    const fields = isCreate ?
      List([engine.getInputKeyPath(fieldId)]) :
      transformation.fields;

    return {
      options: this.state,
      fields,
    };
  }

  // override this to customize how initial state gets computed from existing args
  protected computeInitialState(): State
  {
    const { isCreate, transformation } = this.props;
    if (isCreate)
    {
      return this.initialState;
    }
    else
    {
      return transformation.meta as NodeOptionsType<Type>;
    }
  }

  // the below shouldn't need to be overidden
  protected handleFormChange(state: State)
  {
    this.setState(state);
  }

  protected handleMainAction()
  {
    const { isCreate, engine, fieldId, onEditOrCreate, onClose } = this.props;
    if (isCreate)
    {
      const args = this.computeArgs();
      engine.appendTransformation(this.type, args.fields, args.options);
      onEditOrCreate(this.isStructuralChange());
      onClose();
    }
    else
    {
      const { transformation } = this.props;
      const args = this.computeArgs();
      engine.editTransformation(transformation.id, args.fields, args.options);
      onEditOrCreate(this.isStructuralChange());
    }
  }
}
