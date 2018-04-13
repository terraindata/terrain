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
// tslint:disable:no-empty

import { Picker } from 'app/common/components/Picker';
import { mount, shallow } from 'enzyme';
import * as Immutable from 'immutable';
import { List, Map } from 'immutable';
import * as React from 'react';

describe('Picker', () =>
{
  let pickerComponent = null;
  const pickerState = {
    options: List([
      {
        value: 'a',
        label: 'A',
        selected: false,
      },
      {
        value: 'b',
        label: 'B',
        selected: false,
      },
      {
        value: 'c',
        label: 'C',
        selected: false,
      },
      {
        value: 'd',
        label: 'D',
        selected: false,
      },
    ]),
    rowSize: 2,
    canEdit: true,
    onSelect: (index, val) => { },
  };

  beforeEach(() =>
  {
    pickerComponent = shallow(
      <Picker
        {...pickerState}
      />,
    );
  });

  it('should render a picker with 2 rows and 4 options', () =>
  {
    expect(pickerComponent.find('.picker-wrapper')).toHaveLength(1);
    expect(pickerComponent.find('.picker-row')).toHaveLength(2);
    expect(pickerComponent.find('.picker-option')).toHaveLength(4);
  });

  describe('#render', () =>
  {
    it('should use a flex row when row size is not set', () =>
    {
      pickerComponent.setProps({ rowSize: 0 });
      expect(pickerComponent.find('.picker-row')).toHaveLength(1);
      expect(pickerComponent.find('.picker-row-flex')).toHaveLength(1);
    });

    it('should fill in rows with null options', () =>
    {
      const newOptions = pickerState.options.push({ value: 'e', label: 'E', selected: false });
      pickerComponent.setProps({ options: newOptions });
      expect(pickerComponent.find('.picker-option')).toHaveLength(6);
      expect(pickerComponent.find('.picker-row')).toHaveLength(3);
    });
  });
});
