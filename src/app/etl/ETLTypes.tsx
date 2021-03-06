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
// tslint:disable:import-spacing max-classes-per-file

import { ModalProps } from 'common/components/overlay/MultiModal';
import * as Immutable from 'immutable';
import { List, Map } from 'immutable';

import { IntegrationConfig } from 'shared/etl/immutable/IntegrationRecords';
import { ETLTemplate } from 'shared/etl/immutable/TemplateRecords';
import { makeConstructor, makeExtendedConstructor, WithIRecord } from 'shared/util/Classes';

class ETLStateC
{
  public templates: List<ETLTemplate> = List([]);
  public loading: { [k: string]: number } = {}; // a tracker to verify if we are waiting on queries
  public modalRequests: List<ModalProps> = List([]);
  public integrations: IMMap<ID, IntegrationConfig> = Map<ID, IntegrationConfig>();
  // TODO the way we track what is running and how the ui deals with it is suboptimal
  public runningTemplates: Immutable.Map<number, ETLTemplate> = Map();
  public acknowledgedRuns: Immutable.Map<number, boolean> = Map();
  public ETLProgress: string = '';
  public blockState: NotificationState = _NotificationState();
  public mappingCache: Immutable.Map<string, object> = Map();
  public previewObject: object = null;
}
export type ETLState = WithIRecord<ETLStateC>;
export const _ETLState = makeConstructor(ETLStateC);

class NotificationStateC
{
  public uidBlockers = 1;
  public blockLogs: List<string> = List([]);
  public activeBlocks: List<{ id: number, title: string }> = List([]);

  public isBlocked(): boolean
  {
    return this.activeBlocks.size > 0;
  }

  public getCurrentBlocker(): { id: number, title: string }
  {
    return this.activeBlocks.first();
  }

  public nextBlockId(): number
  {
    return this.uidBlockers;
  }

  public addLog(log: string): NotificationState
  {
    const notif: NotificationState = this as any;
    return notif.update('blockLogs', (logs) => logs.push(log));
  }

  public addBlocker(title: string): NotificationState
  {
    let notif: NotificationState = this as any;
    const id = notif.uidBlockers;
    if (!notif.isBlocked())
    {
      notif = notif.set('blockLogs', List([]));
    }
    notif = notif.update('activeBlocks', (blocks) => blocks.push({ id, title }))
      .set('uidBlockers', id + 1);
    return notif;
  }

  public removeBlocker(id: number): NotificationState
  {
    let notif: NotificationState = this as any;
    const index = this.activeBlocks.findIndex((block) => block.id === id);
    if (index !== -1)
    {
      notif = notif.update('activeBlocks', (blocks) => blocks.delete(index));
      if (!notif.isBlocked())
      {
        notif = notif.set('blockLogs', List([]));
      }
      return notif;
    }
    else
    {
      return notif;
    }
  }
}
export type NotificationState = WithIRecord<NotificationStateC>;
export const _NotificationState = makeExtendedConstructor(NotificationStateC, true);
