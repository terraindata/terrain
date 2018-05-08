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
// tslint:disable:max-classes-per-file

import * as Immutable from 'immutable';
const { List, Map } = Immutable;
import * as Radium from 'radium';
import * as React from 'react';
import { withRouter } from 'react-router';

import { Algorithm, LibraryState } from 'library/LibraryTypes';
import TerrainStore from 'src/app/store/TerrainStore';
import Util from 'util/Util';

import { ETLActions } from 'etl/ETLRedux';
import ETLRouteUtil from 'etl/ETLRouteUtil';
import { ETLState } from 'etl/ETLTypes';
import TemplateEditor from 'etl/templates/components/TemplateEditor';
import { _TemplateField, TemplateField } from 'etl/templates/FieldTypes';
import { createTreeFromEngine } from 'etl/templates/SyncUtil';
import { TemplateEditorActions } from 'etl/templates/TemplateEditorRedux';
import
{
  DefaultDocumentLimit,
  EditorDisplayState,
  FieldMap,
  TemplateEditorState,
} from 'etl/templates/TemplateEditorTypes';
import { _WalkthroughState, WalkthroughState } from 'etl/walkthrough/ETLWalkthroughTypes';
import { _FileConfig, _SinkConfig, _SourceConfig, FileConfig, SinkConfig, SourceConfig } from 'shared/etl/immutable/EndpointRecords';
import { TemplateProxy } from 'shared/etl/immutable/TemplateProxy';
import { _ETLTemplate, copyTemplate, ETLTemplate } from 'shared/etl/immutable/TemplateRecords';
import TemplateUtil from 'shared/etl/immutable/TemplateUtil';
import { Sinks, Sources } from 'shared/etl/types/EndpointTypes';
import { FileTypes } from 'shared/etl/types/ETLTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';

export default abstract class ETLHelpers
{
  protected editorAct: typeof TemplateEditorActions;
  protected etlAct: typeof ETLActions;

  protected get _state(): Immutable.Map<string, any>
  {
    return TerrainStore.getState() as any;
  }

  protected get _template(): ETLTemplate
  {
    return this._templateEditor.get('template');
  }

  protected get _templateEditor(): TemplateEditorState
  {
    return this._state.get('templateEditor');
  }

  protected get _etl(): ETLState
  {
    return this._state.get('etl');
  }

  protected get _walkthrough(): WalkthroughState
  {
    return this._state.get('walkthrough');
  }

  constructor(protected store)
  {
    this.editorAct = (action) =>
    {
      this.store.dispatch(TemplateEditorActions(action));
    };
    this.etlAct = (action) =>
    {
      this.store.dispatch(ETLActions(action));
    };
  }

  public _try(tryFn: (proxy: TemplateProxy) => void): Promise<void>
  {
    return new Promise<void>((resolve, reject) =>
    {
      let template = copyTemplate(this._template);
      const mutator = (newTemplate: ETLTemplate) =>
      {
        template = newTemplate;
      };
      const accessor = () => template;
      const proxy = new TemplateProxy(accessor, mutator);

      try
      {
        tryFn(proxy);
      }
      catch (e)
      {
        return reject(`${String(e)}`);
      }

      const errors = TemplateUtil.verifyIntegrity(template);
      if (errors.length === 0)
      {
        this.editorAct({
          actionType: 'setTemplate',
          template,
          history: 'push',
        });
        if (!this._templateEditor.isDirty)
        {
          this.editorAct({
            actionType: 'setIsDirty',
            isDirty: true,
          });
        }
        resolve();
      }
      else
      {
        reject(String(errors));
      }
    });
  }

  protected _grabOne<T>(resolve, reject)
  {
    return (response: List<T>) =>
    {
      if (response.size === 0)
      {
        reject('Return result had no items');
      }
      else
      {
        resolve(response.get(0));
      }
    };
  }

  protected _getTemplate(templateId: number): Promise<ETLTemplate>
  {
    return new Promise<ETLTemplate>((resolve, reject) =>
    {
      this.etlAct({
        actionType: 'getTemplate',
        id: templateId,
        onLoad: this._grabOne(resolve, reject),
        onError: reject,
      });
    });
  }

  protected _logError(ev)
  {
    // tslint:disable-next-line
    console.error(ev);
  }

  protected _editorErrorHandler(description: string, showModal = false): (ev: any) => void
  {
    return (ev) =>
    {
      const message = `${description}: ${String(ev)}`;
      if (showModal)
      {
        this.editorAct({
          actionType: 'addModal',
          props: {
            title: 'Error',
            message,
            error: true,
          },
        });
      }
      else
      {
        // tslint:disable-next-line
        console.error(description, ev);
      }
    };
  }
}
