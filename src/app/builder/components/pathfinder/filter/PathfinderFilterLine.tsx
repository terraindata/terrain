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

// tslint:disable:no-var-requires restrict-plus-operands strict-boolean-expressions

import ScoreBar from 'app/builder/components/charts/ScoreBar';
import PathfinderMapComponent from 'app/builder/components/pathfinder/filter/PathfinderMapComponent';
import PahfinderText from 'app/builder/components/pathfinder/PathfinderText';
import BuilderTextbox from 'app/common/components/BuilderTextbox';
import CheckBox from 'app/common/components/CheckBox';
import DatePicker from 'app/common/components/DatePicker';
import Dropdown from 'app/common/components/Dropdown';
import { units } from 'app/common/components/MapComponent';
import { RouteSelector, RouteSelectorOption, RouteSelectorOptionSet } from 'app/common/components/RouteSelector';
import DateUtil from 'app/util/DateUtil';
import MapUtil from 'app/util/MapUtil';
import Util from 'app/util/Util';
import * as classNames from 'classnames';
import ElasticBlockHelpers from 'database/elastic/blocks/ElasticBlockHelpers';
import { List, Map } from 'immutable';
import * as _ from 'lodash';
import * as Radium from 'radium';
import * as React from 'react';
import { FieldType } from '../../../../../../shared/builder/FieldTypes';
import { backgroundColor, Colors, getStyle } from '../../../../colors/Colors';
import
{
  _DistanceValue, FilterGroup, FilterLine, PathfinderContext,
} from '../PathfinderTypes';
import TerrainComponent from './../../../../common/components/TerrainComponent';

const RemoveIcon = require('images/icon_close_8x8.svg?name=RemoveIcon');

export interface Props
{
  filterLine: FilterLine;
  canEdit: boolean;
  keyPath: KeyPath;
  pathfinderContext: PathfinderContext;
  comesBeforeAGroup: boolean; // whether this immediately proceeds a filter group
  isSoftFilter?: boolean; // does this section apply to soft filters?
  fieldOptionSet: RouteSelectorOptionSet;
  valueOptions: List<RouteSelectorOption>;
  maxBoost: number;
  onToggleOpen?: (open: boolean) => void;
  onAddScript?: (fieldName: string, lat: any, lon: any, name: string) => string;
  onDeleteScript?: (scriptName: string) => void;
  onUpdateScript?: (fieldName: string, name: string, lat?: any, lon?: any) => void;
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
  public state = {
    boost: this.props.filterLine.boost,
  };

  public componentWillReceiveProps(nextProps: Props)
  {
    this.setState({
      boost: nextProps.filterLine && nextProps.filterLine.boost,
    });
    this.updateFieldType(nextProps);
    if (nextProps.filterLine &&
      nextProps.filterLine.fieldType === FieldType.Geopoint &&
      nextProps.filterLine.comparison === 'located' &&
      nextProps.filterLine.value !== this.props.filterLine.value
    )
    {
      // UPDATE SCRIPT
    }
  }

  public componentWillMount()
  {
    this.updateFieldType(this.props);
  }

  public shouldComponentUpdate(nextProps: Props, nextState)
  {
    for (const key in nextProps)
    {
      if (key === 'comesBeforeAGroup')
      {
        if ((!nextProps.comesBeforeAGroup && this.props.comesBeforeAGroup) ||
          (nextProps.comesBeforeAGroup && !this.props.comesBeforeAGroup))
        {
          // Somestimes comesbeforeagroup changes from undefined => null => false, causes unnecessary rerender
          return true;
        }
      }
      else if (!_.isEqual(nextProps[key], this.props[key]))
      {
        return true;
      }
    }
    return !_.isEqual(this.state, nextState);
  }

  public render()
  {
    const { filterLine, canEdit, pathfinderContext } = this.props;
    const { source, pathErrorMap } = pathfinderContext;

    return (
      <div
        className={classNames({
          'pf-filter-line': true,
          // 'pf-filter-line-pre-group': this.props.comesBeforeAGroup,
        })}
        style={_.extend({},
          getStyle('alignItems', 'flex-start'),
          backgroundColor(Colors().fontWhite),
        )}
      >
        {
          this.renderPicker()
        }
        {
          this.renderBoost()
        }
      </div>
    );
  }

  private renderPicker()
  {
    const { props, state } = this;
    const fieldValue = props.filterLine.field;
    const comparisonValue = props.filterLine.comparison;
    const { pathErrorMap } = this.props.pathfinderContext;
    const valueValue = this.shouldShowValue() ? props.filterLine.value : '';
    const errorKey = JSON.stringify(this.props.keyPath);
    const errors = pathErrorMap.get(errorKey);
    // const boostValue = props.filterLine.boost;
    const values = List([
      fieldValue,
      comparisonValue,
      valueValue,
      // boostValue,
    ]);
    return (
      <RouteSelector
        getOptionSets={this.getOptionSets}
        relevantData={{
          index: (props.pathfinderContext.source.dataSource as any).index,
          fieldValue,
          comparisonValue,
          valueValue,
          fieldType: props.filterLine.fieldType,
        }}
        optionSets={this.getOptionSets() /* TODO store in state? */}
        values={values}
        onChange={this.handleFilterPickerChange}
        canEdit={props.canEdit}
        defaultOpen={fieldValue === null}
        canDelete={true}
        onDelete={this._fn(this.props.onDelete, this.props.keyPath, this.props.filterLine)}
        hideLine={true}
        autoFocus={true}
        footer={this.renderFooter()}
        showWarning={errors !== undefined}
        warningMessage={JSON.stringify(errors)}
        onToggleOpen={this.props.onToggleOpen}
        useTooltip={true}
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

  private isFieldTypeNotSet(fieldType)
  {
    if (fieldType === undefined ||
      fieldType === null ||
      fieldType === FieldType.Any ||
      isNaN(fieldType)
    )
    {
      return true;
    } else
    {
      return false;
    }
  }

  // Check if the field is defined and field type isnt (may occur when filter was created by cards)
  // Update the fieldType if necessary
  private updateFieldType(props: Props)
  {
    let fieldType = props.filterLine.fieldType;
    if (props.filterLine.field && this.isFieldTypeNotSet(fieldType))
    {
      const { schemaState, builderState, source } = props.pathfinderContext;
      const data = ElasticBlockHelpers.getTypeOfField(
        schemaState,
        builderState,
        props.filterLine.field,
        false,
        (source.dataSource as any).index,
        true);
      if (data == null)
      {
        // this could be happened when the index is ''
        return;
      }
      fieldType = data.fieldType;
      const analyzed = data.analyzed;
      let comparison = props.filterLine.comparison;
      // If the field type is date or text, update < > filters to be alpha or date
      if (String(fieldType) === String(FieldType.Date) &&
        ['less', 'lessequal', 'greater', 'greaterequal'].indexOf(comparison) !== -1)
      {
        comparison = comparison === 'less' || comparison === 'lessequal' ? 'datebefore' : 'dateafter';
      }
      else if (String(fieldType) === String(FieldType.Text) &&
        ['less', 'lessequal', 'greater', 'greaterequal'].indexOf(comparison) !== -1)
      {
        comparison = comparison === 'less' || comparison === 'lessequal' ? 'alphabefore' : 'alphaafter';
      }
      // If the field is analyzed text, make sure it is using match comparison (not term)
      if (
        String(fieldType) === String(FieldType.Text) &&
        analyzed &&
        ['equal', 'notequal'].indexOf(comparison) !== -1
      )
      {
        comparison = comparison === 'equal' ? 'contains' : 'notcontain';
      }
      // If the field is unanalyzed text, make sure it is using term comparison (not match)
      else if (
        String(fieldType) === String(FieldType.Text) &&
        !analyzed &&
        ['contains', 'notcontain'].indexOf(comparison) !== -1
      )
      {
        comparison = comparison === 'contains' ? 'equal' : 'notequal';
      }
      if (this.isFieldTypeNotSet(fieldType) === false)
      {
        // Tell the caller to re-render the line only when we successfully set the type, otherwise this generates the infinite event loop
        props.onChange(props.keyPath, props.filterLine
          .set('fieldType', parseFloat(String(fieldType)))
          .set('comparison', comparison), true);
      }
    }
  }

  private getOptionSets(): List<RouteSelectorOptionSet>
  {
    const { filterLine, canEdit, pathfinderContext, isSoftFilter } = this.props;
    const { source } = pathfinderContext;

    // TODO save to state for better runtime?
    const fieldSet = this.props.fieldOptionSet;
    let comparisonOptions = List<RouteSelectorOption>();
    let comparisonHeader = 'Choose a data field first';
    if (filterLine.field)
    {
      comparisonHeader = '';

      comparisonOptions = source.dataSource.getChoiceOptions({
        type: 'comparison',
        field: filterLine.field,
        fieldType: filterLine.fieldType,
        analyzed: filterLine.analyzed,
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
      forceFloat: true,
      // hasOther: false,
    };

    const shouldShowValue = this.shouldShowValue();
    const valueOptions = shouldShowValue && COMPARISONS_WITHOUT_OPTIONS.indexOf(filterLine.comparison) === -1
      ? this.props.valueOptions : List<RouteSelectorOption>();
    let valueHeader = '';

    if (filterLine.field && !filterLine.comparison)
    {
      valueHeader = 'Choose a method next';
    }

    const canShowValueInput = filterLine.fieldType !== FieldType.Geopoint;
    const valueSet: RouteSelectorOptionSet = {
      key: 'value',
      options: valueOptions,
      shortNameText: 'Value',
      headerText: valueHeader,
      column: true,
      hideSampleData: true,
      hasOther: shouldShowValue && canShowValueInput ? true : false, // for now, hide other manually
      focusOtherByDefault: true,
      getValueComponent: this.renderValueComponent(),
      getCustomDisplayName: this._fn(getCustomValueDisplayName, this.props.filterLine),
      forceFloat: true,
      showOptionsOnOther: filterLine.fieldType === FieldType.Date,
    };

    const sets = [
      fieldSet,
      comparisonSet,
      valueSet,
    ];

    // if (this.props.isSoftFilter)
    // {
    //   const boostSet: RouteSelectorOptionSet = {
    //     key: 'boost',
    //     options: BoostOptions, //lk
    //     shortNameText: 'Boost',
    //     headerText: 'Weight this match criteria',
    //     column: true,
    //     hideSampleData: true,
    //     hasOther: true,
    //   };
    //   sets.push(boostSet);
    // }

    return List(sets);
  }

  private handleFilterPickerChange(optionSetIndex: number, value: any)
  {
    const { props } = this;
    const { source } = props.pathfinderContext;

    switch (optionSetIndex)
    {
      case 0:
        // TODO get from state?
        const fieldOptions = this.props.fieldOptionSet.options;
        const fieldChoice = fieldOptions.find((option) => option.value === value);
        this.handleChange(
          'field',
          value,
          (fieldChoice as any).meta,
          true,
        );
        return;

      case 1:
        this.handleChange('comparison', value);
        return;

      case 2:
        this.handleChange('value', value);
        return;

      case 3:
        this.handleChange('boost', value);
        return;

      default:
        throw new Error('Unrecognized option set index in PathfinderFilterLine: ' + optionSetIndex);
    }
  }

  private handleBoostChange(value)
  {
    this.setState({
      boost: value,
    });
  }

  private handleBoostFinish(value)
  {
    this.setState({
      boost: value,
    });
    this.props.onChange(this.props.keyPath, this.props.filterLine.set('boost', value));
  }

  private renderBoost()
  {
    if (!this.props.isSoftFilter)
    {
      return null;
    }
    const { filterLine, maxBoost, pathfinderContext } = this.props;

    // if (filterLine.field === null || filterLine.fieldType === null || filterLine.comparison === null)
    // {
    //   return null;
    // }

    return (
      <div className='pathfinder-filter-boost'>
        <ScoreBar
          weight={this.state.boost}
          onBeforeChange={_.noop}
          onChange={this.handleBoostChange}
          onAfterChange={this.handleBoostFinish}
          altStyle={true}
          max={Math.max(this.state.boost, maxBoost)}
          min={0}
          step={0.1}
          round={true}
          canEdit={pathfinderContext.canEdit}
        />
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

    if (!this.shouldShowValue())
    {
      return undefined;
    }

    const comparisonOptions = source.dataSource.getChoiceOptions({
      type: 'comparison',
      field: filterLine.field,
      fieldType: filterLine.fieldType,
      source,
      schemaState: pathfinderContext.schemaState,
      builderState: pathfinderContext.builderState,
      analyzed: filterLine.analyzed,
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
        return ( // value will be injected by RouteSelector
          (props: { value: any }) =>
          {
            const value = _DistanceValue(Util.asJS(props.value));
            return (
              <div className='pf-filter-map-input-wrapper'>
                <div className='pf-filter-map-inputs'>
                  <BuilderTextbox
                    value={value.distance}
                    canEdit={pathfinderContext.canEdit}
                    onChange={this._fn(this.handleMapValueChange, 'distance')}
                    placeholder={'Distance'}
                  />
                  <Dropdown
                    options={List(_.keys(units))}
                    selectedIndex={_.keys(units).indexOf(value.units)}
                    canEdit={pathfinderContext.canEdit}
                    optionsDisplayName={Map(units)}
                    onChange={this._fn(this.handleMapValueChange, 'units')}
                    openDown={true}
                  />
                </div>
                <PathfinderMapComponent
                  data={value}
                  filterLine={this.props.filterLine}
                  onChange={this.handleMapChange}
                  keyPath={this.props.keyPath}
                  canEdit={pathfinderContext.canEdit}
                  options={this.props.valueOptions && this.props.valueOptions.map((opt) => opt.value).toList()}
                />
              </div>
            );
          }
        );
      case FieldType.Ip:
        return () => (
          <div>IP not supported yet</div>
        );
      case FieldType.Nested:
      default:
        return (() => <div></div>); // Nested, can only handle exists, so there is no value
    }
  }

  private getScriptParams(value)
  {
    let lat;
    let lon;
    if ((value as any).location)
    {
      const point = MapUtil.getCoordinatesFromGeopoint((value as any).location);
      lat = point[0];
      lon = point[1];
    }
    else if ((value as any).address)
    {
      lat = (value as any).address + '.lat';
      lon = (value as any).address + '.lon';
    }
    return { lat, lon };
  }

  private handleMapChange(keyPath: KeyPath, filterLine: FilterLine)
  {
    // If this distance card is involved in a distance script, need to update that script
    if (filterLine.addScript && this.props.onUpdateScript)
    {
      const { lat, lon } = this.getScriptParams(filterLine.value);
      this.props.onUpdateScript(filterLine.field, filterLine.scriptName, lat, lon);
    }
    this.props.onChange(keyPath, filterLine);
  }

  private handleMapValueChange(key, value)
  {
    if (key === 'units')
    {
      value = _.keys(units)[value];
    }
    let filterLine;
    if (this.props.filterLine.value &&
      this.props.filterLine.value[key] !== undefined)
    {
      filterLine = this.props.filterLine
        .setIn(['value', key], value);
    }
    else
    {
      filterLine = this.props.filterLine
        .set('value', _DistanceValue({ [key]: value }));
    }
    this.props.onChange(this.props.keyPath, filterLine, false, false);
  }

  private handleAddScriptChange()
  {
    const { filterLine } = this.props;
    // Add or remove the script
    if (!filterLine.addScript)
    {
      // Pull out the parameters
      const { lat, lon } = this.getScriptParams(filterLine.value);
      if (this.props.onAddScript)
      {
        const scriptName = this.props.onAddScript(filterLine.field, lat, lon, 'distance');
        this.props.onChange(
          this.props.keyPath,
          filterLine
            .set('scriptName', scriptName)
            .set('addScript', true));
      }
    }
    else
    {
      if (this.props.onDeleteScript)
      {
        this.props.onDeleteScript(filterLine.scriptName);
      }
      this.props.onChange(this.props.keyPath,
        filterLine
          .set('addScript', false)
          .set('scriptName', ''));

    }
  }

  private renderFooter()
  {
    const { filterLine } = this.props;
    if (filterLine && filterLine.field && filterLine.comparison && filterLine.fieldType)
    {
      if (filterLine.fieldType === FieldType.Geopoint && filterLine.comparison === 'located')
      {
        return (
          <div className='pf-filter-line-distance-footer'>
            <CheckBox
              checked={filterLine.addScript}
              onChange={this.handleAddScriptChange}
              disabled={!this.props.pathfinderContext.canEdit}
              label={PahfinderText.includeDistanceExplanation}
            />
            {
              filterLine.scriptName &&
              <span>
                (Returned as {filterLine.scriptName})
              </span>
            }
          </div>
        );
      }
    }
    return null;
  }

  private handleChange(key, value, meta?, fieldChange?)
  {
    if (key === 'value')
    {
      const t = this.props.filterLine.fieldType;
      if (t === FieldType.Date)
      {
        const valueString = String(value || '');
        const date = Util.formatInputDate(valueString, 'elastic');
        if (date)
        {
          value = date;
        }
      }
    }
    let filterLine = this.props.filterLine.set(key, value);
    const { pathfinderContext } = this.props;
    const { source } = pathfinderContext;
    if (key === 'field')
    {
      const fieldType = (meta && meta.fieldType !== undefined) ? meta.fieldType : FieldType.Any;
      const analyzed = (meta && meta.analyzed) || true;
      filterLine = filterLine
        .set('fieldType', fieldType)
        .set('analyzed', analyzed);
      // this code picks a default comparison to use
      const comparisonOptions = source.dataSource.getChoiceOptions({
        type: 'comparison',
        field: filterLine.field,
        fieldType,
        analyzed,
        source,
        schemaState: pathfinderContext.schemaState,
        builderState: pathfinderContext.builderState,
      });
      if (comparisonOptions.findIndex((option) => option.value === filterLine.comparison) === -1
        && comparisonOptions.size)
      {
        filterLine = filterLine.set('comparison', null); // comparisonOptions.get(0).value);
      }
      // If the field changed, the comparison was 'located', and the addScript is true, need to update script
      if (filterLine.comparison === 'located' && filterLine.addScript && this.props.onUpdateScript)
      {
        this.props.onUpdateScript(filterLine.field, filterLine.scriptName);
      }
    }
    this.props.onChange(this.props.keyPath, filterLine, false, fieldChange);
  }

}

export const COMPARISONS_WITHOUT_VALUES = [
  'exists',
  'notexists',
];

export const COMPARISONS_WITHOUT_OPTIONS = [
  'datebefore',
  'dateafter',
  'located',
];

export function getCustomValueDisplayName(filterLine: FilterLine, value, setIndex: number)
{
  if (COMPARISONS_WITHOUT_VALUES.indexOf(filterLine.comparison) !== -1)
  {
    return '--';
  }
  switch (filterLine.fieldType)
  {
    case FieldType.Date:
      if (!value)
      {
        return '';
      }
      return (value !== undefined && DateUtil.formatDateValue(value.replace(/ /g, '')));
    case FieldType.Geopoint:
      value = _DistanceValue(Util.asJS(value));
      return value.distance + ' ' + units[value.units] + ' of ' + value.address;
    default:
      return value;
  }
}

export default PathfinderFilterLine;
