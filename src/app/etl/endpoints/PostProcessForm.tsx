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
import * as _ from 'lodash';
import memoizeOne from 'memoize-one';
import * as React from 'react';
import { borderColor, Colors, fontColor } from 'src/app/colors/Colors';
import Util from 'util/Util';

import { DynamicForm } from 'common/components/DynamicForm';
import { DisplayType, InputDeclarationMap } from 'common/components/DynamicFormTypes';
import { RootPostProcessConfig } from 'shared/etl/immutable/EndpointRecords';
import { instanceFnDecorator } from 'shared/util/Classes';

import PathfinderCreateLine from 'app/builder/components/pathfinder/PathfinderCreateLine';

import
{
  PostProcessConfig,
  PostProcessOptionsDefaults,
  PostProcessTypes,
  RootPostProcessConfig as RootPostProcessConfigI,
} from 'shared/etl/types/PostProcessTypes';

import
{
  AggregateForm,
  FilterForm,
  ParseForm,
  SortForm,
} from 'etl/endpoints/PostProcessTypeForms';
import { FormProps } from 'etl/endpoints/PostProcessTypeForms';

import Quarantine from 'util/RadiumQuarantine';

const DeleteIcon = require('images/icon_close.svg');

import { List } from 'immutable';

export interface Props
{
  rootPostProcessConfig: RootPostProcessConfig;
  onChange: (config: RootPostProcessConfig, isBlur?: boolean) => void;
  style?: any;
}

type FormState = RootPostProcessConfigI;

export class PostProcessForm extends TerrainComponent<Props>
{

  public inputMap: InputDeclarationMap<FormState> = {
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
        <TransformForm
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
      const { rootPostProcessConfig, onChange } = this.props;
      const transformations: PostProcessConfig[] = rootPostProcessConfig.transformations;
      const newList = transformations.slice();
      newList[index] = cfg;
      onChange(rootPostProcessConfig.set('transformations', newList), apply);
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

  public render()
  {
    return (
      <DynamicForm
        inputMap={this.inputMap}
        inputState={this.props.rootPostProcessConfig}
        onStateChange={this.props.onChange}
        style={this.props.style}
      />
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
    const { rootPostProcessConfig, onChange } = this.props;
    const transformations = rootPostProcessConfig.transformations != null ?
      rootPostProcessConfig.transformations :
      [];

    const newItems = transformations.slice();

    newItems.push({
      type: 'Aggregate',
      options: PostProcessOptionsDefaults['Aggregate'],
    });

    onChange(rootPostProcessConfig.set('transformations', newItems), true);
  }

  @instanceFnDecorator(_.memoize)
  public handleDeleteRowFactory(index: number)
  {
    return () =>
    {
      const { rootPostProcessConfig, onChange } = this.props;
      const transformations = rootPostProcessConfig.transformations != null ?
        rootPostProcessConfig.transformations :
        [];

      const newItems = transformations.slice();
      newItems.splice(index, 1);

      onChange(rootPostProcessConfig.set('transformations', newItems), true);
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

export class TransformForm extends TerrainComponent<PPTProps>
{
  public postProcessOptions: List<string> = List(['Aggregate', 'Filter', 'Parse', 'Sort']);
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
        onStateChange={this.handleChange}
      />
    );
  }

  public handleChange(cfg: PostProcessConfig, apply?: boolean)
  {
    if (cfg.type !== this.props.transformation.type)
    {
      cfg = _.extend({}, cfg, { options: PostProcessOptionsDefaults[cfg.type] });
    }
    this.props.onChange(cfg, apply);
  }

  public getPPTComponent(type: PostProcessTypes): React.ComponentClass<FormProps<any>>
  {
    switch (type)
    {
      case 'Aggregate':
        return AggregateForm;
      case 'Filter':
        return FilterForm;
      case 'Parse':
        return ParseForm;
      case 'Sort':
        return SortForm;
      default:
        return Util.assertUnreachable(type);
    }
  }

  public renderOptions(state: PostProcessConfig, disabled)
  {
    const options = this.getCurrentOptions();

    const Component = this.getPPTComponent(state.type);
    return (
      <Component
        options={options as any}
        onChange={this.handleOptionsChange}
      />
    );
  }

  public getCurrentOptions()
  {
    const { transformation } = this.props;
    return transformation.options != null ? transformation.options : {};
  }

  public handleOptionsChange(options, apply?: boolean)
  {
    const newTransformation = _.extend({}, this.props.transformation, {
      options,
    });
    this.props.onChange(newTransformation, apply);
  }
}
