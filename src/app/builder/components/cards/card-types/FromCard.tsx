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
import * as React from 'react';
import * as Immutable from 'immutable';
import Actions from "../../../data/BuilderActions.tsx";
import Util from '../../../../util/Util.tsx';
import LayoutManager from "../../layout/LayoutManager.tsx";
import BuilderTextbox from "../../../../common/components/BuilderTextbox.tsx";
import CardField from './../CardField.tsx';
import Dropdown from './../../../../common/components/Dropdown.tsx';
import CardsArea from './../CardsArea.tsx';
import { Operators } from './../../../BuilderTypes.tsx';
import { BuilderTypes } from './../../../BuilderTypes.tsx';
import PureClasss from './../../../../common/components/PureClasss.tsx';
import Ajax from './../../../../util/Ajax.tsx';

interface Props
{
  card: BuilderTypes.IFromCard;
  index: number;
  spotlights: any;
  keys: List<string>;
  keyPath: KeyPath;
}

var OPERATOR_WIDTH: number = 30;
var CARD_PADDING: number = 12;

type TableMap = Map<string, List<string>>;

class FromCard extends PureClasss<Props>
{
  xhr = null;
  state: {
    tables: TableMap; // contains all table data
    tableNames: List<string>;
    iteratorKeys: List<string>; // fields from table with my iterator pre-pended, "iterator.field"
    keys: List<string>; // final keys
  };
  
  constructor(props:Props)
  {
    super(props);
    // TODO compute
    this.state =
    {
      tables: null,
      tableNames: this.emptyKeys,
      iteratorKeys: this.emptyKeys,
      keys: this.props.keys,
    };
  }
  
  emptyKeys: List<string> = Immutable.List([]);
  computeIteratorKeys(tables: TableMap, props:Props): List<string>
  {
    if(tables && tables.get(props.card.table))
    {
      return tables.get(props.card.table).map(field => props.card.iterator + '.' + field).toList();
    }
    
    return this.emptyKeys;
  }
  
  computeKeys(iteratorKeys: List<string>, props: Props): List<string>
  {
    return iteratorKeys.concat(props.keys).toList();
  }
  
  componentWillMount()
  {
    this.xhr = Ajax.schema((tablesData: {name: string, columns: any[]}[], error) =>
    {
      if(!this.xhr) return;
      
      if(tablesData)
      {
        let tables =
          tablesData.reduce(
            (memo: TableMap, table: any) => 
              memo.set(table.name, Immutable.List(table.columns.map(column => column.name) as string[])),
          Immutable.Map({}));
        
        let iteratorKeys = this.computeIteratorKeys(tables, this.props);

        this.setState({
          tables,
          tableNames: tables.keySeq().toList(),
          iteratorKeys,
          keys: this.computeKeys(iteratorKeys, this.props),
        })
      }
      else
      {
        alert(error);
      }
    });
  }
  
  componentWillUnmount()
  {
    this.xhr && this.xhr.abort();
    this.xhr = false;
  }
  
  componentWillReceiveProps(nextProps:Props)
  {
    if(nextProps.card.table !== this.props.card.table || nextProps.card.iterator !== this.props.card.iterator)
    {
      let iteratorKeys = this.computeIteratorKeys(this.state.tables, nextProps);
      this.setState({
        iteratorKeys,
        keys: this.computeKeys(iteratorKeys, nextProps),
      });
      console.log('keys', this.computeKeys(iteratorKeys, nextProps));
    }
  }
  
	render()
  {
		return (
      <div>
        <CardField
          draggable={false}
          removable={false}
          drag_y={true}
        >
          <div className='flex-container'>
            <div className='flex-card-field'>
              <BuilderTextbox
                {...this.props}
                value={this.props.card.table}
                options={this.state.tableNames}
                ref='group'
                placeholder='Table'
                help='The name of the table in the database.'
                id={this.props.card.id}
                keyPath={this._ikeyPath(this.props.keyPath, this.props.index, 'table')}
              />
            </div>
            <div className='builder-operator'>
              <div className='card-assignment'>
                as
              </div>
            </div>
            <div className='flex-card-field'>
              <BuilderTextbox
                {...this.props}
                value={this.props.card.iterator}
                ref='iterator'
                placeholder='Variable name'
                help='Refer to elements in the table by this. \
                  <br/>Example: From a "users" table, you \
                  <br />could name this variable "user" and then \
                  <br />refer to "user.id", "user.name", etc.'
                id={this.props.card.id}
                keyPath={this._ikeyPath(this.props.keyPath, this.props.index, 'iterator')}
              />
            </div>
          </div>  
        </CardField>
        <CardsArea 
          {...this.props}
          cards={this.props.card.cards}
          keyPath={this._ikeyPath(this.props.keyPath, this.props.index, 'cards')}
          keys={
            this.state.keys
          }
        />
      </div>
		);
	}
};

export default FromCard;