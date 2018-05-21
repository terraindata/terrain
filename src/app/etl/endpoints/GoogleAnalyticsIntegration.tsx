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
import { instanceFnDecorator } from 'shared/util/Classes';

import PathfinderCreateLine from 'app/builder/components/pathfinder/PathfinderCreateLine';
import ListForm from 'common/components/ListForm';
import ObjectForm from 'common/components/ObjectForm';
import { EndpointFormBase } from 'etl/common/components/EndpointFormClasses.tsx';
import { _FileConfig, _SourceConfig, FileConfig, SinkConfig, SourceConfig } from 'shared/etl/immutable/EndpointRecords';
import
{
  FileConfig as FileConfigI,
  SftpOptions, SinkOptionsType, Sinks, SourceOptionsType,
  Sources, SQLOptions,
} from 'shared/etl/types/EndpointTypes';
import { FileTypes, Languages } from 'shared/etl/types/ETLTypes';
import
{
  PostProcessAggregationTypes as AggregationTypes,
  PostProcessConfig,
  PostProcessOptionsType,
  PostProcessTypes,
} from 'shared/etl/types/PostProcessTypes';
import Quarantine from 'util/RadiumQuarantine';

const DeleteIcon = require('images/icon_close.svg');
import 'common/components/ObjectForm.less';

const { List } = Immutable;

type FormState = SourceOptionsType<Sources.GoogleAnalytics>;
export class GoogleAnalyticsForm extends EndpointFormBase<FormState>
{
  public inputMap: InputDeclarationMap<FormState> = {
    dayInterval: {
      type: DisplayType.NumberBox,
      displayName: 'Day Interval',
    },
    transformations: {
      type: DisplayType.Custom,
      widthFactor: -1,
      options: {
        render: this.renderTransformations,
      },
    },
  };

  @instanceFnDecorator(memoizeOne)
  public transformationList(transformations: PostProcessConfig[]): List<PostProcessConfig>
  {
    if (transformations === undefined)
    {
      return List([]);
    }
    else
    {
      return List(transformations);
    }
  }

  public renderTransformation(transformation: PostProcessConfig, index: number)
  {
    return (
      <div
        key={index}
        className='object-form-row'
      >
        <PostProcessForm
          transformation={transformation}
          onChange={this.transformationChangeFactory(index)}
        />
        <Quarantine>
          <div
            className='object-form-row-delete'
            style={fontColor(Colors().text3, Colors().text2)}
            onClick={this.handleDeleteRowFactory(index)}
          >
            <DeleteIcon />
          </div>
        </Quarantine>
      </div>
    );
  }

  public transformationChangeFactory(index: number)
  {
    return (cfg: PostProcessConfig, apply?: boolean) =>
    {
      const { endpoint, onChange } = this.props;
      const options: FormState = endpoint.options;
      const newList = options.transformations.slice();
      newList[index] = cfg;
      const newOptions = _.extend({}, options, {
        transformations: newList,
      });
      onChange(endpoint.set('options', newOptions), apply);
    };
  }

  public renderTransformations(state: FormState, disabled)
  {
    return (
      <div className='object-form-container'>
        <div className='object-form-label'>
          Transformations
        </div>
        <div className='object-kv-body' style={borderColor(Colors().border1)}>
          {this.transformationList(state.transformations).map(this.renderTransformation)}
          {this.renderAddNewRow()}
        </div>
      </div>
    );
  }

  public renderAddNewRow()
  {
    return (
      <PathfinderCreateLine
        text={'Add New'}
        canEdit={true}
        onCreate={this.addRow}
        showText={true}
        style={overrideCreateStyle}
      />
    );
  }

  public addRow()
  {
    const { endpoint, onChange } = this.props;
    const transformations = endpoint.options.transformations !== undefined ?
      endpoint.options.transformations :
      [];

    const newItems = transformations.slice();
    newItems.push({
      type: 'Aggregate',
      options: {},
    });

    const newOptions = _.extend({}, endpoint.options, {
      transformations: newItems,
    });
    onChange(endpoint.set('options', newOptions), true);
  }

  @instanceFnDecorator(_.memoize)
  public handleDeleteRowFactory(index: number)
  {
    return () =>
    {
      const { endpoint, onChange } = this.props;
      const transformations = endpoint.options.transformations !== undefined ?
        endpoint.options.transformations :
        [];

      const newItems = transformations.slice();
      newItems.splice(index, 1);

      const newOptions = _.extend({}, endpoint.options, {
        transformations: newItems,
      });
      onChange(endpoint.set('options', newOptions), true);
    };
  }
}

const overrideCreateStyle = {
  height: '24px',
};

export interface PPTProps
{
  transformation: PostProcessConfig;
  onChange: (cfg: PostProcessConfig, apply?: boolean) => void;
}

export class PostProcessForm extends TerrainComponent<PPTProps>
{
  public postProcessOptions: List<string> = List(['Aggregate']);
  public inputMap: InputDeclarationMap<PostProcessConfig> = {
    type: {
      type: DisplayType.Pick,
      displayName: 'Type',
      options: {
        pickOptions: (s) => this.postProcessOptions,
        indexResolver: (value) => this.postProcessOptions.indexOf(value),
      },
    },
    options: {
      type: DisplayType.Custom,
      options: {
        render: this.renderOptions,
      },
    },
  };

  public render()
  {
    return (
      <DynamicForm
        inputMap={this.inputMap}
        inputState={this.props.transformation}
        onStateChange={this.props.onChange}
      />
    );
  }

  public renderOptions(state, disabled)
  {
    const options = this.getCurrentOptions();
    if (state.type === 'Aggregate')
    {
      return (
        <AggregateForm
          options={options as AggregateState}
          onChange={this.handleOptionsChange}
        />
      );
    }
  }

  public getCurrentOptions()
  {
    const { transformation } = this.props;
    return transformation.options !== undefined ? transformation.options : {};
  }

  public handleOptionsChange(options, apply?: boolean)
  {
    const newTransformation = _.extend({}, this.props.transformation, {
      options,
    });
    this.props.onChange(newTransformation, apply);
  }
}

type AggregateState = PostProcessOptionsType<'Aggregate'>;
export interface AggregateProps
{
  options: AggregateState;
  onChange: (cfg: AggregateState, apply?: boolean) => void;
}

export class AggregateForm extends TerrainComponent<AggregateProps>
{
  public aggregationOptions: List<AggregationTypes> = List([
    AggregationTypes.Average,
    AggregationTypes.Merge,
    AggregationTypes.Concat,
    AggregationTypes.Sum,
  ]);

  public inputMap: InputDeclarationMap<AggregateState> = {
    fields: {
      type: DisplayType.Custom,
      options: {
        render: this.renderFieldsForm,
      },
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

  public renderFieldsForm(state: AggregateState, disabled)
  {
    const fields = state.fields !== undefined ? state.fields : [];
    return (
      <ListForm
        items={fields}
        onChange={this.handleFieldsChange}
        label='Fields'
      />
    );
  }

  public handleFieldsChange(newFields: string[], apply?: boolean)
  {
    const newState = _.extend({}, this.props.options, {
      fields: newFields,
    });
    this.props.onChange(newState, apply);
  }
}
