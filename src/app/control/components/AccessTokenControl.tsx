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

import TerrainComponent from 'common/components/TerrainComponent';
import { tooltip } from 'common/components/tooltip/Tooltips';
import * as FileImportTypes from 'fileImport/FileImportTypes';
import Ajax from 'util/Ajax';
import ControlActions from '../data/ControlActions';
import ControlStore from '../data/ControlStore';

import './AccessTokenControl.less';

const CodeIcon = require('images/icon_tqlDropdown.svg');
const { List } = Immutable;

type Template = FileImportTypes.Template;

export interface Props
{
  todo?: string // ignore this for now
}

type HeaderConfigItem = [string, (rowElem) => any];
type HeaderConfig = HeaderConfigItem[];

const TemplateConfig: HeaderConfig = [
  ['ID', (template) => template.templateId],
  ['Name', (template) => template.templateName],
  ['Type', (template) => template.export === 0 ? 'Import' : 'Export'],
  ['Db ID', (template) => template.dbid],
  ['Database', (template) => template.dbname],
  ['Table', (template) => template.tablename],
  ['Access Token', (template) =>
    <div className='access-token-cell'>
      {template.persistentAccessToken}
    </div>
  ],
  ['Headless Code', (template) =>
    tooltip(
      <div className='curl-code-wrapper'>
        <CodeIcon className='curl-code-icon'/>
      </div>,
      {
        title: 'Copy to Clipboard',
        position: 'top-start',
      }
    )
  ]
];

class AccessTokenControl extends TerrainComponent<Props>
{
  public state: {
    templates: List<Template>;
  } = {
    templates: List([]),
  };

  constructor(props)
  {
    super(props);

    this._subscribe(ControlStore, {
      stateKey: 'templates',
      storeKeyPath: ['templates'],
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
          TemplateConfig.map((headerItem: HeaderConfigItem, i: number) => {
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
          TemplateConfig.map((headerItem: HeaderConfigItem, i: number) => {
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
          Templates
        </div>
        {this.renderTable()}
      </div>
    )
  }
}

export default AccessTokenControl;
