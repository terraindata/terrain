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

import * as ip from 'ip';
import * as jsonfile from 'jsonfile';
import * as puppeteer from 'puppeteer';
import * as winston from 'winston';
import { getChromeDebugAddress } from '../../../FullstackUtils';

const USERNAME_SELECTOR = '#login-email';

function getExpectedFile(): string
{
  return __filename.split('.')[0] + '.expected';
}

async function loadPage(page, url)
{
  await page.goto(url);
}

describe('Testing the card parser', () =>
{
  let expected;
  let browser;
  let page;

  beforeAll(async () =>
  {
    expected = jsonfile.readFileSync(getExpectedFile());
    const wsAddress = await getChromeDebugAddress();
    browser = await puppeteer.connect({ browserWSEndpoint: wsAddress });
    winston.info('Connected to the Chrome ' + String(wsAddress));
  });

  it('parse card', async () =>
  {
    page = await browser.newPage();
    winston.info('Created a new browser page.');
    await page.setViewport({ width: 1600, height: 1200 });
    winston.info('Set the page view to 1600x1200.');
    const url = `http://${ip.address()}:3000`;
    winston.info('Get url:' + url);
    await page.goto(url);
    winston.info('Visited url:' + url);
    await page.waitForSelector(USERNAME_SELECTOR);
    winston.info('Loaded the page ' + url);
    for (const testName of Object.keys(expected))
    {
      const testValue: any = expected[testName];
      const request = JSON.stringify(testValue);
      winston.info('Testing request ' + request);
      const cardResult = await page.evaluate((theRequest, theValue) =>
      {
        return window['TerrainTools'].terrainTests.testCardParser(theRequest, theValue);
      }, request, testValue);
      expect(cardResult).toMatchObject({ passed: true, message: 'The test is passed' });
    }
  }, 30000);

  afterAll(async () =>
  {
    await page.close();
    winston.info('The page is closed');
  });
});
