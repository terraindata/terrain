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

import * as jsonfile from 'jsonfile';

import * as puppeteer from 'puppeteer';
import { TestLogger } from '../../../../shared/test/TestLogger';
import { getChromeDebugAddress, login, waitForInput } from '../../../FullstackUtils';

import { PathFinderStringToJSONArray } from '../../../../src/app/builder/components/pathfinder/PathfinderParser';

function getExpectedActionFile(): string
{
  return __dirname + '/actions.json';
}

async function loadPage(page, url)
{
  await page.goto(url);
}

function acceptableLineValues(src, dst): boolean
{
  if (src === dst)
  {
    return true;
  }

  if (src === String(dst))
  {
    return true;
  }

  if (src === null && dst === '')
  {
    return true;
  }

  if (dst.startsWith('['))
  {
    const arrayValue = PathFinderStringToJSONArray(src);
    if (arrayValue.length === JSON.parse(dst).length)
    {
      return true;
    }
  }
  return false;
}

function interstingLine(l): boolean
{
  if (l.filterGroup)
  {
    if (l.filterGroup.lines.length === 0)
    {
      return false;
    }
    return true;
  } else
  {
    if (l.field && l.comparison)
    {
      return true;
    } else
    {
      return false;
    }
  }
}

function diffLine(srcLine, refLine)
{
  // group?
  if (srcLine.hasOwnProperty('lines'))
  {
    if (refLine.hasOwnProperty('lines') === false)
    {
      TestLogger.warn('Ref group does not have lines: ' + JSON.stringify(srcLine) + ': ' + JSON.stringify(refLine));
      return true;
    }
    const srclines = srcLine.lines.filter((l) => interstingLine(l)).sort((a, b) => a.field - b.field);
    const reflines = refLine.lines.filter((l) => interstingLine(l)).sort((a, b) => a.field - b.field);
    if (srclines.length !== reflines.length)
    {
      TestLogger.warn('Ref group has different number of lines: ' + JSON.stringify(srcLine) + ': ' + JSON.stringify(refLine));
      return true;
    }
    TestLogger.info('Testing ' + String(srclines.length) + ' lines');
    for (let i = 0; i < srclines.length; i++)
    {
      if (diffLine(srclines[i], reflines[i]))
      {
        return true;
      }
    }
    return false;
  } else if (srcLine.hasOwnProperty('field'))
  {
    if (srcLine.filterGroup !== null)
    {
      if (refLine.filterGroup === null)
      {
        TestLogger.warn('Ref does not have group: ' + JSON.stringify(srcLine) + ': ' + JSON.stringify(refLine));
        return true;
      }
      return diffLine(srcLine.filterGroup, refLine.filterGroup);
    } else
    {
      if (refLine.filterGroup !== null)
      {
        TestLogger.warn('Ref has one extra group: ' + JSON.stringify(srcLine) + ': ' + JSON.stringify(refLine));
        return true;
      }

      if (refLine.hasOwnProperty('field') === false)
      {
        TestLogger.warn('Ref does not have the field value: ' + JSON.stringify(srcLine) + ': ' + JSON.stringify(refLine));
        return true;
      }

      if (srcLine.comparison !== 'exists' && srcLine.comparison !== 'notexists')
      {
        if (acceptableLineValues(srcLine.value, refLine.value) === false)
        {
          TestLogger.warn('Ref value is not acceptable: ' + JSON.stringify(srcLine) + ': ' + JSON.stringify(refLine));
          return true;
        }
      }
    }
    return false;
  } else
  {
    TestLogger.warn('StrangeLine: ' + JSON.stringify(srcLine) + ': ' + JSON.stringify(refLine));
    return false;
  }
}

function comparePaths(src, ref): boolean
{
  TestLogger.info('Test ' + JSON.stringify(src, null, 2) + ' \nwith ' + JSON.stringify(ref, null, 2));
  if (diffLine(src.filterGroup, ref.filterGroup))
  {
    throw new Error('Hard Group' + JSON.stringify(src.filterGroup, null, 2) + ' is different with ' + JSON.stringify(ref.filterGroup, null, 2));
  }
  if (diffLine(src.softFilterGroup, ref.softFilterGroup))
  {
    throw new Error('Soft Group' + JSON.stringify(src.filterGroup, null, 2) + ' is different with ' + JSON.stringify(ref.filterGroup, null, 2));
  }

  const srcPaths = src.nested.filter((p) => p.name);

  if (srcPaths.length > 0)
  {
    if (srcPaths.length !== ref.nested.length)
    {
      throw new Error('Ref has different nested length');
    }
    for (let i = 0; i < srcPaths.length; i++)
    {
      const srcPath = srcPaths[i];
      const refPath = ref.nested[i];
      TestLogger.info('Testing child path ' + String(i));
      diffLine(srcPath, refPath);
    }
  }
  return true;
}

describe('Testing the pathfinder parser', () =>
{
  let browser;
  let page;
  let actionFileData;
  let actions;
  let updateTest = false;
  const mutated = false;

  beforeAll(async (done) =>
  {
    const actionFileName = getExpectedActionFile();
    actionFileData = jsonfile.readFileSync(actionFileName);
    actions = actionFileData.actions;
    TestLogger.info('Testing ' + String(actions.length) + ' queries.');
    if (actionFileData.updateTest === true)
    {
      TestLogger.warn('The test data will be updated by this run.');
      updateTest = true;
    }
    const wsAddress = await getChromeDebugAddress();
    browser = await puppeteer.connect({ browserWSEndpoint: wsAddress });
    // browser = await puppeteer.launch({ headless: false });
    TestLogger.info('Connected to the Chrome ' + String(wsAddress));
    page = await browser.newPage();
    TestLogger.info('Created a new browser page.');
    await page.setViewport({ width: 1600, height: 1200 });
    TestLogger.info('Set the page view to 1600x1200.');
    done();
  });

  it('CodeToPath parser test', async (done) =>
  {
    const url = `http://${ip.address()}:3000`;
    TestLogger.info('Get url:' + url);
    await login(page, url);

    await page.evaluate(() =>
    {
      window['TerrainTools'].setLogLevel();
    });

    for (let i = 0; i < actions.length; i++)
    {
      const thisAction = JSON.parse(actions[i].action);
      if (thisAction.payload.notDirty === true)
      {
        continue;
      }
      const query = actions[i].query;
      const path = await page.evaluate((theQuery) =>
      {
        return window['TerrainTools'].terrainTests.QueryToPathFinder(theQuery);
      }, query);
      if (path === null)
      {
        TestLogger.info('Failed to parser tql: ' + JSON.stringify(query, null, 2));
        continue;
      }
      TestLogger.info('Parsing item' + String(i) + ':\n' + String(query.tql));
      comparePaths(query.path, path);

      /*      if (updateTest === true)
            {
              try
              {
                expect(tql).toBe(query.tql);
              } catch (err)
              {
                if (actionFileData.interactiveUpdating === true)
                {
                  TestLogger.info(String(err.message) + '\n Do you want to update this one?');
                  const answer = await waitForInput('Type y for YES, n for NO, then press Enter:');
                  if (answer === 'y')
                  {
                    query.tql = tql;
                    mutated = true;
                    TestLogger.info('Updated the test data to:\n' + String(tql));
                  } else
                  {
                    TestLogger.info('Avoid updating this test, keep going.');
                  }
                } else
                {
                  query.tql = tql;
                  mutated = true;
                  TestLogger.info('There are errors when checking the data, updating now');
                }
              }
            } else
            {
              expect(tql).toBe(query.tql);
            }*/
    }
    done();
  }, 30000);

  afterAll(async (done) =>
  {
    if (actionFileData.updateTest === true)
    {
      if (mutated === true)
      {
        const actionFileName = getExpectedActionFile();
        const timestamp = Date();
        actionFileData.timestamp = timestamp;
        jsonfile.writeFileSync(actionFileName, actionFileData);
      } else
      {
        TestLogger.info('The data is clean. Do not need to update the data.');
      }
    }
    await page.close();
    TestLogger.info('The page is closed');
    await browser.disconnect();
    TestLogger.info('The chrome connection is closed');
    done();
  });
});
