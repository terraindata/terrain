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
// tslint:disable:no-var-requires max-classes-per-file strict-boolean-expressions
import TerrainComponent from 'common/components/TerrainComponent';
import * as Immutable from 'immutable';
import * as _ from 'lodash';
import * as React from 'react';
import { backgroundColor, borderColor, Colors, fontColor, getStyle } from 'src/app/colors/Colors';
import Util from 'util/Util';

import { DynamicForm } from 'common/components/DynamicForm';
import { DisplayState, DisplayType, InputDeclarationMap } from 'common/components/DynamicFormTypes';
import { instanceFnDecorator } from 'shared/util/Classes';

import { _IntegrationConfig, IntegrationConfig } from 'shared/etl/immutable/IntegrationRecords';
import { Integrations } from 'shared/etl/types/IntegrationTypes';

const { List, Map } = Immutable;

export interface Props
{
  integrationType?: string;
  integrations: IMMap<ID, IntegrationConfig>;
  selectedIntegration: ID;
  onChange: (id: ID) => void;
}

export default class IntegrationPicker extends TerrainComponent<Props>
{
  public state: {
    filteredIntegrations: IMMap<ID, IntegrationConfig>,
    integrationIds: List<ID>,
  } = {
      filteredIntegrations: Map(),
      integrationIds: List(),
    };

  public inputMap = {
    id: {
      type: DisplayType.Pick,
      displayName: 'Integration',
      options: {
        pickOptions: (s) => this.state.integrationIds,
        indexResolver: (value) => this.state.integrationIds.indexOf(value),
        displayNames: (s) => this.state.filteredIntegrations.map((i) => i.name),
      },
    },
  };

  public componentDidMount()
  {
    this.filterIntegrations(this.props.integrationType, this.props.integrations);
  }

  public componentWillReceiveProps(nextProps: Props)
  {
    if (this.props.integrationType !== nextProps.integrationType ||
      this.props.integrations !== nextProps.integrations)
    {
      this.filterIntegrations(nextProps.integrationType, nextProps.integrations);
    }
  }

  public filterIntegrations(type: string, integrations: Immutable.Map<ID, IntegrationConfig>)
  {
    let filtered;
    if (!type)
    {
      filtered = integrations;
    }
    else
    {
      filtered = integrations.filter((integration) => integration.type === type);
    }
    const integrationIds = filtered.toList().map((i) => i.id).sort().toList();
    this.setState({
      filteredIntegrations: filtered,
      integrationIds,
    });
  }

  public getIntegrationMapOptions()
  {
    const { filteredIntegrations, integrationIds } = this.state;
    return {
      pickOptions: (s) => integrationIds,
      indexResolver: (value) => integrationIds.indexOf(value),
      displayNames: (s) => filteredIntegrations.map((i) => i.name),
    };
  }

  public handleIntegrationChange(newState)
{
    this.props.onChange(newState.id);
  }

  public render()
  {
    const { onChange, selectedIntegration } = this.props;
    return (
      <div className='integration-form-block'>
        {
          <DynamicForm
            inputMap={this.inputMap}
            inputState={{ id: selectedIntegration }}
            onStateChange={this.handleIntegrationChange}
          />
        }
      </div>
    );
  }
}
