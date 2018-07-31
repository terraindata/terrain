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

import { shallow } from 'enzyme';
import * as React from 'react';
import { DatePickerUncontained as DatePicker } from '../../../app/common/components/DatePicker';
import Dropdown from '../../../app/common/components/Dropdown';

/*
const testDates: SOMETHING
{
  date: '@TerrainDate.ThisWeek.1.T12:00:43-07:00',
  onChange: (value) => {},
  canEditL true,
  language: 'elastic',
  colorsActions: (value) => {},
},
{
  date: 'Now+24w',
  onChange: (value) => {},
  canEditL true,
  language: 'elastic',
  colorsActions: (value) => {},
}
*/

describe('DatePicker', () =>
{
  let datePickerComponent = null;
  const datePickerState = {
    date: '2018-06-05T11:17:24-07:00',
    onChange: (value) => { },
    canEdit: true,
    language: 'elastic',
    colorsActions: (value) => { },
  };

  beforeEach(() =>
  {
    datePickerComponent = shallow(
      <DatePicker
        {...datePickerState}
      />,
    );
  });

  it('should render a calendar with the correct date', () =>
  {
    expect(datePickerComponent.find('.date-view-title')).toHaveLength(1);
    expect(datePickerComponent.find('.date-view-label')).toHaveLength(0);
    expect(datePickerComponent.find('.unselected-date-type')).toHaveLength(2);
    expect(datePickerComponent.find('.selected-date-type')).toHaveLength(1);
    expect(datePickerComponent.state()['dateViewType']).toEqual('calendar');
    expect(datePickerComponent.state()['sign']).toEqual('-');
    expect(datePickerComponent.state()['unit']).toEqual('M');
    expect(datePickerComponent.state()['amount']).toEqual('');
    expect(datePickerComponent.find('.labeled-row')).toHaveLength(1);
    expect(datePickerComponent.find('.time-icon-wrapper')).toHaveLength(1);
    expect(datePickerComponent.find('.time-icon')).toHaveLength(1);
    expect(datePickerComponent.find(Dropdown)).toHaveLength(1);
  });

  describe('#render', () =>
  {
    it('should render relative type divs and info', () =>
    {
      datePickerComponent.setProps({ date: '@TerrainDate.ThisWeek.1.T12:00:43-07:00' });
      expect(datePickerComponent.find('.date-view-title')).toHaveLength(1);
      expect(datePickerComponent.find('.date-view-label')).toHaveLength(0);
      expect(datePickerComponent.find('.labeled-row')).toHaveLength(2);
      expect(datePickerComponent.find('.unselected-date-type')).toHaveLength(2);
      expect(datePickerComponent.find('.selected-date-type')).toHaveLength(1);
      expect(datePickerComponent.state()['dateViewType']).toEqual('relative');
      expect(datePickerComponent.find(Dropdown)).toHaveLength(2);
    });

    it('should render specific elastic type divs and info', () =>
    {
      datePickerComponent.setProps({ date: 'now+24w' });
      expect(datePickerComponent.find('.date-view-title')).toHaveLength(1);
      expect(datePickerComponent.find('.date-view-label')).toHaveLength(4);
      expect(datePickerComponent.find('.unselected-date-type')).toHaveLength(2);
      expect(datePickerComponent.find('.selected-date-type')).toHaveLength(1);
      expect(datePickerComponent.state()['dateViewType']).toEqual('specific');
      expect(datePickerComponent.state()['sign']).toEqual('+');
      expect(datePickerComponent.state()['unit']).toEqual('w');
      expect(datePickerComponent.state()['amount']).toEqual('24');
      expect(datePickerComponent.state()['specificity']).toEqual('');
      expect(datePickerComponent.find(Dropdown)).toHaveLength(3);

      datePickerComponent.setProps({ date: 'Now - 1M/d' });
      expect(datePickerComponent.find('.date-view-title')).toHaveLength(1);
      expect(datePickerComponent.find('.date-view-label')).toHaveLength(4);
      expect(datePickerComponent.find('.unselected-date-type')).toHaveLength(2);
      expect(datePickerComponent.find('.selected-date-type')).toHaveLength(1);
      expect(datePickerComponent.state()['dateViewType']).toEqual('specific');
      expect(datePickerComponent.state()['sign']).toEqual('-');
      expect(datePickerComponent.state()['unit']).toEqual('M');
      expect(datePickerComponent.state()['amount']).toEqual('1');
      expect(datePickerComponent.state()['specificity']).toEqual('d');
      expect(datePickerComponent.find(Dropdown)).toHaveLength(3);

      datePickerComponent.setProps({ date: 'now +21342y' });
      expect(datePickerComponent.find('.date-view-title')).toHaveLength(1);
      expect(datePickerComponent.find('.date-view-label')).toHaveLength(4);
      expect(datePickerComponent.find('.unselected-date-type')).toHaveLength(2);
      expect(datePickerComponent.find('.selected-date-type')).toHaveLength(1);
      expect(datePickerComponent.state()['dateViewType']).toEqual('specific');
      expect(datePickerComponent.state()['sign']).toEqual('+');
      expect(datePickerComponent.state()['unit']).toEqual('y');
      expect(datePickerComponent.state()['amount']).toEqual('21342');
      expect(datePickerComponent.state()['specificity']).toEqual('');
      expect(datePickerComponent.find(Dropdown)).toHaveLength(3);

      datePickerComponent.setProps({ date: 'Now- 0m /y' });
      expect(datePickerComponent.find('.date-view-title')).toHaveLength(1);
      expect(datePickerComponent.find('.date-view-label')).toHaveLength(4);
      expect(datePickerComponent.find('.unselected-date-type')).toHaveLength(2);
      expect(datePickerComponent.find('.selected-date-type')).toHaveLength(1);
      expect(datePickerComponent.state()['dateViewType']).toEqual('specific');
      expect(datePickerComponent.state()['sign']).toEqual('-');
      expect(datePickerComponent.state()['unit']).toEqual('m');
      expect(datePickerComponent.state()['amount']).toEqual('0');
      expect(datePickerComponent.state()['specificity']).toEqual('y');
      expect(datePickerComponent.find(Dropdown)).toHaveLength(3);
    });

  });
});
