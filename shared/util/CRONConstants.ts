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

// Copyright 2019 Terrain Data, Inc.

import { keys, range } from 'lodash';

export interface CRONMap
{
  [minuteHourOrDay: number]: boolean;
}

// return a map of number: boolean pairs
// values are true if key is present in the `values` param
export function fillCRONMap(values: number[], start: number, endInclusive: number):
  { [val: number]: boolean }
{
  return range(start, endInclusive + 1).reduce(
    (memo, v) =>
    {
      memo[v] = values.indexOf(v) !== -1;
      return memo;
    },
    {},
  );
}

// handles sorting by value, and also type conversion since
// iteration converts the keys to strings
export function cronMapToList(m: CRONMap, includeAll = false): number[]
{
  const arr = [];
  for (const s in m)
  {
    if (m.hasOwnProperty(s))
    {
      const k = +s;
      let i;
      for (i = arr.length; i > 0 && arr[i - 1] > k; i--) {  } // optimized reverse search
      arr.splice(i, 0, k);
    }
  }

  if (includeAll)
  {
    return arr;
  }

  return arr.filter((v) => m[v]);
}

// Days

export const CRONWeekDayOptions: CRONMap = fillCRONMap([], 0, 6);
export const CRONWeekDayOptionsList: number[] = cronMapToList(CRONWeekDayOptions, true);
export const defaultCRONWeekDayOptions = { 1: true }; // Monday

export const CRONWeekDayNames =
  {
    0: 'Sunday',
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday',
  };

export const CRONMonthDayOptions: CRONMap = fillCRONMap([], 1, 31);
export const CRONMonthDayOptionsList: number[] = cronMapToList(CRONMonthDayOptions, true);
export const defaultCRONMonthDayOptions = { 1: true }; // the 1st

export interface CRONDaySchedule
{
  type: 'daily' | 'workweek' | 'weekly' | 'monthly';
  weekdays?: CRONMap; // for weekly
  days?: CRONMap; // for monthly
}

// Hours and Minutes

export const CRONHourOptions: CRONMap = fillCRONMap([], 0, 23);
export const CRONHourOptionsList: number[] = cronMapToList(CRONHourOptions, true);
export const defaultCRONHourOptions = { 0: true }; // 12 AM

export const CRONHourNames = {
  0: '12 AM', 1: '1 AM', 2: '2 AM', 3: '3 AM', 4: '4 AM', 5: '5 AM', 6: '6 AM', 7: '7 AM', 8: '8 AM',
  9: '9 AM', 10: '10 AM', 11: '11 AM', 12: '12 PM', 13: '1 PM', 14: '2 PM', 15: '3 PM', 16: '4 PM',
  17: '5 PM', 18: '6 PM', 19: '7 PM', 20: '8 PM', 21: '9 PM', 22: '10 PM', 23: '11 PM',
};

export const CRONMinuteOptions: CRONMap = fillCRONMap([], 0, 59);
export const CRONMinuteOptionsList: number[] = cronMapToList(CRONMinuteOptions, true);
export const defaultCRONMinuteOptions = { 0: true }; // :00

export interface CRONHourSchedule
{
  type: 'minute' | 'hourly' | 'daily';
  minutes?: CRONMap; // for hourly
  hours?: CRONMap; // for daily
}
