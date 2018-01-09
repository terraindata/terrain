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

// tslint:disable:object-literal-key-quotes

import ESConverter from '../../../../shared/database/elastic/formatter/ESConverter';
import ESJSONParser from '../../../database/elastic/parser/ESJSONParser';

function testConverter(testName: string,
  testObj: any)
{
  test(testName, () =>
  {
    const obj = new ESJSONParser(JSON.stringify(testObj));
    expect(obj.getValue()).toEqual(JSON.parse(ESConverter.formatES(obj)));
  });
}

testConverter('generic',
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
  });

testConverter('some topologies',
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
  });

testConverter('uncommon data types',
  {
    'foo': null,
    'baz': [null],
    'oof': true,
    'rab': '',
  });

testConverter('newlines',
  {
    'normal': 'string',
    '\nHel\rlo': 'Good\n\nBye',
    'How\n': 'A\rre\r\nYou?',
  });

testConverter('unusual characters and escapes',
  {
    '\\': 'hi\\\\',
    '\0': ['\"hey\"'],
    '': '\twell',
  });

testConverter('unicode values',
  ['\u0000', '\u0001', '\u0008', '\u0030'],
);

testConverter('scientific notation',
  {
    'foo': 1e6,
    'bar': '1e6',
  });

testConverter('root value string',
  'string',
);

testConverter('root value number',
  1,
);

testConverter('root value boolean',
  false,
);

testConverter('root value null',
  null,
);

testConverter('root value empty string',
  '',
);

testConverter('root value unicode',
  '\u0030',
);

const deepArr = [];
let curr = deepArr;
for (let i = 0; i < 64; i++)
{
  curr.push(i);
  curr.push([]);
  curr = curr[1];
}

testConverter('deep nested array',
  deepArr,
);
