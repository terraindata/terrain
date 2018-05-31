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

import Dropdown from 'common/components/Dropdown';
import { DisplayState, DisplayType, InputDeclarationMap } from 'common/components/DynamicFormTypes';
import { TransformationNode } from 'etl/templates/FieldTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import TransformationNodeType from 'shared/transformations/TransformationNodeType';
import { NodeOptionsType } from 'shared/transformations/TransformationNodeType';
import { instanceFnDecorator } from 'shared/util/Classes';
import { backgroundColor, borderColor, buttonColors, Colors, fontColor, getStyle } from 'src/app/colors/Colors';

import { DynamicForm } from 'common/components/DynamicForm';
import { KeyPath as EnginePath } from 'shared/util/KeyPath';

import * as Immutable from 'immutable';
const { List, Map } = Immutable;

import './FieldPicker.less';

interface Props
{
  selectedIds: List<number>;
  labelText?: string;
  onChange: (ids: List<number>) => void;
  engine: TransformationEngine;
  availableFields: List<number>;
}

export class FieldPicker extends TerrainComponent<Props>
{
  public stringifyKeyPath(kp: EnginePath)
  {
    return kp.reduce((reduction, value) =>
    {
      return reduction === undefined ? `${value}` : `${reduction}, ${value}`;
    }, undefined);
  }

  @instanceFnDecorator(memoizeOne)
  public translateFieldsToStrings(availableFields: List<number>, engine: TransformationEngine)
  {
    return availableFields.map((id, i) =>
      this.stringifyKeyPath(engine.getOutputKeyPath(id)),
    ).toList();
  }

  @instanceFnDecorator(memoizeOne)
  public findIdIndexFactory(avail: List<number>): (id: number) => number
  {
    const fn = _.memoize((id: number) =>
    {
      return avail.indexOf(id);
    });
    return fn;
  }

  public renderSelectedField(id, index)
  {
    const { engine, onChange, availableFields } = this.props;
    const options = this.translateFieldsToStrings(availableFields, engine);
    const idIndex = this.findIdIndexFactory(availableFields)(id);
    return (
      <div
        key={index}
        className='field-picker-field'
      >
        <Dropdown
          selectedIndex={idIndex}
          options={options}
          onChange={this.handleChangeFactory(index)}
          canEdit={true}
          textColor={this.computeOptionColorFactory(index)}
        />
      </div>
    );
  }

  public render()
  {
    const { selectedIds } = this.props;
    return (
      <div
        className='engine-field-picker'
      >
        <div
          className='engine-field-picker-title'
        >
          {this.props.labelText !== undefined ? this.props.labelText : 'Field'}
        </div>
        <div
          className='field-options-section'
        >
          {selectedIds.map(this.renderSelectedField)}
        </div>
      </div>
    );
  }

  @instanceFnDecorator(_.memoize)
  public computeOptionColorFactory(rowIndex)
  {
    return (index) =>
    {
      const { selectedIds, availableFields } = this.props;
      const id = availableFields.get(index);
      if (selectedIds.get(rowIndex) === id || selectedIds.indexOf(id) === -1)
      {
        return Colors().text2;
      }
      else
      {
        return Colors().text3;
      }
    };
  }

  @instanceFnDecorator(_.memoize)
  public handleChangeFactory(indexInList: number)
  {
    return (newIndex) =>
    {
      const { onChange, selectedIds, availableFields } = this.props;
      const newId = availableFields.get(newIndex);
      onChange(selectedIds.set(indexInList, newId));
    };
  }
}
