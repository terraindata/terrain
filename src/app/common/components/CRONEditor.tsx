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

// tslint:disable:no-var-requires

import './CRONEditorStyle.less';
import * as classNames from 'classnames';
import { noop } from 'lodash';
import * as React from 'react';
import { borderColor, Colors, getStyle } from './../../colors/Colors';
import TerrainComponent from './../../common/components/TerrainComponent';
import FadeInOut from './FadeInOut';
import FloatingInput from './FloatingInput';
import { parseCRONDaySchedule, parseCRONHourSchedule, canParseCRONSchedule, setCRONDays,
  setCRONHours, setCRONType } from 'shared/util/CRONParser';
import { CRONHourNames, CRONHourOptions, CRONWeekDayNames, CRONWeekDayOptions,
  CRONMonthDayOptions, CRONDaySchedule, CRONHourSchedule } from 'shared/util/CRONConstants';

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
          {
            text
          }
        </div>
        {
          el &&
            <FadeInOut
              open={selected}
            >
              {
                el
              }
            </FadeInOut>
        }
      </div>
    );
  }
  
  private renderDays()
  {
    const { cron } = this.props;
    const sched = canParseCRONSchedule(cron) ? parseCRONDaySchedule(cron) : null;
    
    return [
      this.renderHeader('Day'),
      this.renderOption('Every day', 'daily', sched, 'days'),
      this.renderOption('Every weekday', 'weekdays', sched, 'days'),
      
      this.renderOption('Specific weekday(s)', 'weekly', sched, 'days',
        <div key='w'>
          {
            JSON.stringify(sched.weekdays)
          }
        </div>
      ),
      
      this.renderOption('Specific day(s) of the month', 'monthly', sched, 'days',
        <div key='m'>
          {
            JSON.stringify(sched.days)
          }
        </div>
      ),
    ];
  }
  
  private renderHours()
  {
    const { cron } = this.props;
    const sched = canParseCRONSchedule(cron) ? parseCRONHourSchedule(cron) : null;
    
    return [
      this.renderHeader('Time'),
      this.renderOption('Every minute', 'minute', sched, 'hours'),
      this.renderOption('Every hour', 'hourly', sched, 'hours',
        <div key='h'>
          {
            JSON.stringify(sched.minutes)
          }
        </div>
      ),

      this.renderOption('Specific hour(s)', 'daily', sched, 'hours',
        <div key='d'>
          {
            JSON.stringify(sched.hours)
          }
        </div>
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
      </div>
    ];
  }
}

const SELECTED_OPTION_STYLE = {
  color: Colors().active,
  borderColor: Colors().active,
};

export default CRONEditor;
