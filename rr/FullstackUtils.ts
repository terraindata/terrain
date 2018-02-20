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

// tslint:disable:variable-name strict-boolean-expressions no-console restrict-plus-operands

import readline from 'readline-promise';
import * as sleep from 'sleep';

function ignoreBuilderAction(action: string): boolean
{
  if (action.startsWith('{"type":"builderCards.hoverCard"') || action.startsWith('{"type":"colors.setStyle"')
    || action.startsWith('{"type":"builder.results"'))
  {
    return true;
  }
  return false;
}

export async function waitForInput(msg: string)
{
  const rl = readline.createInterface(
    {
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });
  const answer = await rl.questionAsync(msg);
  rl.close();
}

export async function replayBuilderActions(page, url, actions, records, actionCallBack?)
{
  const loadRecords = await page.evaluate((recordNames) =>
  {
    // window['TerrainTools'].setLogLevel();
    return window['TerrainTools'].terrainStoreLogger.resetSerializeRecordArray(recordNames);
  }, records);
  if (loadRecords === false)
  {
    console.log('Failed to load the serialization records: ' + records);
    return;
  }
  // replay the log
  for (let i = 0; i < actions.length; i = i + 1)
  {
    const action = actions[i];
    console.log('Replaying Action ' + typeof action + ':' + action);

    if (ignoreBuilderAction(action))
    {
      console.log('Ignoring action: ' + String(action));
      continue;
    }
    await page.evaluate((act) =>
    {
      return window['TerrainTools'].terrainStoreLogger.replayAction(window['TerrainTools'].terrainStore, act);
    }, action);
    sleep.sleep(1);
    if (actionCallBack)
    {
      await actionCallBack();
    }
  }
}

export function filteringRecordBuilderActions(actions: string[])
{
  return actions.filter((action) => ignoreBuilderAction(action) === false);
}
