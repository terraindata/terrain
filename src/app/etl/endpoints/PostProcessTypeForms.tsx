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
// tslint:disable:no-var-requires max-classes-per-file

import TerrainComponent from 'common/components/TerrainComponent';
import * as Immutable from 'immutable';
import * as _ from 'lodash';
import memoizeOne from 'memoize-one';
import * as Radium from 'radium';
import * as React from 'react';
import { backgroundColor, borderColor, Colors, fontColor, getStyle } from 'src/app/colors/Colors';
import Util from 'util/Util';

import { DynamicForm } from 'common/components/DynamicForm';
import { DisplayState, DisplayType, InputDeclarationMap } from 'common/components/DynamicFormTypes';

import ListForm from 'common/components/ListForm';

import
{
  PostProcessAggregationTypes as AggregationTypes,
  PostProcessConfig,
  PostProcessFilterTypes as FilterTypes,
  PostProcessOptionsType,
  PostProcessParseTypes as ParseTypes,
  PostProcessSortObjectTypes,
  PostProcessSortTypes as SortTypes,
  PostProcessTypes,
  RootPostProcessConfig as RootPostProcessConfigI,
} from 'shared/etl/types/PostProcessTypes';

const { List } = Immutable;

export interface FormProps<T>
{
  options: T;
  onChange: (cfg: T, apply?: boolean) => void;
}

export type AggregateState = PostProcessOptionsType<'Aggregate'>;

export class AggregateForm extends TerrainComponent<FormProps<AggregateState>>
{
  public aggregationOptions: List<AggregationTypes> = List([
    AggregationTypes.Average,
    AggregationTypes.Merge,
    AggregationTypes.Concat,
    AggregationTypes.Sum,
  ]);

  public inputMap: InputDeclarationMap<AggregateState> = {
    fields: {
      type: DisplayType.TagsBox,
      displayName: 'Fields',
    },
    operation: {
      type: DisplayType.Pick,
      displayName: 'Operation',
      options: {
        pickOptions: (s) => this.aggregationOptions,
        indexResolver: (value) => this.aggregationOptions.indexOf(value),
      },
    },
    pattern: {
      type: DisplayType.TextBox,
      displayName: 'Pattern',
    },
    primaryKey: {
      type: DisplayType.TextBox,
      displayName: 'Primary Key Name',
    },
  };

  public render()
  {
    return (
      <DynamicForm
        inputMap={this.inputMap}
        onStateChange={this.props.onChange}
        inputState={this.props.options}
      />
    );
  }
}

export type FilterState = PostProcessOptionsType<'Aggregate'>;

export class FilterForm extends TerrainComponent<FormProps<FilterState>>
{
  public filterOptions: List<FilterTypes> = List([
    FilterTypes.MostRecent,
    FilterTypes.RemoveByPattern,
  ]);

  public inputMap: InputDeclarationMap<FilterState> = {
    operation: {
      type: DisplayType.Pick,
      displayName: 'Operation',
      options: {
        pickOptions: (s) => this.filterOptions,
        indexResolver: (value) => this.filterOptions.indexOf(value),
      },
    },
    pattern: {
      type: DisplayType.TextBox,
      displayName: 'Pattern',
    },
    primaryKey: {
      type: DisplayType.TextBox,
      displayName: 'Primary Key Name',
    },
  };

  public render()
  {
    return (
      <DynamicForm
        inputMap={this.inputMap}
        onStateChange={this.props.onChange}
        inputState={this.props.options}
      />
    );
  }
}

export type ParseState = PostProcessOptionsType<'Parse'>;

export class ParseForm extends TerrainComponent<FormProps<ParseState>>
{
  public parseOptions: List<ParseTypes> = List([
    ParseTypes.ParseURL,
  ]);

  public inputMap: InputDeclarationMap<ParseState> = {
    field: {
      type: DisplayType.TextBox,
      displayName: 'Field',
    },
    operation: {
      type: DisplayType.Pick,
      displayName: 'Operation',
      options: {
        pickOptions: (s) => this.parseOptions,
        indexResolver: (value) => this.parseOptions.indexOf(value),
      },
    },
    url: {
      type: DisplayType.TextBox,
      displayName: 'URL',
    },
  };

  public render()
  {
    return (
      <DynamicForm
        inputMap={this.inputMap}
        onStateChange={this.props.onChange}
        inputState={this.props.options}
      />
    );
  }
}

export type SortState = PostProcessOptionsType<'Sort'>;

export class SortForm extends TerrainComponent<FormProps<SortState>>
{
  public inputMap: InputDeclarationMap<SortState> = {
    operations: {
      type: DisplayType.Delegate,
      displayName: 'Operation',
      options: {
        component: SortObjectForm,
        inputKey: 'options',
        isList: true,
        listDefaultValue: { field: '', sort: SortTypes.Asc },
      },
    },
  };

  public render()
  {
    return (
      <DynamicForm
        inputMap={this.inputMap}
        onStateChange={this.props.onChange}
        inputState={this.props.options}
      />
    );
  }
}

export class SortObjectForm extends TerrainComponent<FormProps<PostProcessSortObjectTypes>>
{
  public sortOptions: List<SortTypes> = List([
    SortTypes.Asc,
    SortTypes.Desc,
  ]);

  public inputMap: InputDeclarationMap<PostProcessSortObjectTypes> = {
    sort: {
      type: DisplayType.Pick,
      displayName: 'Sort Type',
      group: 'row',
      widthFactor: 2,
      options: {
        pickOptions: (s) => this.sortOptions,
        indexResolver: (value) => this.sortOptions.indexOf(value),
      },
    },
    field: {
      widthFactor: 2,
      type: DisplayType.TextBox,
      displayName: 'Field Name',
      group: 'row',
    },
  };

  public render()
  {
    return (
      <DynamicForm
        inputMap={this.inputMap}
        onStateChange={this.props.onChange}
        inputState={this.props.options}
      />
    );
  }
}
