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

import SchemaTypes from '../SchemaTypes';
import SchemaStore from '../data/SchemaStore';
import * as React from 'react';
import PureClasss from './../../common/components/PureClasss';
import SchemaTreeList from './SchemaTreeList';
import Styles from './SchemaTreeStyles';

interface Props
{
	fullPage: boolean;
	showSearch: boolean;
	search?: string;
}

const horizontalDivide = 50;
const verticalDivide = 75;
const searchHeight = 42;

class SchemaView extends PureClasss<Props>
{
	state: {
		databases: SchemaTypes.DatabaseMap,
		selectedItem: SchemaTypes.SchemaBaseClass,
		onItemUnselect: () => void,
		search: string,
	} = {
		databases: null,
		selectedItem: null,
		onItemUnselect: null,
		search: "",
	};
	
	constructor(props:Props)
	{
		super(props);
		
		this._subscribe(SchemaStore, {
			stateKey: 'databases',
			storeKeyPath: ['databases'],
		});
	}
	
	handleSelectItem(selectedItem: SchemaTypes.SchemaBaseClass, onItemUnselect: () => void)
	{
		console.log(selectedItem);
		this.state.onItemUnselect && this.state.onItemUnselect();
		this.setState({
			selectedItem,
			onItemUnselect,
		});
	}
	
	handleSearchChange(event)
	{
		let search = event.target.value as string;
		this.setState({
			search,
		});
	}
	
  render()
  {
  	let search = this.props.search || this.state.search;
  	let {showSearch} = this.props;
  	
    return (
      <div
      	style={Styles.schemaView}
      >
      	<div
      		style={{
      			position: 'absolute',
      			left: 0,
      			top: 0,
      			width: this.props.fullPage ? horizontalDivide + '%' : '100%',
      			height: this.props.fullPage ? '100%' : verticalDivide + '%',
      			overflow: 'auto',
      			paddingRight: Styles.margin,
      		}}
      	>
      		{
      			showSearch &&
		      		<div
		      			style={{
		      				height: searchHeight,
		      			}}
		      		>
		      			<input
		      				type='text'
		      				value={search}
		      				onChange={this.handleSearchChange}
		      				style={{
		      					borderColor: '#ccc',
		      					margin: '6px',
		      				}}
		      			/>
		      		</div>
      		}
      		<div
      			style={showSearch && {
      				height: 'calc(100% - ' + searchHeight + ')px',
      			}}
      		>
		      	<SchemaTreeList
		      		itemType='database'
		      		itemIds={this.state.databases && this.state.databases.keySeq().toList()}
		      		label={'Databases'}
		      		topLevel={true}
		      		search={search}
		      		onSelectItem={this.handleSelectItem}
		      	/>
		      </div>
	      </div>
      </div>
    );
  }
}

export default SchemaView;