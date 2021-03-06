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

// tslint:disable:no-var-requires restrict-plus-operands strict-boolean-expressions

import * as Immutable from 'immutable';
import * as TerrainLog from 'loglevel';
import * as moment from 'moment';
import * as React from 'react';
import DayPicker from 'react-day-picker';
import './DatePicker.less';
const DateUtils = DayPicker.DateUtils;
import TerrainComponent from '../../common/components/TerrainComponent';
import Util from '../../util/Util';
import Dropdown from './Dropdown';

import _ = require('lodash');
import { Moment } from 'moment';
import TerrainDateParameter from '../../../../shared/database/elastic/parser/TerrainDateParameter';
import { Colors, getStyle } from '../../colors/Colors';
import { ColorsActions } from '../../colors/data/ColorsRedux';
import FadeInOut from '../../common/components/FadeInOut';

const TimeIcon = require('../../../images/icon_clock.svg?name=TimeIcon');
const ScopeIcon = require('../../../images/icon_calendar.svg?name=ScopeIcon');

const PrevMonthIcon = require('../../../images/icon_arrowCircleLeft.svg?name=PrevMonthIcon');
const NextMonthIcon = require('../../../images/icon_arrowCircleRight.svg?name=NextMonthIcon');

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

const DateParameterMap = {
  'This Monday': '@TerrainDate.ThisWeek.0',
  'Next Monday': '@TerrainDate.NextWeek.0',
  'This Tuesday': '@TerrainDate.ThisWeek.1',
  'Next Tuesday': '@TerrainDate.NextWeek.1',
  'This Wednesday': '@TerrainDate.ThisWeek.2',
  'Next Wednesday': '@TerrainDate.NextWeek.2',
  'This Thursday': '@TerrainDate.ThisWeek.3',
  'Next Thursday': '@TerrainDate.NextWeek.3',
  'This Friday': '@TerrainDate.ThisWeek.4',
  'Next Friday': '@TerrainDate.NextWeek.4',
  'This Saturday': '@TerrainDate.ThisWeek.5',
  'Next Saturday': '@TerrainDate.NextWeek.5',
  'This Sunday': '@TerrainDate.ThisWeek.6',
  'Next Sunday': '@TerrainDate.NextWeek.6',
};
const DateParameterArray = [
  'This Monday',
  'Next Monday',
  'This Tuesday',
  'Next Tuesday',
  'This Wednesday',
  'Next Wednesday',
  'This Thursday',
  'Next Thursday',
  'This Friday',
  'Next Friday',
  'This Saturday',
  'Next Saturday',
  'This Sunday',
  'Next Sunday',
];
const DateParameterOptions = Immutable.List(DateParameterArray);

const DateTenseMap = {
  '-': 'Past (Ago)',
  '+': 'Future (From Now)',
};
const DateTenseMapImmu = Immutable.Map(DateTenseMap);
const DateTenseArray = [
  '-',
  '+',
];
const DateTenseOptions = Immutable.List(DateTenseArray);

export const DateUnitMap = {
  m: 'Minute(s)',
  h: 'Hour(s)',
  d: 'Day(s)',
  w: 'Week(s)',
  M: 'Month(s)',
  y: 'Year(s)',
};
const DateUnitMapImmu = Immutable.Map(DateUnitMap);
export const DateUnitArray = [
  'm',
  'h',
  'd',
  'w',
  'M',
  'y',
];
const DateUnitOptions = Immutable.List(DateUnitArray);
export const DateSpecificityArray = [
  '',
  'm',
  'h',
  'd',
  'w',
  'M',
  'y',
];
const DateSpecificityOptions = Immutable.List(DateSpecificityArray);
const DateSpecificityMap = {
  '': 'Unspecified',
  'm': 'Minute',
  'h': 'Hour',
  'd': 'Day',
  'w': 'Week',
  'M': 'Month',
  'y': 'Year',
};
const DateSpecificityMapImmu = Immutable.Map(DateSpecificityMap);

const weekdaysShort = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function Navbar({
  nextMonth,
  previousMonth,
  onPreviousClick,
  onNextClick,
  className,
  localeUtils,
}: any)
{
  return (
    <div className='calendar-nav-bar'>
      <div className='prev-month-button' onClick={() => onPreviousClick()}>
        <PrevMonthIcon />
      </div>
      <div className='next-month-button' onClick={() => onNextClick()}>
        <NextMonthIcon />
      </div>
    </div>
  );
}

export interface Props
{
  date: string;
  onChange: (newDate: string) => void;
  canEdit: boolean;
  language: string;
  colorsActions: typeof ColorsActions;
}

let COLORS_ACTIONS_SET = false;

export class DatePickerUncontained extends TerrainComponent<Props>
{
  public state = {
    dateViewType: 'calendar',
    sign: '-',
    unit: 'M',
    amount: '',
    specificity: '',
  };
  public componentDidMount()
  {
    const currentDateViewType = this.getDateViewType(this.props.date);
    this.setState(
      {
        dateViewType: currentDateViewType,
      },
    );
    if (currentDateViewType === 'specific')
    {
      const updatedState = this.updateElasticState(this.props.date);
      this.setState(
        {
          sign: updatedState[0],
          unit: updatedState[1],
          amount: updatedState[2],
          specificity: updatedState[3],
        },
      );
    }
    if (!COLORS_ACTIONS_SET)
    {
      COLORS_ACTIONS_SET = true;
      this.props.colorsActions({
        actionType: 'setStyle',
        selector: '.date-picker',
        style: { background: Colors().bg, color: Colors().text2 },
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
        selector: '.DayPicker-Caption',
        style: { 'border-color': Colors().sectionEditButton },
      });
      this.props.colorsActions({
        actionType: 'setStyle',
        selector: '.DayPicker',
        style: { 'border-color': Colors().sectionEditButton },
      });
      this.props.colorsActions({
        actionType: 'setStyle',
        selector: '.DayPicker-Month',
        style: { background: Colors().altBg1 },
      });
      this.props.colorsActions({
        actionType: 'setStyle',
        selector: '.DayPicker-Body',
        style: { background: Colors().altBg1 },
      });
      this.props.colorsActions({
        actionType: 'setStyle',
        selector: '.DayPicker-Day',
        style: { 'border-color': Colors().altHighlight, 'background': Colors().altBg1, 'color': Colors().mainSectionTitle },
      });
      this.props.colorsActions({
        actionType: 'setStyle',
        selector: '.DayPicker-Day:hover:not(.DayPicker-Day--selected):not(.DayPicker-Day--outside)',
        style: { background: Colors().inactiveHover, color: Colors().activeText },
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
        style: { color: Colors().text2, background: Colors().bg },
      });
      this.props.colorsActions({
        actionType: 'setStyle',
        selector: '.DayPicker-Day--sunday',
        style: { 'color': Colors().text2, 'background-color': Colors().altBg1 },
      });
      this.props.colorsActions({
        actionType: 'setStyle',
        selector: '.DayPicker-Day--selected:not(.DayPicker-Day--disabled):not(.DayPicker-Day--outside)',
        style: { 'color': Colors().activeText, 'background-color': Colors().active },
      });
      this.props.colorsActions({
        actionType: 'setStyle',
        selector: '.DayPicker-Day--today',
        style: { 'color': Colors().active, 'background-color': Colors().bg },
      });
      this.props.colorsActions({
        actionType: 'setStyle',
        selector: '.date-view-label',
        style: { 'color': Colors().mainSectionTitle, 'background-color': Colors().bg },
      });
      this.props.colorsActions({
        actionType: 'setStyle',
        selector: '.selected-date-type',
        style: { 'color': Colors().active, 'border-color': Colors().activeHover },
      });
      this.props.colorsActions({
        actionType: 'setStyle',
        selector: '.unselected-date-type',
        style: { 'color': Colors().text3, 'background-color': Colors().bg },
      });
      this.props.colorsActions({
        actionType: 'setStyle',
        selector: '.prev-month-button',
        style: { 'fill': Colors().active, 'background-color': Colors().bg },
      });
      this.props.colorsActions({
        actionType: 'setStyle',
        selector: '.next-month-button',
        style: { 'fill': Colors().active, 'background-color': Colors().bg },
      });
      this.props.colorsActions({
        actionType: 'setStyle',
        selector: '.time-icon',
        style: { fill: Colors().mainSectionTitle },
      });
      this.props.colorsActions({
        actionType: 'setStyle',
        selector: '.scope-icon',
        style: { fill: Colors().mainSectionTitle },
      });
    }
  }

  public updateElasticState(nextDate)
  {
    let newSign;
    let newUnit;
    const newDate = nextDate.replace(/ /g, '');
    const nextSign = newDate[3];
    if (nextSign === '+' || nextSign === '-')
    {
      newSign = nextSign;
    }
    else
    {
      newSign = '-';
    }
    const specificityIndex = newDate.length - 2;
    const isSpecified = (newDate[specificityIndex] === '/');
    const nextUnit = (isSpecified) ? newDate[newDate.length - 3] : newDate.slice(-1);
    if ((DateUnitArray.indexOf(nextUnit) !== -1) && newDate.toLowerCase() !== 'now')
    {
      newUnit = nextUnit;
    }
    else
    {
      newUnit = 'M';
    }
    const newAmount = (isSpecified) ? newDate.slice(4, -3) : newDate.slice(4, -1);
    const newSpecificity = (isSpecified) ? newDate.slice(-1) : '';
    return [newSign, newUnit, newAmount, newSpecificity];
  }

  public componentWillReceiveProps(nextProps)
  {
    let nextDateViewType;
    if (this.props.date !== nextProps.date)
    {
      nextDateViewType = this.getDateViewType(nextProps.date);
    }
    if (nextDateViewType !== this.state.dateViewType)
    {
      this.setState(
        {
          dateViewType: nextDateViewType,
        },
      );
    }
    if (nextDateViewType === 'specific')
    {
      const updatedState = this.updateElasticState(nextProps.date);
      this.setState(
        {
          sign: updatedState[0],
          unit: updatedState[1],
          amount: updatedState[2],
          specificity: updatedState[3],
        },
      );
    }
  }

  public getDateViewType(rawDateProp: string): string
  {
    let dateViewType;
    const dateProp = rawDateProp.replace(/ /g, '');
    const elasticCheck = dateProp.slice(0, 3).toLowerCase();
    if (dateProp.startsWith('@TerrainDate'))
    {
      dateViewType = 'relative';
    }
    else if (elasticCheck === 'now')
    {
      dateViewType = 'specific';
    }
    else
    {
      dateViewType = 'calendar';
    }
    return dateViewType;
  }

  public getDate(): Moment
  {
    let dateStr = this.props.date;
    if (TerrainDateParameter.isValidTerrainDateParameter(dateStr))
    {
      try
      {
        dateStr = TerrainDateParameter.getDateString(dateStr);
      } catch (err)
      {
        TerrainLog.error('Error when parsing this.props.date:' + err.message);
      }
    }
    let date = moment.parseZone(dateStr);
    if (date.isValid() === false)
    {
      date = moment();
    }
    return date;
  }

  public handleDayClick(day: Date, modifiers, e)
  {
    const date = this.getDate();
    date.date(day.getDate());
    date.month(day.getMonth());
    date.year(day.getFullYear());
    this.props.onChange(Util.formatInputDate(date, this.props.language));
  }

  public handleHourChange(hourIndex)
  {
    if (this.props.date.startsWith('@TerrainDate') &&
      TerrainDateParameter.isValidTerrainDateParameter(this.props.date) &&
      this.state.dateViewType === 'relative')
    {
      const newHour = Math.floor(hourIndex / MINUTE_RATIO);
      const newMinute = (hourIndex % MINUTE_RATIO) * MINUTE_INTERVAL;
      const timeStr = moment().hour(newHour).minute(newMinute).format('HH:mm:ssZ');
      const date = TerrainDateParameter.setTimePart(this.props.date, timeStr);
      this.props.onChange(date);
    }
    else
    {
      const date = this.getDate();
      date.hour(Math.floor(hourIndex / MINUTE_RATIO));
      date.minute((hourIndex % MINUTE_RATIO) * MINUTE_INTERVAL);
      this.props.onChange(Util.formatInputDate(date, this.props.language));
    }
  }

  public handleDateParameterChange(dateParameterIndex)
  {
    const indexName = DateParameterArray[dateParameterIndex];
    let date = DateParameterMap[indexName];
    if (TerrainDateParameter.isValidTerrainDateParameter(this.props.date))
    {
      date = TerrainDateParameter.setDayPart(this.props.date, date);
    }
    else
    {
      const now = this.getDate().format('HH:mm:ssZ');
      date = date + '.T' + now;
    }

    this.props.onChange(date);
  }

  public handleTenseChange(tenseIndex)
  {
    const sign = DateTenseArray[tenseIndex];
    this.props.onChange(this.formatElasticQuery(sign, this.state.unit, this.state.amount, this.state.specificity));
  }

  public handleUnitChange(unitIndex)
  {
    const unit = DateUnitArray[unitIndex];
    this.props.onChange(this.formatElasticQuery(this.state.sign, unit, this.state.amount, this.state.specificity));
  }

  public handleAmountChange(e)
  {
    this.props.onChange(this.formatElasticQuery(this.state.sign, this.state.unit, e.target.value, this.state.specificity));
  }

  public handleSpecificityChange(specificityIndex)
  {
    const specificity = DateSpecificityArray[specificityIndex];
    this.props.onChange(this.formatElasticQuery(this.state.sign, this.state.unit, this.state.amount, specificity));
  }

  public formatElasticQuery(sign: string, unit: string, amount: string, specificity: string): string
  {
    const specificitySegment = (specificity === '') ? '' : ('/' + specificity);
    return 'now' + sign + amount + unit + specificitySegment;
  }

  public dateToHourIndex(date: Moment)
  {
    return date.hours() * (60 / MINUTE_INTERVAL) + Math.floor(date.minutes() / MINUTE_INTERVAL);
  }

  public dateToDateParameterMapIndex()
  {
    if (TerrainDateParameter.isValidTerrainDateParameter(this.props.date))
    {
      const datePart = TerrainDateParameter.getDatePart(this.props.date);
      const index = _.findIndex(DateParameterArray, (v) => DateParameterMap[v] === datePart);
      return index;
    }
    return -1;
  }

  public renderTimePicker(date)
  {
    return (
      <div className='labeled-row'>
        <Dropdown
          canEdit={this.props.canEdit}
          options={HOUR_OPTIONS}
          selectedIndex={this.dateToHourIndex(this.getDate())}
          onChange={this.handleHourChange}
          iconLabel={<TimeIcon className='time-icon' />}
          iconTooltip='Time'
          labelClass='time-icon-wrapper'
        />
      </div>
    );
  }

  public renderRelativeTimePicker(date)
  {
    return (
      <div className='labeled-row'>
        <Dropdown
          canEdit={this.props.canEdit}
          options={DateParameterOptions}
          selectedIndex={this.dateToDateParameterMapIndex()}
          onChange={this.handleDateParameterChange}
          iconLabel={<ScopeIcon className='scope-icon' />}
          iconTooltip='One Week Scope'
          labelClass='time-icon-wrapper'
        />
      </div>
    );
  }

  public renderCalendar(dateArg, modifiersArg)
  {
    return (
      <div className='date-time-time'>
        <DayPicker
          modifiers={modifiersArg}
          onDayClick={this.handleDayClick}
          initialMonth={dateArg.toDate()}
          weekdaysShort={weekdaysShort as any}
          navbarElement={<Navbar />}
        />
        {this.renderTimePicker(dateArg)}
      </div>
    );
  }

  public renderRelative(dateArg)
  {
    return (
      <div className='date-time-time-top'>
        {this.renderRelativeTimePicker(dateArg)}
        <FadeInOut
          open={this.state.dateViewType === 'relative' && this.props.date.includes('@TerrainDate')}
          children={this.renderTimePicker(dateArg)}
        />
      </div>
    );
  }

  public renderSpecific()
  {
    return (
      <div className='date-time-time-top'>
        <div className='labeled-row'>
          <p className='date-view-label'>Period</p>
          <Dropdown
            canEdit={this.props.canEdit}
            options={DateTenseOptions}
            optionsDisplayName={DateTenseMapImmu}
            selectedIndex={DateTenseOptions.indexOf(this.state.sign)}
            onChange={this.handleTenseChange}
          />
        </div>
        <div className='labeled-row'>
          <p className='date-view-label'>Unit of Time</p>
          <Dropdown
            canEdit={this.props.canEdit}
            options={DateUnitOptions}
            optionsDisplayName={DateUnitMapImmu}
            selectedIndex={DateUnitOptions.indexOf(this.state.unit)}
            onChange={this.handleUnitChange}
          />
        </div>
        <div className='labeled-row'>
          <p className='date-view-label'>Amount</p>
          <input
            className='specific-time-amount'
            type='text'
            value={this.state.amount || ''}
            onChange={this.handleAmountChange}
          />
        </div>
        <div className='labeled-row'>
          <p className='date-view-label'>To the nearest</p>
          <Dropdown
            canEdit={this.props.canEdit}
            options={DateSpecificityOptions}
            optionsDisplayName={DateSpecificityMapImmu}
            selectedIndex={DateSpecificityOptions.indexOf(this.state.specificity)}
            onChange={this.handleSpecificityChange}
          />
        </div>
      </div>
    );
  }

  public onDateViewChange(changedDateView: string)
  {
    this.setState(
      {
        dateViewType: changedDateView,
      },
    );
  }

  public render()
  {
    const date = this.getDate();
    const modifiers =
    {
      selected: (day) => DateUtils.isSameDay(day, date.toDate()),
      today: new Date(),
    };

    return (
      <div
        className='date-picker'
      >
        <p className='date-view-title'>View Type</p>
        <div
          className={this.state.dateViewType === 'calendar' ? 'selected-date-type' : 'unselected-date-type'}
          onClick={this._fn(this.onDateViewChange, 'calendar')}
        >
          calendar
        </div>
        <div
          className={this.state.dateViewType === 'relative' ? 'selected-date-type' : 'unselected-date-type'}
          onClick={this._fn(this.onDateViewChange, 'relative')}
        >
          relative
        </div>
        <div
          className={this.state.dateViewType === 'specific' ? 'selected-date-type' : 'unselected-date-type'}
          onClick={this._fn(this.onDateViewChange, 'specific')}
        >
          custom
        </div>
        {this.state.dateViewType === 'calendar' && this.renderCalendar(date, modifiers)}
        {this.state.dateViewType === 'relative' && this.renderRelative(date)}
        {this.state.dateViewType === 'specific' && this.renderSpecific()}
      </div>
    );
  }
}

const DatePicker = Util.createContainer(
  DatePickerUncontained,
  [],
  {
    colorsActions: ColorsActions,
  },
);
export default DatePicker;
