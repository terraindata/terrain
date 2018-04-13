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

import { extend, filter, identity, isEqual, keys } from 'lodash';

import
{
  CRONDaySchedule, CRONHourOptions, CRONHourSchedule,
  CRONMap, CRONMinuteOptions, CRONMonthDayOptions,
  CRONWeekDayOptions, CRONWorkWeekdays
} from './CRONConstants';

const CACHE = {
  days: {},
  hours: {},
};

// If you promise to not change the return value, you may pass in skipCopy = true
//  for better runtime and memory
export function parseCRONDaySchedule(cron: string, skipCopy: boolean = false): CRONDaySchedule
{
  return evalCron(CACHE.days, parseCRONDayScheduleInternal, cron, skipCopy);
}

export function parseCRONHourSchedule(cron: string, skipCopy: boolean = false): CRONHourSchedule
{
  return evalCron(CACHE.hours, parseCRONHourScheduleInternal, cron, skipCopy);
}

function evalCron(cacheMap, parseFn, cron: string, skipCopy: boolean)
{
  if (cacheMap[cron] === undefined)
  {
    cacheMap[cron] = parseFn(cron);
  }

  const sched = cacheMap[cron];
  if (skipCopy)
  {
    // skip the copy, for perf & memory optimization, if user is safe
    return sched;
  }

  // return a deep copy to protect clients from messing up the cache values
  return JSON.parse(JSON.stringify(sched));
}

// Days

function parseCRONDayScheduleInternal(cron: string): CRONDaySchedule
{
  if (scheduleMeetsStandards(cron))
  {
    // attempt to parse
    const pieces = cron.split(' ');
    const monthDay = pieces[2];
    const weekDay = pieces[4];

    if (weekDay === '*')
    {
      if (monthDay === '*')
      {
        return {
          type: 'daily',
        };
      }

      const monthDays = monthDay.split(',');
      if (monthDays.every(isValidMonthDay))
      {

        return {
          type: 'monthly',
          days: fillMapFromStringList(CRONMonthDayOptions, monthDays),
        };
      }
    }
    else if (monthDay === '*')
    {
      // specified week days
      const weekdaysList = weekDay.split(',');
      if (weekdaysList.every(isValidWeekDay))
      {
        const weekdaysMap = fillMapFromStringList(CRONWeekDayOptions, weekdaysList);

        // check if it is the "weekdays" option
        if (isEqual(weekdaysMap, CRONWorkWeekdays))
        {
          return {
            type: 'weekdays',
          };
        }

        return {
          type: 'weekly',
          weekdays: weekdaysMap,
        };
      }
    }
  }

  return null; // cannot be parsed
}

export function setCRONDays(cron: string, days: CRONDaySchedule): string
{
  if (!canParseCRONSchedule(cron))
  {
    throw new Error('Cannot parse this cron schedule: ' + cron);
  }

  const pieces = cron.split(' ');
  switch (days.type)
  {
    case 'daily':
      pieces[2] = '*';
      pieces[4] = '*';
      break;
    case 'weekdays':
      pieces[2] = '*';
      pieces[4] = mapToCRONString(CRONWorkWeekdays);
      break;
    case 'weekly':
      pieces[2] = '*';
      pieces[4] = mapToCRONString(days.weekdays);
      break;
    case 'monthly':
      pieces[2] = mapToCRONString(days.days);
      pieces[4] = '*';
      break;
    default:
      throw new Error('Unsupported hours type: ' + JSON.stringify(days));
  }

  return pieces.join(' ');
}

export function parseCRONHourScheduleInternal(cron: string): CRONHourSchedule
{
  if (scheduleMeetsStandards(cron))
  {
    // attempt to parse
    const pieces = cron.split(' ');
    const hour = pieces[1];
    const minute = pieces[0];

    if (hour === '*')
    {
      // every hour
      if (minute === '*')
      {
        return { type: 'minute' }; // every minute
      }

      const minutes = minute.split(',');
      if (minutes.every(isValidSingleMinute))
      {
        return {
          type: 'hourly',
          minutes: fillMapFromStringList(CRONMinuteOptions, minutes),
        };
      }
    }
    else if (+minute === 0)
    {
      // specific hours, on the hour
      const hours = hour.split(',');
      if (hours.every(isValidSingleHour))
      {
        return {
          type: 'daily',
          hours: fillMapFromStringList(CRONHourOptions, hours),
        };
      }
    }
    // no other formats currently supported
  }

  return null; // cannot be parsed
}

export function setCRONHours(cron: string, hours: CRONHourSchedule): string
{
  if (!canParseCRONSchedule(cron))
  {
    throw new Error('Cannot parse this cron schedule: ' + cron);
  }

  const pieces = cron.split(' ');
  switch (hours.type)
  {
    case 'minute':
      pieces[0] = '*';
      pieces[1] = '*';
      break;
    case 'hourly':
      pieces[0] = mapToCRONString(hours.minutes);
      pieces[1] = '*';
      break;
    case 'daily':
      pieces[0] = '0';
      pieces[1] = mapToCRONString(hours.hours);
      break;
    default:
      throw new Error('Unsupported hours type: ' + JSON.stringify(hours));
  }

  return pieces.join(' ');
}

export function canParseCRONSchedule(cron: string): boolean
{
  // assert hours and days can be parsed

  if (scheduleMeetsStandards(cron) && parseCRONHourSchedule(cron) !== null && parseCRONDaySchedule(cron) !== null)
  {
    return true;
  }

  return false;
}

// Private

function isValidMonthDay(day: string): boolean
{
  return isValidNumber(day) && CRONMonthDayOptions[+day] !== undefined;
}

function isValidWeekDay(day: string): boolean
{
  return isValidNumber(day) && CRONWeekDayOptions[+day] !== undefined;
}

function isValidSingleHour(hour: string)
{
  return isValidNumber(hour) && +hour >= 0 && +hour < 24;
}

function isValidSingleMinute(minute: string)
{
  return isValidNumber(minute) && +minute >= 0 && +minute <= 59;
}

function isValidNumber(num: string)
{
  return !isNaN(+num);
}

function scheduleMeetsStandards(cron: string): boolean
{
  // assert rest of format, besides hours and days, matches standard

  const pieces = cron.split(' ');

  if (pieces.length !== 5)
  {
    return false;
  }

  if (pieces[3] !== '*')
  {
    // specific months not yet supported
    return false;
  }

  if (pieces[2] !== '*' && pieces[4] !== '*')
  {
    // cannot mix and match weekdays and month days right now
    return false;
  }

  return true;
}

function listToMap(list: string[]): CRONMap
{
  const obj = {};
  list.map((e) => obj[+e] = true);
  return obj;
}

function fillMapFromStringList(map: CRONMap, list: string[]): CRONMap
{
  return extend({}, map, listToMap(list));
}

function mapToCRONString(map: CRONMap): string
{
  return filter(keys(map), (v) => map[v] === true).join(',');
}
