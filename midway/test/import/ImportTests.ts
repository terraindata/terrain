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

import * as winston from 'winston';

import { Import, ImportConfig } from '../../src/app/import/Import';

interface Movie
{
  title: string;
  releasedate: string;
}

const host: string = 'http://localhost:9200';
const movies: Movie[] = [];

let imprt: Import;

beforeAll(async () =>
{
  // TODO: get rid of this monstrosity once @types/winston is updated.
  (winston as any).level = 'debug';
  try
  {
    movies[0] = { title: 'Arrival', releasedate: new Date('01/01/17').toISOString().substring(0, 10) };
    movies[1] = { title: 'Alien: Covenant', releasedate: new Date('01/01/17').toISOString().substring(0, 10) };

    imprt = new Import();
  }
  catch (e)
  {
    fail(e);
  }
});

test('import JSON file', async (done) =>
{
  try
  {
    winston.info('Testing JSON upload to Elastic.');

    const imprtConf: ImportConfig =
      {
        dsn: host,
        db: 'movies',
        table: 'data',
        contents: JSON.stringify(movies),
        dbtype: 'elastic',
        filetype: 'json',
      };
    winston.info(imprtConf.contents);

    const results: any = await imprt.insert(imprtConf);
    winston.info(JSON.stringify(results));
    expect(results).not.toBeUndefined();
    for (let i = 0; i < results.length; i++)
    {
      expect(results[i]).toMatchObject(movies[i]);
    }
  }
  catch (e)
  {
    fail(e);
  }
  done();
});

test('import CSV file', async (done) =>
{
  try
  {
    winston.info('Testing CSV upload to Elastic.');

    let csvString: string = 'title,releasedate\n';
    for (const movie of movies)
    {
      csvString += movie.title + ',' + movie.releasedate + '\n';
    }

    const imprtConf: ImportConfig =
      {
        dsn: host,
        db: 'movies',
        table: 'data',
        contents: csvString,
        dbtype: 'elastic',
        filetype: 'csv',
      };
    winston.info(imprtConf.contents);

    const results: any = await imprt.insert(imprtConf);
    winston.info(JSON.stringify(results));
    expect(results).not.toBeUndefined();
    for (let i = 0; i < results.length; i++)
    {
      expect(results[i]).toMatchObject(movies[i]);
    }
  }
  catch (e)
  {
    fail(e);
  }
  done();
});
