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
import BuilderTextboxCards from "../../../../common/components/BuilderTextboxCards.tsx";
import CardField from './../CardField.tsx';
import Dropdown from './../../../../common/components/Dropdown.tsx';
import { Operators, Combinators } from './../../../CommonVars.tsx';
import { BuilderTypes } from './../../../BuilderTypes.tsx';
import Classs from './../../../../common/components/Classs.tsx';

interface Props
{
  card: BuilderTypes.IFilterCard | BuilderTypes.IIfCard;
  spotlights: any[];
  hideNoFilterMessage?: boolean;
  keys: string[];
}

class FilterArea extends Classs<Props>
{
  addFilter(index)
  {
    Actions.cards.filter.create(this.props.card, index + 1);
  }
  
  shouldComponentUpdate(nextProps, nextState)
  {
    return !_.isEqual(nextProps.card.filters, this.props.card.filters)
      || !_.isEqual(nextProps.spotlights, this.props.spotlights)
      || !_.isEqual(nextProps.keys, this.props.keys);
  }
  
  deleteFilter(index)
  {
    Actions.cards.filter.remove(this.props.card, index);
  }
  
  renderFilter(filter: BuilderTypes.IFilter, index: number)
  {
    return (
      <CardField
        draggable={true}
        drag_y={true}
        removable={true}
        addable={true}
        onAdd={this.addFilter}
        onDelete={this.deleteFilter}
        aboveContent={
          <BuilderTextboxCards
            {...this.props}
            value={filter.condition.first}
            parentId={this.props.card.id}
          />
        }
        belowContent={
          <BuilderTextboxCards
            {...this.props}
            value={filter.condition.second}
            parentId={this.props.card.id}
          />
        }
      >
        <div className='flex-container'>
          <div className='flex-grow card-padding'>
            <BuilderTextbox
              {...this.props}
              value={filter.condition.first}
              id={this.props.card.id}
              keyPath={this._keyPath('filters', index, 'condition', 'first')}
              acceptsCards={true}
              parentId={this.props.card.id}
              top={true}
              options={this.props.keys}
            />
          </div>
          <div className='builder-operator'>
            <Dropdown
              circle={true}
              options={Operators}
              selectedIndex={filter.condition.operator}
              id={this.props.card.id}
              keyPath={this._keyPath('filters', index, 'condition', 'operator')}
            />
          </div>
          <div className='flex-grow card-padding'>
            <BuilderTextbox
              {...this.props}
              value={filter.condition.second}
              id={this.props.card.id}
              keyPath={this._keyPath('filters', index, 'condition', 'second')}
              acceptsCards={true}
              parentId={this.props.card.id}
              options={this.props.keys}
            />
          </div>
          <div className='builder-operator'>
            { index === this.props.card.filters.length - 1 ? null :
              <Dropdown
                circle={true}
                options={Combinators}
                selectedIndex={filter.combinator}
                id={this.props.card.id}
                keyPath={this._keyPath('filters', index, 'condition', 'combinator')}
              />
            }
          </div>
        </div>
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