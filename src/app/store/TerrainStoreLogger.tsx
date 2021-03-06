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
import { pathFinderTypeLoader } from 'builder/components/pathfinder/PathfinderTypes';
import * as hdr from 'hdr-histogram-js';
import * as TerrainLog from 'loglevel';
import { AllRecordNameArray, RecordsSerializer, resetRecordNameArray } from 'shared/util/Classes';
import unique from 'unique-selector';

export default class TerrainStoreLogger
{
  public static actionLatencyLog: { [key: string]: hdr.Histogram } = {};

  public static recordingActionPercentileLatency = false;
  public static printStateChange = false;
  public static printActions = false;
  public static printActionStack = false;

  public static actionSerializationLog = [];
  public static serializeAction = false;

  public static reduxMiddleWare = (store: any) =>
    (next: any) =>
      (action: any): any =>
      {
        const actionStart = performance.now();
        let result;
        let stateBeforeAction;
        if (TerrainStoreLogger.printStateChange === true)
        {
          stateBeforeAction = store.getState();
        }
        try
        {
          result = next(action);
        }
        catch (err)
        {
          TerrainLog.error('Builder Event caught an exception: ', action, err);
        }
        const actionEnd = performance.now();
        const actionLatency = actionEnd - actionStart;
        if (TerrainStoreLogger.printActions === true)
        {
          if (TerrainStoreLogger.shouldPrintBuilderAction(action))
          {
            TerrainLog.debug(String(action.type) + ' takes ' + String(actionLatency) + ' ms');
            if (TerrainStoreLogger.printActionStack)
            {
              TerrainLog.debug('Action stack: ' + new Error().stack);
            }
          }
        }
        if (actionLatency > 100)
        {
          // print out the long latency actions
          TerrainLog.debug(String(action.type) + ' takes ' + String(actionLatency) + ' ms');
        }
        if (TerrainStoreLogger.recordingActionPercentileLatency)
        {
          if (TerrainStoreLogger.actionLatencyLog[action.type] === undefined)
          {
            TerrainStoreLogger.actionLatencyLog[action.type] = hdr.build();
          }
          TerrainStoreLogger.actionLatencyLog[action.type].recordValue(actionLatency);
        }
        if (TerrainStoreLogger.serializeAction)
        {
          // should we log this event?
          if (TerrainStoreLogger.shouldLoggingBuilderAction(action))
          {
            const actionString = RecordsSerializer.stringify(action);
            let queryJS = '';
            const query = store.getState().get('builder').query;
            if (query)
            {
              queryJS = query.toJS();
            }
            TerrainStoreLogger.actionSerializationLog.push({ query: queryJS, action: actionString });
          }
        }
        if (TerrainStoreLogger.printStateChange === true)
        {
          if (TerrainStoreLogger.shouldPrintBuilderAction(action))
          {
            const stateAfterAction = store.getState();
            TerrainLog.debug('State Before: ', stateBeforeAction, 'State After:', stateAfterAction, 'Action:', action);
          }
        }
        return result;
      }

  public static replayAction(store, action: string)
  {
    TerrainLog.debug('replaying ' + typeof action + ':' + action);
    const theAction = RecordsSerializer.parse(action);
    store.dispatch(theAction);
  }

  public static reportActionLatency()
  {
    for (const actionType in TerrainStoreLogger.actionLatencyLog)
    {
      if (TerrainStoreLogger.actionLatencyLog.hasOwnProperty(actionType))
      {
        const actionHdr: hdr.Histogram = TerrainStoreLogger.actionLatencyLog[actionType];
        TerrainLog.info(actionType, actionHdr.outputPercentileDistribution());
      }
    }
  }

  public static serializeAllRecordName()
  {
    this.loadRecordTypes();
    return AllRecordNameArray;
  }

  /**
   *
   * @param recordNames: the array of Record type name (the order is important)
   * @returns {boolean}: true if successfully reset the serializer
   */
  public static resetSerializeRecordArray(recordNames: string[]): boolean
  {
    this.loadRecordTypes();
    const resetResult = resetRecordNameArray(recordNames);
    if (resetResult === false)
    {
      // resetting failed
      TerrainLog.warn('DeSerialization Record Name is not as same as serialization Record name: (DeSer)');
      return false;
    }
    return true;
  }

  public static shouldLoggingBuilderAction(action)
  {
    if (action.type.startsWith('builderCards.hoverCard') || action.type.startsWith('colors.setStyle'))
    {
      return false;
    }
    return true;
  }

  public static shouldPrintBuilderAction(action)
  {
    if (action.type.startsWith('builderCards.hoverCard') || action.type.startsWith('colors.setStyle'))
    {
      return false;
    }
    return true;
  }

  public static recordMouseClick(e: MEvent)
  {
    if (TerrainStoreLogger.serializeAction)
    {
      const selector = unique(e.target);
      TerrainLog.debug(String(e.type) + ' on selector' + String(selector));
      TerrainStoreLogger.actionSerializationLog.push({ eventType: e.type, selector });
    }
  }
  public static recordKeyPress(e: KeyboardEvent)
  {
    if (TerrainStoreLogger.serializeAction)
    {
      const selector = unique(e.target);
      TerrainLog.debug(String(e.type) + ' on selector' + String(selector));
      TerrainStoreLogger.actionSerializationLog.push({ eventType: e.type, selector, key: e.key });
    }
  }

  private static loadRecordTypes()
  {
    // make sure we load all pathfinder types
    for (const f of pathFinderTypeLoader)
    {
      const t = f();
    }
  }
}
