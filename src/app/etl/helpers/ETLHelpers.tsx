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
import { List } from 'immutable';

import TerrainStore from 'src/app/store/TerrainStore';

import { ETLActions } from 'etl/ETLRedux';
import { ETLState } from 'etl/ETLTypes';
import { TemplateEditorActions } from 'etl/templates/TemplateEditorRedux';
import { TemplateEditorState } from 'etl/templates/TemplateEditorTypes';
import { WalkthroughState } from 'etl/walkthrough/ETLWalkthroughTypes';
import { SchemaActions } from 'schema/data/SchemaRedux';
import { TemplateProxy } from 'shared/etl/immutable/TemplateProxy';
import { copyTemplate, ETLTemplate } from 'shared/etl/immutable/TemplateRecords';
import TemplateUtil from 'shared/etl/immutable/TemplateUtil';
import { JobsActions } from 'src/app/jobs/data/JobsRedux';
import { JobsState } from 'src/app/jobs/JobsTypes';

export default abstract class ETLHelpers
{
  /*
   *  makeCall should kick off the async poll call that returns a promise.
   *  makeCall gets called with the last result of its own resolved value
   *  each time makeCall resolves, isFinished will be called on its resolved value.
   *  isFinished and makeCall can throw errors which will be rejected by the returned promise
   *  If isFinished returns true, then the promise with resolve with the last resolved value of the poll function.
   */
  public static asyncPoll<T>(
    makeCall: (promiseValue?: T) => Promise<T>,
    isFinished: (promiseValue?: T) => boolean,
    timeBetweenCalls: number = 5000,
    trailing = false,
  ): Promise<T>
  {
    return new Promise<T>((resolve, reject) =>
    {
      let lastValue;
      const eventLoop = () =>
      {
        makeCall(lastValue)
          .then((value) =>
          {
            lastValue = value;
            if (isFinished(lastValue))
            {
              return resolve(lastValue);
            }
            else
            {
              setTimeout(eventLoop, timeBetweenCalls);
            }
          })
          .catch(reject);
      };

      if (trailing)
      {
        setTimeout(eventLoop, timeBetweenCalls);
      }
      else
      {
        eventLoop();
      }
    });
  }

  protected editorAct: typeof TemplateEditorActions;
  protected etlAct: typeof ETLActions;
  protected schemaAct: typeof SchemaActions;
  protected jobsAct: typeof JobsActions;

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

  protected get _jobsState(): JobsState
  {
    return this._state.get('jobs');
  }

  constructor(protected store)
  {
    this.editorAct = (action) =>
    {
      return this.store.dispatch(TemplateEditorActions(action));
    };
    this.etlAct = (action) =>
    {
      return this.store.dispatch(ETLActions(action));
    };
    this.schemaAct = (action) =>
    {
      return this.store.dispatch(SchemaActions(action));
    };
    this.jobsAct = (action) =>
    {
      return this.store.dispatch(JobsActions(action));
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
        this._logError(ev);
      }
      else
      {
        this._logError(ev);
      }
    };
  }

  protected async _logUpdate(update: string)
  {
    this.etlAct({
      actionType: 'updateBlockers',
      updater: (blockState) => blockState.addLog(update),
    });
    await sleep(1);
  }

  protected _blockOn(title: string, fn: () => Promise<any>)
  {
    const { block, unblock } = this._createUIBlocker(title);
    block();
    setTimeout(() => (fn() as any).finally(unblock), 1);
  }

  protected _createUIBlocker(title: string): { block: () => void, unblock: () => void }
  {
    let id = null;
    const block = () =>
    {
      id = this._etl.blockState.nextBlockId();
      this.etlAct({
        actionType: 'updateBlockers',
        updater: (blockState) => blockState.addBlocker(title),
      });
    };
    const unblock = () =>
    {
      if (id === null)
      {
        // error?
      }
      else
      {
        this.etlAct({
          actionType: 'updateBlockers',
          updater: (blockState) => blockState.removeBlocker(id),
        });
      }
    };
    return { block, unblock };
  }
}

function sleep(ms)
{
  return new Promise((resolve) => setTimeout(resolve, ms));
}
