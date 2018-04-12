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

// tslint:disable:variable-name strict-boolean-expressions no-console restrict-plus-operands max-line-length

import * as ip from 'ip';
import * as puppeteer from 'puppeteer';
import * as sleep from 'sleep';
import * as request from 'then-request';

const USERNAME_SELECTOR = '#login-email';
const PASSWORD_SELECTOR = '#login-password';
import * as winston from 'winston';
const BUTTON_SELECTOR = '#app > div > div.app-wrapper > div > div.login-container > div.login-submit-button-wrapper > div';
const CREATE_CATEGORY_SELECTOR = '#app > div > div.app-wrapper > div > div > div:nth-child(2) > div > div > div > div.library-column.library-column-1 > div.library-column-content > div > div.info-area-buttons-container > div';
const CATEGORY_ITEM_SELECTOR = '#app > div > div.app-wrapper > div > div > div:nth-child(2) > div > div > div > div.library-column.library-column-1 > div.library-column-content > div > div.library-category.library-category-BUILD.library-category-open > div > div:nth-child(1) > a > div > div > div > div.library-item-content > div';
const CREATE_GROUP_SELECTOR = '#app > div > div.app-wrapper > div > div > div:nth-child(2) > div > div > div > div.library-column.library-column-2 > div.library-column-content > div.info-area > div.info-area-buttons-container > div';
const CREATE_GROUP_BUTTON_SELECTOR = 'body > div.ReactModalPortal > div > div > div > div > div.modal-buttons > div.button.modal-confirm-button';
const CREATE_ALGORITHM_SELECTOR = '#app > div > div.app-wrapper > div > div > div:nth-child(2) > div > div > div > div.library-column.library-column-3 > div.library-column-content > div.info-area > div.info-area-buttons-container > div';
const ALGORITHM_SELECTOR = '#app > div > div.app-wrapper > div > div > div:nth-child(2) > div > div > div > div.library-column.library-column-3 > div.library-column-content > div:nth-child(2) > div.library-category.library-category-BUILD.library-category-open > div > div:nth-child(1) > a > div > div > div > div.library-item-content > div > div.flex-grow';
const CARDSTARTER_SELECTOR = '#cards-column-inner > div.info-area > div.info-area-buttons-container > div';

import { toMatchImageSnapshot } from 'jest-image-snapshot';
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
  sleep.sleep(5);
  winston.info('Goto the login page ' + url);
  await takeAndCompareScreenShot(page);

  await page.waitForSelector(USERNAME_SELECTOR);
  winston.info('Username selector is ready.');
  await page.click(USERNAME_SELECTOR);
  await page.keyboard.type('admin@terraindata.com');
  await page.click(PASSWORD_SELECTOR);
  await page.keyboard.type('secret');
  await page.click(BUTTON_SELECTOR);
  sleep.sleep(1);
  winston.info('Goto the starting page.');
  await takeAndCompareScreenShot(page);

  await page.waitForSelector(CREATE_CATEGORY_SELECTOR);
  await page.click(CREATE_CATEGORY_SELECTOR);
  winston.info('Create category');
  sleep.sleep(1);
  await takeAndCompareScreenShot(page);

  await page.waitForSelector(CATEGORY_ITEM_SELECTOR);
  await page.click(CATEGORY_ITEM_SELECTOR);
  winston.info('Select category');
  sleep.sleep(1);
  await takeAndCompareScreenShot(page);

  await page.waitForSelector(CREATE_GROUP_SELECTOR);
  await page.click(CREATE_GROUP_SELECTOR);
  winston.info('Select group');
  sleep.sleep(1);
  await takeAndCompareScreenShot(page);

  await page.waitForSelector(CREATE_GROUP_BUTTON_SELECTOR);
  await page.click(CREATE_GROUP_BUTTON_SELECTOR);
  winston.info('Create group');
  sleep.sleep(1);
  await takeAndCompareScreenShot(page);

  await page.waitForSelector(CREATE_ALGORITHM_SELECTOR);
  await page.click(CREATE_ALGORITHM_SELECTOR);
  winston.info('Create algorithm');
  sleep.sleep(1);
  await takeAndCompareScreenShot(page);

  await page.waitForSelector(ALGORITHM_SELECTOR);
  await page.click(ALGORITHM_SELECTOR, { clickCount: 2 });
  winston.info('Select algorithm');
  sleep.sleep(1);
  await takeAndCompareScreenShot(page);
}

describe('jest-image-snapshot usage with an image received from puppeteer', () =>
{
  let browser;
  let page;

  beforeAll(async () =>
  {
    const wsAddress = await getChromeDebugAddress();
    browser = await puppeteer.connect({ browserWSEndpoint: wsAddress });
    winston.info('Connected to the Chrome ' + wsAddress);
    // browser = await puppeteer.launch({headless: false});
    // page = await browser.newPage();
  });

  it('login', async () =>
  {
    page = await browser.newPage();
    winston.info('Created a new page.');
    await page.setViewport({ width: 1600, height: 1200 });
    const url = `http://${ip.address()}:3000`;
    await loginToBuilder(page, url);
  }, 100000);

  afterAll(async () =>
  {
    await page.close();
    winston.info('The page is closed.');
  });
});
