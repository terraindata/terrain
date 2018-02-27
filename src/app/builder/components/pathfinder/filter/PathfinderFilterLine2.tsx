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

// tslint:disable:no-var-requires restrict-plus-operands strict-boolean-expressions

import * as classNames from 'classnames';
import * as Immutable from 'immutable';
import * as $ from 'jquery';
import * as _ from 'lodash';
import * as Radium from 'radium';
import * as React from 'react';
import { altStyle, backgroundColor, borderColor, Colors, fontColor } from '../../../../colors/Colors';
import TerrainComponent from './../../../../common/components/TerrainComponent';
const { List, Map } = Immutable;
import AdvancedDropdown from 'app/common/components/AdvancedDropdown';
import Autocomplete from 'app/common/components/Autocomplete';
import BuilderTextbox from 'app/common/components/BuilderTextbox';
import DatePicker from 'app/common/components/DatePicker';
import Dropdown from 'app/common/components/Dropdown';
import MapComponent, { units } from 'app/common/components/MapComponent';
import Util from 'app/util/Util';
import { FieldType } from '../../../../../../shared/builder/FieldTypes';
import { PathfinderLine, PathfinderPiece } from '../PathfinderLine';
import { _DistanceValue, DistanceValue, FilterGroup, FilterLine, Path, PathfinderContext, Source } from '../PathfinderTypes';
import { RouteSelector, RouteSelectorOptionSet, RouteSelectorOption } from 'app/common/components/RouteSelector';
const RemoveIcon = require('images/icon_close_8x8.svg?name=RemoveIcon');

export interface Props
{
  filterLine: FilterLine;
  canEdit: boolean;
  depth: number;
  keyPath: KeyPath;
  pathfinderContext: PathfinderContext;
  onChange(keyPath: KeyPath, filter: FilterGroup | FilterLine, notDirty?: boolean, fieldChange?: boolean);
  onDelete(keyPath: KeyPath);
}

const pieceStyle = {
  'padding': '12px 18px',
  'background': '#f2f4f7',
  'color': '#42474f',
  'margin': 6,

  ':hover': {
    background: Colors().active,
    color: Colors().activeText,
  },
};

@Radium
class PathfinderFilterLine extends TerrainComponent<Props>
{
  public state: {

  } = {

    };

  public render()
  {
    const { filterLine, canEdit, pathfinderContext, depth } = this.props;
    const { source } = pathfinderContext;

    return (
      <div
        className='pf-filter-line flex-container'
        style={{
          alignItems: 'flex-start',
        }}
      >
        {
          this.renderPicker()
        }
        {/*{
          this.renderField()
        }
        {
          this.renderMethod()
        }
        {
          this.renderValue()
        }*/}
        {/*{
          this.renderBoost()
        }
        {
          <div
            className='close'
            onClick={this.props.onDelete && this._fn(this.props.onDelete, this.props.keyPath)}
          >
            <RemoveIcon />
          </div>
        }*/}
      </div>
    );
  }
  
  private renderPicker()
  {
    const { props, state} = this;
    
    const fieldValue = props.filterLine.field;
    const comparisonValue = props.filterLine.comparison;
    const valueValue = this.shouldShowValue() ? props.filterLine.value : '';
    const values = List([
      fieldValue,
      comparisonValue,
      valueValue,
    ]);
    
    return (
      <RouteSelector
        optionSets={this.getOptionSets() /* TODO store in state? */}
        values={values}
        onChange={this.handleFilterPickerChange}
        canEdit={props.canEdit}
        defaultOpen={fieldValue === null}
      />
    );
  }
  
  private shouldShowValue(): boolean
  {
    const { filterLine } = this.props;

    if (!filterLine.field || !filterLine.comparison)
    {
      return false;
    }
    
    if (COMPARISONS_WITHOUT_VALUES.indexOf(filterLine.comparison) !== -1)
    {
      return false;
    }
    
    return true;
  }
  
  private getOptionSets(): List<RouteSelectorOptionSet>
  {
    const { filterLine, canEdit, pathfinderContext, depth } = this.props;
    const { source } = pathfinderContext;

    // TODO save to state for better runtime?
    const fieldOptions = source.dataSource.getChoiceOptions({
      type: 'fields',
      source,
      schemaState: pathfinderContext.schemaState,
      builderState: pathfinderContext.builderState,
    });
    
    const fieldSet: RouteSelectorOptionSet = {
      key: 'field',
      options: fieldOptions,
      shortNameText: 'Data Field',
      headerText: '', // 'Choose on which field to impose a condition',
      column: true,
      hideSampleData: true,
      hasSearch: true,
      // hasOther: false,
    };
    
    let comparisonOptions = List<RouteSelectorOption>();
    let comparisonHeader = 'Choose a data field first';
    if (filterLine.field)
    {
      comparisonHeader = '';
      
      comparisonOptions = source.dataSource.getChoiceOptions({
        type: 'comparison',
        field: filterLine.field,
        fieldType: filterLine.fieldType,
        source,
        schemaState: pathfinderContext.schemaState,
        builderState: pathfinderContext.builderState,
      });
      comparisonOptions = comparisonOptions.map((option) =>
      {
        option = option['toJS'](); // TODO perhaps a better conversion between ChoiceOption and RouteOption
        if (COMPARISONS_WITHOUT_VALUES.indexOf(option.value) !== -1)
        {
          // comparisons without values should close the picker when selected
          option.closeOnPick = true;
        }
        return option;
      }).toList();
    }
    
    const comparisonSet: RouteSelectorOptionSet = {
      key: 'comparison',
      options: comparisonOptions,
      shortNameText: 'Condition',
      headerText: comparisonHeader,
      column: true,
      hideSampleData: true,
      // hasOther: false,
    };
    
    
    let valueOptions = List<RouteSelectorOption>();
    let valueHeader = '';
    const shouldShowValue = this.shouldShowValue();
      
    if (shouldShowValue)
    {
      // TODO add more value options
      // TODO add value component selector for Other
      valueOptions = pathfinderContext.source.dataSource.getChoiceOptions({
        type: 'input',
        builderState: pathfinderContext.builderState,
      });
    }
    else if(filterLine.field && !filterLine.comparison)
    {
      valueHeader = 'Choose a method next';
    }
    
    const canShowValueInput = filterLine.fieldType !== FieldType.Geopoint;
    // LK
    const valueSet: RouteSelectorOptionSet = {
      key: 'value',
      options: valueOptions,
      shortNameText: shouldShowValue ? 'Value' : '',
      headerText: valueHeader,
      column: true,
      hideSampleData: true,
      hasOther: shouldShowValue && canShowValueInput ? true : false, // for now, hide other manually
      focusOtherByDefault: true,
      getValueComponent: this.renderValueComponent(),
      getCustomDisplayName: this.getCustomValueDisplayName,
      // otherComponent: TODO,
    };
    
    
    return List([
      fieldSet,
      comparisonSet,
      valueSet,
      // boostSet?
    ]);
  }
  
  private getCustomValueDisplayName(value, setIndex: number)
  {
    switch (this.props.filterLine.fieldType)
    {
      case FieldType.Date:
        if (!value)
        {
          return '';
        }
        
        return Util.formatDate(value, true);
    }
    
    return undefined;
  }
  
  private handleFilterPickerChange(optionSetIndex: number, value: any)
  {
    const { props } = this;
    const { source } = props.pathfinderContext;
    
    switch (optionSetIndex)
    {
      case 0:
        // TODO get from state?
        const fieldOptions = source.dataSource.getChoiceOptions({
          type: 'fields',
          source,
          schemaState: props.pathfinderContext.schemaState,
          builderState: props.pathfinderContext.builderState,
        });
        const fieldChoice = fieldOptions.find((option) => option.value === value);
        this.handleChange('field', value, fieldChoice.meta.fieldType, true);
        return;
        
      case 1:
        this.handleChange('comparison', value);
        return;
        
      case 2:
        this.handleChange('value', value);
        return;
    }
    
    throw new Error('Unrecognized option set index in PathfinderFilterLine: ' + optionSetIndex);
  }

  // private renderField()
  // {
  //   const { filterLine, canEdit, pathfinderContext, depth } = this.props;
  //   const { source } = pathfinderContext;

  //   const options = source.dataSource.getChoiceOptions({
  //     type: 'fields',
  //     source,
  //     schemaState: pathfinderContext.schemaState,
  //   });
    
  //   return (
  //     <RouteSelector
  //       value={filterLine.field}
  //       onChange={this.handleFieldChange}
  //       options={options}
  //       canEdit={canEdit}
  //       shortNameText={'Field'}
  //       headerText={'Pick the field on which you want to impose some condition'}
  //       hasOther={false}
  //     />
  //   );
  // }

  private addBoost()
  {
    this.props.onChange(this.props.keyPath, this.props.filterLine.set('weightSet', true));
  }

  private handleBoostChange(e)
  {
    this.props.onChange(this.props.keyPath, this.props.filterLine.set('weight', e.target.value));
  }

  private renderBoost()
  {
    const { filterLine, pathfinderContext } = this.props;
    if (filterLine.field === null || filterLine.fieldType === null || filterLine.comparison === null)
    {
      return null;
    }
    return (
      <div>
        {
          !filterLine.weightSet ?
            <div onClick={this.addBoost} className='pf-filter-add-boost'>
              Add Boost
          </div>
            :
            <div className='pf-filter-boost'>
              <span>Boost:</span>
              <input
                value={filterLine.weight}
                type='number'
                min={0}
                step={1}
                onChange={this.handleBoostChange}
              />
            </div>
        }
      </div>
    );
  }

  // some data types have a better way to enter the value than with a 
  //  textbox and list of options (e.g., dates and maps)
  // this returns those components for those data types
  private renderValueComponent()
  {
    const { filterLine, pathfinderContext } = this.props;
    const { source } = pathfinderContext;

    if (filterLine.field === null || filterLine.fieldType === null)
    {
      return null;
    }
    
    const comparisonOptions = source.dataSource.getChoiceOptions({
      type: 'comparison',
      field: filterLine.field,
      fieldType: filterLine.fieldType,
      source,
      schemaState: pathfinderContext.schemaState,
      builderState: pathfinderContext.builderState,
    });
    
    switch (filterLine.fieldType)
    {
      case FieldType.Numerical:
      case FieldType.Text:
      case FieldType.Any:
        // Already rendered in RouteSelector "other" textbox
        return null;

      case FieldType.Date:
        // return null;
        return ( // value will be injected by RouteSelector
          (props: { value: any }) =>
            <DatePicker
              canEdit={pathfinderContext.canEdit}
              language={'elastic'}
              format='MM/DD/YYYY h:mma'
              date={String(props.value)}
              onChange={this._fn(this.handleChange, 'value')}
            />
        );

      case FieldType.Geopoint:
        let value = filterLine.value as DistanceValue;
        if (filterLine.value === null)
        {
          value = _DistanceValue();
          this.handleChange('value', value);
        }
        return ( // value will be injected by RouteSelector
          (props: { value: any }) =>
            <div className='pf-filter-map-input-wrapper'>
              <div className='pf-filter-map-inputs'>
                <BuilderTextbox
                  value={value.distance}
                  canEdit={pathfinderContext.canEdit}
                  keyPath={this.props.keyPath.push('value').push('distance')}
                  action={this.props.onChange}
                  placeholder={'Distance'}
                />
                <Dropdown
                  options={List(_.keys(units))}
                  selectedIndex={_.keys(units).indexOf(value.units)}
                  canEdit={pathfinderContext.canEdit}
                  optionsDisplayName={Map(units)}
                  keyPath={this.props.keyPath.push('value').push('units')}
                  action={this.props.onChange}
                />
              </div>
              
              <MapComponent
                geocoder='photon'
                inputValue={props.value && props.value.address}
                coordinates={props.value && props.value.location !== undefined ? props.value.location : [0, 0]}
                distance={props.value && props.value.distance}
                distanceUnit={props.value && props.value.units}
                wrapperClassName={'pf-filter-map-component-wrapper'}
                fadeInOut={true}
                onChange={this.handleMapChange}
                canEdit={pathfinderContext.canEdit}
              />
            </div>
        );
        );

      case FieldType.Ip:
        return () => (
          <div>IP not supported yet</div>
        );

      default:
        throw new Error('No value type handler for ' + filterLine.valueType);
    }
  }

  private handleMapChange(coordinates, inputValue)
  {
    const filterLine = this.props.filterLine
      .setIn(List(['value', 'location']), coordinates)
      .setIn(List(['value', 'address']), inputValue);
    this.props.onChange(this.props.keyPath, filterLine, false, false);
  }

  private handleChange(key, value, fieldType?, fieldChange?)
  {
    let filterLine = this.props.filterLine.set(key, value);
    const { pathfinderContext } = this.props;
    const { source } = pathfinderContext;
    if (key === 'field')
    {
      filterLine = filterLine.set('fieldType', fieldType);
      // this code picks a default comparison to use
      const comparisonOptions = source.dataSource.getChoiceOptions({
        type: 'comparison',
        field: filterLine.field,
        fieldType,
        source,
        schemaState: pathfinderContext.schemaState,
        builderState: pathfinderContext.builderState,
      });

      if (comparisonOptions.findIndex((option) => option.value === filterLine.comparison) === -1
        && comparisonOptions.size)
      {
        filterLine = filterLine.set('comparison', null); // comparisonOptions.get(0).value);
      }
    }

    this.props.onChange(this.props.keyPath, filterLine, false, fieldChange);
  }
}

const COMPARISONS_WITHOUT_VALUES = [
  'exists',
];

export default PathfinderFilterLine;
