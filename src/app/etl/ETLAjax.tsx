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

import MidwayError from 'shared/error/MidwayError';
import { Ajax } from 'util/Ajax';

import { AuthActions as Actions } from 'src/app/auth/data/AuthRedux';

import { _ETLTemplate, ETLTemplate, templateForBackend } from 'etl/templates/TemplateTypes';
import { TemplateBase } from 'shared/etl/types/ETLTypes';

export type ErrorHandler = (response: string | MidwayError) => void;

// making this an instance in case we want stateful things like cancelling ajax requests
class ETLAjax
{
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

  public executeTemplate(templateId: number, downloadFilename?: string): Promise<void>
  {
    return new Promise((resolve, reject) => {
      // const options = {
      //   onError: reject
      // };
      // if (downloadFilename !== undefined)
      // {
      //   options['downloadFilename'] = downloadFilename;
      //   options['download'] = true;
      // }

      // return Ajax.req(
      //   'post',
      //   `etl/execute`,
      //   { templateId },
      //   (resp?) => resolve(),
      //   options,
      // );
      const payload = {
        templateID: String(templateId)
      };
      this.reqFormData(
        'etl/execute',
        payload,
        (resp) => console.log(resp),
        { onError: reject }
      );
    });
  }

  public fetchTemplates(): Promise<List<ETLTemplate>>
  {
    return new Promise((resolve, reject) => {
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
    return new Promise((resolve, reject) => {
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

  public createTemplate(template: ETLTemplate): Promise<List<ETLTemplate>>
  {
    const templateToSave = templateForBackend(template);
    return new Promise((resolve, reject) => {
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
    return new Promise((resolve, reject) => {
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

  // private reqDownload(
  //   route: string,
  //   data: {
  //     [k: string]: string | File
  //   },
  //   config: {
  //     fileName?: string,
  //   }
  // )
  // {
  //   const fullUrl = MIDWAY_HOST + '/midway/v1/' + route;
  //   console.log(fullUrl);
  //   const form = document.createElement('form');
  //   form.setAttribute('action', fullUrl);
  //   form.setAttribute('method', 'post');
  //   form.setAttribute('target', '_blank');

  //   const input = document.createElement('input');
  //   input.setAttribute('type', 'hidden');
  //   input.setAttribute('test', 'yoyoyoyo');
  //   input.setAttribute('value', 'wtf yo');
  //   form.appendChild(input);

  //   document.body.appendChild(form);
  //   form.submit();
  //   form.remove();
  // }

  private reqFormData(
    route: string,
    data: {
      [k: string]: string | File
    },
    handleResponse: (response: any) => void,
    config: {
      onError?: (response: any) => void,
    }
  )
  {
    const formData = new FormData();
    formData.append('id', String(localStorage['id']));
    formData.append('accessToken', localStorage['accessToken']);

    for (const key of Object.keys(data))
    {
      formData.append(key, data[key]);
    }

    const xhr = new XMLHttpRequest();
    xhr.open('post', MIDWAY_HOST + '/midway/v1/' + route);
    xhr.send(formData);

    const onError = config.onError !== undefined ? config.onError : () => null;
    const onLoad = (response: any) => {
      // let responseData: object = null;
      // try {
      //   responseData = JSON.parse(response);
      // }
      // catch (e) {
      //   onError(e);
      // }
      // if (responseData !== null)
      // {
      //   handleResponse(responseData);
      // }
      handleResponse(response);
    };

    xhr.onerror = (err: any) =>
    {
      const routeError: MidwayError = new MidwayError(400, 'The Connection Has Been Lost.', JSON.stringify(err), {});
      onError(routeError);
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
        onError(xhr.responseText);
        return;
      }
      onLoad(xhr.responseText);
    };
  }
}

export default new ETLAjax();
