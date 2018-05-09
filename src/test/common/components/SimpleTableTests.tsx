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

import SimpleTable from 'app/common/components/SimpleTable';
import { mount, shallow } from 'enzyme';
import * as Immutable from 'immutable';
import { List, Map, Record } from 'immutable';
import * as React from 'react';
import { _SchedulerConfig } from 'scheduler/SchedulerTypes';

describe('SimpleTable', () =>
{
  let tableComponent = null;

  const columnsConfig = {
    id: {
      columnKey: 'id',
      columnLabel: 'Id',
    },
    name: {
      columnKey: 'name',
      columnLabel: 'Name',
    },
    status: {
      columnKey: 'status',
      columnLabel: 'Status',
    },
  };

  let tableData = Immutable.Map<ID, any>({});
  const TableItem = Record({ id: 0, name: '', status: '' });
  tableData = tableData.set(1, new TableItem({
    id: 1,
    name: 'item 1',
    status: 'success',
  }));
  tableData = tableData.set(2, new TableItem({
    id: 2,
    name: 'item 2',
    status: 'failure',
  }));

  const tableState = {
    columnsConfig,
    data: tableData,
  };

  beforeEach(() =>
  {
    tableComponent = shallow(
      <SimpleTable
        {...tableState}
      />,
    );
  });

  describe('#render', () =>
  {
    it('should have a header and a body', () =>
    {
      expect(tableComponent.find('.simple-table')).toHaveLength(1);
      expect(tableComponent.find('.simple-table-header')).toHaveLength(1);
      expect(tableComponent.find('.simple-table-body')).toHaveLength(1);

      const columnsCount = Object.keys(columnsConfig).length;

      expect(tableComponent.find('.simple-table-header .simple-table-cell'))
        .toHaveLength(columnsCount);

      expect(tableComponent.find('.simple-table-body .simple-table-row'))
        .toHaveLength(2);

      expect(tableComponent.find('.simple-table-body .simple-table-cell'))
        .toHaveLength(2 * columnsCount);

      expect(tableComponent.find('.simple-table-body .simple-table-cell').at(0).text())
        .toEqual('1');
      expect(tableComponent.find('.simple-table-body .simple-table-cell').at(1).text())
        .toEqual('item 1');
      expect(tableComponent.find('.simple-table-body .simple-table-cell').at(2).text())
        .toEqual('success');
    });
  });
});
