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
import * as Immutable from 'immutable';
import * as _ from 'lodash';
import * as React from 'react';

import { backgroundColor, borderColor, Colors, fontColor, getStyle } from 'common/Colors';
import { notificationManager } from 'common/components/InAppNotification';
import { Menu, MenuOption } from 'common/components/Menu';
import Modal from 'common/components/Modal';
import TerrainComponent from 'common/components/TerrainComponent';
import { tooltip } from 'common/components/tooltip/Tooltips';
import * as FileImportTypes from 'fileImport/FileImportTypes';
import { ServerMap } from 'schema/SchemaTypes';
import { MidwayError } from 'shared/error/MidwayError';
import Ajax from 'util/Ajax';
import ControlActions from '../../data/ControlActions';

import CreateHeadlessCommand from './CreateHeadlessCommand';
import './TemplateControlList.less';
// const CodeIcon = require('images/icon_tqlDropdown.svg');
const DeleteIcon = require('images/icon_close.svg');
const ImportIcon = require('images/icon_import.svg');
const ScheduleIcon = require('images/icon_dateDropdown.svg');
const AccessIcon = require('images/icon_key-1.svg');
const ViewIcon = require('images/icon_search.svg');

const { List } = Immutable;

type Template = FileImportTypes.Template;
type HeaderConfigItem = [string, (rowElem, index) => any];
type HeaderConfig = HeaderConfigItem[];

export interface Props
{
  templates: List<Template>;
  servers: ServerMap;
}

enum ConfirmActionType
{
  DELETE,
  RESET,
}

class AccessTokenControl extends TerrainComponent<Props>
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
    currentActiveTemplate: Template;
    currentActiveIndex: number;
    headlessModalOpen: boolean;
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
    currentActiveTemplate: undefined,
    currentActiveIndex: -1,
    headlessModalOpen: false,
  };

  public templateConfig: HeaderConfig;

  constructor(props)
  {
    super(props);
    this.getServerName = _.memoize(this.getServerName);
  }

  public getOptions(template: Template, index: number)
  {
    const typeText = template.export ? 'Export' : 'Import';
    return List([
      {
        text: 'Delete Template',
        onClick: () => this.requestDeleteTemplate(template, index),
        icon: <DeleteIcon className='template-menu-option-icon' />,
        iconColor: '#555', // iconColor doesn't work right now
      },
      {
        text: `Headless ${typeText}`,
        onClick: () => this.requestCreateHeadless(template, index),
        icon:
        <ImportIcon
          className={classNames({
            'template-menu-option-icon': true,
            'template-icon-export': template.export,
          })}
        />,
        iconColor: '#555',
      },
      {
        text: `Schedule ${typeText}`,
        onClick: () => undefined,
        icon: <ScheduleIcon className='template-menu-option-icon' />,
        iconColor: '#555',
      },
      {
        text: 'Reset Access Token',
        onClick: () => this.requestResetTemplateToken(template, index),
        icon: <AccessIcon className='template-menu-option-icon' />,
        iconColor: '#555',
      },
      {
        text: 'View Raw',
        onClick: () => undefined,
        icon: <ViewIcon className='template-menu-option-icon' />,
        iconColor: '#555',
      },
    ]);
  }

  public getServerName(dbid): string
  {
    const server = this.props.servers.find((v, k) => v.connectionId === dbid);
    return server === undefined ? 'Server Not Found' : server.get('name');
  }

  public getTemplateConfig(): HeaderConfig
  {
    return [
      ['ID', (template, index) => template.templateId],
      ['Name', (template, index) => template.templateName],
      ['Template Type', (template, index) => template.export ? 'Export' : 'Import'],
      ['Server Name', (template, index) => this.getServerName(template.dbid)],
      ['ES Index', (template, index) => template.dbname],
      ['ES Type', (template, index) => template.tablename],
      ['Access Token', (template, index) =>
        <div className='access-token-cell'>
          {template.persistentAccessToken}
        </div>,
      ],
      ['', (template, index) =>
        <div className='template-menu-options-wrapper'>
          <Menu options={this.getOptions(template, index)} />
        </div>,
      ],
    ];
  }

  public requestCreateHeadless(template: Template, index: number)
  {
    this.setState({
      headlessModalOpen: true,
      currentActiveTemplate: template,
      currentActiveIndex: index,
    });
  }

  public confirmConfirmModal()
  {
    if (this.state.confirmModalType === ConfirmActionType.DELETE)
    {
      if (this.state.currentActiveTemplate === undefined)
      {
        return;
      }
      ControlActions.importExport.deleteTemplate(
        this.state.currentActiveTemplate.templateId,
        this.handleDeleteTemplateSuccess,
        this.handleDeleteTemplateError,
        this.state.currentActiveTemplate.templateName,
      );
    }
    else if (this.state.confirmModalType === ConfirmActionType.RESET)
    {
      if (this.state.currentActiveTemplate === undefined)
      {
        return;
      }
      ControlActions.importExport.resetTemplateToken(
        this.state.currentActiveTemplate.templateId,
        this.handleResetTemplateTokenSuccess,
        this.handleResetTemplateTokenError,
      );
    }
  }

  public requestDeleteTemplate(template, index)
  {
    this.setState({
      currentActiveTemplate: template,
      currentActiveIndex: index,
      confirmModalOpen: true,
      confirmModalMessage: `Are you sure you want to delete template "${template.templateName}"?`,
      confirmModalTitle: 'Confirm Action',
      confirmModalIsError: false,
      confirmModalType: ConfirmActionType.DELETE,
    });
  }

  public handleDeleteTemplateSuccess(templateName: string)
  {
    notificationManager.addNotification('Template Deleted', `Successfully deleted template "${templateName}"`, 'info', 4);
  }

  public handleDeleteTemplateError(error: string)
  {
    const readable = MidwayError.fromJSON(error).getDetail();
    this.setState({
      responseModalOpen: true,
      responseModalMessage: `Error deleting template: ${readable}`,
      responseModalTitle: 'Error',
      responseModalIsError: true,
    });
  }

  public handleResetTemplateTokenSuccess()
  {
    notificationManager.addNotification('Token Reset', 'Successfully Reset Access Token', 'info', 4);
  }

  public handleResetTemplateTokenError(error: string)
  {
    const readable = MidwayError.fromJSON(error).getDetail();
    this.setState({
      responseModalOpen: true,
      responseModalMessage: `Error resetting access token: ${readable}`,
      responseModalTitle: 'Error',
      responseModalIsError: true,
    });
  }

  public requestResetTemplateToken(template, index)
  {
    this.setState({
      currentActiveTemplate: template,
      currentActiveIndex: index,
      confirmModalOpen: true,
      confirmModalMessage: `Are you sure you want to reset the access token for "${template.templateName}"?`,
      confirmModalTitle: 'Confirm Action',
      confirmModalIsError: false,
      confirmModalType: ConfirmActionType.RESET,
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

  public headlessCloseModal()
  {
    this.setState({
      headlessModalOpen: false,
    });
  }

  public renderTemplate(template: Template, index: number)
  {
    return (
      <div className='template-info' key={index} style={tableRowStyle}>
        {
          this.getTemplateConfig().map((headerItem: HeaderConfigItem, i: number) =>
          {
            return (
              <div className='template-info-data' key={i}>
                {headerItem[1](template, index)}
              </div>
            );
          })
        }
      </div>
    );
  }

  public renderTable()
  {
    return (
      <div className='import-export-token-control-table'>
        <div
          className={classNames({
            'template-info-header': true,
          })}
          key='header'
        >
          {
            this.getTemplateConfig().map((headerItem: HeaderConfigItem, i: number) =>
            {
              return (
                <div className='template-info-data' key={i}>
                  {headerItem[0]}
                </div>
              );
            })
          }
        </div>
        {this.props.templates.map(this.renderTemplate)}
      </div>
    );
  }

  public renderCreateHeadlessCommand()
  {
    return (
      <CreateHeadlessCommand
        templates={this.props.templates}
        index={this.state.currentActiveIndex}
        getServerName={this.getServerName}
      />
    );
  }

  public render()
  {
    const typeText = (this.state.currentActiveTemplate !== undefined &&
      this.state.currentActiveTemplate.export) ? 'Export' : 'Import';

    return (
      <div>
        {this.renderTable()}
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
        {
          this.state.headlessModalOpen &&
          <Modal
            open={this.state.headlessModalOpen}
            title={`Compose Headless Command`}
            onClose={this.headlessCloseModal}
            children={this.renderCreateHeadlessCommand()}
            allowOverflow={true}
            wide={true}
            noFooterPadding={true}
          />
        }
      </div>
    );
  }
}

const tableRowStyle = _.extend({},
  backgroundColor(Colors().bg3),
  borderColor(Colors().bg2),
);

// const cellMiddleStyle = _.extend({},
//   getStyle('borderTopColor', Colors().highlight),
//   getStyle('borderBottomColor', Colors().darkerHighlight),
// )

// const cellLeftStyle = _.extend({},
//   getStyle('borderLeftColor', Colors().border1),
//   getStyle('borderTopColor', Colors().highlight),
//   getStyle('borderBottomColor', Colors().darkerHighlight),
// );

// const cellRightStyle = _.extend({},
//   getStyle('borderRightColor', Colors().darkerHighlight),
//   getStyle('borderTopColor', Colors().highlight),
//   getStyle('borderBottomColor', Colors().darkerHighlight),
// );

export default AccessTokenControl;
