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
import { altStyle, backgroundColor, borderColor, Colors, fontColor, getStyle } from '../../../../colors/Colors';
import TerrainComponent from './../../../../common/components/TerrainComponent';
const { List, Map, Set } = Immutable;
import ElasticBlockHelpers, { FieldType } from '../../../../../database/elastic/blocks/ElasticBlockHelpers';
import { getIndex, getType } from '../../../../../database/elastic/blocks/ElasticBlockHelpers';
import AdvancedDropdown from '../../../../common/components/AdvancedDropdown';
import BuilderTextbox from '../../../../common/components/BuilderTextbox';
import Dropdown from '../../../../common/components/Dropdown';
import Menu from '../../../../common/components/Menu';
import RadioButtons from '../../../../common/components/RadioButtons';
import Ajax from '../../../../util/Ajax';
import PathfinderFilterSection from '../filter/PathfinderFilterSection';
import PathfinderCreateLine from '../PathfinderCreateLine';
import PathfinderLine from '../PathfinderLine';
import PathfinderText from '../PathfinderText';
import
{
  _AggregationLine, _FilterGroup, _Sample, ADVANCED_MAPPINGS,
  AggregationLine, AggregationTypes, ChoiceOption, Path, PathfinderContext, Source,
} from '../PathfinderTypes';
import BuilderActions from './../../../data/BuilderActions';
import { BuilderStore } from './../../../data/BuilderStore';
import PathfinderAdvancedLine from './PathfinderAdvancedLine';
import PathfinderAggregationMoreSection from './PathfinderAggregationMoreSection';

const ArrowIcon = require('images/icon_arrow.svg?name=ArrowIcon');

export interface Props
{
  aggregation: AggregationLine;
  index: number;
  onDelete: (index) => void;
  keyPath: KeyPath;
  pathfinderContext: PathfinderContext;
}

class PathfinderAggregationLine extends TerrainComponent<Props>
{

  public state: {
    fieldOptions: List<string>,
    moreExpanded: boolean,
  } = {
    fieldOptions: List([]),
    moreExpanded: false,
  };

  public options: List<string> = List([]);

  public constructor(props)
  {
    super(props);
    this.options = List(_.keys(AggregationTypes.toJS()).sort());
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
    BuilderActions.change(this.props.keyPath.push('expanded'), !this.props.aggregation.expanded);
  }

  public handleTypeChange(index)
  {
    const type = this.options.get(index);
    this.updateAggregation(type, this.props.aggregation.field);
  }

  // When the field changes, change the name as well as the elastic type (when facets are being used)
  public handleFieldChange(newField)
  {
    BuilderActions.change(this.props.keyPath.push('field'), newField);
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
    if (List.isList(elasticType))
    {
      elasticType = this.getElasticType(type, field);
    }
    BuilderActions.change(this.props.keyPath.push('elasticType'), elasticType);

    // Update the advanced section of the aggregation
    const advancedTypes = this.getAdvancedOptions(type, elasticType);
    const advancedObj = this.createAdvancedObject(advancedTypes, field);
    BuilderActions.change(this.props.keyPath.push('advanced'), Map(advancedObj));
    BuilderActions.change(this.props.keyPath.push('advanced').push('name'), type + ' ' + field);
  }

  // This function, given a type of aggregation, returns a list of the advanced settings for that
  // aggreagtion type
  public getAdvancedOptions(type, elasticType)
  {
    let advancedTypes: any = AggregationTypes.get(type).advanced;
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

    // For the keys min, max, and interval (if they exist), auto-fill
    if (advancedObj.get('min') !== undefined)
    {      // TODO: Get database info from PathfinderContext.source
      const source: 'm2' | 'm1' = 'm2';
      const db = {
        id: 1,
        name: '',
        type: 'string',
        source,
      };
      const index: string = getIndex('');
      const type: string = getType('');
      const domainQuery = {
        body: {
          size: 0,
          query: {
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
        },
      };

      domainQuery['index'] = index;
      domainQuery['type'] = type;

      Ajax.query(
        JSON.stringify(domainQuery),
        db,
        (resp) =>
        {
          const min = resp.result.aggregations.minimum.value;
          const max = resp.result.aggregations.maximum.value;
          const interval = (max - min) / 10;
          BuilderActions.change(this.props.keyPath.push('advanced').push('min'), min);
          BuilderActions.change(this.props.keyPath.push('advanced').push('max'), max);
          BuilderActions.change(this.props.keyPath.push('advanced').push('interval'), interval);
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
    const fieldType: FieldType = ElasticBlockHelpers.getTypeOfField(this.props.pathfinderContext.schemaState, field);
    const options = AggregationTypes.get(type).fieldTypesToElasticTypes.get(String(fieldType));
    if (options === undefined)
    {
      return 'histogram'; // Meta fields (TODO)
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
          return this.props.aggregation.advanced.get('geoType') || 'geo_distnace';
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
    const { schemaState, source } = this.props.pathfinderContext;
    let allFieldOptions = List([]);
    if (source.dataSource.getChoiceOptions !== undefined)
    {
      allFieldOptions = source.dataSource.getChoiceOptions({
        type: 'fields',
        source,
        schemaState,
      }).map((option) => option.displayName).toList();
    }
    if ((type === undefined || type === '') || FieldType.Any in AggregationTypes.get(type).acceptedTypes)
    {
      return allFieldOptions.sort().toList();
    }
    let filteredOptions = Set([]);
    const acceptedTypes = AggregationTypes.get(type).acceptedTypes;
    acceptedTypes.forEach((fieldType) =>
    {
      filteredOptions = filteredOptions.union(ElasticBlockHelpers.getFieldsOfType(schemaState, fieldType).toSet());
    });
    return filteredOptions.sort().toList();
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
          options={this.options}
          selectedIndex={this.options.indexOf(this.props.aggregation.type)}
          keyPath={this.props.keyPath.push('type')}
          onChange={this.handleTypeChange}
          canEdit={canEdit}
        />
        <AdvancedDropdown
          value={this.props.aggregation.field}
          options={List(this.state.fieldOptions.map((option) =>
          {
            return {
              value: option,
              displayName: option,
            };
          }))}
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
      keyPath={this.props.keyPath.push('advanced')}
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
    BuilderActions.change(this.props.keyPath.push('elasticType'), elasticType);
  }

  public addSampler(index, id)
  {
    BuilderActions.change(this.props.keyPath.push('sampler'), _Sample());
  }

  public addFilters()
  {
    BuilderActions.change(this.props.keyPath.push('filters'), _FilterGroup());
  }

  public addNested()
  {
    BuilderActions.change(this.props.keyPath.push('nested'), List([]));
  }

  public renderSampleSection()
  {
    const { sampleType } = this.props.aggregation.sampler;
    const { canEdit } = this.props.pathfinderContext;
    const options = this.filterFieldOptions(undefined); // Will return all options if type = undefined
    return (
      <div>
        <RadioButtons
          selected={sampleType}
          radioKey={'sampleType'}
          keyPath={this.props.keyPath.push('sampler').push('sampleType')}
          options={List([
            {
              key: 'global',
              display: <div className='pf-aggregation-sampler-option'><span>All hits</span></div>,
            },
            {
              key: 'sampler',
              display:
              <div className='pf-aggregation-sampler-option'>
                <span>The top</span>
                <BuilderTextbox
                  value={this.props.aggregation.sampler.numSamples}
                  keyPath={this.props.keyPath.push('sampler').push('numSamples')}
                  canEdit={canEdit && sampleType === 'sampler'}
                />
                <span>hits</span>
              </div>,
            },
            {
              key: 'diversified_sampler',
              display:
              <div className='pf-aggregation-sampler-option'>
                <span>The top</span>
                <BuilderTextbox
                  value={this.props.aggregation.sampler.numSamples}
                  keyPath={this.props.keyPath.push('sampler').push('numSamples')}
                  canEdit={canEdit && sampleType === 'diversified_sampler'}
                />
                <span>hits with unique</span>
                <Dropdown
                  selectedIndex={options.indexOf(this.props.aggregation.sampler.diverseField)}
                  options={options}
                  keyPath={this.props.keyPath.push('sampler').push('diverseField')}
                  canEdit={canEdit && sampleType === 'diversified_sampler'}
                />
              </div>,
            },
          ])}
        />
      </div>
    );
  }

  public renderFilterSection()
  {
    return (
      <PathfinderFilterSection
        pathfinderContext={this.props.pathfinderContext}
        filterGroup={this.props.aggregation.filters}
        keyPath={this.props.keyPath.push('filters')}
      />
    );
  }

  public handleDeleteNestedLine(index)
  {
    BuilderActions.change(this.props.keyPath.push('nested'), this.props.aggregation.nested.delete(index));
  }

  public handleAddLine()
  {
    BuilderActions.change(this.props.keyPath.push('nested'), this.props.aggregation.nested.push(_AggregationLine()));
  }

  public getAggregationLines()
  {
    return (
      <div>
        {
          this.props.aggregation.nested.map((agg, i) =>
          {
            return (
              <PathfinderAggregationLine
                pathfinderContext={this.props.pathfinderContext}
                aggregation={agg}
                keyPath={this.props.keyPath.push('nested').push(i)}
                onDelete={this.handleDeleteNestedLine}
                index={i}
                key={i}
              />
            );
          })}
      </div>
    );
  }

  public renderNestedAggregations()
  {
    return (
      <div>
        {this.getAggregationLines()}
        <PathfinderCreateLine
          canEdit={this.props.pathfinderContext.canEdit}
          onCreate={this.handleAddLine}
          text={PathfinderText.createAggregationLine}
        />
      </div>
    );
  }

  // The advanced section allows the user to set more advanced things on their aggregation
  // Besides just field. It also lets them change the name of the aggregation
  // which is auto set to be type_field
  public renderAdvancedSection()
  {
    if (this.props.aggregation.type === undefined || this.props.aggregation.type === '')
    {
      return null;
    }
    const advanced = this.getAdvancedOptions(this.props.aggregation.type, this.props.aggregation.elasticType);
    let moreOptions = List([]);
    if (this.props.aggregation.sampler === undefined)
    {
      moreOptions = moreOptions.push({
        text: 'Sample from...',
        onClick: this.addSampler,
      });
    }
    if (this.props.aggregation.filters === undefined)
    {
      moreOptions = moreOptions.push({
        text: 'Filter by...',
        onClick: this.addFilters,
      });
    }
    if (this.props.aggregation.nested === undefined)
    {
      moreOptions = moreOptions.push({
        text: 'Add nested...',
        onClick: this.addNested,
      });
    }
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
        <div>
          {this.props.aggregation.sampler !== undefined &&
            <PathfinderAggregationMoreSection
              canEdit={this.props.pathfinderContext.canEdit}
              content={this.renderSampleSection()}
              title={'Sample From'}
              keyPath={this.props.keyPath.push('sampler')}
            />
          }
          {this.props.aggregation.filters !== undefined &&
            <PathfinderAggregationMoreSection
              canEdit={this.props.pathfinderContext.canEdit}
              content={this.renderFilterSection()}
              title={'Filter By'}
              keyPath={this.props.keyPath.push('filters')}
            />
          }
          {this.props.aggregation.nested !== undefined &&
            <PathfinderAggregationMoreSection
              canEdit={this.props.pathfinderContext.canEdit}
              content={this.renderNestedAggregations()}
              title={'Nested'}
              keyPath={this.props.keyPath.push('nested')}
            />
          }
        </div>
        <div className='pf-aggregation-more-menu-wrapper'>
          <Menu
            options={moreOptions}
            title='More...'
            openRight={true}
          />
        </div>
      </div>
    );
  }

  public render()
  {
    return (
      <PathfinderLine
        canDrag={true}
        canDelete={true}
        onDelete={this.props.onDelete}
        index={this.props.index}
        canEdit={this.props.pathfinderContext.canEdit}
        children={this.renderInnerLine()}
        expandableContent={this.renderAdvancedSection()}
        expanded={this.props.aggregation.expanded}
        onExpand={this.toggleExpanded}
        expandOnLeft={true}
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

export default PathfinderAggregationLine;
