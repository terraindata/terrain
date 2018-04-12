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


export const CRONWeekDayOptions = [0, 1, 2, 3, 4, 5, 6];
export const CRONWeekDayNames =
{
	0: 'Sunday',
	1: 'Monday',
	2: 'Tuesday',
	3: 'Wednesday',
	4: 'Thursday',
	5: 'Friday',
	6: 'Saturday',
	7: 'Sunday',
};
const workWeekdays = [1,2,3,4,5];

export const CRONMonthDayOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
	17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31];

export type CRONDaySchedule =
	{
		type: 'daily'
	} | 
	{
		type: 'weekdays'
	} |
	{
		type: 'weekly',
		weekdays: number[],
	} |
	{
		type: 'monthly',
		days: number[],
	};

export function parseCRONDaySchedule(cron: string): CRONDaySchedule
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
					days: monthDays.map((d) => +d),
				};
			}
		}
		else if(monthDay === '*')
		{
			// specified week days
			const weekdays = weekDay.split(',');
			if (weekdays.every(isValidWeekDay))
			{
				// check if it is the "weekdays" option
				if (weekdays.every((w) => workWeekdays.indexOf(+w) !== -1)
					&& workWeekdays.every((ww) => weekdays.indexOf(""+ww) !== -1))
				{
					return {
						type: 'weekdays',
					};
				}
				
				return {
					type: 'weekly',
					weekdays: weekdays.map((d) => +d),
				}
			}
		}
	}
	
	return null; // cannot be parsed
}

function isValidMonthDay(day: string): boolean
{
	return isValidNumber(day) && CRONMonthDayOptions.indexOf(+day) !== -1;
}

function isValidWeekDay(day: string): boolean
{
	return isValidNumber(day) && CRONWeekDayOptions.indexOf(+day) !== -1;
}



export const CRONMinuteOptions = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

export const CRONHourOptions = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
	17, 18, 19, 20, 21, 22, 23];
export const CRONHourNames = {
	0: '12 AM', 1: '1 AM', 2: '2 AM', 3: '3 AM', 4: '4 AM', 5: '5 AM', 6: '6 AM', 7: '7 AM', 8: '8 AM', 
	9: '9 AM', 10: '10 AM', 11: '11 AM', 12: '12 PM', 13: '1 PM', 14: '2 PM', 15: '3 PM', 16: '4 PM',
	17: '5 PM', 18: '6 PM', 19: '7 PM', 20: '8 PM', 21: '9 PM', 22: '10 PM', 23: '11 PM',
};

export type CRONHourSchedule = 
	{
		type: 'minute',
	} |
	{
		type: 'hourly',
		minutes: number[],
	} |
	{
		type: 'daily',
		hours: number[],
	};

export function parseCRONHourSchedule(cron: string): CRONHourSchedule
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
					minutes: minutes.map((m) => +m),
				};
			}
		}
		else if(minute === '0' || minute === '00')
		{
			// specific hours, on the hour
			const hours = hour.split(',');
			if (hours.every(isValidSingleHour))
			{
				return {
					type: 'daily',
					hours: hours.map((h) => +h),
				};
			}
		}
		// no other formats currently supported
	}
	
	return null; // cannot be parsed
}

function isValidSingleHour(hour: string)
{
	return isValidNumber(hour) && +hour >= 0 && +hour < 24;
}

function isValidSingleMinute(minute: string)
{
	return isValidNumber(minute) && CRONMinuteOptions.indexOf(+ minute) >= 0;
}

function isValidNumber(num: string)
{
	return !isNaN(+num);
}

export function canParseCRONSchedule(cron: string, skipHoursOrDays?: 'hours' | 'days'): boolean
{
	// assert hours and days can be parsed
	
	if (scheduleMeetsStandards(cron) && parseCRONHourSchedule(cron) !== null && parseCRONDaySchedule(cron) !== null)
	{
		return true;
	}
	
	return true;
}

// private
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

