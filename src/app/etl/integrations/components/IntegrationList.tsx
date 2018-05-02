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
import PathfinderCreateLine from 'app/builder/components/pathfinder/PathfinderCreateLine';
import Modal from 'app/common/components/Modal';
import { ETLActions } from 'app/etl/ETLRedux';
import { ETLState } from 'app/etl/ETLTypes';
import TerrainTools from 'app/util/TerrainTools';
import Util from 'app/util/Util';
import TerrainComponent from 'common/components/TerrainComponent';
import * as Immutable from 'immutable';
import { List, Map } from 'immutable';
import * as React from 'react';
import XHR from 'util/XHR';
import { _IntegrationConfig, IntegrationConfig } from 'shared/etl/immutable/IntegrationRecords';
import Integration from 'app/etl/integrations/components/Integration';
import './IntegrationStyle.less';

export interface Props
{
  integrations?: Map<ID, IntegrationConfig>;
  etlActions?: typeof ETLActions;
}

class IntegrationList extends TerrainComponent<Props>
{
  public state: {
    confirmModalOpen: boolean,
    deleteIntegrationId: ID,
  } = {
    confirmModalOpen: false,
    deleteIntegrationId: -1,
  };

  public componentWillMount()
  {
    this.props.etlActions({
      actionType: 'getIntegrations',
    });
  }

  public handleIntegrationChange(integration: IntegrationConfig)
  {
    this.props.etlActions({
      actionType: 'updateIntegration',
      integrationId: integration.id,
      integration,
    });
  }

  public createIntegration()
  {
    const blankIntegration = _IntegrationConfig({id: undefined});
    this.props.etlActions({
      actionType: 'createIntegration',
      integration: blankIntegration,
    });
  }

  public deleteIntegration(integrationId: ID)
  {
    this.props.etlActions({
      actionType: 'deleteIntegration',
      integrationId,
    })
  }

  public confirmDeleteIntegration(integrationId: ID)
  {
    this.setState({
      confirmModalOpen: true,
      deleteIntegrationId: integrationId,
    });
  }

  public render()
  {
    const { integrations } = this.props;
    const keys = integrations.keySeq().toList().sort();
    const integrationList = keys.map((id) => integrations.get(id));
    const toDelete = integrations.get(this.state.deleteIntegrationId) ?
      integrations.get(this.state.deleteIntegrationId).name : '';
    return (
      <div className='schedule-list-wrapper'>
        {
          integrationList.map((integration, i) =>
            <Integration
              integration={integration}
              onDelete={this.confirmDeleteIntegration}
              onChange={this.handleIntegrationChange}
              key={i}
            />
          )
        }
        <PathfinderCreateLine
          text='Add Integration'
          canEdit={TerrainTools.isAdmin()}
          onCreate={this.createIntegration}
          showText={true}
        />
        <Modal
          open={this.state.confirmModalOpen}
          confirm={true}
          title={'Confirm Action'}
          message={`Are you sure you want to delete ${toDelete}?`}
          confirmButtonText={'Yes'}
          onConfirm={this.deleteIntegration}
          onClose={this._toggle('confirmModalOpen')}
        />
      </div>
    );
  }
}

export default Util.createContainer(
  IntegrationList,
  [
    ['etl', 'integrations'],
  ],
  {
    etlActions: ETLActions,
  },
);
