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

// tslint:disable:variable-name strict-boolean-expressions no-console restrict-plus-operands max-line-length

import * as ip from 'ip';
import * as puppeteer from 'puppeteer';
import * as sleep from 'sleep';

const USERNAME_SELECTOR = '#login-email';
const PASSWORD_SELECTOR = '#login-password';
const BUTTON_SELECTOR = '#login-submit';

import { toMatchImageSnapshot } from 'jest-image-snapshot';
import { TestLogger } from '../../../shared/test/TestLogger';
import { getChromeDebugAddress } from '../../FullstackUtils';

expect.extend({ toMatchImageSnapshot } as any);

async function takeAndCompareScreenShot(page, options?)
{
  const localOption = { failureThreshold: '0.01', failureThresholdType: 'percent' };
  if (options)
  {
    Object.assign(localOption, options);
  }
  const image = await page.screenshot();
  (expect(image) as any).toMatchImageSnapshot(localOption);
}

async function loginToBuilder(page, url)
{
  await page.goto(url);
  sleep.sleep(1);
  TestLogger.info('Goto the login page ' + url);
  await page.waitForSelector(USERNAME_SELECTOR);
  TestLogger.info('Username selector is ready.');
  await takeAndCompareScreenShot(page);
  await page.click(USERNAME_SELECTOR);
  await page.keyboard.type('admin@terraindata.com');
  await page.click(PASSWORD_SELECTOR);
  await page.keyboard.type('CnAATPys6tEB*ypTvqRRP5@2fUzTuY!C^LZP#tBQcJiC*5');
  await page.click(BUTTON_SELECTOR);
  sleep.sleep(6);
  await takeAndCompareScreenShot(page);
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
  await takeAndCompareScreenShot(page);

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
  await takeAndCompareScreenShot(page);

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
  await takeAndCompareScreenShot(page);

  await page.evaluate(() =>
  {
    window['TerrainTools'].terrainTests.gotoAlgorithm();
  });
  sleep.sleep(1);
  TestLogger.info('Load algorithm ' + String(algid));
  await takeAndCompareScreenShot(page);
}

describe('jest-image-snapshot usage with an image received from puppeteer', () =>
{
  let browser;
  let page;

  beforeAll(async (done) =>
  {
    const wsAddress = await getChromeDebugAddress();
    browser = await puppeteer.connect({ browserWSEndpoint: wsAddress });
    TestLogger.info('Connected to the Chrome ' + wsAddress);
    done();
    // browser = await puppeteer.launch({headless: false});
    // page = await browser.newPage();
  });

  it('login', async (done) =>
  {
    page = await browser.newPage();
    TestLogger.info('Created a new page.');
    await page.setViewport({ width: 1600, height: 1200 });
    const url = `http://${ip.address()}:3000`;
    await loginToBuilder(page, url);
    done();
  }, 200000);

  afterAll(async (done) =>
  {
    await page.close();
    TestLogger.info('The page is closed.');
    await browser.disconnect();
    done();
  });
});
