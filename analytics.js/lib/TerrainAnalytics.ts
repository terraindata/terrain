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

import jsurl = require('jsurl');
import sizeof = require('object-sizeof');
declare let ClientJS: any;
import 'clientjs';

// tslint:disable:strict-boolean-expressions

// Use the 'data-server' attribute to specify the backend server
// <script src='...' data-server='http://<terrain-analytics-domain>/sigint/v1/'>

const scripts = document.getElementsByTagName('script');
const currentScript = scripts[scripts.length - 1];
const server = currentScript.getAttribute('data-server');
const client = new ClientJS();
let fingerprint = null;
let batch = [];
let batchSize = 0; // memoized so we aren't always computing sizeof(batch)

const TerrainAnalytics = {
  assembleParams(asObject: bool, eventName: string | any, variantOrSourceId: string | any, meta?: any)
  {
    const visitorID = meta != null && meta.hasOwnProperty('visitorid') ? meta['visitorid'] :
      (fingerprint || (fingerprint = client.getFingerprint()));

    if (asObject)
    {
      return Object.assign({
        eventname: eventName,
        visitorid: String(visitorID),
        variantid: String(variantOrSourceID),
      }, meta !== null && meta !== undefined ? meta : undefined);
    }

    let paramString = 'eventname=' + String(eventName)
      + '&visitorid=' + String(visitorID)
      + '&variantid=' + String(variantOrSourceID);

    if (meta !== null && meta !== undefined)
    {
      paramString += '&meta=' + jsurl.stringify(meta);
    }

    return paramString;
  },

  queueEvent(eventName: string | any, variantOrSourceID: string | any, meta?: any)
  {
    const event = assembleParams(true, eventName, variantOrSourceId, meta);
    batch.push(event);
    batchSize += sizeof(event);
    // GET requests should be under 2kB.  If we get too close to this limit,
    // immediately process and reset the buffer.
    if (batchSize >= 1900) {
      logQueue();
    }
  },

  logQueue()
  {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', (server || '') + '?batch=' + jsurl.stringify(batch), true);
    xhr.send();
    batch = [];
    batchSize = 0;
  }

  logEvent(eventName: string | any, variantOrSourceID: string | any, meta?: any)
  {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', (server || '') + '?' + assembleParams(false, eventName, variantOrSourceId, meta), true);
    xhr.send();
  },
};

// noinspection TypeScriptUnresolvedVariable
window['TerrainAnalytics'] = TerrainAnalytics;
export = TerrainAnalytics;
