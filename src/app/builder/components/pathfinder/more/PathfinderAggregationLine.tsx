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
import BuilderTextbox from '../../../../common/components/BuilderTextbox';
import Dropdown from '../../../../common/components/Dropdown';
import ScoreBar from '../../charts/ScoreBar';
import TransformCard from '../../charts/TransformCard';
import TransformChartPreviewWrapper from '../../charts/TransformChartPreviewWrapper';
import PathfinderLine from '../PathfinderLine';
import PathfinderText from '../PathfinderText';
import
{
  ADVANCED_MAPPINGS, AggregationLine, AggregationTypes,
  ChoiceOption, Path, PathfinderContext, Source,
} from '../PathfinderTypes';
import BuilderActions from './../../../data/BuilderActions';
import { BuilderStore } from './../../../data/BuilderStore';
import PathfinderAdvancedLine from './PathfinderAdvancedLine';

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
  } = {
    fieldOptions: List([]),
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
    if (this.props.aggregation.type !== nextProps.aggregation.type)
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
    const advancedTypes = AggregationTypes.get(type).advanced;
    let advancedObj = {};
    advancedTypes.forEach((advancedType) =>
    {
      advancedObj = _.extend({}, advancedObj, ADVANCED_MAPPINGS[advancedType]);
    });
    BuilderActions.change(this.props.keyPath.push('advanced'), Map(advancedObj));
    BuilderActions.change(this.props.keyPath.push('elasticType'), AggregationTypes.get(type).elasticType);
    BuilderActions.change(this.props.keyPath.push('advanced').push('name'), type + ' ' + this.props.aggregation.field);
  }

  public handleFieldChange(index)
  {
    const newField = this.state.fieldOptions.get(index);
    BuilderActions.change(this.props.keyPath.push('advanced').push('name'), this.props.aggregation.type + ' ' + newField);
  }

  // This function returns a list of fields that can be used with a given aggregation type
  // (e.g. average aggregations can only be used on numerical or date fields, not text fields)
  public filterFieldOptions(type)
  {
    const { schemaState, source } = this.props.pathfinderContext;
    let allFieldOptions = List([]);
    if (source.dataSource.getChoiceOptions !== undefined)
    {
      allFieldOptions = source.dataSource.getChoiceOptions({
        type: 'fields',
        source,
        schemaState,
      }).map((option) => option.name).toList();
    }
    if ((type === undefined || type === '') || FieldType.Any in AggregationTypes.get(type).acceptedTypes)
    {
      return allFieldOptions.sort();
    }
    let filteredOptions = Set([]);
    const acceptedTypes = AggregationTypes.get(type).acceptedTypes;
    acceptedTypes.forEach((fieldType) =>
    {
      filteredOptions = filteredOptions.union(ElasticBlockHelpers.getFieldsOfType(schemaState, fieldType).toSet());
    });
    return filteredOptions.toList().sort();
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
        <Dropdown
          options={this.state.fieldOptions}
          selectedIndex={this.state.fieldOptions.indexOf(this.props.aggregation.field)}
          keyPath={this.props.keyPath.push('field')}
          canEdit={canEdit}
          placeholder={'field'}
          onChange={this.handleFieldChange}
        />
      </div>
    );
  }

  public renderLine(key, text, text2, multiValue, i)
  {
    const { aggregation } = this.props;
    const { advanced } = aggregation;
    const { canEdit } = this.props.pathfinderContext;
    return (
      <div className='pf-aggregation-advanced-line' key={i}>
        <span>{text}</span>
        {
          !multiValue ?
            <BuilderTextbox
              value={advanced.get(key)}
              keyPath={this.props.keyPath.push(key)}
              canEdit={canEdit}
              placeholder={'value'}
            />
            :
            null // TODO ADD IN MULTILPE INPUTS
        }
        <span>{text2}</span>
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
    />;
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
    const advanced = AggregationTypes.get(this.props.aggregation.type).advanced;
    return (
      <div className='pf-aggregation-advanced-wrapper'>
        {
          advanced.map((advancedType, i) =>
          {
            return this.renderAdvancedLine(advancedType, i);
          })
        }
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
