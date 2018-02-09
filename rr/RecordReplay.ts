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

import * as commandLineArgs from 'command-line-args';
import * as getUsage from 'command-line-usage';
import * as jsonfile from 'jsonfile';
import * as puppeteer from 'puppeteer';
import * as readlineSync from 'readline-sync';
import * as sleep from 'sleep';

const USERNAME_SELECTOR = '#login-email';
const PASSWORD_SELECTOR = '#login-password';
const BUTTON_SELECTOR = '#app > div > div.app-wrapper > div > div.login-container > div.login-submit-button-wrapper > div';
const CARDSTARTER_SELECTOR = '#cards-column-inner > div.info-area > div.info-area-buttons-container > div';

const optionDefinitions = [
  { name: 'record', alias: 'r', type: Boolean },
  { name: 'replay', alias: 'p', type: Boolean },
  { name: 'help', alias: 'h' },
  { name: 'directory', alias: 'd', type: String },
  { name: 'url', alias: 'u', type: String },
];

const usageSections = [
  {
    header: 'Terrain Redux Recorder',
    content: 'This application records Redux actions while you play the builder, and saves the log for creating new tests.',
  },
  {
    header: 'Options',
    optionList: [
      {
        name: 'help',
        description: 'Print this usage guide.',
      },
      {
        name: 'record',
        typeLabel: 'boolean',
        description: 'Record the actions.',
      },
      {
        name: 'replay',
        typeLabel: 'boolean',
        description: 'Replay the actions.',
      },
      {
        name: 'directory',
        typeLabel: '[underline]{directory}',
        description: 'Where to save/load the action json file.',
      },
      {
        name: 'url',
        typeLabel: '[underline]{builderURL}',
        description: 'Where to start from recording.',
      },
    ],
  },
];

async function loginToBuilder(page, url?)
{
  await loadPage(page, url);
  await page.click(USERNAME_SELECTOR);
  await page.keyboard.type('admin@terraindata.com');
  await page.click(PASSWORD_SELECTOR);
  await page.keyboard.type('secret');
  await page.click(BUTTON_SELECTOR);
}

async function loadPage(page, url)
{
  if (url)
  {
    await page.goto(url);
    sleep.sleep(3);
    await page.waitForSelector(USERNAME_SELECTOR);
  }
}

async function recordBuilderActions(browser, url)
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1200 });
  await loginToBuilder(page, url);
  sleep.sleep(1);
  const records = await page.evaluate(() =>
  {
    window['TerrainTools'].setLogLevel();
    const recordList = window['TerrainTools'].terrainStoreLogger.serializeAllRecordName();
    window['TerrainTools'].terrainStoreLogger.serializeAction = true;
    return recordList;
  });
  while (true)
  {
    if (readlineSync.keyInYN('Do you want to stop recording?'))
    {
      await page.evaluate(() =>
      {
        window['TerrainTools'].terrainStoreLogger.serializeAction = false;
      });
      const actions = await page.evaluate(() =>
      {
        return window['TerrainTools'].terrainStoreLogger.actionSerializationLog;
      });
      await page.close();
      const timestamp = Date();
      return { timestamp, records, actions };
    } else
    {
      continue;
    }
  }
}

async function replayBuilderActions(browser, url, actions)
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1200 });
  await page.goto(url);
  await loginToBuilder(page, url);
  await page.evaluate(() =>
  {
    window['TerrainTools'].setLogLevel();
    window['TerrainTools'].terrainStoreLogger.printStateChange = true;
  });
  // replay the log
  for (let i = 0; i < actions.length; i = i + 1)
  {
    const action = actions[i];
    console.log('Replaying Action ' + typeof action + ':' + action);
    if (action.startsWith('{"type":"hoverCard"'))
    {
      console.log('Ignoring hoverCard action');
      continue;
    }
    await page.evaluate((act) =>
    {
      return window['TerrainTools'].terrainStoreLogger.replayAction(window['TerrainTools'].terrainStore, act);
    }, action);
    sleep.sleep(1);
  }
}

async function rr()
{
  const options = commandLineArgs(optionDefinitions);
  const usage = getUsage(usageSections);
  if (options['help'] !== undefined)
  {
    console.log(usage);
    return;
  }

  // record
  let url = 'http://localhost:3000/builder/!3';
  if (options['url'] !== undefined)
  {
    url = options['url'];
  }
  let actionFileName = './actions.json';
  if (options['directory'] !== undefined)
  {
    actionFileName = options['directory'] + '/actions.json';
  }

  const browser = await puppeteer.launch({ headless: false });

  if (options['record'])
  {
    try
    {
      const actions = await recordBuilderActions(browser, url);
      // saving to options['directory']/actions.json
      jsonfile.writeFileSync(actionFileName, actions);
    } catch (e)
    {
      console.trace(e);
    }
  }

  if (options['replay'])
  {
    // loading from options['directory']/actions.json
    const actionFileData = jsonfile.readFileSync(actionFileName);
    const actions = actionFileData['actions'];
    try
    {
      console.log('Replaying ' + actions.length + ' actions.');
      await replayBuilderActions(browser, url, actions);
    } catch (e)
    {
      console.trace(e);
    }
    while (true)
    {
      if (readlineSync.keyInYN('Do you want to stop the browser?'))
      {
        break;
      } else
      {
        continue;
      }
    }
  }

  console.log('Closing thebrowser');
  await browser.close();
}

rr().catch((err) => console.log('Error when executing rr: ' + err ));
