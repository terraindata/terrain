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
import Actions from "../../../data/BuilderActions.tsx";
import Util from '../../../../util/Util.tsx';
import LayoutManager from "../../layout/LayoutManager.tsx";
import BuilderTextbox from "../../../../common/components/BuilderTextbox.tsx";
import CardField from './../CardField.tsx';
import Dropdown from './../../../../common/components/Dropdown.tsx';
import CardsArea from './../CardsArea.tsx';
import { Operators } from './../../../CommonVars.tsx';
import { BuilderTypes } from './../../../BuilderTypes.tsx';
import FilterArea from './FilterArea.tsx';
import Classs from './../../../../common/components/Classs.tsx';
import Ajax from './../../../../util/Ajax.tsx';
  
interface Props {
  card: BuilderTypes.ISFWCard;
  index: number;
  spotlights: any;
  keys: string[];
  canEdit: boolean;
}

var OPERATOR_WIDTH: number = 30;
var CARD_PADDING: number = 12;

class SFWCard extends Classs<Props>
{
  xhr = null;
  constructor(props:Props)
  {
    super(props);
    this.state =
    {
      tables: null,
      tableNames: null,
      tableKeys: [],
    }
  }
  
  computeTableKeys(tables, props)
  {
    return tables[props.card.group] ?
          tables[props.card.group].map(column => props.card.iterator + '.' + column)
          : [];
  }
  
  componentWillMount()
  {
    this.xhr = Ajax.schema((tablesData: {name: string, columns: any[]}[], error) =>
    {
      if(!this.xhr) return;
      
      if(tablesData)
      {
        var tables = tablesData['reduce'](
          (memo, table) => 
          {
            memo[table.name] = table.columns.map(column => column.name);
            return memo;
          },
          {});

        this.setState({
          tables,
          tableKeys: this.computeTableKeys(tables, this.props),
          tableNames: _.keys(tables),
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
  
  componentWillReceiveProps(nextProps)
  {
    if(!_.isEqual(nextProps, this.props) && this.state.tables)
    {
      this.setState({
        tableKeys: this.computeTableKeys(this.state.tables, nextProps),
      })
    }
  }
  
  renderFrom()
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
                value={this.props.card.group}
                options={this.state.tableNames}
                ref='group'
                placeholder='Table'
                help='The name of the table in the database.'
                id={this.props.card.id}
                keyPath={this._keyPath('group')}
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
                keyPath={this._keyPath('iterator')}
              />
            </div>
          </div>  
        </CardField>
      </div>
    );
  }
  
  
    
  addField(index)
  {
    Actions.cards.select.create(this.props.card, index + 1);
  }
  
  removeField(index)
  {
     Actions.cards.select.remove(this.props.card, index);
  }
  
  move(curIndex, newIndex)
  {
    Actions.cards.select.move(this.props.card, this.props.card.properties[curIndex], newIndex);
  }
  
  handleChange(value, event)
  {
    var index = +Util.rel(event.target);
    Actions.cards.select.change(this.props.card, index, 
      {
        property: value,
        id: this.props.card.properties[index].id,
      });
  }

  
  renderSelect()
  {
    if(!this.props.card.properties.length)
    {
      return <div className='info-message info-message-clickable' onClick={this.addField}>No fields selected, click to add one.</div>;
    }
      
    var properties = this.props.card.properties;

    var layout = {
      reorderable: true,
      rows: properties.map((property: string, index) => {
        return {
          key: index, // TODO
          content: (
            <CardField
              onDelete={this.removeField}
              draggable={this.props.canEdit}
              removable={this.props.canEdit}
              drag_y={true}
              dragInsideOnly={true}
              addable={this.props.canEdit}
              onAdd={this.addField}
              >
              <BuilderTextbox
                {...this.props}
                value={property.property}
                placeholder='Field name'
                help='The name of the field in the database.'
                rel={'' + index}
                id={this.props.card.id}
                keyPath={this._keyPath('properties', index, 'property')}
                options={
                  this.props.keys.concat(this.state.tableKeys)
                }
              />
            </CardField>
          ),
        };
      }),
    };
    
    return <LayoutManager layout={layout} moveTo={this.move} />
  }
  
  renderWhere()
  {
    return <FilterArea {...this.props} keys={
                  this.props.keys.concat(this.state.tableKeys)
                } />
  }
  
  showCards()
  {
    this.setState({
      showCards: true,
    })
  }
  
  renderCardsArea()
  {
    if((this.props.card.cards && this.props.card.cards.length) || this.state.showCards)
    {
      return (
        <div>
          <div><br /><b>(Actions)</b><br /></div>
          <CardsArea 
            {...this.props}
            cards={this.props.card.cards}
            parentId={this.props.card.id}
            keys={
              this.props.keys.concat(this.state.tableKeys)
            }
          />
        </div>
        );
    }
    
    return (
      <div>
        <br />
        <a onClick={this.showCards}>
          Add child cards
        </a>
      </div>
    );
  }
  
  render()
  {
    return (
      <div>
        <div><b>Select</b></div>
        {
          this.renderSelect()
        }
        <div><b>From</b></div>
        {
          this.renderFrom()
        }
        <div><b>Where</b></div>
        {
          this.renderWhere()
        }
        {
          this.renderCardsArea()
        }
      </div>
    );
  }
};

export default SFWCard;