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
import { borderColor, Colors, getStyle } from 'src/app/colors/Colors';
import Util from 'util/Util';

import * as Immutable from 'immutable';
const { List, Map } = Immutable;

import { DynamicForm } from 'common/components/DynamicForm';
import { DisplayState, DisplayType, InputDeclarationMap } from 'common/components/DynamicFormTypes';

import { availableTransformations, getTransformationForm } from 'etl/templates/components/transformations/TransformationForms';
import { TransformationNode } from 'etl/templates/FieldTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import { InfoType, TransformationInfo } from 'shared/transformations/TransformationInfo';
import TransformationNodeType from 'shared/transformations/TransformationNodeType';

import './TransformationEditor.less';

interface FormState
{
  transformationIndex: number;
}

export interface Props
{
  onTransformationCreated: (structuralChanges: boolean) => void;
  onClose: () => void;
  engine: TransformationEngine;
  fieldID: number;
}

@Radium
export class TransformationCreator extends TerrainComponent<Props>
{
  public state: FormState = {
    transformationIndex: -1,
  };

  private inputMap: InputDeclarationMap<FormState> =
    {
      transformationIndex: {
        type: DisplayType.Pick;
        displayName: 'Transformation',
        group: 'main',
        options: {
          pickOptions: this.getOptionNames,
        },
      },
    };

  public getValidOptions(): List<TransformationNodeType>
  {
    return availableTransformations.filter(
      (type, index) =>
      {
        return TransformationInfo.isAvailable(type, this.props.engine, this.props.fieldID);
      },
    ).toList();
  }

  public getOptionNames(s: FormState)
  {
    const transformations = this.getValidOptions();
    return transformations.map((type) => TransformationInfo.getReadableName(type)).toList();
  }

  public renderCreateTransformation()
  {
    const { transformationIndex } = this.state;
    let compComponent = null;
    if (transformationIndex !== -1)
    {
      const type = this.getValidOptions().get(transformationIndex);
      const CompClass = getTransformationForm(type);
      compComponent = (
        <CompClass
          isCreate={true}
          engine={this.props.engine}
          fieldId={this.props.fieldID}
          onEditOrCreate={this.props.onTransformationCreated}
          onClose={this.props.onClose}
        />
      );
    }

    return (
      <div className='create-transformation-container'>
        <DynamicForm
          inputMap={this.inputMap}
          inputState={this.state}
          onStateChange={this.handleStateChange}
        />
        <div className='create-transformation-component'>
          {compComponent}
        </div>
      </div>
    );
  }

  public render()
  {
    return (
      <div className='transformation-editor'>
        {this.renderCreateTransformation()}
      </div>
    );
  }

  public handleStateChange(s: FormState)
  {
    this.setState(s);
  }

}
