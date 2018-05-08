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
// tslint:disable:no-console strict-boolean-expressions
import Colors, { backgroundColor, borderColor } from 'app/colors/Colors';
import Button from 'app/common/components/Button';
import { ETLActions } from 'app/etl/ETLRedux';
import TerrainTools from 'app/util/TerrainTools';
import Util from 'app/util/Util';
import TerrainComponent from 'common/components/TerrainComponent';
import IntegrationForm from 'etl/common/components/IntegrationForm';
import { List, Map } from 'immutable';
import * as Immutable from 'immutable';
import * as _ from 'lodash';
import * as React from 'react';
import { browserHistory } from 'react-router';
import { _IntegrationConfig, IntegrationConfig } from 'shared/etl/immutable/IntegrationRecords';

export interface Props
{
  location?: any;
  params?: {
    integrationId?: number;
  };
  router?: any;
  route?: any;
  integrations?: Map<ID, IntegrationConfig>;
  etlActions?: typeof ETLActions;
}

interface State
{
  integration: IntegrationConfig;
}

function getIntegrationId(params): number
{
  const asNumber = (params != null && params.integrationId != null) ? Number(params.integrationId) : NaN;
  return Number.isNaN(asNumber) ? -1 : asNumber;
}

class IntegrationEditorPage extends TerrainComponent<Props>
{
  public state = {
    integration: null,
  };

  public componentDidMount()
  {
    const { integrations, params } = this.props;
    this.setState({
      integration: integrations.get(getIntegrationId(params)),
    });
    this.props.etlActions({
      actionType: 'getIntegrations',
    });
  }

  public componentWillReceiveProps(nextProps: Props)
  {
    const { params } = this.props;
    const nextParams = nextProps.params;
    const oldIntegrationId = getIntegrationId(params);
    const integrationId = getIntegrationId(nextParams);
    if (integrationId !== -1 &&
      (oldIntegrationId !== integrationId ||
        this.props.integrations !== nextProps.integrations))
    {
      this.setState({
        integration: nextProps.integrations.get(integrationId),
      });
    }
  }

  public handleIntegrationChange(newIntegration)
  {
    this.setState({
      integration: newIntegration,
    });
  }

  public save()
  {
    const { integration } = this.state;
    this.props.etlActions({
      actionType: 'updateIntegration',
      integrationId: integration.id,
      integration,
    });
    // Update route to go back
    browserHistory.push('/data/integrations');
  }

  public cancel()
  {
    // Go back don't save
    browserHistory.push('/data/integrations');
  }

  public render()
  {
    const { integration } = this.state;
    return (
      <div
        className='integration-wrapper'
        style={backgroundColor('rgba(255, 255, 255, 0.75)')}
      >
        <div
          className='integration-editor-header'
        >
          Edit Integration
        </div>
        <IntegrationForm
          integration={integration}
          onChange={this.handleIntegrationChange}
        />
        <div
          className='integration-buttons'
        >
          <Button
            text={'Cancel'}
            onClick={this.cancel}
            size={'small'}
          />
          {
            integration &&
            <Button
              text={'Save'}
              onClick={this.save}
              size={'small'}
              theme={'active'}
            />
          }
        </div>
      </div>
    );
  }
}

export default Util.createContainer(
  IntegrationEditorPage,
  [
    ['etl', 'integrations'],
  ],
  {
    etlActions: ETLActions,
  },
);
