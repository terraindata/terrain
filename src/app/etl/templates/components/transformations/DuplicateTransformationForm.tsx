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

import { DisplayState, DisplayType, InputDeclarationMap } from 'common/components/DynamicFormTypes';
import { EngineProxy, FieldProxy } from 'etl/templates/EngineProxy';
import { TransformationNode } from 'etl/templates/FieldTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import TransformationNodeType from 'shared/transformations/TransformationNodeType';
import { NodeOptionsType } from 'shared/transformations/TransformationNodeType';
import { TransformationArgs, TransformationForm, TransformationFormProps } from './TransformationFormBase';

import { DynamicForm } from 'common/components/DynamicForm';
import { KeyPath as EnginePath } from 'shared/util/KeyPath';

import * as Immutable from 'immutable';
const { List, Map } = Immutable;

interface DuplicateOptions
{
  outputName: string;
}
export class DuplicateTFF extends TransformationForm<DuplicateOptions, TransformationNodeType.DuplicateNode>
{
  protected readonly type = TransformationNodeType.DuplicateNode;
  protected readonly inputMap: InputDeclarationMap<DuplicateOptions> = {
    outputName: {
      type: DisplayType.TextBox,
      displayName: 'New Field Name',
    },
  };
  protected readonly initialState = {
    outputName: 'New Field',
  };

  protected computeInitialState()
  {
    const { fieldId, isCreate, engine } = this.props;
    if (isCreate)
    {
      const myKP = engine.getOutputKeyPath(fieldId);
      const baseName = `Copy of ${myKP.last()}`;
      let outputName = baseName;
      let i = 2;
      const fieldNames = engine.getAllFieldNames().map((name) => name.last()).toList();
      while (fieldNames.indexOf(outputName) !== -1)
      {
        outputName = baseName + ' ' + String(i);
        i++;
      }
      return {
        outputName,
      };
    }
    else
    {
      return super.computeInitialState();
    }
  }

  protected isStructuralChange()
  {
    return true;
  }

  // this shouldn't be called since duplicate transformations cannot be edited.. todo remove it?
  protected computeArgs()
  {
    const { engine, fieldId } = this.props;
    const { outputName } = this.state;
    const args = super.computeArgs();

    const currentKeyPath = engine.getOutputKeyPath(fieldId);
    const newKeyPath = currentKeyPath.set(currentKeyPath.size - 1, outputName);
    return {
      options: {
        newFieldKeyPaths: List([newKeyPath]),
      },
      fields: args.fields,
    };
  }

  protected createTransformation(proxy: EngineProxy)
  {
    const { engine, fieldId } = this.props;
    const { outputName } = this.state;
    const currentKeyPath = engine.getOutputKeyPath(fieldId);
    const newKeyPath = currentKeyPath.set(currentKeyPath.size - 1, outputName);
    proxy.duplicateField(fieldId, newKeyPath);
  }
}
