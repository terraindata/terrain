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

import * as _ from 'lodash';
// Log levels
const LEVEL_TEXT = 'text';
const LEVEL_DEBUG = 'debug';
const LEVEL_INFO = 'info';
const LEVEL_WARN = 'warn';
const LEVEL_ERROR = 'error';

// Log message styles per level
const logStyles = {
  [LEVEL_TEXT]: 'color: darkgrey;',
  [LEVEL_DEBUG]: 'color: white; background-color: darkgrey; display: block;',
  [LEVEL_INFO]: 'color: white; background: blue; font-weight: bold; display: block;',
  [LEVEL_WARN]: 'color: white; background-color: orange; display: block;',
  [LEVEL_ERROR]: 'color: white; background-color: red; display: block;',
};

// Toggle-able features
const FEATURE_KEY_PREFIX = 'toggle-feature-'; // prefix for the localStorage key.

class TerrainTools {
  public static ANALYTICS = 'analytics';

  public static welcome() {
    TerrainTools.log('TerrainTools test are loaded');
  }

  public static help() {
    TerrainTools.log(`
API:
TerrainTools.activate(<feature>)
TerrainTools.deactivate(<feature>)

Example:
TerrainTools.activate(TerrainTools.ANALYITICS);

Toggle-able Features:
* TerrainTools.ANALYTICS`, LEVEL_TEXT)
  }

  public static activate(feature) {
    localStorage.setItem(TerrainTools.getFeatureKey(feature), '1');
    TerrainTools.log(`${_.capitalize(feature)} has been enabled, refresh the page.`)
  }

  public static deactivate(feature) {
    localStorage.setItem(TerrainTools.getFeatureKey(feature), '0');
    TerrainTools.log(`${_.capitalize(feature)} has been disabled, refresh the page.`)
  }

  public static isFeatureEnabled(feature) {
    return localStorage.getItem(TerrainTools.getFeatureKey(feature)) === '1';
  }

  public static getFeatureKey(feature) {
    return `${FEATURE_KEY_PREFIX}${feature}`;
  }

  public static log(message, logLevel = LEVEL_INFO) {
    console.error(`%c ${message} `, logStyles[logLevel]);
  }
}

export default TerrainTools;
