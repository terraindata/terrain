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

// tslint:disable:no-var-requires restrict-plus-operands

import * as React from 'react';
import './DatePicker.less';
// import * as moment from 'moment';
const moment = require('moment');
import * as Immutable from 'immutable';
import DayPicker from 'react-day-picker';
const DateUtils = DayPicker.DateUtils;
import TerrainComponent from '../../common/components/TerrainComponent';
import Util from '../../util/Util';
import Dropdown from './Dropdown';

import { backgroundColor, Colors, fontColor, getStyle } from '../../colors/Colors';
import { ColorsActions } from '../../colors/data/ColorsRedux';

const MINUTE_INTERVAL = 30;
const MINUTE_RATIO = (60 / MINUTE_INTERVAL);

const _hours = [];
for (let h = 0; h < 24; h++)
{
  for (let m = 0; m < 60; m += MINUTE_INTERVAL)
  {
    let hour = (h - 1) % 12 + 1;
    if (h === 0)
    {
      hour = 12;
    }
    _hours.push(hour + ':' + (m < 10 ? '0' : '') + m + (h < 12 ? 'am' : 'pm'));
  }
}

const HOUR_OPTIONS = Immutable.List(_hours);

export interface Props
{
  date: string;
  onChange: (newDate: string) => void;
  canEdit: boolean;
  language: string;
  colorsActions: typeof ColorsActions;
}

class DatePicker extends TerrainComponent<Props>
{
  public componentWillMount()
  {
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.date-picker',
      style: { background: Colors().bg1, color: Colors().text2 },
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.date-picker .dropdown-wrapper:not(:hover)',
      style: { 'box-shadow': getStyle('boxShadow', '0px 0px 0px 1px ' + Colors().boxShadow) },
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.DayPicker-Weekday',
      style: { color: Colors().text2 },
    });
     this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.DayPicker-Day',
      style: { 'border-color': Colors().altHighlight, 'background': Colors().altBg1, 'color': Colors().altText3  },
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.DayPicker-Day:hover:not(.DayPicker-Day--selected):not(.DayPicker-Day--outside)',
      style: { background: Colors().inactiveHover },
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.DayPicker-Day--today',
      style: { 'color': Colors().altText1, 'background-color': Colors().altBg1 },
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.DayPicker-Day--disabled',
      style: { 'color': Colors().text2, 'background-color': Colors().altBg2 },
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.DayPicker-Day--outside',
      style: { color: Colors().text2, background: Colors().altBg2 },
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.DayPicker-Day--sunday',
      style: { 'color': Colors().text2, 'background-color': Colors().altBg1 },
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.DayPicker-Day--selected:not(.DayPicker-Day--disabled):not(.DayPicker-Day--outside)',
      style: { 'color': Colors().text1, 'background-color': Colors().active },
    });
  }

  public getDate(): Date
  {
    let date = new Date(this.props.date);
    if (isNaN(date.getTime()))
    {
      // not a valid date
      date = new Date();
      date.setMinutes(0);
    }

    return date;
  }

  public handleDayClick(day: Date, modifiers, e)
  {
    const date = this.getDate();
    date.setDate(day.getDate());
    date.setMonth(day.getMonth());
    date.setFullYear(day.getFullYear());
    this.props.onChange(Util.formatInputDate(date, this.props.language));
  }

  public handleHourChange(hourIndex)
  {
    const date = this.getDate();
    date.setHours(Math.floor(hourIndex / MINUTE_RATIO));
    date.setMinutes((hourIndex % MINUTE_RATIO) * MINUTE_INTERVAL);
    this.props.onChange(Util.formatInputDate(date, this.props.language));
  }

  public dateToHourIndex(date)
  {
    return date.getHours() * (60 / MINUTE_INTERVAL) + (date.getMinutes() / MINUTE_INTERVAL);
  }

  public renderTimePicker()
  {
    const date = this.getDate();

    return (
      <div className='date-time-time'>
        <Dropdown
          canEdit={this.props.canEdit}
          options={HOUR_OPTIONS}
          selectedIndex={this.dateToHourIndex(this.getDate())}
          onChange={this.handleHourChange}
        />
      </div>);
  }

  public render()
  {
    const date = this.getDate();
    const modifiers =
      {
        selected: (day) => DateUtils.isSameDay(day, date),
      };

    return (
      <div
        className='date-picker'
      >
        <DayPicker
          modifiers={modifiers}
          onDayClick={this.handleDayClick}
          initialMonth={date}
        />
        {this.renderTimePicker()}
      </div>
    );
  }
}

export default Util.createContainer(
  DatePicker,
  [],
  {
    colorsActions: ColorsActions
  },
);