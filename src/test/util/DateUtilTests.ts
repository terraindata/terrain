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

import DateUtil from 'app/util/DateUtil';

describe('DateUtil', () =>
{
  const formatTimeTests =
  {
    '04:30:34-07:00': '4:30 am',
    '04:30:34-09:00': '4:30 am',
    '00:30:24-07:00': '12:30 am',
    '00:00:02-07:00': '12:00 am',
    '09:00:16-07:00': '9:00 am',
    '12:30:30-07:00': '12:30 pm',
    '15:30:02-07:00': '3:30 pm',
    '19:00:08-07:00': '7:00 pm',
    '23:30:47-07:00': '11:30 pm',
  };
  const formatCalendarDateTests =
  {
    '2018-06-20T23:30:47-07:00': 'June 20 2018, 11:30 pm',
    '2018-07-01T23:30:47-07:00': 'July 1 2018, 11:30 pm',
    '2018-08-03T09:00:47-07:00': 'August 3 2018, 9:00 am',
    '2018-09-08T09:00:47-07:00': 'September 8 2018, 9:00 am',
    '2018-09-12T20:00:47-07:00': 'September 12 2018, 8:00 pm',
    '2018-10-18T13:30:47-07:00': 'October 18 2018, 1:30 pm',
    '2018-12-31T00:30:47-07:00': 'December 30 2018, 11:30 pm',
    '2019-02-04T04:00:47-07:00': 'February 4 2019, 3:00 am',
  };
  const formatRelativeDateTests =
  {
    '@TerrainDate.ThisWeek.0.T00:00:24-07:00': 'This Monday, 12:00 am',
    '@TerrainDate.NextWeek.0.T01:30:06-07:00': 'Next Monday, 1:30 am',
    '@TerrainDate.ThisWeek.1.T05:30:34-07:00': 'This Tuesday, 5:30 am',
    '@TerrainDate.NextWeek.1.T10:30:02-07:00': 'Next Tuesday, 10:30 am',
    '@TerrainDate.ThisWeek.3.T12:00:36-07:00': 'This Thursday, 12:00 pm',
    '@TerrainDate.NextWeek.4.T16:30:07-07:00': 'Next Friday, 4:30 pm',
    '@TerrainDate.ThisWeek.5.T19:00:50-07:00': 'This Saturday, 7:00 pm',
    '@TerrainDate.ThisWeek.6.T22:30:13-07:00': 'This Sunday, 10:30 pm',
    '@TerrainDate.NextWeek.6.T23:30:35-07:00': 'Next Sunday, 11:30 pm',
  };
  const formatSpecificDateTests =
  {
    'Now-0h': '0 hours ago',
    'Now+1d': '1 day from now',
    'Now-1h': '1 hour ago',
    'Now+3M': '3 months from now',
    'Now-7d': '7 days ago',
    'Now+163y': '163 years from now',
    'Now-43m': '43 minutes ago',
    'Now-1m': '1 minute ago',
    'Now+1y': '1 year from now',
    'Now-1M': '1 month ago',
    'Now+1M': '1 month from now',
    'Now-9134h': '9134 hours ago',
  };
  const formatDateValueTests =
  {
    '2009-12-07T19:30:58-08:00': 'December 7 2009, 7:30 pm',
    '2010-04-05T23:00:26-07:00': 'April 5 2010, 11:00 pm',
    '2011-06-02T09:00:47-07:00': 'June 2 2011, 9:00 am',
    '2014-03-17T10:00:47-07:00': 'March 17 2014, 10:00 am',
    '2016-07-22T11:00:47-07:00': 'July 22 2016, 11:00 am',
    '2017-12-12T18:30:47-08:00': 'December 12 2017, 6:30 pm',
    '2018-11-30T14:30:47-08:00': 'November 30 2018, 2:30 pm',
    '2019-08-14T16:00:47-07:00': 'August 14 2019, 4:00 pm',
    '@TerrainDate.ThisWeek.0.T00:00:24-07:00': 'This Monday, 12:00 am',
    '@TerrainDate.NextWeek.2.T02:30:06-07:00': 'Next Wednesday, 2:30 am',
    '@TerrainDate.ThisWeek.1.T07:30:34-07:00': 'This Tuesday, 7:30 am',
    '@TerrainDate.NextWeek.1.T09:30:02-07:00': 'Next Tuesday, 9:30 am',
    '@TerrainDate.ThisWeek.4.T14:00:36-07:00': 'This Friday, 2:00 pm',
    '@TerrainDate.NextWeek.4.T16:30:07-07:00': 'Next Friday, 4:30 pm',
    '@TerrainDate.ThisWeek.3.T17:00:50-07:00': 'This Thursday, 5:00 pm',
    '@TerrainDate.ThisWeek.3.T22:30:13-07:00': 'This Thursday, 10:30 pm',
    '@TerrainDate.NextWeek.6.T23:30:35-07:00': 'Next Sunday, 11:30 pm',
    'Now+0w': '0 weeks from now',
    'Now+0d': '0 days from now',
    'Now-1w': '1 week ago',
    'Now+25M': '25 months from now',
    'Now-7w': '7 weeks ago',
    'Now-43y': '43 years ago',
    'Now-432h': '432 hours ago',
    'Now+1m': '1 minute from now',
    'Now-12y': '12 years ago',
    'Now-0M': '0 months ago',
  };

  describe('#formatTime', () =>
  {
    it('should return a properly formatted time', () =>
    {
      for (const rawTime of Object.keys(formatTimeTests))
      {
        expect(formatTimeTests[rawTime]).toEqual(DateUtil.formatTime(rawTime));
      }
    });

    it('should return a properly formatted calendar date', () =>
    {
      for (const calendarDate of Object.keys(formatCalendarDateTests))
      {
        expect(formatCalendarDateTests[calendarDate]).toEqual(DateUtil.formatCalendarDate(calendarDate));
      }
    });

    it('should return a properly formatted date within the one week scope', () =>
    {
      for (const relativeDate of Object.keys(formatRelativeDateTests))
      {
        expect(formatRelativeDateTests[relativeDate]).toEqual(DateUtil.formatRelativeDate(relativeDate));
      }
    });

    it('should return a properly formatted date from elastic input', () =>
    {
      for (const specificDate of Object.keys(formatSpecificDateTests))
      {
        expect(formatSpecificDateTests[specificDate]).toEqual(DateUtil.formatSpecificDate(specificDate));
      }
    });

    it('should return a properly formatted date from any of the date view type values', () =>
    {
      for (const rawDate of Object.keys(formatDateValueTests))
      {
        expect(formatDateValueTests[rawDate]).toEqual(DateUtil.formatDateValue(rawDate));
      }
    });
  });
},

);
