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

import { fillCRONMap } from '../../util/CRONConstants';
import
{
  canParseCRONSchedule, parseCRONDaySchedule, parseCRONHourSchedule, setCRONDays, setCRONHours,
  setCRONType,
} from '../../util/CRONParser';

test('parses daily', () =>
{
  expect(parseCRONDaySchedule(' 0 0 * * *')).toEqual(
    { type: 'daily' },
  );
});

test('parses weekdays 1 to 5 individually', () =>
{
  expect(parseCRONDaySchedule('4 8 * *   1,2,3,4,5')).toEqual(
    { type: 'weekly', weekdays: fillCRONMap([1, 2, 3, 4, 5], 0, 6) },
  );
});

test('parses workweek', () =>
{
  expect(parseCRONDaySchedule('4 8 * *   1-5')).toEqual(
    { type: 'workweek' },
  );
});

test('parses weekly', () =>
{
  expect(parseCRONDaySchedule('15 16  * * 2,3')).toEqual(
    { type: 'weekly', weekdays: fillCRONMap([2, 3], 0, 6) },
  );
});

test('parses monthly', () =>
{
  expect(parseCRONDaySchedule('4 2 1 * *')).toEqual(
    { type: 'monthly', days: fillCRONMap([1], 1, 31) },
  );
});

test('cannot parse combined weekdays & month days', () =>
{
  expect(parseCRONDaySchedule('* * 4 * 2,4')).toEqual(
    null,
  );
});

test('cannot parse invalid weekdays', () =>
{
  expect(parseCRONDaySchedule('* * * * 2,4,8')).toEqual(
    null,
  );
});

test('cannot parse invalid month days', () =>
{
  expect(parseCRONDaySchedule('* * 32 * *')).toEqual(
    null,
  );
});

test('modifying a returned result does not screw up the cache', () =>
{
  const str = '* * 17,19 * *';
  const result = parseCRONDaySchedule(str);
  result.days[99] = true;
  result.type = 'daily';
  expect(parseCRONDaySchedule(str)).toEqual(
    { type: 'monthly', days: fillCRONMap([17, 19], 1, 31) },
  );
});

test('can set daily', () =>
{
  expect(setCRONDays('0 * 1,15 * *', { type: 'daily' })).toEqual(
    '0 * * * *',
  );
});

test('can set workweek', () =>
{
  expect(setCRONDays('0 0,6,12,18 * * *', { type: 'workweek' })).toEqual(
    '0 0,6,12,18 * * 1-5',
  );
});

test('can set weekly', () =>
{
  expect(setCRONDays('* * * * *',
    { type: 'weekly', weekdays: { 0: true, 2: true, 4: true } },
  )).toEqual(
    '* * * * 0,2,4',
  );
});

test('can set monthly', () =>
{
  expect(setCRONDays('0 12 * * *',
    { type: 'monthly', days: { 1: true, 15: true } },
  )).toEqual(
    '0 12 1,15 * *',
  );
});

test('cannot set days if invalid schedule', () =>
{
  let passed = false;
  try
  {
    setCRONDays('0 0 * * 9',
      { type: 'monthly', days: { 1: true, 15: true } },
    );
  } catch (e)
  {
    passed = true;
  }
  expect(passed).toBe(true);
});

test('cannot set hours if invalid schedule', () =>
{
  let passed = false;
  try
  {
    expect(setCRONHours('0 24 * * *', { type: 'minute' })).toThrow();
  } catch (e)
  {
    passed = true;
  }
  expect(passed).toBe(true);
});

test('cannot parse invalid hour schedule', () =>
{
  expect(canParseCRONSchedule('0 24 * * *')).toBe(false);
});

test('cannot parse invalid day schedule', () =>
{
  expect(canParseCRONSchedule('* * 32 * *')).toBe(false);
});

test('can parse valid hour schedule', () =>
{
  expect(canParseCRONSchedule('0 23 * * *')).toBe(true);
});

test('can parse valid day schedule', () =>
{
  expect(canParseCRONSchedule('* * 31 * *')).toBe(true);
});

test('parses every minute', () =>
{
  expect(parseCRONHourSchedule('* * * * *')).toEqual(
    { type: 'minute' },
  );
});

test('parses hourly', () =>
{
  expect(parseCRONHourSchedule('00,15,30,45 * * * 1,2,3,4,5')).toEqual(
    { type: 'hourly', minutes: fillCRONMap([0, 15, 30, 45], 0, 59) },
  );
});

test('parses hourly with arbitrary minutes', () =>
{
  expect(parseCRONHourSchedule('3 * * * *')).toEqual(
    { type: 'hourly', minutes: fillCRONMap([3], 0, 59) },
  );
});

test('parses daily', () =>
{
  expect(parseCRONHourSchedule('00 4,8,15,16 23 * *')).toEqual(
    { type: 'daily', hours: fillCRONMap([4, 8, 15, 16], 0, 23) },
  );
});

test('does not parse invalid hours', () =>
{
  expect(parseCRONHourSchedule('00 24 * * *')).toEqual(null);
});

test('does not parse invalid minutes', () =>
{
  expect(parseCRONHourSchedule('73 * * * *')).toEqual(null);
});

test('does not parse invalid minute / hour combos', () =>
{
  expect(parseCRONHourSchedule('0,30 0,6,12,18 * * *')).toEqual(null);
});

test('can set cron type to daily', () =>
{
  expect(setCRONType('* * * * *', 'days', 'daily')).toEqual('* * * * *');
});

test('can set cron type to workweek', () =>
{
  expect(setCRONType('0 * * * *', 'days', 'workweek')).toEqual('0 * * * 1-5');
});

test('can set cron type to weekly', () =>
{
  expect(setCRONType('0 12 * * *', 'days', 'weekly')).toEqual('0 12 * * 1');
});

test('can set cron type to monthly', () =>
{
  expect(setCRONType('0 0 * * *', 'days', 'monthly')).toEqual('0 0 1 * *');
});

test('can set cron type to minute', () =>
{
  expect(setCRONType('0 0 * * *', 'hours', 'minute')).toEqual('* * * * *');
});

test('can set cron type to hourly', () =>
{
  expect(setCRONType('* * * * *', 'hours', 'hourly')).toEqual('0 * * * *');
});

test('can set cron type to daily (hours)', () =>
{
  expect(setCRONType('* * * * *', 'hours', 'daily')).toEqual('0 0 * * *');
});

test('throws error when setting a bad CRON type', () =>
{
  let threw = false;
  try
  {
    setCRONType('* * * * *', 'days', 'minute');
  }
  catch (e)
  {
    threw = true;
  }
  expect(threw).toEqual(true);
});
