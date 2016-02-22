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

require('./DatePicker.less')
import * as React from 'react';
import * as moment from 'moment';
var ReactDayPicker = require('react-day-picker').default;
var DateUtils = require('react-day-picker').DateUtils;
import Util from '../../util/Util.tsx';
import Dropdown from './Dropdown.tsx';
import LayoutManager from './../layout/LayoutManager.tsx';

var HOUR_OPTIONS = [];
for(var h = 0; h < 24; h ++) HOUR_OPTIONS.push("" + h);

var MINUTE_INTERVAL = 15;
var MINUTE_OPTIONS = [];
for(var m = 0; m < 60; m += MINUTE_INTERVAL) MINUTE_OPTIONS.push((m < 10 ? "0" : "") + m);

interface Props {
  date: string;
  onChange: (newDate: string) => void;
}

class DatePicker extends React.Component<Props, any>
{
  constructor(props)
  {
    super(props);
    
    Util.bind(this, ['handleDayClick', 'getDate', 'renderTimePicker',
      'handleMinuteChange', 'handleHourChange']);
  }
  
  getDate(): Date
  {
    return new Date(this.props.date);
  }
  
  handleDayClick(e, day: Date, modifiers)
  {
    var date = this.getDate();
    date.setDate(day.getDate());
    date.setMonth(day.getMonth());
    date.setFullYear(day.getFullYear());
    console.log(date.toString());
    this.props.onChange(date.toString());
  }
  
  handleHourChange(hour)
  {
    var date = this.getDate();
    date.setHours(hour);
    this.props.onChange(date.toString()); 
  }
  
  handleMinuteChange(minuteInterval)
  {
    var date = this.getDate();
    date.setMinutes(minuteInterval * MINUTE_INTERVAL);
    this.props.onChange(date.toString());
  }
  
  renderTimePicker()
  {
    var date = this.getDate();
    
    var layout =
    {
      columns: [
        {
          content: <Dropdown 
            options={HOUR_OPTIONS}
            selectedIndex={date.getHours()}
            onChange={this.handleHourChange} />
        },
        {
          content: <div className='date-time-colon'>:</div>,
          width: 25,
        },
        {
          content: <Dropdown 
            options={MINUTE_OPTIONS}
            selectedIndex={date.getMinutes() / MINUTE_INTERVAL}
            onChange={this.handleMinuteChange} />
        }
      ],
    }
    
    return (
      <div className='date-time-time'>
        <LayoutManager layout={layout} />
      </div>);
  }
  
  render() {
    var date = this.getDate();
    const modifiers = 
    {
      selected: day => DateUtils.isSameDay(day, date),
    }
    
    return (
      <div className='date-picker'>
        <ReactDayPicker
          modifiers={modifiers}
          onDayClick={this.handleDayClick}
          initialMonth={date} />
        { this.renderTimePicker() }
      </div>
     );
  }
};

export default DatePicker;