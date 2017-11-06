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

import * as Immutable from 'immutable';

import Ajax from 'util/Ajax';
import ActionTypes from './ControlActionTypes';

import { _CredentialConfig, _SchedulerConfig, CredentialConfig, SchedulerConfig } from 'control/ControlTypes';
import * as FileImportTypes from 'fileImport/FileImportTypes';
import * as _ from 'lodash';
import { _ControlState, ControlState } from './ControlStore';
type Template = FileImportTypes.Template;

const { List, Map } = Immutable;

const ControlReducer = {};

ControlReducer[ActionTypes.importExport.fetchTemplates] =
  (state, action) =>
  {
    Ajax.getAllTemplates(
      action.payload.exporting,
      (templatesArr) =>
      {
        const templates: List<Template> = List<Template>(templatesArr.map((template) =>
        { // TODO move this translation to _Template
          return FileImportTypes._Template(_.extend({},
            template,
            {
              export: action.payload.exporting,
              templateId: template['id'],
              templateName: template['name'],
              originalNames: List<string>(template['originalNames']),
            },
            action.payload.exporting ? { objectKey: template['objectKey'] } : {},
          ));
        },
        ));
        action.payload.setTemplates(templates, action.payload.exporting);
      },
    );
    return state;
  };

ControlReducer[ActionTypes.importExport.setTemplates] =
  (state, action) =>
  {
    const stateVar = action.payload.exporting ? 'exportTemplates' : 'importTemplates';
    return state.set(stateVar, action.payload.templates);
  };

ControlReducer[ActionTypes.importExport.deleteTemplate] =
  (state, action) =>
  {
    Ajax.deleteTemplate(
      action.payload.templateId,
      action.payload.exporting,
      () =>
      {
        action.payload.handleDeleteTemplateSuccess(action.payload.templateName);
        action.payload.fetchTemplates(action.payload.exporting);
      },
      (err: string) =>
      {
        action.payload.handleDeleteTemplateError(err);
        action.payload.fetchTemplates(action.payload.exporting);
      },
    );
    return state;
  };

ControlReducer[ActionTypes.importExport.resetTemplateToken] =
  (state, action) =>
  {
    Ajax.resetTemplateToken(
      action.payload.templateId,
      action.payload.exporting,
      () =>
      {
        action.payload.handleResetSuccess();
        action.payload.fetchTemplates(action.payload.exporting);
      },
      (err: string) =>
      {
        action.payload.handleResetError(err);
        action.payload.fetchTemplates(action.payload.exporting);
      },
    );
    return state;
  };

ControlReducer[ActionTypes.importExport.fetchSchedules] =
  (state, action) =>
  {
    Ajax.getAllScheduledJobs(
      (schedulesArr) =>
      {
        const schedules: List<SchedulerConfig> = List<SchedulerConfig>(schedulesArr.map((schedule: SchedulerConfig) =>
        {
          return _SchedulerConfig(_.extend({},
            schedule,
            { transport: JSON.parse(schedule.transportStr), paramsScheduleArr: JSON.parse(schedule.paramsScheduleStr) },
          ));
        },
        ));
        action.payload.setSchedules(schedules);
      },
    );
    return state;
  };

ControlReducer[ActionTypes.importExport.setSchedules] =
  (state, action) =>
  {
    return state.set('importExportScheduledJobs', action.payload.schedules);
  };

ControlReducer[ActionTypes.importExport.fetchCredentials] =
  (state, action) =>
  {
    Ajax.getCredentialConfigs(
      (credentialsArr) =>
      {
        const credentials: List<CredentialConfig> = List<CredentialConfig>(credentialsArr.map((credential) =>
        {
          return _CredentialConfig(_.extend({}, credential));
        },
        ));
        action.payload.setCredentials(credentials);
      },
    );
    return state;
  };

ControlReducer[ActionTypes.importExport.setCredentials] =
  (state, action) =>
  {
    return state.set('importExportCredentials', action.payload.credentials);
  };

ControlReducer[ActionTypes.importExport.createSchedule] =
  (state, action) =>
  {
    const params = _.pick(action.payload, ['name', 'jobType', 'paramsJob', 'schedule', 'sort', 'transport']);
    Ajax.createSchedule(params,
      (resp: object[]) =>
      {
        action.payload.onLoad(resp);
        action.payload.fetchSchedules();
      },
      (err: string) =>
      {
        action.payload.onError(err);
        action.payload.fetchSchedules();
      },
    );
    return state;
  };

ControlReducer[ActionTypes.importExport.deleteSchedule] =
  (state, action) =>
  {
    Ajax.deleteSchedule(action.payload.id,
      (resp: object[]) =>
      {
        action.payload.onLoad(resp);
        action.payload.fetchSchedules();
      },
      (err: string) =>
      {
        action.payload.onError(err);
        action.payload.fetchSchedules();
      },
    );
    return state;
  };

const ControlReducerWrapper = (state: ControlState = _ControlState(), action) =>
{
  let nextState = state;
  if (ControlReducer[action.type])
  {
    nextState = ControlReducer[action.type](state, action);
  }
  return nextState;
};

export default ControlReducerWrapper;
