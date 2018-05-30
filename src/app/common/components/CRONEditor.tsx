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

// tslint:disable:no-var-requires strict-boolean-expressions

import * as classNames from 'classnames';
import * as cronParser from 'cron-parser';
import { List } from 'immutable';
import { noop } from 'lodash';
import * as React from 'react';
import
{
  CRONDaySchedule, CRONHourNames, CRONHourOptionsList, CRONHourSchedule,
  CRONMinuteOptionsList, CRONMonthDayOptionsList, CRONWeekDayNames, CRONWeekDayOptionsList,
} from 'shared/util/CRONConstants';
import
{
  canParseCRONSchedule, parseCRONDaySchedule, parseCRONHourSchedule, setCRONDays,
  setCRONHours, setCRONType,
} from 'shared/util/CRONParser';
import Util from 'util/Util';
import { borderColor, Colors, getStyle } from './../../colors/Colors';
import TerrainComponent from './../../common/components/TerrainComponent';
import './CRONEditorStyle.less';
import FadeInOut from './FadeInOut';
import FloatingInput from './FloatingInput';

// these two imports need to be separate because of Radium
import Picker from './Picker';
import { PickerOption } from './Picker';

export interface Props
{
  cron: string;
  onChange: (cron: string) => void;
}

class CRONEditor extends TerrainComponent<Props>
{
  public render()
  {
    return (
      <div>
        {
          this.renderDays()
        }
        {
          this.renderHours()
        }
        {
          this.renderCustom()
        }
        <div className='note'>
          Note: All times are PDT
        </div>
        <div className='note'>
          Schedule will next be executed:
        </div>
        <div className='note cron-editor-bottom-note'>
          <b>
            {
              Util.formatDate(
                cronParser.parseExpression(this.props.cron, { tz: 'America/Los_Angeles' }).next().toString(),
                true,
              )
            }
          </b>
        </div>
      </div>
    );
  }

  private handleOptionClick(daysOrHours: 'days' | 'hours', type: string)
  {
    const newCRON = setCRONType(this.props.cron, daysOrHours, type);
    if (newCRON === null)
    {
      // this may never be used
      alert('Not allowed');
      return;
    }

    this.props.onChange(newCRON);
  }

  private renderHeader(str: string)
  {
    return (
      <div
        className='common-list-option-style common-label-style'
        key={str}
      >
        {
          str
        }
      </div>
    );
  }

  private renderOption(text: string, type: string, sched: CRONDaySchedule | CRONHourSchedule,
    daysOrHours: 'days' | 'hours', el?: any)
  {
    const selected = sched && sched.type === type;

    return (
      <div
        className='common-list-option-style'
        style={selected ? SELECTED_OPTION_STYLE : null}
        onClick={selected ? noop : this._fn(this.handleOptionClick, daysOrHours, type)}
        key={type}
      >
        <div className='common-option-name-style'>
          <div>
            {
              text
            }
          </div>
          {
            el &&
            <FadeInOut
              open={selected}
            >
              <div style={getStyle('marginTop', 6)}>
                {
                  el
                }
              </div>
            </FadeInOut>
          }
        </div>
      </div>
    );
  }

  private renderDays()
  {
    const { cron } = this.props;
    const sched = this.canRenderCRONSchedule() ? parseCRONDaySchedule(cron, true) : null;

    return [
      this.renderHeader('Day'),
      this.renderOption('Every day', 'daily', sched, 'days'),
      this.renderOption('Every weekday', 'workweek', sched, 'days'),

      this.renderOption('Specific weekday(s)', 'weekly', sched, 'days',
        <div key='w' style={getStyle('margin', '0px -3px')}>
          <Picker
            options={this.getCRONOptions(sched, 'weekdays', CRONWeekDayOptionsList, CRONWeekDayNames, true)}
            canEdit={true}
            circular={true}
            onSelect={this._fn(this.handleCRONValueSelect, 'days', 'weekdays')}
          />
        </div>,
      ),

      this.renderOption('Specific day(s) of the month', 'monthly', sched, 'days',
        <div key='m' style={getStyle('margin', '0px -3px')}>
          <Picker
            options={this.getCRONOptions(sched, 'days', CRONMonthDayOptionsList)}
            canEdit={true}
            onSelect={this._fn(this.handleCRONValueSelect, 'days', 'days')}
            rowSize={7}
          />
        </div>,
      ),
    ];
  }

  private renderHours()
  {
    const { cron } = this.props;
    const sched = this.canRenderCRONSchedule() ? parseCRONHourSchedule(cron, true) : null;

    return [
      this.renderHeader('Time'),
      this.renderOption('Every minute', 'minute', sched, 'hours'),
      this.renderOption('Every hour', 'hourly', sched, 'hours',
        <div key='h' style={getStyle('margin', '0px -3px')}>
          <Picker
            options={this.getCRONOptions(sched, 'minutes', LimitedCRONMinuteOptionsList,
              LimitedCRONMinuteOptionsNames)}
            canEdit={true}
            onSelect={this._fn(this.handleCRONValueSelect, 'hours', 'minutes')}
            optionWidth={50}
          />
        </div>,
      ),

      this.renderOption('Specific hour(s)', 'daily', sched, 'hours',
        <div key='d' style={getStyle('margin', '0px -3px')}>
          <Picker
            options={this.getCRONOptions(sched, 'hours', CRONHourOptionsList, CRONHourNames, false)}
            canEdit={true}
            onSelect={this._fn(this.handleCRONValueSelect, 'hours', 'hours')}
            optionWidth={70}
          />
        </div>,
      ),
    ];
  }

  private renderCustom()
  {
    return [
      this.renderHeader('Custom'),
      <div
        className='common-list-option-style'
        key='c'
      >
        <div className='common-option-name-style'>
          <FloatingInput
            value={this.props.cron}
            onChange={this.props.onChange}
            label={'CRON Schedule'}
            isTextInput={true}
            canEdit={true}
          />
        </div>
      </div>,
    ];
  }

  private getCRONOptions(schedule: CRONDaySchedule | CRONHourSchedule, scheduleKey: string, CRONOptions: number[],
    labels?: { [k: number]: string }, substring?: boolean): List<PickerOption>
  {
    if (!schedule || !schedule[scheduleKey])
    {
      return null;
    }

    return List(CRONOptions.map((value) =>
    {
      let label;
      if (labels)
      {
        label = labels[value];
      }
      if (substring)
      {
        label = label.substr(0, 1);
      }

      return {
        value,
        selected: schedule[scheduleKey][value],
        label,
      };
    }));
  }

  private handleCRONValueSelect(daysOrHours: 'days' | 'hours', scheduleKey: string, index, option: PickerOption)
  {
    const parseFn = daysOrHours === 'days' ? parseCRONDaySchedule : parseCRONHourSchedule;
    const currentSched = parseFn(this.props.cron, false); // makes a copy
    if (currentSched === null)
    {
      alert('Unable to parse schedule, so unable to change schedule');
      return;
    }

    // toggle
    currentSched[scheduleKey][option.value] = !currentSched[scheduleKey][option.value];

    const setFn: any = daysOrHours === 'days' ? setCRONDays : setCRONHours;
    const newCRON = setFn(this.props.cron, currentSched);
    if (!newCRON || !canParseCRONSchedule(newCRON))
    {
      // tried to unselect something that is selected
      alert(`You must have at least one ${daysOrHours === 'days' ? 'day' : 'hour'} selected.`);
      return;
    }

    this.props.onChange(newCRON);
  }

  // This UI imposes additional restrictions on CRON schedules
  private canRenderCRONSchedule(): boolean
  {
    const { cron } = this.props;
    if (!canParseCRONSchedule(cron))
    {
      return false;
    }

    const hourSched = parseCRONHourSchedule(cron);
    if (hourSched.type === 'hourly')
    {
      // verify we can display the minutes
      for (const h in hourSched.minutes)
      {
        if (hourSched.minutes[h] && LimitedCRONMinuteOptionsList.indexOf(+h) === -1)
        {
          // involves a minute that we don't display in this UI
          return false;
        }
      }
    }

    return true;
  }
}

const LimitedCRONMinuteOptionsList = [0, 15, 30, 45];
const LimitedCRONMinuteOptionsNames = {
  0: ':00',
  15: ':15',
  30: ':30',
  45: ':45',
};

const SELECTED_OPTION_STYLE = {
  color: Colors().active,
  borderColor: Colors().active,
};

export default CRONEditor;
