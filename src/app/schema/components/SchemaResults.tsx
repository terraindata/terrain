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

import * as _ from 'underscore';
import * as Immutable from 'immutable';
let {List, Map} = Immutable;
const Radium = require('radium');
import SchemaTypes from '../SchemaTypes';
import SchemaStore from '../data/SchemaStore';
import * as React from 'react';
import PureClasss from './../../common/components/PureClasss';
import SchemaTreeStyles from './SchemaTreeStyles';
import Styles from '../../Styles';
type SchemaBaseClass = SchemaTypes.SchemaBaseClass;
import ResultsTable from '../../builder/components/results/ResultsTable';
import {ResultsManager, ResultsState, _ResultsState} from '../../builder/components/results/ResultsManager';
import BuilderTypes from '../../builder/BuilderTypes';

const NUM_ROWS = 200;

interface Props
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
		resultsQuery?: BuilderTypes.Query;
		resultsDb?: string;
	} = {
		resultsState: _ResultsState(),
	};
	
	constructor(props:Props)
	{
		super(props);
		
		this._subscribe(SchemaStore, {
			updater: (storeState:SchemaTypes.SchemaState) =>
			{
				let {selectedId} = storeState;
				// TODO change if store changes
				let selectedItem = 
					storeState.getIn(['databases', selectedId]) || 
					storeState.getIn(['tables', selectedId]) || 
					storeState.getIn(['columns', selectedId]) ||
					storeState.getIn(['indexes', selectedId]);
				
				if(selectedItem !== this.state.selectedItem)
				{
					this.setState({
						selectedId,
						selectedItem,
					});
					
					if(this.showsResults(selectedItem))
					{
						let resultsDb = this.props.databases 
							&& this.props.databases.get(selectedItem['databaseId']).name;
						let field: string, table: string;
						
						switch(selectedItem.type)
						{
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
						console.log(field, table);
						
						let resultsQuery = this.getQuery(field, table);
						
						this.setState({
							resultsQuery,
							resultsDb,
							resultsState: _ResultsState(),
						});
					}
					else
					{
						this.handleResultsStateChange(_ResultsState());
					}
				}
			}
		});
	}
	
	getQuery(field: string, table: string): BuilderTypes.Query
	{
		let tql = "SELECT " + field + " FROM " + table + " LIMIT " + NUM_ROWS + ";";
		
		let inputs = [
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
			inputConfig =>
				BuilderTypes.make(
					BuilderTypes.Blocks.input,
					inputConfig
				)
		);
		
		return BuilderTypes._Query({
			inputs: List(inputs),
			
			cards: List([
				BuilderTypes.make(
					BuilderTypes.Blocks.sfw,
					{
						fields: List([
							BuilderTypes.make(
								BuilderTypes.Blocks.field,
								{
									field: 'input.field',
								}
							),
						]),
						
						cards: List([
							BuilderTypes.make(
								BuilderTypes.Blocks.from,
								{
									tables: List([
										BuilderTypes.make(
											BuilderTypes.Blocks.table,
											{
												table: 'input.table',
											}
										),
									]),
								}
							),
							
							BuilderTypes.make(
								BuilderTypes.Blocks.take,
								{
									value: 'input.numRows',
								}
							),
						]),
					}
				),
			]),
		});
	}
	
	showsResults(selectedItem: SchemaBaseClass): boolean
	{
		return selectedItem && selectedItem.type !== 'database';
	}
	
	handleResultsStateChange(resultsState: ResultsState)
	{
		this.setState({
			resultsState,
		});
	}
	
  render()
  {
  	console.log(this.state.resultsState.results.size);
    return (
    	<div
    		style={{
    			width: '100%',
    			height: '100%',
    		}}
    	>
    		<ResultsTable
    			results={this.state.resultsState.results}
    			onExpand={_.noop}
    		/>
    		
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