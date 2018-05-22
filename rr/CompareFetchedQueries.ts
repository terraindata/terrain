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

import * as commandLineArgs from 'command-line-args';
import * as getUsage from 'command-line-usage';
import * as jsonfile from 'jsonfile';

const optionDefinitions = [
  { name: 'help', alias: 'h' },
  { name: 'file', alias: 'f', type: String },
];

const usageSections = [
  {
    header: 'Compare fetched results of fetched queries.',
    content: 'This application read the fetched-queries.json and compare results of top20 and newtop20.',
  },
  {
    header: 'Options',
    optionList: [
      {
        name: 'help',
        description: 'Print this usage guide.',
      },
      {
        name: 'file',
        typeLabel: '[underline]{fetched-query.json}',
        description: 'The path of the source, if not given, using ./fetched-query.json.',
      },
    ],
  },
];

async function replayQueries()
{
  let path = './fetched-queries.json';
  const options = commandLineArgs(optionDefinitions);
  const usage = getUsage(usageSections);
  if (options['help'] !== undefined)
  {
    console.log(usage);
    return;
  }
  if (options['file'] !== undefined)
  {
    path = options['midway'];
  }
  const items = jsonfile.readFileSync(path);
  items.map((item) =>
  {
    const meta = JSON.parse(item.meta);
    console.log(item.name + ': db ' + meta.db.id);
    if (item.newtop20 && item.top20)
    {
      if (item.newtop20.length === item.top20.length)
      {
        let same = true;
        for (let i = 0; i < item.top20.length; i++)
        {
          if (item.newtop20[i]._id !== item.top20[i]._id)
          {
            console.log(i + 'diff\n==========\n' + JSON.stringify(item.top20[i]) + '\n===========\n' + JSON.stringify(item.newtop20[i]));
            same = false;
          }
        }
        if (same === true)
        {
          console.log(item.top20.length + ' results are same');
        } else
        {
          console.log(item.top20.length + ' results are different.');
        }
      } else
      {
        console.log('Results have different size.');
      }
    } else
    {
      console.log('No results to compare.');
    }
  },
  );
}

replayQueries().catch((err) => console.log('Error when executing the program: ' + err));
