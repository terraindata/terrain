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

// tslint:disable:switch-default strict-boolean-expressions restrict-plus-operands no-console

import Radium = require('radium');
import * as React from 'react';
import BackendInstance from '../../../database/types/BackendInstance';
import * as SchemaTypes from '../SchemaTypes';
import TerrainComponent from './../../common/components/TerrainComponent';
type SchemaBaseClass = SchemaTypes.SchemaBaseClass;
import { _Path } from 'app/builder/components/pathfinder/PathfinderTypes';
import bodybuilder = require('bodybuilder');
import * as PropTypes from 'prop-types';
import Util from 'util/Util';
import { _ResultsConfig } from '../../../../shared/results/types/ResultsConfig';
import { AllBackendsMap } from '../../../database/AllBackends';
import { _Query, Query } from '../../../items/types/Query';
import HitsArea from '../../builder/components/results/HitsArea';
import { ResultsManager } from '../../builder/components/results/ResultsManager';
import { _ResultsState, ResultsState } from '../../builder/components/results/ResultTypes';
import InfoArea from '../../common/components/InfoArea';
export interface Props
{
  servers: SchemaTypes.ServerMap;
  // injected props
  schema?: SchemaTypes.SchemaState;
}

@Radium
class SchemaResults extends TerrainComponent<Props>
{
  public static showsResults(selectedItem: SchemaBaseClass): boolean
  {
    return selectedItem && selectedItem.type !== 'index';
  }

  public state: {
    initialized?: boolean,
    selectedId?: ID,
    selectedItem?: SchemaBaseClass,

    resultsState?: ResultsState;
    resultsQuery?: Query;
    resultsQueryString?: string;
    resultsServer?: BackendInstance;
    resultsErrorMessage?: string;
  } = {
      initialized: false,
      resultsState: _ResultsState(),
    };

  public componentWillReceiveProps(nextProps: Props)
  {
    const { schema: storeState } = nextProps;

    if (!this.state.initialized)
    {
      this.setState({
        initialized: true,
      });
    }
    const { selectedId } = storeState;
    // TODO change if store changes
    const selectedItem =
      storeState.getIn(['servers', selectedId]) ||
      storeState.getIn(['databases', selectedId]) ||
      storeState.getIn(['tables', selectedId]) ||
      storeState.getIn(['columns', selectedId]) ||
      storeState.getIn(['fieldProperties', selectedId]);

    if (selectedItem !== this.state.selectedItem)
    {
      this.setState({
        selectedId,
        selectedItem,
      });

      if (SchemaResults.showsResults(selectedItem))
      {
        const resultsServer: SchemaTypes.Server =
          selectedItem['type'] === 'server' ? selectedItem :
            this.props.servers
            && this.props.servers.get(selectedItem['serverId']);

        let queryString: string = '';
        let path = _Path();
        switch (selectedItem.type)
        {
          case 'server':
            queryString = JSON.stringify(
              bodybuilder()
                .rawOption('query', { bool: {} })
                .from(0)
                .size(100)
                .build(),
            );
            break;
          case 'database':
            queryString = JSON.stringify(
              bodybuilder()
                .filter('term', '_index', selectedItem['name'])
                .from(0)
                .size(100)
                .build(),
            );
            path = path.setIn(['source', 'dataSource', 'index'], selectedItem['name']);
            break;
          case 'table':
            queryString = JSON.stringify(
              bodybuilder()
                .filter('term', '_index', selectedItem['databaseId'].replace(selectedItem['serverId'] + '/', ''))
                .filter('term', '_type', selectedItem['name'])
                .from(0)
                .size(100)
                .build(),
            );
            path = path.setIn(['source', 'dataSource', 'index'],
              selectedItem['databaseId'].replace(selectedItem['serverId'] + '/', ''));
            break;
          case 'column':
          case 'fieldProperty':
            queryString = JSON.stringify(
              bodybuilder()
                .filter('term', '_index', selectedItem['databaseId'].replace(selectedItem['serverId'] + '/', ''))
                .filter('term', '_type', selectedItem['tableId'].replace(selectedItem['databaseId'] + '.', ''))
                .from(0)
                .size(100)
                .build(),
            );
            path = path.setIn(['source', 'dataSource', 'index'],
              selectedItem['databaseId'].replace(selectedItem['serverId'] + '/', ''));
            break;
        }

        if (resultsServer === this.state.resultsServer && queryString === this.state.resultsQueryString)
        {
          return;
        }

        let resultsQuery: Query;
        if (!this.state.resultsQuery)
        {
          resultsQuery = _Query({});
          resultsQuery = resultsQuery.set('resultsConfig', _ResultsConfig());
        }
        else
        {
          resultsQuery = this.state.resultsQuery;
          resultsQuery = resultsQuery.set('lastMutation', resultsQuery.lastMutation + 1);
        }
        resultsQuery = resultsQuery.set('db', {
          id: resultsServer.connectionId,
          name: resultsServer.name,
          source: 'm2',
          type: 'elastic',
        });
        resultsQuery = resultsQuery.set('tql', queryString).set('path', path);
        resultsQuery = resultsQuery.set('parseTree', AllBackendsMap['elastic'].parseQuery(resultsQuery));

        const resultsErrorMessage = null;

        this.setState({
          resultsQuery,
          resultsQueryString: queryString,
          resultsServer: resultsQuery.db as BackendInstance,
          resultsState: _ResultsState(),
          resultsErrorMessage,
        });
      }
      else
      {
        this.handleResultsStateChange(_ResultsState());
      }
    }
  }

  public handleResultsStateChange(resultsState: ResultsState)
  {
    this.setState({
      resultsState,
    });
  }

  public render()
  {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        {
          SchemaResults.showsResults(this.state.selectedItem) ?
            <div
              style={{
                paddingRight: 6,
                boxSizing: 'border-box',
              }}
              className={'schema-results-wrapper'}
            >
              <HitsArea
                query={this.state.resultsQuery}
                canEdit={false}
                db={this.state.resultsServer}
                algorithmName={''}
                onNavigationException={PropTypes.func}
                resultsState={this.state.resultsState}
                showExport={false}
                showCustomizeView={false}
                allowSpotlights={false}
                ignoreEmptyCards={true}
              />
            </div>
            :
            <InfoArea
              large='Select an item to see its contents here.'
            />
        }
        <ResultsManager
          db={this.state.resultsServer}
          onResultsStateChange={this.handleResultsStateChange}
          resultsState={this.state.resultsState}
          query={this.state.resultsQuery}
          noExtraFields={true}
          hitsPage={1}
        />
      </div>
    );
  }
}

export default Util.createTypedContainer(
  SchemaResults,
  ['schema'],
  {},
);
