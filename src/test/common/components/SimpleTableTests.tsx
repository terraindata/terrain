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
import { shallow } from 'enzyme';
import * as Immutable from 'immutable';
import { Record } from 'immutable';
import * as React from 'react';

describe('SimpleTable', () =>
{
  let tableComponent = null;

  const columnsConfig = [
    {
      columnKey: 'id',
      columnLabel: 'Id',
    },
    {
      columnKey: 'name',
      columnLabel: 'Name',
      columnRelativeSize: 4,
    },
    {
      columnKey: 'status',
      columnLabel: 'Status',
      columnRelativeSize: 0.5,
    },
  ];

  let tableData = Immutable.Map<ID, any>({});
  const TableItem = Record({ id: 0, name: '', status: '' });

  for (let i = 1; i <= 10; i++)
  {
    tableData = tableData.set(i, new TableItem({
      id: i,
      name: `item ${i}`,
      status: 'success',
    }));
  }

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

      const columnsCount = columnsConfig.length;

      expect(tableComponent.find('.simple-table-header .simple-table-cell'))
        .toHaveLength(columnsCount);

      expect(tableComponent.find('.simple-table-body .simple-table-row'))
        .toHaveLength(10); // displayRowCount defaults to 10

      expect(tableComponent.find('.simple-table-body .simple-table-cell'))
        .toHaveLength(10 * columnsCount);

      expect(tableComponent.find('.simple-table-body .simple-table-cell').at(0).text())
        .toEqual('1');
      expect(tableComponent.find('.simple-table-body .simple-table-cell').at(1).text())
        .toEqual('item 1');
      expect(tableComponent.find('.simple-table-body .simple-table-cell').at(2).text())
        .toEqual('success');
    });

    it('should limit the rendered rows to props.displayRowCount', () =>
    {
      tableComponent = shallow(
        <SimpleTable
          {...tableState}
          displayRowCount={5}
        />,
      );
      expect(tableComponent.find('.simple-table-body .simple-table-row')).toHaveLength(6);

      tableComponent.setProps({ displayRowCount: 15 });
      expect(tableComponent.find('.simple-table-body .simple-table-row')).toHaveLength(10);
      expect(tableComponent.find('ShowMore')).toHaveLength(0);
    });

    it('should set the default props', () =>
    {
      expect(tableComponent.instance().props.displayRowCount).toEqual(10);
    });

    it('should order entries by defaultOrder.columnKey in direction defaultOrder.direction', () =>
    {
      tableComponent = shallow(
        <SimpleTable
          {...tableState}
          defaultOrder={{ columnKey: 'name', direction: 'desc' }}
        />,
      );

      const tableRows = tableComponent.find('.simple-table-body .simple-table-row');

      const firstRow = tableRows.at(0);
      const lastRow = tableRows.at(9);

      const firstRowName = firstRow.find('.simple-table-cell').at(1).text();
      const lastRowName = lastRow.find('.simple-table-cell').at(1).text();
      expect(firstRowName).toEqual('item 9');
      expect(lastRowName).toEqual('item 1');
    });

    it('should re-render entries when data changes', () =>
    {
      tableComponent = shallow(
        <SimpleTable
          {...tableState}
          displayRowCount={15}
          defaultOrder={{ columnKey: 'name', direction: 'desc' }}
        />,
      );

      const tableRows = tableComponent.find('.simple-table-body .simple-table-row');
      const numRows = Number(tableRows.length);

      const newTableData = tableData.set(99, new TableItem({
        id: 99,
        name: `item 99`,
        status: 'success',
      }));
      tableComponent.setProps({
        data: newTableData,
      });
      const newTableRows = tableComponent.find('.simple-table-body .simple-table-row');
      const newNumRows = newTableRows.length;

      expect(newNumRows).toEqual(numRows + 1);
    });

    it('should format a column value using the formatter if one was specified', () =>
    {
      const columnsConfigWithFormatter = [
        {
          columnKey: 'id',
          columnLabel: 'Id',
        },
        {
          columnKey: 'name',
          columnLabel: 'Name',
          columnRelativeSize: 4,
          formatter: (item) => item.name.toUpperCase(),
        },
        {
          columnKey: 'status',
          columnLabel: 'Status',
          columnRelativeSize: 0.5,
        },
      ];

      const tableStateWithFormatter = {
        ...tableState,
        columnsConfig: columnsConfigWithFormatter,
      };

      tableComponent = shallow(
        <SimpleTable
          {...tableStateWithFormatter}
        />,
      );

      const tableRows = tableComponent.find('.simple-table-body .simple-table-row');

      expect(tableRows.at(0).find('.simple-table-cell').at(1).text())
        .toEqual('ITEM 1');
      expect(tableRows.at(1).find('.simple-table-cell').at(1).text())
        .toEqual('ITEM 2');
    });

    describe('when props.data is empty', () =>
    {
      describe('and props.noResultsMessage is not set', () =>
      {
        it('should display the default no results message', () =>
        {
          const _tableState = Object.assign({}, tableState, { data: Immutable.Map<ID, any>({}) });
          tableComponent = tableComponent = shallow(
            <SimpleTable
              {..._tableState}
            />,
          );

          const tableRows = tableComponent.find('.simple-table-body .simple-table-row');

          expect(tableRows.at(0).find('.simple-table-cell').at(0).text())
            .toEqual('No results');
        });
      });

      describe('and props.noResultsMessage is set', () =>
      {
        it('should display props.noResultsMessage', () =>
        {
          const _tableState = Object.assign({}, tableState, { data: Immutable.Map<ID, any>({}) });
          tableComponent = tableComponent = shallow(
            <SimpleTable
              {..._tableState}
              noResultsMessage={'Nothing to see here'}
            />,
          );

          const tableRows = tableComponent.find('.simple-table-body .simple-table-row');

          expect(tableRows.at(0).find('.simple-table-cell').at(0).text())
            .toEqual('Nothing to see here');
        });
      });
    });

    describe('when props.loading is set to true', () =>
    {
      describe('and props.loadingMessage is not set', () =>
      {
        it('should display the default loading message', () =>
        {
          const _tableState = Object.assign({}, tableState, { data: Immutable.Map<ID, any>({}) });
          tableComponent = tableComponent = shallow(
            <SimpleTable
              {..._tableState}
              loading={true}
            />,
          );

          const tableRows = tableComponent.find('.simple-table-body .simple-table-row');

          expect(tableRows.at(0).find('.simple-table-cell').at(0).text())
            .toEqual('Loading...');
        });
      });

      describe('and props.loadingMessage is set', () =>
      {
        it('should display the default loading message', () =>
        {
          const _tableState = Object.assign({}, tableState, { data: Immutable.Map<ID, any>({}) });
          tableComponent = tableComponent = shallow(
            <SimpleTable
              {..._tableState}
              loading={true}
              loadingMessage={'Please wait, results will show up soon...'}
            />,
          );

          const tableRows = tableComponent.find('.simple-table-body .simple-table-row');

          expect(tableRows.at(0).find('.simple-table-cell').at(0).text())
            .toEqual('Please wait, results will show up soon...');
        });
      });
    });
  });

  describe('#handlePageChange', () =>
  {
    it('should make visible the next props.displayRowCount chunk of rows', () =>
    {
      tableComponent = shallow(
        <SimpleTable
          {...tableState}
          displayRowCount={4}
        />,
      );

      let tableRows = tableComponent.find('.simple-table-body .simple-table-row');
      expect(tableRows).toHaveLength(5);
      expect(tableRows.at(0).find('.simple-table-cell').at(1).text())
        .toEqual('item 1');
      expect(tableRows.at(1).find('.simple-table-cell').at(1).text())
        .toEqual('item 2');

      tableComponent.instance().handlePageChange(2);
      tableComponent.update();

      tableRows = tableComponent.find('.simple-table-body .simple-table-row');
      expect(tableRows).toHaveLength(5);
      expect(tableRows.at(0).find('.simple-table-cell').at(1).text())
        .toEqual('item 5');
      expect(tableRows.at(1).find('.simple-table-cell').at(1).text())
        .toEqual('item 6');

      tableComponent.instance().handlePageChange(3);
      tableComponent.update();

      tableRows = tableComponent.find('.simple-table-body .simple-table-row');
      expect(tableRows).toHaveLength(3);
      expect(tableRows.at(0).find('.simple-table-cell').at(1).text())
        .toEqual('item 9');
      expect(tableRows.at(1).find('.simple-table-cell').at(1).text())
        .toEqual('item 10');
    });
  });

  describe('#calculateColumnWidths', () =>
  {
    it('should balance column widths to fill 100% based on the defined columnRelativeSize', () =>
    {
      // take the columnRelativeSize (defaults to 1 if not defined), multiply by 100
      // and divide by the sum of all the columns columnRelativeSize.
      expect(tableComponent.instance().calculateColumnWidths()).toEqual(
        {
          id: 18.18,
          name: 72.73,
          status: 9.09,
        },
      );
    });
  });

  describe('#orderData', () =>
  {
    it('should return the data ordered by the specified criteria', () =>
    {
      let orderedData = tableComponent.instance().orderData(tableData);

      expect(orderedData).toEqual(tableData.toList());

      orderedData = tableComponent.instance().orderData(tableData, 'name');
      expect(orderedData.get(0).name).toEqual('item 1');
      expect(orderedData.get(9).name).toEqual('item 9');

      orderedData = tableComponent.instance().orderData(tableData, 'name', 'desc');
      expect(orderedData.get(0).name).toEqual('item 9');
      expect(orderedData.get(9).name).toEqual('item 1');
    });
  });
});
