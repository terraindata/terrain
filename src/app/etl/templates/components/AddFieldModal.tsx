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
// tslint:disable:no-var-requires max-classes-per-file

import * as classNames from 'classnames';
import TerrainComponent from 'common/components/TerrainComponent';
import * as Immutable from 'immutable';
import * as _ from 'lodash';
import memoizeOne from 'memoize-one';
import * as Radium from 'radium';
import * as React from 'react';
import { instanceFnDecorator } from 'src/app/Classes';
import { backgroundColor, borderColor, buttonColors, Colors, fontColor, getStyle } from 'src/app/colors/Colors';
import Util from 'util/Util';
const { List, Map } = Immutable;

import Autocomplete from 'common/components/Autocomplete';
import Modal from 'common/components/Modal';
import { TemplateField } from 'etl/templates/FieldTypes';
import { TemplateEditorActions } from 'etl/templates/TemplateEditorRedux';
import { kpToString, stringToKP, validateNewFieldName } from 'shared/transformations/util/TransformationsUtil';
import { KeyPath as EnginePath } from 'shared/util/KeyPath';
import { mapDispatchKeys, mapStateKeys, TemplateEditorField, TemplateEditorFieldProps } from './TemplateEditorField';

import './MoveFieldModal.less';

export default class Injector extends TerrainComponent<TemplateEditorFieldProps>
{
  public render()
  {
    const { fieldId } = this.props;
    if (fieldId === null)
    {
      return null;
    }
    else
    {
      return (
        <AddFieldModal
          {... this.props}
        />
      );
    }
  }
}

const indentSize = 24;
const emptyList = List([]);

// UI to add a new field underneath this field
class AddFieldModalC extends TemplateEditorField<TemplateEditorFieldProps>
{
  public state: {
    name: string,
  } = {
      name: 'new_field',
    };

  @instanceFnDecorator(memoizeOne)
  public _validateKeyPath(engine, engineVersion, field, pathKP: List<string>)
  {
    return validateNewFieldName(engine, field.fieldId, pathKP);
  }

  public validateKeyPath(): { isValid: boolean, message: string }
  {
    const engineVersion = this._uiState().get('engineVersion');
    const engine = this._currentEngine();
    const field = this._field();
    return this._validateKeyPath(engine, engineVersion, field, this.computeKeyPath());
  }

  @instanceFnDecorator(memoizeOne)
  public _computeKeyPath(oldKp: EnginePath, value: string): EnginePath
  {
    return oldKp.push(value);
  }

  public computeKeyPath(): EnginePath
  {
    const field = this._field();
    return this._computeKeyPath(field.outputKeyPath, this.state.name);
  }

  public renderInner()
  {
    const { isValid, message } = this.validateKeyPath();
    return (
      <div className='add-field-modal-wrapper'>
        <Autocomplete
          value={this.state.name}
          options={emptyList}
          onChange={this._setStateWrapper('name')}
          help={message}
          helpIsError={!isValid}
        />
      </div>
    );
  }

  public render()
  {
    const { isValid, message } = this.validateKeyPath();
    return (
      <Modal
        open={this.props.fieldId !== null}
        title='Add Field'
        onClose={this.closeModal}
        onConfirm={this.onConfirm}
        confirm={true}
        closeOnConfirm={true}
        confirmDisabled={!isValid}
      >
        {this.renderInner()}
      </Modal>
    );
  }

  public closeModal()
  {
    this.props.act({
      actionType: 'setDisplayState',
      state: {
        addFieldId: null,
      },
    });
  }

  public onConfirm()
  {
    this._proxy().addNewField(this.computeKeyPath());
  }
}

const AddFieldModal = Util.createTypedContainer(
  AddFieldModalC,
  mapStateKeys,
  mapDispatchKeys,
);
