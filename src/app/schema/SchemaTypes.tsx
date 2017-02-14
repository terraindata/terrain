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

import Classes from '../Classes';
import * as Immutable from 'immutable';
const {List, Map} = Immutable;
import {New, BaseClass} from '../Classes';
import Util from '../util/Util';

type IDList = (ID[] | List<ID>);
function checkIds(ids: IDList): List<ID>
{
	if(Array.isArray(ids))
	{
		return List(ids);
	}
	return ids;
}

export module SchemaTypes
{
	export class SchemaBaseClass extends BaseClass
	{
		type = "";
	}
	
	class SchemaState extends SchemaBaseClass
	{
		databases: Map<ID, Database>;
		tables: Map<ID, Table>;
		columns: Map<ID, Column>;
		indexes: Map<ID, Index>;
		
		loading: boolean = false;
		loaded: boolean = false;
		schemaError: boolean = false;
	}
	let _SchemaState = (config?: {[key:string]: any}) => 
	  New<SchemaState>(new SchemaState(config), config);
	
	class Database extends SchemaBaseClass
	{
		type = "database";
		name = "";
		
		tableIds: List<ID> = List([]);
	}
	export const _Database = 
		(config: { 
			name: string, 
			tableIds?: IDList, 
			id?: ID 
		}) => {
		  config.id = name;
		 	config.tableIds = checkIds(config.tableIds);
		  return New<Database>(new Database(config), config);
		}  
	
	class Table extends SchemaBaseClass
	{
		type = "table";
		name = "";
		databaseId: ID = "";
		
		columnIds: List<ID> = List([]);
		indexIds: List<ID> = List([]);
	}
	export const _Table = (config: { 
		name: string, 
		databaseId: ID,
		columnIds?: IDList, 
		indexIds?: IDList,
		id?: ID 
	}) => {
	  config.id = config.databaseId + '.' + config.name;
	  config.columnIds = checkIds(config.columnIds);
	  config.indexIds = checkIds(config.indexIds);
	  return New<Table>(new Table(config), config);
	}  
	
	class Column extends SchemaBaseClass
	{
		type = "column";
		name = "";
		databaseId: ID = "";
		tableId: ID = "";
		
		indexIds: List<ID> = List([]);
		datatype = "";
		defaultValue = "";
		nullable = false;
	}
	export const _Column = (config: { 
		name: string, 
		databaseId: ID,
		tableId: ID,
		
		defaultValue: string,
		datatype: string,
		nullable: boolean,
		indexIds?: IDList, 
		id?: ID 
	}) => {
	  config.id = config.databaseId + '.' + config.tableId + '.c.' + config.tableId;
	  config.indexIds = checkIds(config.indexIds);
	  return New<Column>(new Column(config), config);
	}  
	
	class Index extends SchemaBaseClass
	{
		type = "index";
		name = "";
		databaseId: ID = "";
		tableId: ID = "";
		
		indexType = "";
		columnIds: List<ID> = List([]);
	}
	export const _Index = (config: { 
		name: string, 
		databaseId: ID,
		tableId: ID,
		
		indexType: string,
		columnIds?: IDList, 
		id?: ID 
	}) => {
	  config.id = config.databaseId + '.' + config.tableId + '.i.' + config.tableId;
	  config.columnIds = checkIds(config.columnIds);
	  return New<Index>(new Index(config), config);
	}  
}

export default SchemaTypes;
