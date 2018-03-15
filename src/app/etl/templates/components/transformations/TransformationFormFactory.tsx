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
// tslint:disable:no-var-requires import-spacing max-classes-per-file no-invalid-this

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

import { DynamicForm } from 'common/components/DynamicForm';
import { DisplayState, DisplayType, InputDeclarationMap } from 'common/components/DynamicFormTypes';

import { TransformationNode } from 'etl/templates/FieldTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import TransformationNodeType from 'shared/transformations/TransformationNodeType';
import { NodeOptionsType } from 'shared/transformations/TransformationNodeType';
import { KeyPath as EnginePath } from 'shared/util/KeyPath';

import { TransformationInfo } from 'shared/transformations/TransformationInfo';

// visitor components must use this
export interface TransformationFormProps
{
  isCreate: boolean; // whether or not the transformation is being created or edited
  transformation?: TransformationNode; // must be supplied if isCreate is false
  engine: TransformationEngine;
  fieldID: number;
  onEditOrCreate: (structural: boolean) => void;
  onClose: () => void;
  // calls handler with a bool indicating if transform results in structural changes to the document
}

interface ArgsPayload<Type extends TransformationNodeType>
{
  options: NodeOptionsType<Type>;
  fields: List<EnginePath>;
}

export interface FactoryArgs<State extends object, Type extends TransformationNodeType>
{
  inputMap: InputDeclarationMap<State>;
  type: Type;
  initialState: State;
  noEditOptions?: boolean; // if true, then this transformation has no editable properties

  getStateFromNode?: (node: TransformationNode, engine: TransformationEngine, fieldID: number)
    => State;
  // if not specified, then the default is to pick names from node.meta (using initialState to pick keys)
  // the factory is not responsible for making sure that node.meta and State are similar types

  computeNewParams?: (state: State, engine: TransformationEngine, fieldID: number)
    => ArgsPayload<Type>;
  // if not specified, then the default is to pass State as the options.
  // again, the factory is not responsible for making sure that the expected meta object and State are similar types

  computeEditParams?: (state: State, engine: TransformationEngine, fieldID: number, transformationID: number)
    => ArgsPayload<Type>; // defaults to computeNewParams

  validateState?: (state: State, engine: TransformationEngine, fieldID: number) =>
    {
      valid: boolean;
      message: string;
    };
  // check if state is valid and provide an error or warning message (TODO not implemented)
}

export function transformationFormFactory<State extends object, Type extends TransformationNodeType>(
  args: FactoryArgs<State, Type>,
): React.ComponentClass<TransformationFormProps>
{
  class TransformationForm extends TerrainComponent<TransformationFormProps>
  {
    public state: State = args.initialState;

    constructor(props)
    {
      super(props);
      if (this.props.transformation != null && !this.props.isCreate)
      {
        this.state = this.getStateFromNode(this.props.transformation);
      }
    }

    public componentWillReceiveProps(nextProps)
    {
      if (nextProps.transformation !== undefined && nextProps.transformation !== this.props.transformation)
      {
        this.setState(this.getStateFromNode(nextProps.transformation));
      }
    }

    public render()
    {
      const { isCreate } = this.props;

      if (!isCreate && args.noEditOptions)
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
          inputMap={args.inputMap}
          inputState={this.state}
          onStateChange={this.handleStateChange}
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

    public getStateFromNode(transformation: TransformationNode): State
    {
      const { engine, fieldID } = this.props;
      if (args.getStateFromNode === undefined)
      {
        return _.pick(transformation.meta, Object.keys(args.initialState)) as State;
      }
      else
      {
        return args.getStateFromNode(transformation, engine, fieldID);
      }
    }

    public defaultComputeParams(state: State, engine: TransformationEngine, fieldID: number, transformID?): ArgsPayload<Type>
    {
      const { transformation } = this.props;
      const fields = (transformation === undefined || transformation.fields === undefined) ?
        List([engine.getInputKeyPath(this.props.fieldID)]) :
        transformation.fields;

      return {
        options: state,
        fields,
      };
    }

    public handleStateChange(newState: State)
    {
      this.setState(newState);
    }

    public handleMainAction()
    {
      let fnToUse = this.defaultComputeParams;
      let transformID;
      if (this.props.isCreate && args.computeNewParams !== undefined)
      {
        fnToUse = args.computeNewParams;
      }
      else if (!this.props.isCreate && args.computeEditParams !== undefined)
      {
        fnToUse = args.computeEditParams;
      }
      if (!this.props.isCreate)
      {
        transformID = this.props.transformation.id;
      }

      const payload = fnToUse(this.state, this.props.engine, this.props.fieldID, transformID);
      if (this.props.isCreate)
      {
        const { engine } = this.props;
        this.props.engine.appendTransformation(args.type, payload.fields, payload.options);
        this.props.onEditOrCreate(false); // TODO figure out if structural changes happen
        this.props.onClose();
      }
      else
      {
        this.props.engine.editTransformation(transformID, payload.fields, payload.options);
        this.props.onEditOrCreate(false); // TODO figure out if structural changes happen
      }
    }
  }
  return TransformationForm;
}
