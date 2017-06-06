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

import * as Immutable from 'immutable';
import * as _ from 'underscore';
const { List, Map } = Immutable;
const Radium = require('radium');
import * as React from 'react';
import Styles from '../../Styles';
import SchemaStore from '../data/SchemaStore';
import SchemaTypes from '../SchemaTypes';
import BackendInstance from './../../../../shared/backends/types/BackendInstance';
import PureClasss from './../../common/components/PureClasss';
import SchemaTreeStyles from './SchemaTreeStyles';
type SchemaBaseClass = SchemaTypes.SchemaBaseClass;
import BlockUtils from '../../../../shared/blocks/BlockUtils';
import { _Query, Query } from '../../../../shared/items/types/Query';
import { _ResultsState, ResultsManager, ResultsState } from '../../builder/components/results/ResultsManager';
import ResultsTable from '../../builder/components/results/ResultsTable';
import InfoArea from '../../common/components/InfoArea';

import { AllBackendsMap } from '../../../../shared/backends/AllBackends';

const NUM_ROWS = 200;

export interface Props
{
  databases: SchemaTypes.DatabaseMap;
}

@Radium
class SchemaResults extends PureClasss<Props>
{
  state: {
    selectedId?: ID,
    selectedItem?: SchemaBaseClass,

    resultsState?: ResultsState;
    resultsQuery?: Query;
    resultsDb?: BackendInstance;
    resultsErrorMessage?: string;
  } = {
    resultsState: _ResultsState(),
  };

  constructor(props: Props)
  {
    super(props);

    this._subscribe(SchemaStore, {
      updater: (storeState: SchemaTypes.SchemaState) =>
      {
        const { selectedId } = storeState;
        // TODO change if store changes
        const selectedItem =
          storeState.getIn(['databases', selectedId]) ||
          storeState.getIn(['tables', selectedId]) ||
          storeState.getIn(['columns', selectedId]) ||
          storeState.getIn(['indexes', selectedId]);

        if (selectedItem !== this.state.selectedItem)
        {
          this.setState({
            selectedId,
            selectedItem,
          });

          if (this.showsResults(selectedItem))
          {
            const resultsDb =
              selectedItem.type === 'database' ? selectedItem.name :
                this.props.databases
                && this.props.databases.get(selectedItem['databaseId']);
            console.log('schema resultsDb', resultsDb);
            let field: string, table: string, where: string;

            switch (selectedItem.type)
            {
              case 'database':
                field = 'TABLE_NAME, TABLE_ROWS, AVG_ROW_LENGTH, DATA_LENGTH';
                table = 'INFORMATION_SCHEMA.TABLES';
                where = `TABLE_SCHEMA = '${selectedItem.name}'`;
                break;
              case 'table':
                field = '*';
                table = selectedItem.name;
                break;
              case 'column':
                field = selectedItem.name;
                table = SchemaStore.getState().tables.get(selectedItem['tableId']).name;
                break;
              case 'index':
                //TODO
                break;
            }

            const resultsQuery = this.getQuery(resultsDb, field, table, where);
            let resultsErrorMessage = null;

            if (!resultsQuery)
            {
              resultsErrorMessage = 'Unsupported DB type: ' + resultsDb.type;
            }

            this.setState({
              resultsQuery,
              resultsDb,
              resultsState: _ResultsState(),
              resultsErrorMessage,
            });
          }
          else
          {
            this.handleResultsStateChange(_ResultsState());
          }
        }
      },
    });
  }

  getQuery(resultsDb: BackendInstance, field: string, table: string, where: string = '1'): Query
  {
    if (resultsDb.type !== 'mysql')
    {
      // TODO MOD
      return null;
    }

    const inputs = [
      {
        key: 'table',
        value: table,
      },
      {
        key: 'field',
        value: field,
      },
      {
        key: 'numRows',
        value: NUM_ROWS,
      },
    ].map(
      (inputConfig) =>
        BlockUtils.make(
          AllBackendsMap.mysql.blocks.input,
          inputConfig,
        ),
    );

    return _Query({
      inputs: List(inputs),

      cards: List([
        BlockUtils.make(
          AllBackendsMap.mysql.blocks.sfw,
          {
            fields: List([
              BlockUtils.make(
                AllBackendsMap.mysql.blocks.field,
                {
                  field: 'input.field',
                },
              ),
            ]),

            cards: List([
              BlockUtils.make(
                AllBackendsMap.mysql.blocks.from,
                {
                  tables: List([
                    BlockUtils.make(
                      AllBackendsMap.mysql.blocks.table,
                      {
                        table: 'input.table',
                      },
                    ),
                  ]),
                },
              ),

              BlockUtils.make(
                AllBackendsMap.mysql.blocks.where,
                {
                  cards: List([
                    BlockUtils.make(
                      AllBackendsMap.mysql.blocks.tql,
                      {
                        clause: where,
                      },
                    ),
                  ]),
                },
              ),

              BlockUtils.make(
                AllBackendsMap.mysql.blocks.take,
                {
                  value: 'input.numRows',
                },
              ),
            ]),
          },
        ),
      ]),
    });
  }

  showsResults(selectedItem: SchemaBaseClass): boolean
  {
    return selectedItem && selectedItem.type !== 'index';
  }

  handleResultsStateChange(resultsState: ResultsState)
  {
    this.setState({
      resultsState,
    });
  }

  render()
  {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#fff',
        }}
      >
        {
          this.showsResults(this.state.selectedItem) ?
            (
              this.state.resultsErrorMessage ?
                <InfoArea
                  large='Error retrieving results'
                  small={this.state.resultsErrorMessage}
                />
                :
                <ResultsTable
                  results={this.state.resultsState.results}
                  onExpand={_.noop}
                  resultsLoading={this.state.resultsState.loading}
                />
            )
            :
            <InfoArea
              large='Select an item to see its contents here.'
            />
        }

        <ResultsManager
          db={this.state.resultsDb}
          onResultsStateChange={this.handleResultsStateChange}
          resultsState={this.state.resultsState}
          query={this.state.resultsQuery}
          noExtraFields={true}
        />
      </div>
    );
  }
}

export default SchemaResults;
