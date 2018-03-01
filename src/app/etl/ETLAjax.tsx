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

import { _ETLTemplate, ETLTemplate, templateForBackend } from 'etl/templates/TemplateTypes';
import { TemplateBase } from 'shared/etl/types/ETLTypes';

export type ErrorHandler = (response: string | MidwayError) => void;

// making this an instance in case we want stateful things like cancelling ajax requests
class ETLAjax
{
  public templatesToImmutable(templates: TemplateBase[]): List<ETLTemplate>
  {
    return List(templates)
      .map((template, index) => _ETLTemplate(template as TemplateBase, true))
      .toList();
  }

  public fetchTemplates(
    onLoad: (response: List<ETLTemplate>) => void,
    onError: ErrorHandler,
  )
  {
    const handleResponse = (templates: TemplateBase[]) =>
    {
      onLoad(this.templatesToImmutable(templates));
    };
    return Ajax.req(
      'get',
      'etl/templates/',
      {},
      handleResponse,
      {
        onError,
      },
    );
  }

  public getTemplate(
    id: number,
    onLoad: (response: List<ETLTemplate>) => void,
    onError: ErrorHandler,
  )
  {
    const handleResponse = (templates: TemplateBase[]) =>
    {
      onLoad(this.templatesToImmutable(templates));
    };
    return Ajax.req(
      'get',
      `etl/templates/${id}`,
      {},
      handleResponse,
      {
        onError,
      },
    );
  }

  public createTemplate(
    template: ETLTemplate,
    onLoad: (response: List<ETLTemplate>) => void,
    onError: ErrorHandler,
  )
  {
    const templateToSave = templateForBackend(template);
    const handleResponse = (templates: TemplateBase[]) =>
    {
      onLoad(this.templatesToImmutable(templates));
    };
    return Ajax.req(
      'post',
      `etl/templates/create`,
      templateToSave,
      handleResponse,
      {
        onError,
      },
    );
  }

  public saveTemplate(
    template: ETLTemplate,
    onLoad: (response: List<ETLTemplate>) => void,
    onError: ErrorHandler,
  )
  {
    const id = template.id;
    const templateToSave = templateForBackend(template);
    const handleResponse = (templates: TemplateBase[]) =>
    {
      onLoad(this.templatesToImmutable(templates));
    };
    if (typeof id !== 'number')
    {
      onError(`id "${id}" is invalid`);
    }
    return Ajax.req(
      'post',
      `etl/templates/update/${id}`,
      templateToSave,
      handleResponse,
      {
        onError,
      },
    );
  }
}

export default new ETLAjax();
