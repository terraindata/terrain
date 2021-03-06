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

import * as classNames from 'classnames';
import * as Immutable from 'immutable';
import * as _ from 'lodash';
import * as React from 'react';
import TerrainComponent from './../../../../common/components/TerrainComponent';
const { List, Map, Set } = Immutable;
import Util from 'util/Util';
import { FieldType } from '../../../../../../shared/builder/FieldTypes';
import ElasticBlockHelpers from '../../../../../database/elastic/blocks/ElasticBlockHelpers';
import Dropdown from '../../../../common/components/Dropdown';
import SearchableDropdown from '../../../../common/components/SearchableDropdown';
import Ajax from '../../../../util/Ajax';
import PathfinderLine from '../PathfinderLine';
import { ADVANCED_MAPPINGS, AggregationLine, AggregationTypes, PathfinderContext } from '../PathfinderTypes';
import BuilderActions from './../../../data/BuilderActions';
import PathfinderAdvancedLine from './PathfinderAdvancedLine';
import PathfinderAggregationMoreArea from './PathfinderAggregationMoreArea';

const ArrowIcon = require('images/icon_arrow.svg?name=ArrowIcon');

export interface Props
{
  aggregation: AggregationLine;
  index: number;
  onDelete: (index) => void;
  keyPath: KeyPath;
  pathfinderContext: PathfinderContext;

  builderActions?: typeof BuilderActions;
  db?: any;
}

class PathfinderAggregationLine extends TerrainComponent<Props>
{

  public state: {
    fieldOptions: List<string>,
  } = {
      fieldOptions: List([]),
    };

  public typeOptions: List<string> = List([]);

  public constructor(props)
  {
    super(props);
    this.typeOptions = List(_.keys(AggregationTypes.toJS()).sort());
  }

  public componentWillMount()
  {
    this.setState({
      fieldOptions: this.filterFieldOptions(this.props.aggregation.type),
    });
  }

  public componentWillReceiveProps(nextProps)
  {
    if (this.props.aggregation.type !== nextProps.aggregation.type ||
      this.props.pathfinderContext !== nextProps.pathfinderContext)
    {
      this.setState({
        fieldOptions: this.filterFieldOptions(nextProps.aggregation.type),
      });
    }
  }

  public toggleExpanded()
  {
    this.props.builderActions.changePath(this._ikeyPath(this.props.keyPath, 'expanded'), !this.props.aggregation.expanded);
  }

  public handleTypeChange(index)
  {
    const type = this.typeOptions.get(index);
    this.updateAggregation(type, this.props.aggregation.field);
  }

  public handleFieldChange(index: number)
  {
    const newField = this.state.fieldOptions.get(index);
    this.props.builderActions.changePath(this._ikeyPath(this.props.keyPath, 'field'), newField, false, true);
    const fieldType = ElasticBlockHelpers.getTypeOfField(
      this.props.pathfinderContext.schemaState,
      this.props.pathfinderContext.builderState,
      newField,
    );
    this.props.builderActions.changePath(this._ikeyPath(this.props.keyPath, 'fieldType'), fieldType);
    this.updateAggregation(this.props.aggregation.type, newField);
  }

  // Given a type and a field, update the elasticType, advanced section, and name of the aggregation
  public updateAggregation(type, field)
  {
    if (!type)
    {
      return;
    }
    let elasticType = AggregationTypes.get(type).elasticType;
    // If there are multiple options for the elasticType, choose the correct one
    if (List.isList(elasticType))
    {
      elasticType = this.getElasticType(type, field);
    }
    this.props.builderActions.changePath(this._ikeyPath(this.props.keyPath, 'elasticType'), elasticType);

    // Update the advanced section of the aggregation
    const advancedTypes = this.getAdvancedOptions(type, elasticType);
    const advancedObj = this.createAdvancedObject(advancedTypes, field);
    this.props.builderActions.changePath(this._ikeyPath(this.props.keyPath, 'advanced'), Map(advancedObj));
    this.props.builderActions.changePath(this._ikeyPath(this.props.keyPath, 'advanced', 'name'), type + ' ' + field);
  }

  // This function, given a type of aggregation, returns a list of the advanced settings for that
  // aggreagtion type
  public getAdvancedOptions(type, elasticType)
  {
    let advancedTypes: any = AggregationTypes.get(type).advanced;
    // If the advancedTypes are a map (of elasticType: advancedTypes list), select the correct list
    if (!List.isList(advancedTypes))
    {
      advancedTypes = advancedTypes.get(elasticType);
    }
    return advancedTypes;
  }

  // Given a list of advanced types, create an advanced object for an aggregation
  public createAdvancedObject(advancedTypes, field)
  {
    let advancedObj = this.props.aggregation.advanced;
    const keys = {}; // To store correct keys for final obj with O(1) lookup

    // Add any keys to the object that are currently missing
    advancedTypes.forEach((advancedType) =>
    {
      _.keys(ADVANCED_MAPPINGS[advancedType]).forEach((key) =>
      {
        keys[key] = true;
        if (advancedObj.get(key) === undefined)
        {
          advancedObj = advancedObj.set(key, ADVANCED_MAPPINGS[advancedType][key]);
        }
      });
    });

    // Remove any keys from the object that are not in keys
    _.keys(advancedObj.toJS()).forEach((key) =>
    {
      if (keys[key] === undefined)
      {
        advancedObj = advancedObj.delete(key);
      }
    });

    // For the keys min, max, and interval (if they exist), auto-fill by running an aggregation query
    if (advancedObj.get('min') !== undefined)
    {
      const { db } = this.props;
      const backend = {
        id: db.id,
        name: db.name,
        type: db.type,
        source: db.source,
      };
      const index: string = (this.props.pathfinderContext.source.dataSource as any).index;
      const domainQuery = {
        query: {
          bool: {
            filter: [
              {
                term: {
                  _index: index,
                },
              }],
          },
        },
        aggs: {
          maximum: {
            max: {
              field,
            },
          },
          minimum: {
            min: {
              field,
            },
          },
        },
        size: 0,
      };
      Ajax.query(
        JSON.stringify(domainQuery),
        backend,
        (resp) =>
        {
          // Set the bounds and interval of the advanced section based on the aggregation results
          if (resp && resp.result && resp.result.aggregations)
          {
            const min = resp.result.aggregations.minimum.value;
            const max = resp.result.aggregations.maximum.value;
            const interval = (max - min) / 10;
            this.props.builderActions.changePath(this._ikeyPath(this.props.keyPath, 'advanced', 'min'), min);
            this.props.builderActions.changePath(this._ikeyPath(this.props.keyPath, 'advanced', 'max'), max);
            this.props.builderActions.changePath(this._ikeyPath(this.props.keyPath, 'minMatches', 'interval'), interval);
          }

        },
        (err) =>
        { /**/ },
      );
    }
    return advancedObj;
  }

  // Given a type of aggregation, this function returns the correct elasticType based on
  // the field type (text, number, geopoint...) as well as other advanced information
  public getElasticType(type, overrideField?, overrideKey?)
  {
    const field = overrideField !== undefined ? overrideField : this.props.aggregation.field;
    if (field === undefined || field === '')
    {
      return 'histogram';
    }
    // Get the type of field (using schema) and narrow down th options with fieldTypesToElasticTYpes
    const fieldType: FieldType = ElasticBlockHelpers.getTypeOfField(
      this.props.pathfinderContext.schemaState,
      this.props.pathfinderContext.builderState,
      field,
      this.props.pathfinderContext.source.dataSource,
    ) as FieldType;
    const options = AggregationTypes.get(type).fieldTypesToElasticTypes.get(String(fieldType));
    // If there are no options, it is a meta-field
    if (options === undefined)
    {
      if (field === '_score' || field === '_size')
      {
        return (this.props.aggregation.advanced.get('rangeType') === 'ranges') ? 'range' : 'histogram';
      }
      return 'terms';
    }
    // From there choose the correct option based on the advanced features
    // If intervalType = interval, use histograms (not ranges)
    // Choose between terms and sig terms
    // Choose between geohash and geodistance
    const { advanced } = this.props.aggregation;
    let key = overrideKey !== undefined ? overrideKey : advanced.get('rangeType');
    if (key === undefined)
    {
      key = 'interval';
    }
    switch (Number(fieldType))
    {
      case FieldType.Numerical:
        if (key === 'interval')
        {
          return 'histogram';
        }
        return 'range';
      case FieldType.Date:
        if (key === 'interval')
        {
          return 'date_histogram';
        }
        return 'date_range';
      case FieldType.Geopoint:
        if (key !== 'geo_distance' && key !== 'geo_hash')
        {
          return this.props.aggregation.advanced.get('geoType') || 'geo_distance';
        }
        return key;
      case FieldType.Text:
        if (key !== 'terms' && key !== 'significant_terms')
        {
          return this.props.aggregation.advanced.get('termsType') || 'terms';
        }
        return key;
      default:
        return options.get(0);
    }
  }

  // This function returns a list of fields that can be used with a given aggregation type
  // (e.g. average aggregations can only be used on numerical or date fields, not text fields)
  public filterFieldOptions(type): List<string>
  {
    const { schemaState, builderState, source } = this.props.pathfinderContext;
    let allFieldOptions = List([]);
    if (source.dataSource.getChoiceOptions !== undefined)
    {
      allFieldOptions = source.dataSource.getChoiceOptions({
        type: 'fields',
        source,
        schemaState,
        builderState,
      }).map((option) => option.displayName).toList();
    }
    // If the type has not been chosen, or the type can accept Any field, return all fields
    if ((type === undefined || type === '') || AggregationTypes.get(type).acceptedTypes.indexOf(FieldType.Any) !== -1)
    {
      return allFieldOptions.toList();
    }
    let filteredOptions = Set([]);
    const acceptedTypes = AggregationTypes.get(type).acceptedTypes;
    acceptedTypes.forEach((fieldType) =>
    {
      filteredOptions = filteredOptions.union(
        ElasticBlockHelpers.getFieldsOfType(
          schemaState,
          builderState,
          fieldType,
          source.dataSource,
        ).toSet(),
      );
    });
    return filteredOptions.toList();
  }

  public renderInnerLine()
  {
    const { source, canEdit, schemaState } = this.props.pathfinderContext;
    return (
      <div className='pf-line'>
        <span>
          The
        </span>
        <Dropdown
          options={this.typeOptions}
          selectedIndex={this.typeOptions.indexOf(this.props.aggregation.type)}
          keyPath={this._ikeyPath(this.props.keyPath, 'type')}
          onChange={this.handleTypeChange}
          canEdit={canEdit}
          action={this.props.builderActions.changePath}
        />
        <SearchableDropdown
          selectedIndex={this.state.fieldOptions.indexOf(this.props.aggregation.field)}
          options={this.state.fieldOptions}
          onChange={this.handleFieldChange}
          canEdit={canEdit}
          placeholder={'Field'}
        />
      </div>
    );
  }

  // Given a type of advanced section to return, and the advanced
  // data from the aggregation return an PathfinderAdvancedLine with the
  // correct information
  public renderAdvancedLine(type, i)
  {
    const { canEdit } = this.props.pathfinderContext;
    return <PathfinderAdvancedLine
      key={i}
      advancedType={type}
      keyPath={this._ikeyPath(this.props.keyPath, 'advanced')}
      canEdit={canEdit}
      advancedData={this.props.aggregation.advanced}
      fieldName={this.props.aggregation.field}
      onRadioChange={this.handleAdvancedChange}
      fields={this.filterFieldOptions(undefined)}
    />;
  }

  // When an advanced feature that affects elastic type changes, update the elasticType
  public handleAdvancedChange(key, radioKey)
  {
    const type = this.props.aggregation.type;
    let elasticType = AggregationTypes.get(type).elasticType;
    if (!List.isList(elasticType))
    {
      return;
    }
    elasticType = this.getElasticType(type, undefined, key);
    this.props.builderActions.changePath(this._ikeyPath(this.props.keyPath, 'elasticType'), elasticType);
    // If switching from ranges to uniform interval, auto-fill the interval values
    if (radioKey === 'rangeType')
    {
      const advancedTypes = this.getAdvancedOptions(this.props.aggregation.type, elasticType);
      this.props.builderActions.changePath(this._ikeyPath(this.props.keyPath, 'advanced'),
        this.createAdvancedObject(advancedTypes, this.props.aggregation.field));
    }
  }

  // The advanced section allows the user to set more advanced things on their aggregation
  // Besides just field. It also lets them add the most complex features to their aggregation
  // in the advancedMoreArea (samplers, filters, nested, scripts)
  public renderAdvancedSection()
  {
    if (this.props.aggregation.type === undefined || this.props.aggregation.type === '')
    {
      return null;
    }
    const advanced = this.getAdvancedOptions(this.props.aggregation.type, this.props.aggregation.elasticType);
    return (
      <div>
        <div className='pf-aggregation-advanced-wrapper'>
          {
            advanced.map((advancedType, i) =>
            {
              return this.renderAdvancedLine(advancedType, i);
            })
          }
        </div>
        <PathfinderAggregationMoreArea
          pathfinderContext={this.props.pathfinderContext}
          keyPath={this.props.keyPath}
          aggregation={this.props.aggregation}
          fields={this.filterFieldOptions(undefined)}
        />
      </div>
    );
  }

  public render()
  {
    return (
      <PathfinderLine
        canDrag={true}
        canDelete={this.props.pathfinderContext.canEdit}
        onDelete={this.props.onDelete}
        index={this.props.index}
        canEdit={this.props.pathfinderContext.canEdit}
        children={this.renderInnerLine()}
        expandableContent={this.renderAdvancedSection()}
        expanded={this.props.aggregation.expanded}
        onExpand={this.toggleExpanded}
        expandButton={
          <div
            className={classNames({
              'pf-aggregation-arrow': true,
              'pf-aggregation-arrow-open': this.props.aggregation.expanded,
            })}>
            <ArrowIcon />
          </div>}
      />
    );
  }
}

export default Util.createTypedContainer(
  PathfinderAggregationLine,
  [['builder', 'db']],
  { builderActions: BuilderActions },
);
