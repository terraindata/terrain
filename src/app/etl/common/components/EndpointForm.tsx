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
// tslint:disable:no-var-requires import-spacing
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

import { _FileConfig, _SinkConfig, _SourceConfig, FileConfig, SinkConfig, SourceConfig } from 'shared/etl/immutable/EndpointRecords';
import { Sinks, Sources } from 'shared/etl/types/EndpointTypes';
import { FileTypes } from 'shared/etl/types/ETLTypes';

import { SinkFormMap, SourceFormMap } from 'etl/common/components/EndpointOptions';

const { List } = Immutable;

export interface Props
{
  isSource: boolean;
  endpoint: SourceConfig | SinkConfig;
  onChange: (newEndpoint: SourceConfig | SinkConfig, apply?: boolean) => void;
  hideTypePicker?: boolean;
}

export default class EndpointForm extends TerrainComponent<Props>
{
  public sinkTypeMap: InputDeclarationMap<SinkFormState> =
    {
      type: {
        type: DisplayType.Pick,
        displayName: 'Sink Type',
        options: {
          pickOptions: (s) => sinkList,
          indexResolver: (value) => sinkList.indexOf(value),
        },
      },
    };

  public sourceTypeMap: InputDeclarationMap<SourceFormState> =
    {
      type: {
        type: DisplayType.Pick,
        displayName: 'Source Type',
        options: {
          pickOptions: (s) => sourceList,
          indexResolver: (value) => sourceList.indexOf(value),
        },
      },
    };

  public render()
  {
    const { isSource, endpoint, onChange, hideTypePicker } = this.props;
    const mapToUse = isSource ? this.sourceTypeMap : this.sinkTypeMap;
    const FormClass = isSource ? SourceFormMap[endpoint.type] : SinkFormMap[endpoint.type];

    return (
      <div className='endpoint-block'>
        {
          hideTypePicker === true ? null :
            <DynamicForm
              inputMap={mapToUse}
              inputState={this.typeValueToState(endpoint)}
              onStateChange={this.handleTypeChange}
            />
        }
        {
          FormClass != null ?
            <FormClass
              endpoint={endpoint}
              onChange={this.handleEndpointChange}
            />
            : null
        }

      </div>
    );
  }

  public typeStateToValue(state: SinkFormState | SourceFormState)
  {
    const { endpoint } = this.props;
    return endpoint.set('type', state.type);
  }

  @instanceFnDecorator(memoizeOne)
  public typeValueToState(value: SinkConfig | SourceConfig)
  {
    return {
      type: value.type,
    };
  }

  public handleTypeChange(state: SinkFormState | SourceFormState)
  {
    const { isSource, endpoint, onChange } = this.props;
    const constructorToUse = isSource ? _SourceConfig : _SinkConfig;
    const newEndpoint = constructorToUse({ type: state.type });
    onChange(newEndpoint);
  }

  public handleEndpointChange(newEndpoint: SinkConfig | SourceConfig, apply?: boolean)
  {
    this.props.onChange(newEndpoint, apply);
  }
}

interface SinkFormState
{
  type: Sinks;
}

interface SourceFormState
{
  type: Sources;
}

const sourceList = List(Object.keys(Sources));
const sinkList = List(Object.keys(Sinks));
