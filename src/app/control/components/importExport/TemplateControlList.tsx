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
import * as React from 'react';

import { backgroundColor, borderColor, Colors, fontColor } from 'common/Colors';
import { Menu, MenuOption } from 'common/components/Menu';
import Modal from 'common/components/Modal';
import TerrainComponent from 'common/components/TerrainComponent';
import { tooltip } from 'common/components/tooltip/Tooltips';
import * as FileImportTypes from 'fileImport/FileImportTypes';
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
}

type ConfirmActionType = 'DELETE' | 'RESET';

class AccessTokenControl extends TerrainComponent<Props>
{
  public state: {
    // templates: List<Template>;
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
    // templates: List([]),
    responseModalOpen: false,
    responseModalMessage: '',
    responseModalTitle: '',
    responseModalIsError: false,
    confirmModalOpen: false,
    confirmModalMessage: '',
    confirmModalTitle: '',
    confirmModalIsError: false,
    confirmModalType: 'DELETE',
    currentActiveTemplate: undefined,
    currentActiveIndex: -1,
    headlessModalOpen: false,
  };

  public templateConfig: HeaderConfig;

  constructor(props)
  {
    super(props);
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
        onClick: () => undefined,
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

  public getTemplateConfig(): HeaderConfig
  {
    // const menuOptions = List([option1]);
    return [
      ['ID', (template, index) => template.templateId],
      ['Name', (template, index) => template.templateName],
      ['Template Type', (template, index) => template.export ? 'Export' : 'Import'],
      ['Server ID', (template, index) => template.dbid],
      ['Index', (template, index) => template.dbname],
      ['Type', (template, index) => template.tablename],
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
    if (this.state.confirmModalType === 'DELETE')
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
    else if (this.state.confirmModalType === 'RESET')
    {
      // TODO: complete this
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
    });
  }

  public handleDeleteTemplateSuccess(templateName: string)
  {
    this.setState({
      responseModalOpen: true,
      responseModalMessage: `Successfully deleted template "${templateName}"`,
      responseModalTitle: 'Template Deleted',
      responseModalIsError: false,
    });
  }

  public handleDeleteTemplateError(error: string)
  {
    this.setState({
      responseModalOpen: true,
      responseModalMessage: `Error deleting template: ${error}`,
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

  public headlessCloseModal()
  {
    this.setState({
      headlessModalOpen: false,
    });
  }

  public renderTemplate(template: Template, index: number)
  {
    return (
      <div className='template-info' key={index} style={backgroundColor(Colors().bg3)}>
        {
          this.getTemplateConfig().map((headerItem: HeaderConfigItem, i: number) =>
          {
            return (
              <div className='template-info-data' key={i} style={borderColor(Colors().border3)}>
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
    return <CreateHeadlessCommand templates={this.props.templates} index={this.state.currentActiveIndex} />;
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

export default AccessTokenControl;
