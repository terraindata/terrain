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

import * as Immutable from 'immutable';
import * as _ from 'lodash';
import * as React from 'react';
const moment = require('moment');
import onClickOutside from 'react-onclickoutside';
import TerrainComponent from '../../common/components/TerrainComponent';
import Util from '../../util/Util';
import Dropdown from './Dropdown';

import { backgroundColor, borderColor, Colors, fontColor, getStyle } from '../../colors/Colors';
import DatePicker from './DatePicker';
import './DatePicker.less';
import FadeInOut from './FadeInOut';

const CalendarIcon = require('images/icon_calendar.svg');

export interface Props
{
  date: string;
  onChange: (newDate: string) => void;
  canEdit: boolean;
  language: string;
  format?: string;
}

class DatePickerWrapper extends TerrainComponent<Props>
{
  public state: {
    expanded: boolean;
  } = {
      expanded: false,
    };

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

  public handleClickOutside()
  {
    this.setState({
      expanded: false,
    });
  }

  public render()
  {
    const { language } = this.props;
    const date = this.getDate();
    const dateText = this.props.format === undefined ? Util.formatInputDate(date, language) :
      moment(date).format(this.props.format);
    const dateStyle = _.extend({}, fontColor(Colors().text1), backgroundColor(Colors().inputBg), borderColor(Colors().inputBorder));
    return (
      <div className='date-picker-wrapper'>
        <div
          onClick={this._toggle('expanded')}
          className='date-picker-wrapper-date'
          style={dateStyle}
        >
          <CalendarIcon style={getStyle('fill', Colors().iconColor)} />
          <span>{dateText}</span>
        </div>
        <FadeInOut
          children={<DatePicker {...this.props} />}
          open={this.state.expanded}
        />
      </div>
    );
  }
}

export default onClickOutside(DatePickerWrapper);
