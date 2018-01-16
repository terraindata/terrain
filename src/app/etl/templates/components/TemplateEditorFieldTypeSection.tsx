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
// tslint:disable:import-spacing strict-boolean-expressions
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

import CheckBox from 'common/components/CheckBox';
import Dropdown from 'common/components/Dropdown';
import { TemplateEditorActions } from 'etl/templates/data/TemplateEditorRedux';
import { _TemplateField, ElasticFieldSettings, TemplateEditorState, TemplateField } from 'etl/templates/TemplateTypes';
import { ELASTIC_TYPES, TEMPLATE_TYPES } from 'shared/etl/templates/TemplateTypes';

import { TemplateEditorField, TemplateEditorFieldProps } from './TemplateEditorField';
import './TemplateEditorField.less';

export interface Props extends TemplateEditorFieldProps
{
  // below from container
  templateEditor?: TemplateEditorState;
  act?: typeof TemplateEditorActions;
}

@Radium
class TemplateEditorFieldTypeSection extends TemplateEditorField<Props>
{
  constructor(props)
  {
    super(props);

    this._getTypeListIndex = _.memoize(this._getTypeListIndex);
    this.handleChangeArrayType = _.memoize(this.handleChangeArrayType);
  }

  // memoized
  public _getTypeListIndex(type): number
  {
    return elasticTypeOptions.indexOf(type);
  }

  public getDataTypeListIndex(): number
  {
    return this._getTypeListIndex(this.props.field.langSettings.type);
  }

  public getArrayTypeListIndex(arrayTypeIndex): number
  {
    return this._getTypeListIndex(this.props.field.langSettings.arrayType.get(arrayTypeIndex));
  }

  public setLangSettings<K extends keyof ElasticFieldSettings>(key: K, value: ElasticFieldSettings[K])
  {
    this._set('langSettings', this.props.field.langSettings.set(key, value));
  }

  public renderAnalyzerSection()
  {
    const { field } = this.props;
    const inputDisabled = this._inputDisabled();

    const analyzedCheckbox = (
      <CheckBox
        checked={field.langSettings.isAnalyzed}
        onChange={voidFunction}
        disabled={inputDisabled}
      />
    );

    const showAnalyzer = field.langSettings.isAnalyzed;

    return (
      <div
        className='tef-checkbox-section'
        style={field.langSettings.isAnalyzed ? fontColor(Colors().text2) : fontColor(Colors().text3)}
        onClick={this._noopIfDisabled(this.handleAnalyzedCheckboxClicked)}
      >
        <div className='tef-checkbox-spacer'> {analyzedCheckbox} </div>
        <div className='type-section-label label-right'> Analyze </div>
      </div>
    );
  }

  public renderArrayTypeSection()
  {
    const { field } = this.props;
    const inputDisabled = this._inputDisabled();

    return field.langSettings.arrayType.flatMap((value, i) =>
    {
      const arrayTypeDropdown = (
        <Dropdown
          options={elasticTypeOptions}
          selectedIndex={this.getArrayTypeListIndex(i)}
          canEdit={!inputDisabled}
          onChange={this.handleChangeArrayType(i)}
        />
      );
      return List([
        <div className='type-section-label' key={`of ${i}`}> of </div>,
        <div className='type-dropdown-spacer' key={`dropdown ${i}`}> {arrayTypeDropdown} </div>,
      ]);
    });
  }

  public render()
  {
    const { field } = this.props;
    const inputDisabled = this._inputDisabled();

    const fieldTypeDropdown = (
      <Dropdown
        options={elasticTypeOptions}
        selectedIndex={this.getDataTypeListIndex()}
        canEdit={!inputDisabled}
        onChange={this.handleChangeDataType}
      />
    );

    const showArrayTypeSection = field.langSettings.type === ELASTIC_TYPES.ARRAY;
    const showAnalyzedSection = field.langSettings.type === ELASTIC_TYPES.TEXT ||
      (
        field.langSettings.type === ELASTIC_TYPES.ARRAY &&
        field.langSettings.arrayType.size > 0 &&
        field.langSettings.arrayType.get(field.langSettings.arrayType.size - 1) === ELASTIC_TYPES.TEXT
      );
    // TODO make it show only for import

    return (
      <div className='template-editor-type-section'>
        <div className='type-section-label' style={getStyle('paddingRight', '12px')}> Type </div>
        <div className='type-dropdown-spacer'> {fieldTypeDropdown} </div>
        {showArrayTypeSection && this.renderArrayTypeSection().map((v, i) => v)}
        {showAnalyzedSection && this.renderAnalyzerSection()}
      </div>
    );
  }

  public handleChangeDataType(index)
  {
    if (index >= elasticTypeOptions.size || index < 0)
    {
      return;
    }
    const { field, act } = this.props;
    const nextType = elasticTypeOptions.get(index);
    const currentType = this.props.field.langSettings.type;
    if (currentType === ELASTIC_TYPES.ARRAY && nextType !== ELASTIC_TYPES.ARRAY)
    { // if user changes type from array, clear the array type
      this.setLangSettings('arrayType', List([ELASTIC_TYPES.TEXT]));
      this.setLangSettings('type', elasticTypeOptions.get(index));
    }
    else if (isNested(currentType, field.langSettings.arrayType)
      && !isNested(nextType, field.langSettings.arrayType) && field.children.size > 0)
    { // if user changes type from nested to something else and there are children, then show a warning
      const deferredAction = () =>
      {
        this._clearChildren();
        this.setLangSettings('type', elasticTypeOptions.get(index));
      };
      act({
        actionType: 'addModalConfirmation',
        props: {
          title: 'Confirm Action',
          message: `Changing this type will remove ${field.children.size} nested fields. Would you like to continue?`,
          onConfirm: deferredAction,
          confirm: true,
        },
      });
    }
    else
    {
      this.setLangSettings('type', elasticTypeOptions.get(index));
    }
  }

  // memoized
  public handleChangeArrayType(arrayTypeIndex: number)
  {
    return (index: number) =>
    {
      if (arrayTypeIndex >= this.props.field.langSettings.arrayType.size
        || arrayTypeIndex < 0
        || index >= elasticTypeOptions.size
        || index < 0)
      {
        return;
      }
      else
      {
        const { field, act } = this.props;
        const newArray = cleanArrayType(field.langSettings.arrayType.set(arrayTypeIndex, elasticTypeOptions.get(index)));
        if (!isNested(field.langSettings.type, newArray) && field.children.size > 0)
        {
          const deferredAction = () =>
          {
            this._clearChildren();
            this.setLangSettings('arrayType', newArray);
          };
          act({
            actionType: 'addModalConfirmation',
            props: {
              title: 'Confirm Action',
              message: `Changing this type will remove ${field.children.size} nested fields. Would you like to continue?`,
              onConfirm: deferredAction,
              confirm: true,
            },
          });
        }
        else
        {
          this.setLangSettings('arrayType', newArray);
        }
      }
    };
  }

  public handleAnalyzedCheckboxClicked()
  {
    this.setLangSettings('isAnalyzed', !this.props.field.langSettings.isAnalyzed);
  }

}

const elasticTypeOptions = List([
  ELASTIC_TYPES.TEXT,
  ELASTIC_TYPES.LONG,
  ELASTIC_TYPES.BOOLEAN,
  ELASTIC_TYPES.DATE,
  ELASTIC_TYPES.ARRAY,
  ELASTIC_TYPES.NESTED,
  ELASTIC_TYPES.DOUBLE,
  ELASTIC_TYPES.SHORT,
  ELASTIC_TYPES.BYTE,
  ELASTIC_TYPES.INTEGER,
  ELASTIC_TYPES.HALF_FLOAT,
  ELASTIC_TYPES.FLOAT,
  ELASTIC_TYPES.GEO_POINT,
]);

const elasticAnalyzerOptions = List([
  'standard',
  'test analyzer',
  'test analyzer 2',
]); // this is just a placeholder

// returns true if type or arrayType are nested
function isNested(type: ELASTIC_TYPES, arrayType: List<ELASTIC_TYPES>)
{
  return type === ELASTIC_TYPES.NESTED || (arrayType && arrayType.last() === ELASTIC_TYPES.NESTED);
}

/*
 * Turns [] into [text]
 * Turns [array, array] into [array, array, text]
 * Turns [array, array, text, array] into [array, array, text]
 */
function cleanArrayType(arrayType: List<ELASTIC_TYPES>)
{
  let cutIndex = -1;
  let newArrayType = arrayType;
  arrayType.forEach((value, index) =>
  {
    if (value !== ELASTIC_TYPES.ARRAY)
    {
      cutIndex = index + 1;
      return false;
    }
  });
  if (cutIndex !== -1 && cutIndex < arrayType.size)
  {
    newArrayType = arrayType.slice(0, cutIndex).toList();
  }
  if (newArrayType.size === 0 || newArrayType.last() === ELASTIC_TYPES.ARRAY)
  {
    newArrayType = newArrayType.push(ELASTIC_TYPES.TEXT);
  }
  return newArrayType;
}

const voidFunction = () => { /* do nothing */ };

export default Util.createTypedContainer(
  TemplateEditorFieldTypeSection,
  ['templateEditor'],
  { act: TemplateEditorActions },
);
