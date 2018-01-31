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

import * as puppeteer from 'puppeteer';
import * as sleep from 'sleep';
import * as ip from 'ip';
import * as syncRequest from 'sync-request';

const USERNAME_SELECTOR = '#login-email';
const PASSWORD_SELECTOR = '#login-password';
const BUTTON_SELECTOR = '#app > div > div.app-wrapper > div > div.login-container > div.login-submit-button-wrapper > div';
const CARDSTARTER_SELECTOR = '#cards-column-inner > div.info-area > div.info-area-buttons-container > div';

import { toMatchImageSnapshot }  from 'jest-image-snapshot';

expect.extend({ toMatchImageSnapshot });

async function loginToBuilder(page, url)
sel  await page.goto(url);
  sleep.sleep(3);
  let image = await page.screenshot();
  expect(image).toMatchImageSnapshot();
  await page.waitForSelector(USERNAME_SELECTOR);
  await page.click(USERNAME_SELECTOR);
  await page.keyboard.type('admin@terraindata.com');
  await page.click(PASSWORD_SELECTOR);
  await page.keyboard.type('secret');
  await page.click(BUTTON_SELECTOR);
  await page.waitForSelector(CARDSTARTER_SELECTOR);

  sleep.sleep(1);
  image = await page.screenshot();
  expect(image).toMatchImageSnapshot();

  await page.click(CARDSTARTER_SELECTOR);
}

function getChromeDebugAddress()
{
  try
  {
    const res = syncRequest('GET', 'http://localhost:9222/json');
    const resBody = JSON.parse(res.getBody());
    const wsAddress = resBody[0]['webSocketDebuggerUrl'];
    return wsAddress;
  } catch (err)
  {
    console.log(err);
    return undefined;
  }
}

describe('jest-image-snapshot usage with an image received from puppeteer', () => {
  let browser;

  beforeAll(async () => {
    const wsAddress = getChromeDebugAddress();
    browser = await puppeteer.connect({ browserWSEndpoint: wsAddress});
  });

  it('works', async () => {
    const page = await browser.newPage();
    await page.setViewport({width: 1600, height: 1200});
    const url = `http://${ip.address()}:8080/builder/!3`;
    await loginToBuilder(page, url)
    sleep.sleep(3);
    const image = await page.screenshot();
    expect(image).toMatchImageSnapshot();
  }, 100000);

  afterAll(async () => {
    await page.close();
  });
});
