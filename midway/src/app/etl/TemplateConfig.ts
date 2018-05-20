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
import * as _ from 'lodash';
import ConfigType from '../ConfigType';

import { _ETLTemplate, ETLTemplate, templateForBackend } from 'shared/etl/immutable/TemplateRecords';
import { DefaultSinkConfig, DefaultSourceConfig } from 'shared/etl/types/EndpointTypes';
import { ETLProcess, TemplateBase, TemplateMeta, TemplateObject, TemplateSettings } from 'shared/etl/types/ETLTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';

export class TemplateConfig extends ConfigType implements TemplateBase
{
  public id?: number = undefined;
  public createdAt: Date = null;
  public lastModified: Date = null;
  public archived: boolean = false; // TODO, add ability to filter on this in routes
  public templateName: string = '';
  public process: ETLProcess = {
    nodes: {},
    edges: [],
    uidNode: 0,
    uidEdge: 0,
  };
  public sources: DefaultSourceConfig = {};
  public sinks: DefaultSinkConfig = {};
  public settings: TemplateSettings = {};
  public meta: TemplateMeta = {};
  public uiData = {};

  constructor(props: object)
  {
    super();
    ConfigType.initialize(this, props);
  }
}

export function recordToConfig(template: ETLTemplate): TemplateConfig
{
  const asObject = templateForBackend(template);
  return new TemplateConfig(asObject);
}

export type TemplateInDatabase = {
  [k in keyof TemplateBase]: string | number | boolean;
};

// deserialize fields of an object in-place
export function parseKeys<T>(obj: T, keys: Array<(keyof T)>)
{
  for (const key of keys)
  {
    if (obj[key] != null && typeof obj[key] === 'string')
    {
      obj[key] = JSON.parse(obj[key] as any);
    }
  }
}

export function destringifySavedTemplate(obj: TemplateInDatabase): TemplateConfig
{
  const newObj: TemplateObject = _.extend({}, obj);
  const template = new TemplateConfig(newObj);
  parseKeys(template, ['sources', 'sinks', 'process', 'settings', 'meta', 'uiData']);
  return template;
}

export function templateForSave(template: TemplateObject): TemplateInDatabase
{
  const obj = _.extend({}, template);
  obj.sources = JSON.stringify(template.sources);
  obj.sinks = JSON.stringify(template.sinks);
  obj.process = JSON.stringify(template.process);
  obj.settings = JSON.stringify(obj.settings);
  obj.meta = JSON.stringify(obj.meta);
  obj.uiData = JSON.stringify(obj.uiData);
  return obj;
}
