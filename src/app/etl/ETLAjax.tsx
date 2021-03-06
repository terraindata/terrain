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

import { List } from 'immutable';
import * as _ from 'lodash';

import * as download from 'downloadjs';
import MidwayError from 'shared/error/MidwayError';
import { SourceConfig } from 'shared/etl/immutable/EndpointRecords';
import { JobConfig } from 'shared/types/jobs/JobConfig';
import { TaskEnum } from 'shared/types/jobs/TaskEnum';
import { recordForSave } from 'shared/util/Classes';
import { AuthActions as Actions } from 'src/app/auth/data/AuthRedux';
import { Ajax } from 'util/Ajax';

import { _ETLTemplate, ETLTemplate, templateForBackend } from 'shared/etl/immutable/TemplateRecords';
import { TemplateBase } from 'shared/etl/types/ETLTypes';

export type ErrorHandler = (response: string | MidwayError) => void;

// making this an instance in case we want stateful things like cancelling ajax requests
class ETLAjax
{
  public getIntegrations(simple?: boolean): Promise<any[]>
  {
    return new Promise((resolve, reject) =>
    {
      const handleResponse = (response: any) =>
      {
        resolve(response);
      };
      return Ajax.req(
        'get',
        simple ? 'integrations/simple/' : 'integrations/',
        {},
        handleResponse,
        {
          onError: handlerFactory(reject),
        });
    });
  }

  public getIntegration(integrationId: ID, simple?: boolean): Promise<any>
  {
    return new Promise((resolve, reject) =>
    {
      const handleResponse = (response: any) =>
      {
        resolve(response);
      };
      return Ajax.req(
        'get',
        simple ? `integrations/simple/${integrationId}` : `integrations/${integrationId}`,
        {},
        handleResponse,
        {
          onError: handlerFactory(reject),
        });
    });
  }

  public createIntegration(integration: any): Promise<any>
  {
    return new Promise((resolve, reject) =>
    {
      const handleResponse = (response: any) =>
      {
        resolve(response);
      };
      return Ajax.req(
        'post',
        `integrations/`,
        integration,
        handleResponse,
        {
          onError: handlerFactory(reject),
        });
    });
  }

  public updateIntegration(integrationId: ID, integration: any): Promise<any>
  {
    return new Promise((resolve, reject) =>
    {
      const handleResponse = (response: any) =>
      {
        resolve(response);
      };
      return Ajax.req(
        'post',
        `integrations/${integrationId}`,
        integration,
        handleResponse,
        {
          onError: handlerFactory(reject),
        });
    });
  }

  public deleteIntegration(integrationId: ID): Promise<any>
  {
    return new Promise((resolve, reject) =>
    {
      const handleResponse = (response: any) =>
      {
        resolve(response);
      };
      return Ajax.req(
        'post',
        `integrations/delete/${integrationId}`,
        {},
        handleResponse,
        {
          onError: handlerFactory(reject),
        });
    });
  }

  public templatesToImmutable(templates: TemplateBase[]): List<ETLTemplate>
  {
    try
    {
      return List(templates)
        .map((template, index) => _ETLTemplate(template as TemplateBase, true))
        .toList();
    }
    catch (e)
    {
      // todo better error handleing
      // tslint:disable-next-line
      console.error(`Error trying to parse templates ${String(e)}`);
      return List([]);
    }
  }

  public fetchTemplates(): Promise<List<ETLTemplate>>
  {
    return new Promise((resolve, reject) =>
    {
      const handleResponse = (templates: TemplateBase[]) =>
      {
        resolve(this.templatesToImmutable(templates));
      };
      return Ajax.req(
        'get',
        'etl/templates',
        {},
        handleResponse,
        {
          onError: handlerFactory(reject),
        },
      );
    });
  }

  public getTemplate(id: number): Promise<List<ETLTemplate>>
  {
    return new Promise((resolve, reject) =>
    {
      const handleResponse = (templates: TemplateBase[]) =>
      {
        resolve(this.templatesToImmutable(templates));
      };
      return Ajax.req(
        'get',
        `etl/templates/${id}`,
        {},
        handleResponse,
        {
          onError: handlerFactory(reject),
        },
      );
    });
  }

  public deleteTemplate(template: ETLTemplate): Promise<void>
  {
    return new Promise((resolve, reject) =>
    {
      const handleResponse = (response: any) =>
      {
        resolve();
      };
      return Ajax.req(
        'post',
        'etl/templates/delete',
        {
          templateId: template.id,
        },
        handleResponse,
        {
          onError: handlerFactory(reject),
        },
      );
    });
  }

  public createTemplate(template: ETLTemplate): Promise<List<ETLTemplate>>
  {
    const templateToSave = templateForBackend(template);
    return new Promise((resolve, reject) =>
    {
      const handleResponse = (templates: TemplateBase[]) =>
      {
        resolve(this.templatesToImmutable(templates));
      };
      return Ajax.req(
        'post',
        `etl/templates/create`,
        templateToSave,
        handleResponse,
        {
          onError: handlerFactory(reject),
        },
      );
    });
  }

  public saveTemplate(template: ETLTemplate): Promise<List<ETLTemplate>>
  {
    return new Promise((resolve, reject) =>
    {
      const id = template.id;
      const templateToSave = templateForBackend(template);
      const handleResponse = (templates: TemplateBase[]) =>
      {
        resolve(this.templatesToImmutable(templates));
      };
      if (typeof id !== 'number')
      {
        reject(`id "${id}" is invalid`);
      }
      return Ajax.req(
        'post',
        `etl/templates/update/${id}`,
        templateToSave,
        handleResponse,
        {
          onError: handlerFactory(reject),
        },
      );
    });
  }

  public createExecuteJob(templateName: string): Promise<number>
  {
    return new Promise((resolve, reject) =>
    {
      const job: JobConfig = {
        meta: null,
        pausedFilename: null,
        running: false,
        runNowPriority: null,
        scheduleId: null,
        status: null,
        workerId: null,
        name: 'ETL - ' + (templateName.length > 0 ? templateName : 'Unsaved Template'),
        createdBy: null,
        priority: -1,
        type: 'ETL',
        tasks: JSON.stringify([
          {
            id: 0,
            taskId: TaskEnum.taskETL,
            params: null,
          },
        ]),
      };

      return Ajax.req(
        'post',
        'jobs/',
        job,
        (resp) =>
        {
          if (resp[0] !== undefined)
          {
            const jobId = Number(resp[0].id);
            if (!Number.isNaN(jobId))
            {
              return resolve(jobId);
            }
          }
          return reject('No Job Id Returned.');
        },
        {
          onError: handlerFactory(reject),
        },
      );
    });
  }

  public runExecuteJob(
    jobId: number,
    template: ETLTemplate,
    files?: { [k: string]: File },
    downloadName?: string,
    mimeType?: string,
    onProgress?: (progress: string) => void,
  ): Promise<any>
  {
    return new Promise((resolve, reject) =>
    {
      const config: ReqConfig = {
        onError: reject,
        downloadName,
        mimeType,
        onProgress,
      };

      const templateToRun = JSON.stringify(templateForBackend(template));
      const isUpload = files !== undefined && Object.keys(files).length > 0;
      const payload = files !== undefined ? files : {};

      _.extend(payload, { template: templateToRun });

      if (config.downloadName !== undefined && !isUpload)
      {
        this.downloadFile(
          `jobs/runnow/${jobId}`,
          payload,
          (resp) => resolve(resp),
          config,
        );
      } else
      {
        this.reqFormData(
          `jobs/runnow/${jobId}`,
          payload,
          (resp) => resolve(resp),
          config,
        );
      }
    });
  }

  public fetchPreview(
    source: SourceConfig,
    size: number,
    rawStringOnly: boolean,
    fileString?: string,
  ): Promise<List<object> | object>
  {
    return new Promise((resolve, reject) =>
    {
      const handleResponse = (response: any) =>
      {
        if (rawStringOnly === true)
        {
          if (response !== undefined)
          {
            resolve(response.result);
          }
          else
          {
            throw new Error('No valid response');
          }
        }
        else
        {
          let documents;
          try
          {
            documents = List(response);
          }
          catch (e)
          {
            return reject(e);
          }
          if (documents !== undefined)
          {
            resolve(documents);
          }
          else
          {
            throw new Error('No valid response');
          }
        }
      };
      const payload = {
        source: recordForSave(source),
        size,
        fileString,
        rawString: rawStringOnly,
      };
      return Ajax.req(
        'post',
        'etl/preview',
        payload,
        handleResponse,
        {
          onError: handlerFactory(reject),
        },
      );
    });
  }

  // should this be in schema?
  public getMapping(
    serverId: string,
    database: string,
  ): Promise<object>
  {
    return new Promise((resolve, reject) =>
    {
      const handleResponse = (response: any) =>
      {
        resolve(response);
      };
      return Ajax.req(
        'get',
        `schema/${serverId}/${database}`,
        {},
        handleResponse,
        {
          onError: handlerFactory(reject),
        },
      );
    });
  }

  private downloadFile(
    route: string,
    data: {
      [k: string]: string | File,
    },
    handleResponse: (response: any) => void,
    cfg: ReqConfig,
  )
  {
    const fullUrl = '/midway/v1/' + route;
    const form = document.createElement('form');
    form.setAttribute('action', fullUrl);
    form.setAttribute('method', 'post');
    form.setAttribute('target', '_self');

    data['id'] = localStorage['id'];
    data['accessToken'] = localStorage['accessToken'];
    data['downloadName'] = cfg.downloadName;
    Object.keys(data).forEach((key) =>
    {
      const input = document.createElement('input');
      input.setAttribute('type', 'hidden');
      input.setAttribute('name', key);
      input.setAttribute('value', data[key] as any);
      form.appendChild(input);
    });
    document.body.appendChild(form); // Required for FF
    form.submit();
    form.remove();
    handleResponse('');
    return;
  }

  private reqFormData(
    route: string,
    data: {
      [k: string]: string | File,
    },
    handleResponse: (response: any) => void,
    cfg: ReqConfig,
  )
  {
    const isDownload = cfg.downloadName !== undefined;
    const config: ReqConfig = _.extend({
      onError: () => null,
      downloadName: 'file.txt',
      mimeType: 'text/plain',
    }, cfg);

    const formData = new FormData();
    formData.append('id', String(localStorage['id']));
    formData.append('accessToken', localStorage['accessToken']);
    for (const key of Object.keys(data))
    {
      formData.append(key, data[key]);
    }

    const xhr = new XMLHttpRequest();

    if (isDownload)
    {
      xhr.responseType = 'blob';
    }

    xhr.onerror = (err: any) =>
    {
      const routeError: MidwayError = new MidwayError(400, 'The Connection Has Been Lost.', JSON.stringify(err), {});
      config.onError(routeError);
    };

    xhr.onload = (ev: Event) =>
    {
      if (xhr.status === 401)
      {
        // TODO re-enable
        Ajax.reduxStoreDispatch(Actions({ actionType: 'logout' }));
      }
      if (xhr.status !== 200)
      {
        config.onError(xhr.responseText);
        return;
      }

      if (isDownload)
      {
        download((ev.target as any).response, config.downloadName, config.mimeType);
        handleResponse('');
      }
      else
      {
        handleResponse(xhr.responseText);
      }
    };

    if (config.onProgress !== undefined)
    {
      xhr.upload.addEventListener('progress', (e: ProgressEvent) =>
      {
        let percent = 0;
        if (e.total !== 0)
        {
          percent = (e.loaded / e.total) * 100;
          const progress = `Uploading file...${Math.round(percent)}%`;
          config.onProgress(progress);
        }
      }, false);

      // TODO: Think of a better way to show this progress
      // xhr.onprogress = (ev: Event) =>
      // {
      //   try
      //   {
      //     const responseText = xhr.responseText.slice(xhr.responseText.lastIndexOf('{'), xhr.responseText.lastIndexOf('}') + 1);
      //     const response = JSON.parse(responseText);
      //     config.onProgress(`Documents processed...${response.successful}`);
      //   }
      //   catch (e)
      //   {
      //     // do nothing
      //   }
      // }
    }

    xhr.open('post', '/midway/v1/' + route);
    xhr.send(formData);
  }
}

interface ReqConfig
{
  onError?: (response: any) => void;
  downloadName?: string;
  mimeType?: string;
  onProgress?: (progress: string) => void;
}

export interface ExecuteConfig
{
  files?: {
    [id: string]: File;
  };
  download?: {
    downloadFilename?: string;
    mimeType?: string;
  };
}

export function errorToReadable(err: any, defaultMsg: string = 'Unknown Error Occurred')
{
  try
  {
    if (err == null)
    {
      return defaultMsg;
    }
    else if (typeof err.getDetail === 'function') // if the error is already a midway error
    {
      return err.getDetail();
    }
    try
    {
      try
      { // attempt to see if the midway error was created from an already wrapped error
        const detailError = _.get(err, ['response', 'data', 'errors', 0, 'detail']);
        if (detailError !== undefined && detailError !== null)
        {
          if (typeof detailError === 'object')
          {
            return JSON.stringify(detailError);
          }
          else
          {
            return detailError;
          }
        }
      }
      catch (e)
      {
        // do nothing
      }
      const readable = MidwayError.fromJSON(err).getDetail();
      return readable;
    }
    catch (e)
    {
      if (typeof err === 'object')
      {
        return JSON.stringify(err);
      }
      else if (typeof err === 'string')
      {
        return err;
      }
    }
  }
  catch (e)
  {
    return defaultMsg;
  }
  return defaultMsg;
}

function handlerFactory(reject)
{
  return (err) => reject(errorToReadable(err));
}

export default new ETLAjax();
