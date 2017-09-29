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

// tslint:disable:no-var-requires

import * as classNames from 'classnames';
import * as Immutable from 'immutable';
import * as React from 'react';

import { Menu, MenuOption } from 'common/components/Menu';
import Modal from 'common/components/Modal';
import TerrainComponent from 'common/components/TerrainComponent';
import { tooltip } from 'common/components/tooltip/Tooltips';
import * as FileImportTypes from 'fileImport/FileImportTypes';
import Ajax from 'util/Ajax';
import ControlActions from '../data/ControlActions';
import ControlStore from '../data/ControlStore';

import './TemplateControlList.less';
// const CodeIcon = require('images/icon_tqlDropdown.svg');
const DeleteIcon = require('images/icon_close.svg');
const ImportIcon = require('images/icon_import.svg');
const ScheduleIcon = require('images/icon_dateDropdown.svg');
const AccessIcon = require('images/icon_key-1.svg');
const ViewIcon = require('images/icon_search.svg');

const { List } = Immutable;

type Template = FileImportTypes.Template;
type HeaderConfigItem = [string, (rowElem) => any];
type HeaderConfig = HeaderConfigItem[];

export interface Props
{
  todo?: string // ignore this for now
}

type ConfirmActionType = 'DELETE' | 'RESET';

class AccessTokenControl extends TerrainComponent<Props>
{
  public state: {
    templates: List<Template>;
    responseModalOpen: boolean;
    responseModalMessage: string;
    responseModalTitle: string;
    responseModalIsError: boolean;
    confirmModalOpen: boolean;
    confirmModalMessage: string;
    confirmModalTitle: string;
    confirmModalIsError: boolean;
    confirmModalType: ConfirmActionType;
    confirmModalTemplate: Template;
  } = {
    templates: List([]),
    responseModalOpen: false,
    responseModalMessage: '',
    responseModalTitle: '',
    responseModalIsError: false,
    confirmModalOpen: false,
    confirmModalMessage: '',
    confirmModalTitle: '',
    confirmModalIsError: false,
    confirmModalType: 'DELETE',
    confirmModalTemplate: undefined,
  };

  public templateConfig: HeaderConfig;

  constructor(props)
  {
    super(props);
    this._subscribe(ControlStore, {
      stateKey: 'templates',
      storeKeyPath: ['importExportTemplates'],
    });
  }

  public getOptions(template)
  {
   return List([
      {
        text: 'Delete Template',
        onClick: () => {
          this.requestDeleteTemplate(template);
        },
        icon: <DeleteIcon className='template-menu-option-icon'/>,
        iconColor: '#555',
      },
      {
        text: 'Headless Import',
        onClick: () => undefined,
        icon: <ImportIcon className='template-menu-option-icon'/>,
        iconColor: '#555',
      },
      {
        text: 'Schedule Import',
        onClick: () => undefined,
        icon: <ScheduleIcon className='template-menu-option-icon'/>,
        iconColor: '#555',
      },
      {
        text: 'Reset Access Token',
        onClick: () => undefined,
        icon: <AccessIcon className='template-menu-option-icon'/>,
        iconColor: '#555',
      },
      {
        text: 'View Details',
        onClick: () => undefined,
        icon: <ViewIcon className='template-menu-option-icon'/>,
        iconColor: '#555',
      },
    ]);
  }

  public getTemplateConfig()
  {
    // const menuOptions = List([option1]);
    return [
      ['ID', (template) => template.templateId],
      ['Name', (template) => template.templateName],
      ['Template Type', (template) => template.export === 0 ? 'Import' : 'Export'],
      ['Server ID', (template) => template.dbid],
      ['Index', (template) => template.dbname],
      ['Type', (template) => template.tablename],
      ['Access Token', (template) =>
        <div className='access-token-cell'>
          {template.persistentAccessToken}
        </div>
      ],
      ['', (template) =>
        <div className='template-menu-options-wrapper'>
          <Menu options={this.getOptions(template)}/>
        </div>
      ],
    ];
  }

  public confirmConfirmModal()
  {
    if (this.state.confirmModalType === 'DELETE')
    {
      if (this.state.confirmModalTemplate === undefined)
      {
        return;
      }
      ControlActions.importExport.deleteTemplate(
        this.state.confirmModalTemplate.templateId,
        this.handleDeleteTemplateSuccess,
        this.handleDeleteTemplateError,
        this.state.confirmModalTemplate.templateName
      );
    }
    else if (this.state.confirmModalType === 'RESET')
    {
      // TODO: complete this
    }
  }

  public requestDeleteTemplate(template)
  {
    this.setState({
      confirmModalTemplate: template,
      confirmModalOpen: true,
      confirmModalMessage: `Are you sure you want to delete template "${template.templateName}"`,
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
  public componentDidMount()
  {
    ControlActions.importExport.fetchTemplates();
  }

  public renderTemplate(template: Template, index: number)
  {
    return (
      <div className='template-info' key={index}>
        {
          this.getTemplateConfig().map((headerItem: HeaderConfigItem, i: number) =>
          {
            return (
              <div className='template-info-data' key={i}>
                {headerItem[1](template)}
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
        {this.state.templates.map(this.renderTemplate)}
      </div>
    );
  }

  public render()
  {
    return (
      <div className='import-export-token-control-page'>
        <div className='import-export-control-title'>
          Manage Templates
        </div>
        {this.renderTable()}
        <Modal
          open={this.state.responseModalOpen}
          message={this.state.responseModalMessage}
          title={this.state.responseModalTitle}
          error={this.state.responseModalIsError}
          onClose={this.responseCloseModal}
          confirm={false}
        />
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
      </div>
    )
  }
}

export default AccessTokenControl;
