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

import * as Immutable from 'immutable';
import * as _ from 'lodash';
const { List, Map } = Immutable;

import * as download from 'downloadjs';
import MidwayError from 'shared/error/MidwayError';
import { SourceConfig } from 'shared/etl/immutable/EndpointRecords';
import { recordForSave } from 'shared/util/Classes';
import { AuthActions as Actions } from 'src/app/auth/data/AuthRedux';
import { Ajax } from 'util/Ajax';

import { _ETLTemplate, ETLTemplate, templateForBackend } from 'shared/etl/immutable/TemplateRecords';
import { TemplateBase } from 'shared/etl/types/ETLTypes';

export type ErrorHandler = (response: string | MidwayError) => void;

// making this an instance in case we want stateful things like cancelling ajax requests
class ETLAjax
{
  // Get integrations
  public getIntegrations(): Promise<Map<ID, any>>
  {
    return new Promise((resolve, reject) =>
    {
      const handleResponse = (response: any) =>
      {
        resolve(response);
      }
      return Ajax.req(
        'get',
        'integrations/',
        {},
        handleResponse,
        {
          onError: reject,
        });
    });
  }
  // Get ingegatrion by id
  public getIntegration(integrationId: ID): Promise<any>
  {
    return new Promise((resolve, reject) =>
    {
      const handleResponse = (response: any) =>
      {
        resolve(response);
      }
      return Ajax.req(
        'get',
        `integrations/${integrationId}`,
        {},
        handleResponse,
        {
          onError: reject,
        });
    });
  }
  // Create integration
  public createIntegration(integration: any): Promise<any>
  {
    return new Promise((resolve, reject) =>
    {
      const handleResponse = (response: any) =>
      {
        resolve(response);
      }
      return Ajax.req(
        'post',
        `integrations/`,
        {integration},
        handleResponse,
        {
          onError: reject,
        });
    });
  }
  // Update integration by id
  public updateIntegration(integrationId: ID, integration: any): Promise<any>
  {
    return new Promise((resolve, reject) =>
    {
      const handleResponse = (response: any) =>
      {
        resolve(response);
      }
      return Ajax.req(
        'post',
        `integrations/${integrationId}`,
        {integration},
        handleResponse,
        {
          onError: reject,
        });
    });
  }
  // Delete integration
  public deleteIntegration(integrationId: ID): Promise<any>
  {
    return new Promise((resolve, reject) =>
    {
      const handleResponse = (response: any) =>
      {
        resolve(response);
      }
      return Ajax.req(
        'post',
        `integrations/delete/${integrationId}`,
        {},
        handleResponse,
        {
          onError: reject,
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
          onError: reject,
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
          onError: reject,
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
          onError: reject,
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
          onError: reject,
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
          onError: reject,
        },
      );
    });
  }

  // if download is provided, then the response will be downloaded as the mime type with provided filename
  public executeTemplate(
    template: ETLTemplate,
    options: ExecuteConfig,
  ): Promise<void>
  {
    return new Promise((resolve, reject) =>
    {
      const config: ReqConfig = {
        onError: reject,
      };
      if (options.download !== undefined)
      {
        config.downloadName = options.download.downloadFilename;
        config.mimeType = options.download.mimeType;
      }
      const templateToRun = JSON.stringify(templateForBackend(template));
      const payload = {
        template: templateToRun,
      };
      if (options.files !== undefined)
      {
        _.extend(payload, options.files);
      }
      this.reqFormData(
        'etl/execute',
        payload,
        (resp) => resolve(resp),
        config,
      );
    });
  }

  public fetchPreview(
    source: SourceConfig,
    size: number,
  ): Promise<List<object>>
  {
    return new Promise((resolve, reject) =>
    {
      const handleResponse = (response: any) =>
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
      };
      const payload = {
        source: recordForSave(source),
        size,
      };
      return Ajax.req(
        'post',
        'etl/preview',
        payload,
        handleResponse,
        {
          onError: reject,
        },
      );
    });
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

    xhr.open('post', MIDWAY_HOST + '/midway/v1/' + route);
    xhr.send(formData);
  }
}

interface ReqConfig
{
  onError?: (response: any) => void;
  downloadName?: string;
  mimeType?: string;
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

export default new ETLAjax();
