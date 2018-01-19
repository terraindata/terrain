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
import * as React from 'react';
import { altStyle, backgroundColor, borderColor, Colors, fontColor } from '../../../../colors/Colors';
import TerrainComponent from './../../../../common/components/TerrainComponent';
const { List, Map } = Immutable;
import AdvancedDropdown from 'app/common/components/AdvancedDropdown';
import Autocomplete from 'app/common/components/Autocomplete';
import BuilderTextbox from 'app/common/components/BuilderTextbox';
import DatePickerWrapper from 'app/common/components/DatePickerWrapper';
import Dropdown from 'app/common/components/Dropdown';
import MapComponent, { units } from 'app/common/components/MapComponent';
import Util from 'app/util/Util';
import { PathfinderLine, PathfinderPiece } from '../PathfinderLine';
import { _DistanceValue, DistanceValue, FilterGroup, FilterLine, Path, PathfinderContext, Source } from '../PathfinderTypes';

export interface Props
{
  filterLine: FilterLine;
  canEdit: boolean;
  depth: number;
  keyPath: KeyPath;
  pathfinderContext: PathfinderContext;
  onChange(keyPath: KeyPath, filter: FilterGroup | FilterLine);
  onDelete(keyPath: KeyPath);
}

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
      <PathfinderLine
        canDelete={canEdit}
        canDrag={true}
        canEdit={canEdit}
        onDelete={this._fn(this.props.onDelete, this.props.keyPath)}
        depth={depth}
        pieces={List([
          <AdvancedDropdown
            options={source.dataSource.getChoiceOptions({
              type: 'fields',
              source,
              schemaState: pathfinderContext.schemaState,
            })}
            value={filterLine.field}
            canEdit={pathfinderContext.canEdit}
            onChange={this._fn(this.handleChange, 'field')}
            placeholder={'Choose field'}
          />,
          {
            content:
              <AdvancedDropdown
                options={source.dataSource.getChoiceOptions({
                  type: 'comparison',
                  field: filterLine.field,
                  source,
                  schemaState: pathfinderContext.schemaState,
                })}
                value={filterLine.comparison}
                canEdit={pathfinderContext.canEdit}
                onChange={this._fn(this.handleChange, 'comparison')}
                placeholder={'Choose comparison'}
              />,
            visible: filterLine.field !== null,
          },
          {
            content:
              this.renderValue(),
            visible: filterLine.comparison !== null,
          },
        ])}
      />
    );
  }

  private renderValue()
  {
    const { filterLine, pathfinderContext } = this.props;
    const valueTypes = pathfinderContext.source.dataSource.getChoiceOptions({
      type: 'valueType',
      field: filterLine.field,
      comparison: filterLine.comparison,
      source: pathfinderContext.source,
      schemaState: pathfinderContext.schemaState,
    });
    if (valueTypes.size !== 1)
    {
      throw new Error('Zero / Multiple filter valueTypes not supported yet.');
    }
    switch (valueTypes.get(0).value)
    {
      case 'text':
      case 'number':
      case 'auto':
        if (Array.isArray(filterLine.value))
        {
          return <div>Arrays not supported</div>;
        }
        return (
          <Autocomplete
            options={pathfinderContext.source.dataSource.getChoiceOptions({
              type: 'input',
            }).map((c) => c.value).toList()}
            value={filterLine.value as string | number}
            onChange={this._fn(this.handleChange, 'value')}
            disabled={!pathfinderContext.canEdit}
          />
        );

      case 'date':
        return (
          <DatePickerWrapper
            date={String(filterLine.value)}
            onChange={this._fn(this.handleChange, 'value')}
            canEdit={pathfinderContext.canEdit}
            language={'elastic'}
            format='MM/DD/YYYY h:mma'
          />
        );

      case 'location':
      case 'distance':
        let value = filterLine.value as DistanceValue;
        if (filterLine.value === null)
        {
          value = _DistanceValue();
          this.handleChange('value', value);
        }
        return (
          <div className='pf-filter-map-input-wrapper'>
            <BuilderTextbox
              value={value.distance}
              canEdit={pathfinderContext.canEdit}
              keyPath={this.props.keyPath.push('value').push('distance')}
              action={this.props.onChange}
            />
            <Dropdown
              options={List(_.keys(units))}
              selectedIndex={_.keys(units).indexOf(value.units)}
              canEdit={pathfinderContext.canEdit}
              optionsDisplayName={Map(units)}
              keyPath={this.props.keyPath.push('value').push('units')}
              action={this.props.onChange}
            />
            <MapComponent
              address={value.address}
              location={value.location}
              markLocation={true}
              showSearchBar={true}
              zoomControl={true}
              keepAddressInSync={false}
              geocoder='google'
              keyPath={this.props.keyPath.push('value').push('location')}
              textKeyPath={this.props.keyPath.push('value').push('address')}
              hideSearchSettings={true}
              showDistanceCircle={true}
              distance={value.distance}
              distanceUnit={value.units}
              wrapperClassName={'pf-filter-map-component-wrapper'}
              fadeInOut={true}
              action={this.props.onChange}
            />
          </div>
        );
      case 'input':
        return (
          <AdvancedDropdown
            options={pathfinderContext.source.dataSource.getChoiceOptions({
              type: 'input',
            })}
            value={filterLine.value}
            canEdit={pathfinderContext.canEdit}
            onChange={this._fn(this.handleChange, 'value')}
            placeholder={'Choose input'}
          />
        );

      case null:
        return null;
      default:
        throw new Error('No value type handler for ' + filterLine.valueType);
    }
  }

  private handleChange(key, value)
  {
    this.props.onChange(this.props.keyPath, this.props.filterLine.set(key, value));
  }

  private getPieces()
  {
    //
  }

}

export default PathfinderFilterLine;
