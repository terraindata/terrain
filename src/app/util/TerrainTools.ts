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
import * as _ from 'lodash';
import * as TerrainLog from 'loglevel';
import { LogLevelDesc } from 'loglevel';
import TerrainStore from 'store/TerrainStore';
import TerrainStoreLogger from 'store/TerrainStoreLogger';
import TerrainTests from 'util/TerrainTests';

// Log levels
const LEVEL_TRACE = 'trace';
const LEVEL_DEBUG = 'debug';
const LEVEL_INFO = 'info';
const LEVEL_WARN = 'warn';
const LEVEL_ERROR = 'error';
const LEVEL_SILENT = 'silent';

// Log message styles per level
const logStyles = {
  [LEVEL_TRACE]: 'color: darkgrey;',
  [LEVEL_DEBUG]: 'color: white; background-color: darkgrey; display: block;',
  [LEVEL_INFO]: 'color: white; background: blue; font-weight: bold; display: block;',
  [LEVEL_WARN]: 'color: white; background-color: orange; display: block;',
  [LEVEL_ERROR]: 'color: white; background-color: red; display: block;',
};

// Toggle-able features
const FEATURE_KEY_PREFIX = 'toggle-feature-'; // prefix for the localStorage key.

// tslint:disable:no-console
class TerrainTools
{
  public static ANALYTICS = 'analytics';
  public static ADVANCED_RESULTS = 'advanced_results';
  public static SIMPLE_PARSER = 'simple_parser';
  public static OPERATORS = 'operators';

  public static terrainStoreLogger = TerrainStoreLogger;
  public static terrainStore = TerrainStore;
  public static terrainTests = TerrainTests;

  public static welcome()
  {
    TerrainTools.log('TerrainTools test are loaded');
  }

  public static help()
  {
    TerrainTools.log(`
API:
TerrainTools.activate(<feature>)
TerrainTools.deactivate(<feature>)

Example:
TerrainTools.activate(TerrainTools.ANALYITICS);

Toggle-able Features:
* TerrainTools.ANALYTICS`, LEVEL_INFO);
  }

  public static isAdmin()
  {
    const store = TerrainStore.getState() as Immutable.Map<string, any>;
    const user = store.get('users').get('currentUser');

    return user && user.isSuperUser;
  }

  public static activate(feature)
  {
    if (TerrainTools.isAdmin())
    {
      localStorage.setItem(TerrainTools.getFeatureKey(feature), '1');
      TerrainTools.log(`${_.capitalize(feature)} has been enabled, refresh the page.`);
    } else
    {
      TerrainTools.log('You need to be Admin to enable/disabled features', LEVEL_ERROR);
    }
  }

  public static deactivate(feature)
  {
    if (TerrainTools.isAdmin())
    {
      localStorage.setItem(TerrainTools.getFeatureKey(feature), '0');
      TerrainTools.log(`${_.capitalize(feature)} has been disabled, refresh the page.`);
    } else
    {
      TerrainTools.log('You need to be Admin to enable/disabled features', LEVEL_ERROR);
    }
  }

  public static isFeatureEnabled(feature)
  {
    return localStorage.getItem(TerrainTools.getFeatureKey(feature)) === '1';
  }

  public static getFeatureKey(feature)
  {
    return `${FEATURE_KEY_PREFIX}${feature}`;
  }

  public static log(message, logLevel = LEVEL_INFO)
  {
    switch (logLevel)
    {
      case LEVEL_TRACE:
        TerrainLog.trace(`%c ${message} `, logStyles[logLevel]);
        break;
      case LEVEL_DEBUG:
        TerrainLog.debug(`%c ${message} `, logStyles[logLevel]);
        break;
      case LEVEL_INFO:
        TerrainLog.info(`%c ${message} `, logStyles[logLevel]);
        break;
      case LEVEL_WARN:
        TerrainLog.warn(`%c ${message} `, logStyles[logLevel]);
        break;
      case LEVEL_ERROR:
        TerrainLog.error(`%c ${message} `, logStyles[logLevel]);
        break;
      default:
        TerrainLog.error(`%c ${message} `, logStyles[logLevel]);
    }
  }
  // turn on all levels of logging if no parameter
  public static setLogLevel(logLevel = LEVEL_TRACE)
  {
    TerrainLog.setLevel(logLevel as LogLevelDesc);
  }

  public static setDefaultLogLevel(logLevel = LEVEL_WARN)
  {
    TerrainLog.setDefaultLevel(logLevel as LogLevelDesc);
  }
}
export default TerrainTools;
