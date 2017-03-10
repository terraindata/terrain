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
const Radium = require('radium');
import SchemaTypes from '../SchemaTypes';
import SchemaStore from '../data/SchemaStore';
import * as React from 'react';
import PureClasss from './../../common/components/PureClasss';
import SchematreeStyles from './SchemaTreeStyles';
import Styles from '../../Styles';
import FadeInOut from '../../common/components/FadeInOut';
import SchemaTreeItem from './SchemaTreeItem';

interface Props
{
	search: string;
}

let INIT_SHOWING_COUNT: {[type:string]: number} = {};
let INIT_ITEMS: Map<string, List<SchemaTypes.SchemaBaseClass>> = 
	Immutable.Map<string, List<SchemaTypes.SchemaBaseClass>>({});

_.map(SchemaTypes.typeToStoreKey,
	(storeKey, type) => 
	{
		INIT_SHOWING_COUNT[type] = 15;
		INIT_ITEMS = INIT_ITEMS.set(type, Immutable.List([]));
	}
);
console.log(INIT_SHOWING_COUNT);


@Radium
class SchemaSearchResults extends PureClasss<Props>
{
	state: {
		items: Map<string, List<SchemaTypes.SchemaBaseClass>>,
		schemaState: SchemaTypes.SchemaState;
		showingCount: {[type:string]: number};
	} = {
		schemaState: SchemaStore.getState(),
		showingCount: INIT_SHOWING_COUNT,
		items: INIT_ITEMS,
	};
	
	constructor(props:Props)
	{
		super(props);
		
		this._subscribe(SchemaStore, {
			stateKey: 'schemaState',
		});
	}
	
	renderSection(stateKey: string, type: string, label: string)
	{
		let count = 0, index = 0;
		let items = Immutable.List<SchemaTypes.SchemaBaseClass>([]);
		// TODO store valueseq of this in state, instead of the mapÏ
		this.state.schemaState.get(stateKey).map(
			(item: SchemaTypes.SchemaBaseClass) =>
			{
				
			}
		);
		
		return (
			<div
				style={{
					marginTop: Styles.margin,
					marginLeft: Styles.margin,
				}}
			>
				<div
					style={Styles.font.semiBoldNormal}
				>
					{
						label
					}
				</div>
				
				{
					this.state.schemaState.get(stateKey).map(
						(item, index) =>
							index <  &&
								<SchemaTreeItem
									id={item.id}
									type={type}
									search={this.props.search || "!@#$%^&*&%$!%!$#%!@"}
									key={item.id}
								/>
					).valueSeq()
				}
			</div>
		);
	}
	
  render()
  {
  	let {search} = this.props;
  	let {schemaState} = this.state;
  	
    return (
    	<div
    		style={[
    			Styles.transition,
    			{
    				opacity: search ? 1 : 0,
    			}
    		]}
    	>
		      <div
		      	style={{
		      		marginTop: 2 * Styles.margin,
		      	}}
		      >
		      	<div
		      		style={[
		      			Styles.font.semiBoldBig,
		      		]}
		      	>
		      		All Results
		      	</div>
		      	
		      	{
		      		this.renderSection('databases', 'database', 'Databases')
		      	}
		      	
		      	{
		      		this.renderSection('tables', 'table', 'Tables')
		      	}
		      	
		      	{
		      		this.renderSection('columns', 'column', 'Columns')
		      	}
		      	
		      	{
		      		this.renderSection('indexes', 'index', 'Indexes')
		      	}
		      </div>
    	</div>
    );
  }
}

export default SchemaSearchResults;