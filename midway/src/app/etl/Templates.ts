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

import * as fs from 'fs';
import * as naturalSort from 'javascript-natural-sort';
import * as _ from 'lodash';
import * as request from 'request';
import * as stream from 'stream';
import * as winston from 'winston';

import * as Tasty from '../../tasty/Tasty';
import * as App from '../App';
import CredentialConfig from '../credentials/CredentialConfig';
import Credentials from '../credentials/Credentials';
import UserConfig from '../users/UserConfig';
import { versions } from '../versions/VersionRouter';

import { destringifySavedTemplate, TemplateConfig, templateForSave, TemplateInDatabase } from './TemplateConfig';

export default class Templates
{
  private templateTable: Tasty.Table;

  constructor()
  {
    this.templateTable = new Tasty.Table(
      'templates',
      ['id'],
      [
        'templateName',
        'transformationEngine',
        'transformationConfig',
        'sources',
        'sinks',
      ],
    );
  }

  public async get(id?: number): Promise<TemplateConfig[]>
  {
    return new Promise<TemplateConfig[]>(async (resolve, reject) =>
    {
      const params = id !== undefined ? { id } : undefined;
      const rawTemplates = await App.DB.select(this.templateTable, [], params);
      const templates = rawTemplates.map((value, index) =>
        destringifySavedTemplate(value as TemplateInDatabase));
      resolve(templates);
    });
  }

  public async validateTemplate(template: TemplateConfig, requireExistingId?: boolean):
    Promise<{ valid: boolean, message: string}>
  {
    const { sources, sinks, transformationEngine } = template;
    let valid = true;
    const messages: string[] = [];
    if (requireExistingId)
    {
      if (template.id == null || typeof template.id !== 'number')
      {
        valid = false;
        messages.push(`id is missing or invalid type: ${template.id}`);
      }
      else
      {
        const searchForTemplates = await this.get(template.id);
        if (searchForTemplates.length === 0)
        {
          valid = false;
          messages.push(`no template with the specified id exists`);
        }
      }
    }
    if (sources == null || typeof sources !== 'object')
    {
      valid = false;
      messages.push(`sources is missing or invalid type: ${sources}`);
    }
    else if (sinks == null || typeof sources !== 'object')
    {
      valid = false;
      messages.push(`sinks is missing or invalid type: ${sinks}`);
    }
    else if (transformationEngine == null || typeof transformationEngine !== 'object')
    {
      valid = false;
      messages.push(`transformation engine is missing or invalid type: ${transformationEngine} .`);
    }
    return { valid, message: `${messages}`};
  }

  public async create(template: TemplateConfig): Promise<TemplateConfig>
  {
    return new Promise<TemplateConfig>(async (resolve, reject) =>
    {
      const { valid, message } = await this.validateTemplate(template);
      if (!valid)
      {
        return reject(message);
      }
      const newTemplate: TemplateConfig = {
        templateName: template.templateName,
        transformationEngine: template.transformationEngine,
        transformationConfig: template.transformationConfig,
        sources: template.sources,
        sinks: template.sinks,
      };
      resolve(await this.upsert(newTemplate));
    });
  }

  public async update(template: TemplateConfig): Promise<TemplateConfig>
  {
    return new Promise<TemplateConfig>(async (resolve, reject) =>
    {
      const { valid, message } = await this.validateTemplate(template, true);
      if (!valid)
      {
        return reject(message);
      }
      const newTemplate: TemplateConfig = {
        id: template.id,
        templateName: template.templateName,
        transformationEngine: template.transformationEngine,
        transformationConfig: template.transformationConfig,
        sources: template.sources,
        sinks: template.sinks,
      };
      resolve(await this.upsert(newTemplate));
    });
  }

  public async upsert(newTemplate: TemplateConfig): Promise<TemplateConfig>
  {
    const toUpsert = templateForSave(newTemplate);
    return App.DB.upsert(this.templateTable, toUpsert) as Promise<TemplateConfig>;
  }
}
