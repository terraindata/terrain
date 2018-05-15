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
// tslint:disable:no-console strict-boolean-expressions no-var-requires
import Colors, { backgroundColor, borderColor } from 'app/colors/Colors';
import FloatingInput from 'app/common/components/FloatingInput';
import { ETLActions } from 'app/etl/ETLRedux';
import EtlRouteUtil from 'app/etl/ETLRouteUtil';
import { ETLState } from 'app/etl/ETLTypes';
import TerrainTools from 'app/util/TerrainTools';
import Util from 'app/util/Util';
import TerrainComponent from 'common/components/TerrainComponent';
import { HeaderConfig, HeaderConfigItem, ItemList } from 'etl/common/components/ItemList';
import * as Immutable from 'immutable';
import { List, Map } from 'immutable';
import * as _ from 'lodash';
import * as React from 'react';
import { _IntegrationConfig, IntegrationConfig } from 'shared/etl/immutable/IntegrationRecords';
import { User } from 'users/UserTypes';
import XHR from 'util/XHR';
import './IntegrationStyle.less';
const RemoveIcon = require('images/icon_close_8x8.svg?name=RemoveIcon');

export interface Props
{
  integrations?: Map<ID, IntegrationConfig>;
  etlActions?: typeof ETLActions;
  users?: Immutable.Map<ID, User>;
}

export class IntegrationListUncontained extends TerrainComponent<Props>
{

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
    const blankIntegration = _IntegrationConfig({ id: undefined });
    this.props.etlActions({
      actionType: 'createIntegration',
      integration: blankIntegration,
    });
  }

  public deleteIntegration(integrationId: ID, e?)
  {
    if (e !== undefined)
    {
      e.stopPropagation();
    }
    const onConfirm = () =>
    {
      this.props.etlActions({
        actionType: 'deleteIntegration',
        integrationId,
      });
    };
    this.props.etlActions({
      actionType: 'addModal',
      props: {
        title: 'Confirm Action',
        message: 'Are you sure you want to delete this integration?',
        closeOnConfirm: true,
        confirm: true,
        onConfirm,
      },
    });
  }

  public handleRowClick(index: number)
  {
    const { integrations } = this.props;
    const keys = integrations.keySeq().toList().sort();
    EtlRouteUtil.gotoEditIntegration(keys.get(index));
  }

  public formatValue(name, value)
  {
    switch (name)
    {
      case 'createdBy':
        const user = this.props.users.get(value);
        const userName = user ? user.name ? user.name : user.email : value;
        return userName;
      case 'lastModified':
        return Util.formatDate(value, true);
      case 'id':
      case 'name':
      case 'type':
      default:
        return value;
    }
  }

  public renderProperty(propertyName, item: IntegrationConfig, index: number)
  {
    return (
      <div>
        {this.formatValue(propertyName, item.get(propertyName))}
      </div>
    );
  }

  public getIntegrationActions(index: number, integration: IntegrationConfig)
  {
    return (
      <RemoveIcon
        className='close'
        onClick={this._fn(this.deleteIntegration, integration.id)}
      />
    );
  }

  public render()
  {
    const { integrations } = this.props;
    const keys = integrations.keySeq().toList().sort();
    const integrationList = keys.map((id) => integrations.get(id));
    return (
      <div
        className='integration-page'
      >
        <div
          className='integration-list-wrapper'
        >
          <ItemList
            items={integrationList.toList()}
            columnConfig={[
              {
                name: 'id',
                render: this._fn(this.renderProperty, 'id'),
              },
              {
                name: 'name',
                render: this._fn(this.renderProperty, 'name'),
              },
              {
                name: 'type',
                render: this._fn(this.renderProperty, 'type'),
              },
              {
                name: 'created By',
                render: this._fn(this.renderProperty, 'createdBy'),
              },
              {
                name: 'last Modified',
                render: this._fn(this.renderProperty, 'lastModified'),
              },
            ]}
            onRowClicked={this.handleRowClick}
            getActions={this.getIntegrationActions}
            itemsName='integration'
            canCreate={TerrainTools.isAdmin()}
            onCreate={this.createIntegration}
          />
        </div>
      </div>
    );
  }
}

const IntegrationList = Util.createContainer(
  IntegrationListUncontained,
  [
    ['etl', 'integrations'],
    ['users', 'users'],
  ],
  {
    etlActions: ETLActions,
  },
);

export default IntegrationList;
