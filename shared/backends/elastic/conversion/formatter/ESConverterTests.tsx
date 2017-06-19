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

// Temporary testing file to be run using node from command line, until I get unit testing working
import * as deepEqual from 'deep-equal';
import ESJSONParser from '../../parser/ESJSONParser';
import ESConverter from './ESConverter';

/* tslint:disable:no-console */
/* tslint:disable:object-literal-key-quotes */

class BounceTest
{
  public testName: string;
  public testObj: ESJSONParser;
  constructor(testName: string, testObj: any)
  {
    this.testName = testName;
    this.testObj = new ESJSONParser(JSON.stringify(testObj));
  }
}
function bounceCheck(obj: ESJSONParser): boolean
{
  const bounced: any = JSON.parse(ESConverter.formatES(obj));
  return deepEqual(bounced, obj.getValue());
}
function runBounceChecks(tests: BounceTest[])
{
  let nPassed: number = 0;
  for (let i = 0; i < tests.length; i++)
  {
    try
    {
      if (bounceCheck(tests[i].testObj))
      {
        nPassed += 1;
        console.log('PASS: ' + tests[i].testName);
      }
      else
      {
        console.log('FAIL: ' + tests[i].testName);
        console.log('Expected object: ');
        console.log(tests[i].testObj);
        console.log('Reparsed as: ');
        console.log(JSON.parse(ESConverter.formatES(tests[i].testObj)));
      }
    }
    catch (e)
    {
      console.log('FAIL: ' + tests[i].testName);
      console.log('uncaught exception or error: ');
      console.log(e);
    }
  }
  if (nPassed === tests.length)
  {
    console.log(String(nPassed) + '/' + String(tests.length) + ' tests passed');
    console.log('All Tests Passed');
  }
  else
  {
    console.log(String(nPassed) + '/' + String(tests.length) + ' tests passed');
    console.log('Tests Failed');
  }
}

const deepArr = [];
let curr = deepArr;
for (let i = 0; i < 64; i++)
{
  curr.push(i);
  curr.push([]);
  curr = curr[1];
}

runBounceChecks([
  new BounceTest('generic',
    {
      'index': 'movies',
      'type': 'data',
      'size': 10,
      'body': {
        'query': {
          'bool': {
            'must_not': [
              {
                'match': {
                  'title': 'Toy Story (1995)',
                },
              },
            ],
            'must': [
              {
                'range': {
                  'releasedate': {
                    'gte': '2007-03-24',
                  },
                },
              },
            ],
          },
        },
      },
    }),
  new BounceTest('some topologies',
    {
      '1':
      [
        { '1': [1, 2] },
        [{ '1': 1 }, [1, 2]],
      ],
      '2':
      {
        '1': [[1, 2], [1, 2]],
        '2': [{ '1': '1', '2': '2' }, { '1': '1', '2': '2' }],
      },
    }),
  new BounceTest('uncommon data types',
    {
      'foo': null,
      'baz': [null],
      'oof': true,
      'rab': '',
    }),
  new BounceTest('newlines',
    {
      'normal': 'string',
      '\nHel\rlo': 'Good\n\nBye',
      'How\n': 'A\rre\r\nYou?',
    }),
  new BounceTest('unusual characters and escapes',
    {
      '\\': 'hi\\\\',
      '\0': ['\"hey\"'],
      '': '\twell',
    }),
  new BounceTest('unicode values',
    ['\u0000', '\u0001', '\u0008', '\u0030'],
  ),
  new BounceTest('scientific notation',
    {
      'foo': 1e6,
      'bar': '1e6',
    }),
  new BounceTest('root value string',
    'string',
  ),
  new BounceTest('root value number',
    1,
  ),
  new BounceTest('root value boolean',
    false,
  ),
  new BounceTest('root value null',
    null,
  ),
  new BounceTest('root value empty string',
    '',
  ),
  new BounceTest('root value unicode',
    '\u0030',
  ),
  new BounceTest('deep nested array',
    deepArr,
  ),
]);
/*
console.log(ESConverter.formatES(new ESJSONParser(JSON.stringify(
    {
      'index': 'movies',
      'type': 'data',
      'size': 10,
      'body': {
        'query': {
          'bool': {
            'must_not': [
              {
                'match': {
                  'title': 'Toy Story (1995)',
                },
              },
            ],
            'must': [
              {
                'range': {
                  'releasedate': {
                    'gte': '2007-03-24',
                  },
                },
              },
            ],
          },
        },
      },
    }))));
*/
// const parser = new ESJSONParser('{"foo":[1, 2, {"bar": "xD"}]}');
// console.log(parser);
// console.log(parser.getValue());

/* tslint:enable:no-console */
/* tslint:enable:object-literal-key-quotes */
