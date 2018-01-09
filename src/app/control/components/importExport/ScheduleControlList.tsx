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

// tslint:disable:no-var-requires strict-boolean-expressions

import * as classNames from 'classnames';
import cronstrue from 'cronstrue';
import { List } from 'immutable';
import * as _ from 'lodash';
import * as React from 'react';

import { backgroundColor, borderColor, Colors, fontColor, getStyle } from 'app/colors/Colors';
import { notificationManager } from 'common/components/InAppNotification';
import { Menu, MenuOption } from 'common/components/Menu';
import Modal from 'common/components/Modal';
import TerrainComponent from 'common/components/TerrainComponent';
import { tooltip } from 'common/components/tooltip/Tooltips';
import { CredentialConfig, SchedulerConfig } from 'control/ControlTypes';
import * as FileImportTypes from 'fileImport/FileImportTypes';
import { ServerMap } from 'schema/SchemaTypes';
import { MidwayError } from 'shared/error/MidwayError';
import ControlActions from '../../data/ControlActions';
import { ControlList, HeaderConfig } from '../ControlList';

import CreateHeadlessCommand from './CreateHeadlessCommand';
import TransportScheduler from './TransportScheduler';

import './TemplateControlList.less';

const DeleteIcon = require('images/icon_close.svg');

type Template = FileImportTypes.Template;

export interface Props
{
  scheduledJobs: List<SchedulerConfig>;
  templates: List<Template>;
  servers: ServerMap;
  credentials: List<CredentialConfig>;
}

enum ConfirmActionType
{
  DELETE,
  DEACTIVATE, // TODO
  ACTIVATE, // TODO
}

class ScheduleControlList extends TerrainComponent<Props>
{
  public state: {
    responseModalOpen: boolean;
    responseModalMessage: string;
    responseModalTitle: string;
    responseModalIsError: boolean;
    confirmModalOpen: boolean;
    confirmModalMessage: string;
    confirmModalTitle: string;
    confirmModalIsError: boolean;
    confirmModalType: ConfirmActionType;
    currentActiveSchedule: SchedulerConfig;
    currentActiveIndex: number;
  } = {
      responseModalOpen: false,
      responseModalMessage: '',
      responseModalTitle: '',
      responseModalIsError: false,
      confirmModalOpen: false,
      confirmModalMessage: '',
      confirmModalTitle: '',
      confirmModalIsError: false,
      confirmModalType: ConfirmActionType.DELETE,
      currentActiveSchedule: undefined,
      currentActiveIndex: -1,
    };

  public displayConfig: HeaderConfig =
    [
      ['ID', (schedule, index) => schedule.id],
      ['Job Type', (schedule, index) => schedule.jobType],
      ['Scheduled Job Name', (schedule, index) => schedule.name],
      ['Schedule Settings', (schedule, index) => cronstrue.toString(schedule.schedule)],
      ['Template Id', (schedule, index) => schedule.paramsScheduleArr[0].templateId],
      ['Template Name', (schedule, index) => this.getTemplateName(schedule.paramsScheduleArr[0].templateId)],
      ['Transfer Type', (schedule, index) => schedule.transport.type],
      ['Transfer Connection', (schedule, index) => this.getConnectionName(schedule.transport.id)],
      ['Transfer Filename', (schedule, index) => schedule.transport.filename],
    ];

  public getOptions(schedule: SchedulerConfig, index: number)
  {
    return List([
      {
        text: 'Delete Scheduled Job',
        onClick: () => this.requestDeleteSchedule(schedule, index),
        icon: <DeleteIcon className='schedule-menu-option-icon' />,
      },
    ]);
  }

  public getConnectionName(transferId)
  {
    const credential = this.props.credentials.find((v, k) => v.id === transferId);
    return credential && credential.name;
  }

  public getTemplateName(templateId)
  {
    const template = this.props.templates.find((v, k) => v.templateId === templateId);
    return template && template.templateName;
  }

  public getServerName(dbid): string // is this needed?
  {
    const server = this.props.servers.find((v, k) => v.connectionId === dbid);
    return server === undefined ? 'Server Not Found' : server.get('name');
  }

  public confirmConfirmModal()
  {
    if (this.state.confirmModalType === ConfirmActionType.DELETE)
    {
      if (this.state.currentActiveSchedule === undefined)
      {
        return;
      }
      ControlActions.importExport.deleteSchedule(
        this.state.currentActiveSchedule.id,
        this.handleDeleteScheduleSuccess,
        this.handleDeleteScheduleError,
      );
    }
  }

  public requestDeleteSchedule(schedule, index)
  {
    this.setState({
      currentActiveSchedule: schedule,
      currentActiveIndex: index,
      confirmModalOpen: true,
      confirmModalMessage: `Are you sure you want to delete schedule "${schedule.id}"?`,
      confirmModalTitle: 'Confirm Action',
      confirmModalIsError: false,
      confirmModalType: ConfirmActionType.DELETE,
    });
  }

  public handleDeleteScheduleSuccess(scheduleName: string)
  {
    notificationManager.addNotification('Schedule Deleted', `Successfully deleted schedule "${scheduleName}"`, 'info', 4);
  }

  public handleDeleteScheduleError(error: string)
  {
    const readable = MidwayError.fromJSON(error).getDetail();
    this.setState({
      responseModalOpen: true,
      responseModalMessage: `Error deleting schedule: ${readable}`,
      responseModalTitle: 'Error',
      responseModalIsError: true,
    });
  }

  public confirmCloseModal()
  {
    this.setState({
      confirmModalOpen: false,
    });
  }

  public responseCloseModal()
  {
    this.setState({
      responseModalOpen: false,
    });
  }

  public render()
  {
    return (
      <div>
        {
          <ControlList
            items={this.props.scheduledJobs}
            config={this.displayConfig}
            getMenuOptions={this.getOptions}
            _templates={this.props.templates}
            _servers={this.props.servers}
            _credentials={this.props.credentials}
          />
        }
        {
          this.state.responseModalOpen &&
          <Modal
            open={this.state.responseModalOpen}
            message={this.state.responseModalMessage}
            title={this.state.responseModalTitle}
            error={this.state.responseModalIsError}
            onClose={this.responseCloseModal}
            confirm={false}
          />
        }
        {
          this.state.confirmModalOpen &&
          <Modal
            open={this.state.confirmModalOpen}
            message={this.state.confirmModalMessage}
            title={this.state.confirmModalTitle}
            error={this.state.confirmModalIsError}
            onClose={this.confirmCloseModal}
            onConfirm={this.confirmConfirmModal}
            confirm={true}
            closeOnConfirm={true}
          />
        }
      </div>
    );
  }
}

export default ScheduleControlList;
