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
import { TransformationNode } from 'etl/templates/FieldTypes';
import { DateFormats, etlFieldTypesList, etlFieldTypesNames, FieldTypes } from 'shared/etl/types/ETLTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import TransformationNodeType from 'shared/transformations/TransformationNodeType';
import { NodeOptionsType } from 'shared/transformations/TransformationNodeType';
import * as Utils from 'shared/transformations/util/EngineUtils';
import { TransformationArgs, TransformationForm, TransformationFormProps } from './TransformationFormBase';

import { DynamicForm } from 'common/components/DynamicForm';
import { KeyPath as EnginePath } from 'terrain-keypath';

import * as Immutable from 'immutable';
const { List, Map } = Immutable;

type CastOptions = NodeOptionsType<TransformationNodeType.CastNode>;
export class CastTFF extends TransformationForm<CastOptions, TransformationNodeType.CastNode>
{
  protected readonly type = TransformationNodeType.CastNode;
  protected readonly inputMap: InputDeclarationMap<CastOptions> = {
    toTypename: {
      type: DisplayType.Pick,
      displayName: 'Cast to Type',
      options: {
        pickOptions: (s) => etlFieldTypesList,
        indexResolver: (value) => etlFieldTypesList.indexOf(value),
        displayNames: (s) => etlFieldTypesNames,
      },
    },
    format: {
      type: DisplayType.Pick,
      displayName: 'Date Format',
      getDisplayState: this.formatDisplayState,
      options: {
        pickOptions: (s) => dateOptions,
        indexResolver: (value) => dateOptions.indexOf(value),
      },
    },
  };

  protected readonly initialState = {
    toTypename: FieldTypes.String,
  }; // this should be overriden by computeInitialState

  public formatDisplayState(state: CastOptions)
  {
    return state.toTypename === FieldTypes.Date ? DisplayState.Active : DisplayState.Hidden;
  }

  protected computeInitialState()
  {
    const { fieldId, isCreate, engine } = this.props;
    if (isCreate)
    {
      const etlType = Utils.fields.fieldType(fieldId, engine);
      const state: CastOptions = {
        toTypename: etlType,
      };
      if (etlType === FieldTypes.Date)
      {
        state.format = DateFormats.ISOstring;
      }
      return state;
    }
    else
    {
      return super.computeInitialState();
    }
  }

  protected transformFormOnChange(state: CastOptions)
  {
    if (state.toTypename === FieldTypes.Date && state.format === undefined)
    {
      return _.extend({}, state, {
        format: DateFormats.ISOstring,
      });
    }
    else
    {
      return state;
    }
  }
}

const dateOptions: List<DateFormats> = List([DateFormats.ISOstring, DateFormats.MMDDYYYY]);
