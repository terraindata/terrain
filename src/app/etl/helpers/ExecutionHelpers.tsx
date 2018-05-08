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
// tslint:disable:max-classes-per-file import-spacing

import * as Immutable from 'immutable';
const { List, Map } = Immutable;

import { Algorithm, LibraryState } from 'library/LibraryTypes';
import TerrainStore from 'src/app/store/TerrainStore';
import Util from 'util/Util';

import { ETLActions } from 'etl/ETLRedux';
import ETLRouteUtil from 'etl/ETLRouteUtil';
import { TemplateEditorActions } from 'etl/templates/TemplateEditorRedux';
import { _FileConfig, _SinkConfig, _SourceConfig, FileConfig, SinkConfig, SourceConfig } from 'shared/etl/immutable/EndpointRecords';
import { _ETLTemplate, ETLTemplate } from 'shared/etl/immutable/TemplateRecords';
import TemplateUtil from 'shared/etl/immutable/TemplateUtil';
import { Sinks, SourceOptionsType, Sources } from 'shared/etl/types/EndpointTypes';
import { FileTypes, NodeTypes } from 'shared/etl/types/ETLTypes';
import ETLHelpers from './ETLHelpers';

class ExecutionHelpers extends ETLHelpers
{
  public canRunTemplate(template: ETLTemplate): { canRun: boolean, message: string }
  {
    const { runningTemplates } = this._etl;
    const verifyErrors = TemplateUtil.verifyExecutable(template);
    if (verifyErrors.length > 0)
    {
      return {
        canRun: false,
        message: `Cannot run template "${template.templateName}": ${JSON.stringify(verifyErrors)}`,
      };
    }
    else if (runningTemplates.has(template.id))
    {
      return {
        canRun: false,
        message: `Cannot run template "${template.templateName}". This template is already running`,
      };
    }
    return {
      canRun: true,
      message: '',
    };
  }

  public createExecuteJob(): Promise<number>
  {
    return new Promise<number>((resolve, reject) =>
    {
      this.etlAct({
        actionType: 'createExecuteJob',
        onLoad: resolve,
        onError: reject,
      });
    });
  }

  public runExecuteJobFactory(template: ETLTemplate): (id: number) => Promise<void>
  {
    return (jobId: number) =>
    {
      const defaultSink = template.getDefaultSink();

      let mimeType;
      let downloadName;
      if (defaultSink.type === Sinks.Download)
      {
        const extension = defaultSink.fileConfig.fileType === FileTypes.Json ?
          '.json' : '.csv';
        mimeType = defaultSink.fileConfig.fileType === FileTypes.Json ?
          'application/json' : 'text/csv';
        downloadName = `Export_${template.id}${extension}`;
      }
      const files = {};
      template.getSources().forEach((source, key) =>
      {
        if (source.type === Sources.Upload)
        {
          files[key] = (source.options as SourceOptionsType<Sources.Upload>).file;
        }
      });
      return new Promise<void>((resolve, reject) =>
      {
        this.etlAct({
          actionType: 'runExecuteJob',
          jobId,
          template,
          files,
          downloadName,
          mimeType,
          onLoad: resolve,
          onError: reject,
        });
      });
    };
  }

  public beforeRunTemplate(template: ETLTemplate)
  {
    this.etlAct({
      actionType: 'setRunningTemplate',
      templateId: template.id,
      template,
    });
    this.etlAct({
      actionType: 'setAcknowledgedRun',
      templateId: template.id,
      value: false,
    });
  }

  public afterRunTemplate(template: ETLTemplate)
  {
    this.etlAct({
      actionType: 'clearRunningTemplate',
      templateId: template.id,
    });
    this.etlAct({
      actionType: 'setAcknowledgedRun',
      templateId: template.id,
      value: false,
    });
  }

  public runInlineTemplate(template: ETLTemplate)
  {
    const { canRun, message } = this.canRunTemplate(template);
    if (!canRun)
    {
      this.etlAct({
        actionType: 'addModal',
        props: {
          message,
          title: `Error`,
          error: true,
        },
      });
      return;
    }

    const updateUIAfterSuccess = () =>
    {
      this.afterRunTemplate(template);
      this.etlAct({
        actionType: 'addModal',
        props: {
          message: `"${template.templateName}" finished running`,
          title: 'Task Complete',
        },
      });
      this.schemaAct({
        actionType: 'fetch',
      });
    };
    const updateUIAfterError = (ev) =>
    {
      this.afterRunTemplate(template);
      this.etlAct({
        actionType: 'addModal',
        props: {
          message: `Error while running: ${String(ev)}`,
          title: `Error`,
          error: true,
        },
      });
    };

    this.beforeRunTemplate(template);
    this.createExecuteJob()
      .then(this.runExecuteJobFactory(template))
      .then(updateUIAfterSuccess)
      .catch(updateUIAfterError);
  }
}

export default new ExecutionHelpers(TerrainStore);
