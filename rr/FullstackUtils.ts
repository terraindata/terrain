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

// tslint:disable:variable-name strict-boolean-expressions no-console restrict-plus-operands

import readline from 'readline-promise';
import * as sleep from 'sleep';
import * as request from 'then-request';

import { TestLogger } from '../shared/test/TestLogger';

function ignoreBuilderAction(action: string): boolean
{
  if (action.startsWith('{"type":"builderCards.hoverCard"') || action.startsWith('{"type":"colors.setStyle"')
    || action.startsWith('{"type":"builder.results"'))
  {
    return true;
  }
  return false;
}

function recursiveRemoveFunctionValue(action)
{
  if (!action)
  {
    return false;
  }
  if (typeof action === 'object')
  {
    if (Array.isArray(action))
    {
      for (const v of action)
      {
        recursiveRemoveFunctionValue(v);
      }
    } else
    {
      // object
      for (const k of Object.keys(action))
      {
        if (typeof action[k] === 'string')
        {
          if (action[k].search('ffunction') !== -1)
          {
            // removing something like `\"getChoiceOptions\":{\"$jsan\":\"ffunction (context) { /* ... */ }\"}`
            delete action[k];
            return true;
          }
        } else if (typeof action[k] === 'object')
        {
          if (recursiveRemoveFunctionValue(action[k]) === true)
          {
            delete action[k];
          }
        }
      }
    }
    return false;
  }
}

function removeFunctionFromBuilderAction(action: string): string
{
  const a = JSON.parse(action);
  recursiveRemoveFunctionValue(a);
  return JSON.stringify(a);
}

export async function getChromeDebugAddress()
{
  try
  {
    const res = await (request as any)('GET', 'http://localhost:9222/json');
    const resBody = JSON.parse(res.getBody());
    const wsAddress = resBody[resBody.length - 1]['webSocketDebuggerUrl'];
    return wsAddress;
  } catch (err)
  {
    TestLogger.error(err);
    return undefined;
  }
}

export async function waitForInput(msg: string)
{
  const rl = readline.createInterface(
    {
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });
  await rl.questionAsync(msg);
  rl.close();
}

export async function replayInputEventOnly(action)
{
  if (action.eventType)
  {
    return true;
  } else
  {
    return false;
  }
}

export async function replayReduxEventOnly(action)
{
  if (action.eventType)
  {
    return false;
  } else
  {
    return true;
  }
}

/**
 *
 * @param action
 * @returns {Promise<boolean>}: If true, keep replaying the action, if false, jump this record.
 */
export async function defaultBeforeAction(action)
{
  return true;
}

export async function defaultAfterAction(action)
{
  sleep.sleep(1);
  return;
}

export async function replayRREvents(page, url, actions, records,
  beforeAction: (action) => Promise<boolean> = defaultBeforeAction,
  afterAction: (action) => void = defaultAfterAction)
{
  const loadRecords = await page.evaluate((recordNames) =>
  {
    return window['TerrainTools'].terrainStoreLogger.resetSerializeRecordArray(recordNames);
  }, records);
  if (loadRecords === false)
  {
    console.warn('Serialization records are changed');
  }
  // replay the log
  for (let i = 0; i < actions.length; i = i + 1)
  {
    const a = actions[i];
    if (await beforeAction(a) === false)
    {
      continue;
    }
    try
    {
      if (a.eventType)
      {
        console.log('Replaying dom event ' + a.eventType + ' on element ' + a.selector);
        await page.waitForSelector(a.selector, { visible: true, hidden: true, timeout: 10000 });
        if (a.eventType === 'click' || a.eventType === 'mousedown')
        {
          await page.click(a.selector);
        } else if (a.eventType === 'dblclick')
        {
          await page.click(a.selector, { clickCount: 2 });
        } else if (a.eventType === 'keypress')
        {
          await page.keyboard.type(a.key);
        }
      } else
      {
        let reduxEvent = actions[i].action;
        if (ignoreBuilderAction(reduxEvent))
        {
          console.log('Ignoring Redux action: ' + String(reduxEvent));
          continue;
        }
        console.log('Replaying the Redux action ' + reduxEvent);
        reduxEvent = removeFunctionFromBuilderAction(reduxEvent);
        await page.mouse.move(0, 0);
        await page.evaluate((act) =>
        {
          return window['TerrainTools'].terrainStoreLogger.replayAction(window['TerrainTools'].terrainStore, act);
        }, reduxEvent);
      }
    } catch (e)
    {
      console.log('WARNING: ' + e);
    }
    await afterAction(a);
  }
}

export function filteringRecordBuilderActions(actions: any[])
{
  return actions.filter((record) => record.action === undefined || ignoreBuilderAction(record.action) === false);
}

const USERNAME_SELECTOR = '#login-email';
const PASSWORD_SELECTOR = '#login-password';
const BUTTON_SELECTOR = '#login-submit';
async function loadPage(page, url)
{
  if (url)
  {
    await page.goto(url);
    sleep.sleep(3);
    await page.waitForSelector(USERNAME_SELECTOR);
  }
}

/**
 * Try to login in to the page
 * @param page
 * @param {string} url
 */
export async function login(page, url: string)
{
  await page.goto(url);
  sleep.sleep(1);
  TestLogger.info('Login ' + url);
  try
  {
    await page.waitForSelector(USERNAME_SELECTOR, { timeout: 1000, visible: true });
    TestLogger.info('Username selector is ready.');
    await page.click(USERNAME_SELECTOR);
    await page.keyboard.type('admin@terraindata.com');
    await page.click(PASSWORD_SELECTOR);
    await page.keyboard.type('CnAATPys6tEB*ypTvqRRP5@2fUzTuY!C^LZP#tBQcJiC*5');
    await page.click(BUTTON_SELECTOR);
    sleep.sleep(5);
  } catch (e)
  {
    TestLogger.warn('The page might be already loaded, keep going.');
    sleep.sleep(4);
  }
}

export async function createAndLoadFirstLiveAlgorithm(page)
{
  await page.evaluate(() =>
  {
    window['TerrainTools'].terrainTests.testCreateCategory();
  });
  sleep.sleep(1);
  const catid = await page.evaluate(() =>
  {
    return window['TerrainTools'].terrainTests.lastCategoryId;
  });
  TestLogger.info('Create a new category, ID:' + String(catid));

  await page.evaluate(() =>
  {
    window['TerrainTools'].terrainTests.testCreateGroup();
  });
  sleep.sleep(1);
  const groupid = await page.evaluate(() =>
  {
    return window['TerrainTools'].terrainTests.lastGroupId;
  });
  TestLogger.info('Create a new group, ID:' + String(groupid));

  await page.evaluate(() =>
  {
    window['TerrainTools'].terrainTests.testCreateAlgorithm();
  });
  sleep.sleep(1);
  const algid = await page.evaluate(() =>
  {
    return window['TerrainTools'].terrainTests.lastAlgorithmId;
  });
  TestLogger.info('Create a new algorithm, ID:' + String(algid));

  await page.evaluate(() =>
  {
    window['TerrainTools'].terrainTests.setAlgorithmStatus();
  });
  sleep.sleep(1);

  await page.evaluate(() =>
  {
    window['TerrainTools'].terrainTests.gotoAlgorithm();
  });
  sleep.sleep(1);
  return { catid, groupid, algid };
}
