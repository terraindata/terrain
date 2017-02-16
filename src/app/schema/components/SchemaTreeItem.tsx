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
import {DatabaseTreeInfo, databaseChildrenConfig} from './items/DatabaseTreeInfo';
import {TableTreeInfo, tableChildrenConfig} from './items/TableTreeInfo';
import {ColumnTreeInfo, columnChildrenConfig} from './items/ColumnTreeInfo';
import {IndexTreeInfo, indexChildrenConfig} from './items/IndexTreeInfo';
const Radium = require('radium');
import Styles from './SchemaTreeStyles';
const ArrowIcon = require("./../../../images/icon_arrow.svg?name=ArrowIcon");
import SchemaTreeList from './SchemaTreeList';
import FadeInOut from '../../common/components/FadeInOut';


interface Props
{
	id: ID;
	type: string;
}

class State
{
	open: boolean = false;
	item: SchemaTypes.SchemaBaseClass = null;
	childCount: number = 0;
}

const typeToRendering: {
	[type: string]: {
		component: any,
		childConfig: SchemaTypes.ISchemaTreeChildrenConfig,
	}
} = {
	database: 
	{
		component: DatabaseTreeInfo,
		childConfig: databaseChildrenConfig,
	},
	
	table: 
	{
		component: TableTreeInfo,
		childConfig: tableChildrenConfig,
	},
	
	column:
	{
		component: ColumnTreeInfo,
		childConfig: columnChildrenConfig,
	},
	
	index: 
	{
		component: IndexTreeInfo,
		childConfig: indexChildrenConfig,
	},
};

@Radium
class SchemaTreeItem extends PureClasss<Props>
{
	state: State = new State();
	
	constructor(props:Props)
	{
		super(props);
		
		this._subscribe(SchemaStore, {
			stateKey: 'item',
			storeKeyPath: 
				[ SchemaTypes.typeToStoreKey[this.props.type], this.props.id ],
			updater: (state) =>
			{
				let item = state.getIn([ SchemaTypes.typeToStoreKey[this.props.type], this.props.id ]);
				if(item)
				{
					let count = 0;
					typeToRendering[item['type']].childConfig.map(
						section =>
							count += item[section.type + 'Ids'].size
					);
					this.setState({
						childCount: count,
					});
				}
			}
		});
	}
	
	renderItemInfo()
	{
		let {item} = this.state;
		
		if(!item)
		{
			return null;
		}
		
		if(typeToRendering[item.type])
		{
			let Comp = typeToRendering[item.type].component;
			return (
				<Comp
					item={item}
				/>
			);
		}
		
		return <div>No item type information</div>;
		// switch(this.state.item.type)
		// {
		// 	case 'database':
		// 		return this.renderDatabaseInfo();
		// 	case 'table':
		// 		return this.renderTableInfo();
		// 	case 'column':
		// 		return this.renderColumnInfo();
		// 	case 'index':
		// 		return this.renderIndexInfo();
		// 	default:
		// 		return <div>No item type information</div>;
		// }
	}
	
	renderItemChildren()
	{
		let {item} = this.state;
		
		if(!this.state.open)
		{
			return null;
		}
		
		if(!item)
		{
			return (
				<div
					style={Styles.loadingText}
				>
					Loading...
				</div>
			);
		}
		
		return (
			<div
				style={Styles.childrenWrapper}
			>
				{
					typeToRendering[item.type].childConfig.map(
						(childSection, index) =>
							<SchemaTreeList
								itemType={childSection.type}
								label={childSection.label}
								itemIds={item[childSection.type + 'Ids']}
								key={index}
							/>
					)
				}
			</div>
		);
	}
	
	
	
  render()
  {
  	let {item} = this.state;
  	
    return (
      <div
      	style={Styles.treeItem}
      >
      	<div
      		style={Styles.treeItemHeader}
      		onClick={this._toggle('open')}
      	>
	      	<ArrowIcon
	      		style={
	      			this.state.open ? Styles.arrowOpen : Styles.arrow
	      		}
	      	/>
	      	<div
	      		style={Styles.name}
	      	>
	      		{
	      			item ? item.name : 'Loading...'
	      		}
	      	</div>
	      	
	      	<div
	      		style={Styles.itemInfoRow as any}
	      	>
		    		{
		    			this.renderItemInfo()
		    		}
		    	</div>
	      </div>
      	
      	<FadeInOut
      		open={this.state.open}
      	>
	      	{
	    			this.renderItemChildren()
	      	}
		    </FadeInOut>
		  </div>
    );
  }
}

export default SchemaTreeItem;