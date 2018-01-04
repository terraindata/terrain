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

// tslint:disable:strict-boolean-expressions

import * as classNames from 'classnames';
import * as Immutable from 'immutable';
import * as $ from 'jquery';
import * as React from 'react';
import { altStyle, backgroundColor, borderColor, Colors, fontColor } from '../../../../colors/Colors';
import TerrainComponent from './../../../../common/components/TerrainComponent';
const { List, Map } = Immutable;
import PathfinderText from 'app/builder/components/pathfinder/PathfinderText';
import BuilderActions from 'app/builder/data/BuilderActions';
import BuilderStore from 'app/builder/data/BuilderStore';
import BuilderTextbox from 'app/common/components/BuilderTextbox';
import DragAndDrop from 'app/common/components/DragAndDrop';
import DragHandle from 'app/common/components/DragHandle';
import Dropdown from 'app/common/components/Dropdown';
import Ajax from 'app/util/Ajax';
import
{
  _FilterLine, ElasticDataSource, FilterGroup, FilterLine,
  Path, PathfinderContext, PathfinderSteps, Source
} from '../PathfinderTypes';
import './PathfinderFilter.less';
import PathfinderFilterCreate from './PathfinderFilterCreate';
import PathfinderFilterGroup from './PathfinderFilterGroup';
import PathfinderFilterLine from './PathfinderFilterLine2';

const NUM_RESULTS = 10;
export interface Props
{
  pathfinderContext: PathfinderContext;
  filterGroup: FilterGroup;
  keyPath: KeyPath;
  step?: PathfinderSteps;
  onStepChange?: (oldStep: PathfinderSteps) => void;
}

class PathfinderFilterSection2 extends TerrainComponent<Props>
{
  public state: {
    sampleData: List<any>,
    schema: List<string | List<string>>,
    currentResult: number,
    filtersOpen: Immutable.Map<string, boolean>,

  } = {
    sampleData: List([]),
    schema: List([]),
    currentResult: 0,
    filtersOpen: Immutable.Map<string, boolean>({}),
  };

  public componentWillMount()
  {
    // Collect the schema to use in the example results
    this.buildSchema();
    // Fetch some example results to display (10)
    this.getSampleResults(NUM_RESULTS);
  }

  public render()
  {
    const { source, step, canEdit } = this.props.pathfinderContext;
    const { filterGroup } = this.props;
    return (
      <div className='pf-filter-section'>
        {this.renderSampleResults()}
        {this.renderFilterList()}
        {
          this.props.step === PathfinderSteps.Filter &&
          <div
            onClick={this.handleStepChange}
            className='pf-step-button'
          >
            Filters look good for now
          </div>
        }
      </div>
    );
  }

  private changeCurrentResult(value: number)
  {
    let newValue = this.state.currentResult + value;
    if (newValue >= NUM_RESULTS)
    {
      newValue = 0;
    }
    else if (newValue < 0)
    {
      newValue = NUM_RESULTS - 1;
    }
    this.setState({
      currentResult: newValue,
    });
  }

  private buildSchema()
  {
    const { index, types } = this.props.pathfinderContext.source.dataSource as ElasticDataSource;
    const { schemaState } = this.props.pathfinderContext;
    const server = BuilderStore.getState().db.name;
    if (index)
    {
      if (types && types.size)
      {
        const cols = schemaState.columns.filter(
          (column) => column.serverId === String(server) &&
            column.databaseId === String(index))
          .map((col) =>
          {
            return col.name;
          }).toList();
        // need to handle nested stuff here
        this.setState({
          schema: cols,
        });
      }
    }
  }

  private getSampleResults(numResults: number)
  {
    const { index } = this.props.pathfinderContext.source.dataSource as ElasticDataSource;
    const { db } = BuilderStore.getState();
    const query = {
      query: {
        bool: {
          filter: [
            {
              term: {
                _index: index.split('/')[1],
              },
            },
          ],
        },
      },
      size: 10,
    };
    Ajax.query(
      JSON.stringify(query),
      db,
      (resp) =>
      {
        if (resp.result && resp.result.hits && resp.result.hits.hits)
        {
          const sampleData = resp.result.hits.hits.map((hit) => hit._source);
          this.setState({
            sampleData: List(sampleData),
          });
        }
      },
      (err) =>
      {
        // console.log(err);
      },
    );
  }

  private renderSampleResults()
  {
    const result = this.state.sampleData.get(this.state.currentResult);
    if (!result)
    {
      return null;
    }
    const backText = '<';
    const nextText = '>';
    return (
      <div className='pf-filter-sample-wrapper'>
        <div
          onClick={this._fn(this.changeCurrentResult, -1)}
          className='pf-filter-sample-arrow'
        > {backText} </div>
        <div className='pf-filter-sample-result'>
          {
            this.state.schema.map((field: string, i) =>
            {
              return (
                <div
                  key={i}
                  className='pf-filter-sample-result-row'
                  onClick={this._fn(this.toggleFilters, field)}
                >
                  <span className='pf-filter-sample-result-field'>{field}</span>
                  :
                  <span className='pf-filter-sample-result-value'>{result[field]}</span>
                  {
                    this.state.filtersOpen.get(field) &&
                    this.renderFilters(field)
                  }
                </div>
              );
            })
          }
        </div>
        <div
          onClick={this._fn(this.changeCurrentResult, 1)}
          className='pf-filter-sample-arrow pf-filter-sample-arrow-next'
        > {nextText} </div>
      </div>
    );
  }

  private getFiltersForField(field)
  {
    const allFilters = this.props.filterGroup.lines;
    const fieldFilters = allFilters.filter((f: FilterLine) =>
    {
      return f.field === field;
    });
    return fieldFilters.toList();
  }

  private renderFilters(field)
  {
    const filters = this.getFiltersForField(field);
    if (filters.size === 0)
    {
      return (
        <div onClick={this._fn(this.handleAddFilter, field)} className='pf-filter-add-filter'> Add Filter </div>
      );
    }
    const { source, schemaState, canEdit } = this.props.pathfinderContext;
    return (
      <div>
        {
          filters.map((filter: FilterLine, i) =>
          {
            const comparisonOptions = source.dataSource.getChoiceOptions({
              type: 'comparison',
              field,
              fieldType: filter.fieldType,
              source,
              schemaState,
            });
            let displayNames = Map<string, string>({});
            comparisonOptions.forEach((option) =>
            {
              displayNames = displayNames.set(option.value, String(option.displayName));
            });
            return (
              <div key={i} className='pf-filter-filter-line' onClick={(e) => { e.stopPropagation(); }}>
                <Dropdown
                  options={comparisonOptions.map((option) => option.value).toList()}
                  optionsDisplayName={displayNames}
                  selectedIndex={comparisonOptions.map((option) => option.value).toList().indexOf(filter.comparison)}
                  keyPath={this.props.keyPath.push('lines').push(i).push('comparison')}
                  canEdit={canEdit}
                />
                <BuilderTextbox
                  value={filter.value}
                  keyPath={this.props.keyPath.push('lines').push(i).push('value')}
                  canEdit={canEdit}
                />
                <div
                  onClick={this._fn(this.handleRemoveFilter, filter)}
                  className='pf-filter-remove-filter'>
                  X
               </div>
              </div>
            );
          })
        }
      </div>
    );
  }

  private handleRemoveFilter(filter)
  {
    const oldLines = this.props.filterGroup.get('lines');
    const index = oldLines.indexOf(filter);
    BuilderActions.change(this.props.keyPath.push('lines'), oldLines.delete(index));
  }

  private handleAddFilter(field, e)
  {
    const oldLines = this.props.filterGroup.get('lines');
    const filter = _FilterLine({ field, comparison: 'equals', value: '' });
    BuilderActions.change(this.props.keyPath.push('lines'), oldLines.push(filter));
    e.stopPropagation();
    e.preventDefault();
  }

  private toggleFilters(field)
  {
    this.setState({
      filtersOpen: this.state.filtersOpen.set(field, !this.state.filtersOpen.get(field)),
    });
  }

  private renderFilterList()
  {
    return null;
  }

  private handleStepChange()
  {
    if (this.props.step === PathfinderSteps.Filter)
    {
      this.props.onStepChange(this.props.step);
    }
  }
}

export default PathfinderFilterSection2;
