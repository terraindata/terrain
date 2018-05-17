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

import {MAX_HITS} from 'buildercomponents/results/ResultTypes';
import * as commandLineArgs from 'command-line-args';
import * as getUsage from 'command-line-usage';
import * as jsonfile from 'jsonfile';
import * as puppeteer from 'puppeteer';
import * as sleep from 'sleep';
import * as request from 'supertest';
import * as winston from 'winston';
import ESInterpreter from '../shared/database/elastic/parser/ESInterpreter';
import {loginToBuilder} from './FullstackUtils';

const optionDefinitions = [
  { name: 'help', alias: 'h' },
  { name: 'midway', alias: 'm', type: String },
  { name: 'credential', alias: 'u', type: String},
  { name: 'output', alias: 'o', type: String},
  { name: 'pathfinderparser', alias: 'p', type: Boolean},
];

const usageSections = [
  {
    header: 'Midway query reader',
    content: 'This application read and save algorithms in the live and the build state from the midway.',
  },
  {
    header: 'Options',
    optionList: [
      {
        name: 'help',
        description: 'Print this usage guide.',
      },
      {
        name: 'midway',
        typeLabel: '[underline]{midwayURL}',
        description: 'The url of the midway, if not given, using http://localhost:3000',
      },
      {
        name: 'credential',
        typeLabel: '[underline]{credential JSON file}',
        description: 'The path of the credential JSON file, if not give, using default midway password.',
      },
      {
        name: 'output',
        typeLabel: '[underline]{OutputFile}',
        description: 'The path of the output JSON file, if not give, using fetched-queries.json.',
      },
      {
        name: 'pathfinderparser',
        typeLabel: '[underline]{Parse the fetched pathfinder}',
        description: 'Use the pathfinder parser to generate an query.',
      },
    ],
  },
];

async function getChromePage(browser)
{
  const url = 'http://localhost:8080';
  const page = await browser.newPage();
  await page.setViewport({width: 1600, height: 1200});
  await loginToBuilder(page, url);
  sleep.sleep(3);
  return page;
}

async function getQueryStringFromPage(page, queryConfig)
{
  const newTql = await page.evaluate((theQuery) =>
  {
    return window['TerrainTools'].terrainTests.PathFinderToQuery(theQuery);
  }, queryConfig);
  return newTql;
}

async function getAccessToken(url, info)
{
  let token = null;
  try
  {
    await request(url)
      .post('/midway/v1/auth/login')
      .send(info)
      .then((response) =>
      {
        console.log(response.text);
        if (response.text === 'Unauthorized')
        {
          return null;
        }
        const respData = JSON.parse(response.text);
        token = respData.accessToken;
      })
      .catch((error) =>
      {
        console.log('Error while creating access token for default user: ' + String(error));
      });
  } catch (e)
  {
    console.log('Error when trying to login ' + url);
  }
  return token;
}

async function sendQueryFromItem(url, token, queryString, inputs, dbid, name)
{
  console.log('Querying Item ' + name);
  const inputMap = ESInterpreter.toInputMap(inputs);
  const queryTree = new ESInterpreter(queryString, inputMap);
  if (queryTree.hasError())
  {
    console.log('Item ' + name + ' has errros ' + JSON.stringify(queryTree.getErrors()));
  }
  const finalQueryString = queryTree.toCode({replaceInputs: true, limit: MAX_HITS});
  return sendQuery(url, token, finalQueryString, dbid);
}

async function sendQuery(url, token, queryString, databaseID)
{
  let ret = null;

  await request(url)
    .post('/midway/v1/query/')
    .send({
      id: 1,
      accessToken: token,
      body: {
        database: databaseID,
        datebasetype: 'elastic',
        type: 'search',
        body: queryString,
      },
    })
    .expect(200)
    .then((response) =>
    {
      ret = JSON.parse(response.text);
    })
    .catch((error) =>
    {
      console.log('POST /midway/v1/query/ request returned an error: ' + String(error));
    });
  return ret;
}

async function getQueryFromItem(url, token, id)
{
  const route = '/midway/v1/items/' + id;
  let ret = null;
  await request(url)
    .get(route)
    .query({
      id: 1,
      accessToken: token,
    })
    .expect(200)
    .then((response) =>
    {
      if (response.text === 'Unauthorized')
      {
        throw Error('Unauthorized');
      }
      const respData = JSON.parse(response.text)[0];
      if (respData.id !== id)
      {
        throw Error('Response is not the right item.' + response.text);
      }
      ret = respData;
    })
    .catch((error) =>
    {
      console.log('GET ' + route + ' request returned an error: ' + String(error));
    });
  return ret;
}

async function getAllLiveItems(url, token)
{
  let ret = [];
  console.log(url + ': ' + token);
  await request(url)
    .get('/midway/v1/items/live')
    .query({
      id: 1,
      accessToken: token,
    })
    .expect(200)
    .then((response) =>
    {
      if (response.text === 'Unauthorized')
      {
        throw Error('Unauthorized');
      }
      const respData = JSON.parse(response.text);
      if (Array.isArray(respData) === false)
      {
        throw Error('Response is not an array');
      }
      ret = respData;
    })
    .catch((error) =>
    {
      console.log('GET /midway/v1/items/ request returned an error: ' + String(error));
    });
  return ret;
}

async function fetch()
{
  const options = commandLineArgs(optionDefinitions);
  const usage = getUsage(usageSections);
  if (options['help'] !== undefined)
  {
    console.log(usage);
    return;
  }

  let url = 'http://localhost:3000';
  if (options['midway'] !== undefined)
  {
    url = options['midway'];
  }
  const cre = {
    email: 'admin@terraindata.com',
      password: 'CnAATPys6tEB*ypTvqRRP5@2fUzTuY!C^LZP#tBQcJiC*5',
  };
  if (options['credential'] !== undefined)
  {
    const creFilePath = options['credential'];
    let creData;
    try
    {
      creData = jsonfile.readFileSync(creFilePath);
    } catch (e)
    {
      console.log('Failed to load the credential JSON file from path ' + creFilePath);
      return;
    }
    if (creData.email && creData.password)
    {
      cre.email = creData.email;
      cre.password = creData.password;

    } else
    {
      console.log('Credential JSON file is not in right format.');
    }
  }
  let outputFile = './fetched-queries.json';
  if (options['output'] !== undefined)
  {
    outputFile = options['output'];
  }

  let compareQuery = false;
  let page = null;
  let browser = null;
  if (options['pathfinderparser'] === true)
  {
    compareQuery = true;
  }

  if (compareQuery === true)
  {
    browser = await puppeteer.launch({headless: false});
    page = await getChromePage(browser);
  }

  console.log('Login to ' + url);
  const accessToken = await getAccessToken(url, cre);
  console.log('token ' + accessToken);
  if (accessToken == null)
  {
    console.log('Failed to login in.');
    return;
  }

  const liveItems = await getAllLiveItems(url, accessToken);
  const items = [];
  console.log('LiveItems: ' + JSON.stringify(liveItems));

  // let's fetch the quer(item) =>
  for (let i = 0; i < liveItems.length; i++)
  {
    const item = liveItems[i];
    const r = await getQueryFromItem(url, accessToken, item.id);
    if (r !== null)
    {
      items.push(r);
    }
    const meta = JSON.parse(r.meta);
    if (meta.query && meta.query.tql)
    {
      r['fetchedquery'] = meta.query.tql;
      console.log(meta.query.tql);
      const results = await sendQueryFromItem(url, accessToken, meta.query.tql, meta.query.inputs, meta.db.id, r.name);
      if (results !== null)
      {
        try
        {
          r['top20'] = results.result.hits.hits.slice(0, 20);
          if (r['top20'].length === 0)
          {
            console.log('Item ' + r.name + ' has ho hits.');
          }
        } catch (e)
        {
          console.log('Item ' + r.name + ' has error ' +  e);
        }
      }

      if (compareQuery === true)
      {
        const newQuery = await getQueryStringFromPage(page, meta.query);
        console.log(newQuery);
        r['newquery'] = newQuery;
        const newResults = await sendQueryFromItem(url, accessToken, newQuery, meta.query.inputs, meta.db.id, r.name);
        if (newResults !== null)
        {
          try
          {
            r['newtop20'] = newResults.result.hits.hits.slice(0, 20);
            if (r['newtop20'].length === 0)
            {
              console.log('Item ' + r.name + ' has ho hits. with new query');
            }
          } catch (e)
          {
            console.log('Item ' + r.name + ' has error with new query' +  e);
          }
        }
      }
    }
  }
  jsonfile.writeFileSync(outputFile, items);
  if (compareQuery)
  {
    await browser.close();
  }
}

fetch().catch((err) => console.log('Error when executing the program: ' + err));
