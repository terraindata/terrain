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

import * as moment from 'moment';

export default class TerrainDateParameter
{
  /**
   *
   * @param {string} dateString in format 'TerrainDate.[ThisWeek/NextWeek].[0-6].{T00:00:00+00:00}'
   * This function replace the parameter with the current time.
   */
  public static fillTerrainDateParameter(dateString: string): string
  {
    if (TerrainDateParameter.isValidTerrainDateParameter(dateString) === false)
    {
      throw new Error('The TerrainDate parameter ' + dateString + ' is not in the right format:'
        + 'TerrainDate.{ThisWeek/NextWeek}.[0-6]{T00:00:00+00:00}.');
    }

    const datePart = dateString.split('.');

    const dayOffset = Number(datePart[2]);
    const today = moment().startOf('week');
    if (datePart[1] === 'NextWeek')
    {
      today.add(1, 'w');
    }
    today.add(dayOffset, 'd');
    let dateStr = today.format('YYYY-MM-DD');
    if (datePart.length > 3)
    {
      dateStr = dateStr + datePart[3];
      if (moment.parseZone(dateStr).isValid() === false)
      {
        throw new Error('The generated time string is not valid: ' + dateString + ' -> ' + dateStr);
      }
    }
    return JSON.stringify(dateStr);
  }

  public static isValidTerrainDateParameter(dateString: string): boolean
  {
    let datePart;
    if (dateString.startsWith('@'))
    {
      datePart = dateString.slice(1).split('.');
    } else
    {
      datePart = dateString.split('.');
    }

    if (datePart.length < 3 || datePart[0] !== 'TerrainDate' || (datePart[1] !== 'ThisWeek' && datePart[1] !== 'NextWeek') ||
      Number.isInteger(Number(datePart[2])) === false ||
      Number(datePart[2]) < 0 || Number(datePart[2]) > 6)
    {
      return false;
    }
    return true;
  }

  public static getTimePart(dateString: string): string
  {
    const  datePart = dateString.split('.');
    if (datePart[3] !== undefined)
    {
      return datePart[3];
    } else
    {
      return null;
    }
  }
  public static setTimePart(dateString: string, timeStr: string): string
  {
    const  datePart = dateString.split('.');
    if (timeStr.startsWith('T'))
    {
      datePart[3] = timeStr;
    } else
    {
      datePart[3] = 'T' + timeStr;
    }
    return datePart.join('.');
  }

  public static getDatePart(dateString: string): string
  {
    const  datePart = dateString.split('.');
    return datePart.slice(0, 3).join('.');
  }
  public static setDayPart(dateString: string, dayStr: string): string
  {
    const  datePart = dateString.split('.');
    if (datePart[3] === undefined)
    {
      return dayStr;
    }
    const dayPart = dayStr.split('.');
    dayPart[3] = datePart[3];
    return dayPart.join('.');
  }
}
