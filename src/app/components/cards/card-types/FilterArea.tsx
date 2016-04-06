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

import * as React from 'react';
import Actions from "../../../data/Actions.tsx";
import Util from '../../../util/Util.tsx';
import LayoutManager from "../../layout/LayoutManager.tsx";
import BuilderTextbox from "../../common/BuilderTextbox.tsx";
import BuilderTextboxCards from "../../common/BuilderTextboxCards.tsx";
import CardField from './../CardField.tsx';
import Dropdown from './../../common/Dropdown.tsx';
import { Operators, Combinators } from './../../../CommonVars.tsx';
import { CardModels } from './../../../models/CardModels.tsx';

interface Props
{
  card: CardModels.IFilterCard | CardModels.IIfCard;
  spotlights: any[];
  hideNoFilterMessage?: boolean;
}

var OPERATOR_WIDTH: number = 27;
var CARD_PADDING: number = 12;

class FilterArea extends React.Component<Props, any>
{
  constructor(props:Props)
  {
    super(props);
    Util.bind(this, 'renderFilter', 'addFilter', 'moveFilter');
  }
  
  addFilter(index)
  {
    Actions.cards.filter.create(this.props.card, index + 1);
  }

  renderFilter(filter: CardModels.IFilter, index: number)
  {
    var changeFilter = () =>
    {
      if(typeof filter.condition.first === 'string')
      {
        var first: any = this.refs['first' + index]['value'];
      }
      else
      {
        var first: any = filter.condition.first;
      }
      
      if(typeof filter.condition.second === 'string')
      {
        var second: any = this.refs['second' + index]['value'];
      }
      else
      {
        var second: any = filter.condition.second;
      }
      
      var operator = this.refs['operator' + index]['value'];
      console.log(operator);
      var combinator = this.refs['combinator' + index] ? this.refs['combinator' + index]['value'] : CardModels.Combinator.AND;
      
      Actions.cards.filter.change(this.props.card, index, {
        condition:
        {
            operator: operator,
            first: first,
            second: second,
        },
        combinator: combinator,
        id: filter.id,
      });
    }

    var filterLayout =
    {
      columns: [
        {
          content: (
            <BuilderTextbox
              value={filter.condition.first}
              onChange={changeFilter}
              ref={'first' + index}
              acceptsCards={true}
              parentId={this.props.card.id}
              top={true}
              />
          ),
        },
        {
          content: (
            <div>
              <Dropdown ref={'operator' + index} circle={true} options={Operators} selectedIndex={filter.condition.operator} onChange={changeFilter} />
            </div>
          ),
          width: OPERATOR_WIDTH,
        },
        {
          content: (
            <BuilderTextbox
              value={filter.condition.second}
              onChange={changeFilter}
              ref={'second' + index}
              acceptsCards={true}
              parentId={this.props.card.id}
              />
          ),
        },
        {
          width: OPERATOR_WIDTH,
          content: index === this.props.card.filters.length - 1 ? null : (
            <Dropdown
              ref={'combinator' + index}
              circle={true}
              options={Combinators}
              selectedIndex={filter.combinator}
              onChange={changeFilter}
              />
          )
        }
      ],
      colPadding: CARD_PADDING,
    };

    var deleteFn = () =>
    {
        Actions.cards.filter.remove(this.props.card, index);
    }
    
    return (
      <CardField
        draggable={true}
        drag_y={true}
        removable={true}
        addable={true}
        onAdd={this.addFilter}
        onDelete={deleteFn}
        aboveContent={<BuilderTextboxCards
          value={filter.condition.first}
          spotlights={this.props.spotlights}
          parentId={this.props.card.id}
          />}
        belowContent={<BuilderTextboxCards
          value={filter.condition.second}
          spotlights={this.props.spotlights}
          parentId={this.props.card.id}
          />}
      >
        <LayoutManager layout={filterLayout} />
      </CardField>
    );
  }
  
  moveFilter(curIndex, newIndex)
  {
    Actions.cards.filter.move(this.props.card, this.props.card.filters[curIndex], newIndex);
  }
  
  renderNoFilters()
  {
    if(this.props.hideNoFilterMessage)
    {
      return null;
    }
    
    return (
      <div className='info-message info-message-clickable' onClick={this.addFilter}>
        Click to add a filter
      </div>
    );
  }

	render() {
    return (
      <div>
        { this.props.card.filters.length === 0 && this.renderNoFilters() }
        <LayoutManager
          layout={{
            reorderable: true,
            rows: this.props.card.filters.map((filter, index) => (
              {
                key: filter.id,
                content: this.renderFilter(filter, index)
              })
            )
          }}
          moveTo={this.moveFilter}
          />
      </div>
		);
	}
};

export default FilterArea;