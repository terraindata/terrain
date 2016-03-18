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
import Actions from "../../../data/Actions.tsx";
import Util from '../../../util/Util.tsx';
import LayoutManager from "../../layout/LayoutManager.tsx";
import ThrottledInput from "../../common/ThrottledInput.tsx";
import CardField from './../CardField.tsx';
import Dropdown from './../../common/Dropdown.tsx';
import CardsArea from './../CardsArea.tsx';
import { Operators } from './../../../CommonVars.tsx';
import { CardModels } from './../../../models/CardModels.tsx';

var ArrowIcon = require("./../../../../images/icon_arrow_42x16.svg?name=ArrowIcon");

interface Props {
  card: CardModels.IFromCard;
  index: number;
}

var OPERATOR_WIDTH: number = 30;
var CARD_PADDING: number = 12;

class FromCard extends React.Component<Props, any>
{
  constructor(props:Props)
  {
    super(props);
    Util.bind(this, ['renderJoin', 'handleChange', 'handleJoinChange', 'renderCards']);
  }
  
  handleJoinChange(joinValue, event)
  {
    var index = parseInt(Util.rel(event.target), 10);
    var refBase = index + '-';
    
    var group = this.refs[refBase + 'group']['value'];
    var first = this.refs[refBase + 'first']['value'];
    var second = this.refs[refBase + 'second']['value'];
    var operator = this.refs[refBase + 'operator']['value'];
    
    Actions.cards.from.join.change(this.props.card, index, {
      group: group,
      comparison:
      {
        first: first,
        second: second,
        operator: operator,
      },
      id: this.props.card.joins[index].id,
    });
  }

  renderJoin(join: CardModels.IJoin, index: number)
  {
    var refBase = index + '-';
    var groupRef = refBase + 'group';
    var firstRef = refBase + 'first';
    var secondRef = refBase + 'second';
    var operatorRef = refBase + 'operator';

    var rel = index + "";

    var joinLayout =
    {
      columns: [
        {
          content: (
            <ThrottledInput value={join.group} onChange={this.handleJoinChange} ref={groupRef} rel={rel} />
          ),
          colSpan: 2,
        },
        {
          content: (
            <ThrottledInput value={join.comparison.first} onChange={this.handleJoinChange} ref={firstRef} rel={rel} />
          ),
        },
        {
          content: (
            <div>
             <Dropdown ref={operatorRef} circle={true} options={Operators} selectedIndex={join.comparison.operator} onChange={this.handleJoinChange} rel={rel} />
            </div>
          ),
          width: OPERATOR_WIDTH,
        },
        {
          content: (
            <ThrottledInput value={join.comparison.second} onChange={this.handleJoinChange} ref={secondRef} rel={rel} />
          ),
        }
      ],
      colPadding: CARD_PADDING,
    };

    var deleteFn = () =>
    {
        Actions.cards.from.join.remove(this.props.card, index);
    }

    return (
      <CardField
        key={join.id}
        draggable={false}
        removable={true}
        onDelete={deleteFn} >
        <LayoutManager layout={joinLayout} />
      </CardField>
    );
  }
  
  handleChange(value)
  {
    Actions.cards.from.change(this.props.card,
      this.refs['group']['value'], this.refs['iterator']['value']);
  }
  
  renderCards()
  {
    return <CardsArea cards={this.props.card.cards} parentId={this.props.card.id} spotlights={[]} />;
  }

	render() {
    var layout = 
    {
      columns:
      [
        {
          content: <ThrottledInput
            value={this.props.card.group}
            ref='group'
            onChange={this.handleChange}
            placeholder='Enter group name' />,
        },
        {
          content: (
            <div className='card-arrow'>
              <ArrowIcon />
            </div>
          ),
          width: 50,
        },
        {
          content: <ThrottledInput
            value={this.props.card.iterator}
            ref='iterator'
            onChange={this.handleChange}
            placeholder='Iterator name' />,
        }
      ]
    }
    
		return (
      <div>
        <CardField
          draggable={false}
          removable={false}
          drag_y={true}>
          <LayoutManager layout={layout} />
        </CardField>
        { this.props.card.joins.map(this.renderJoin) }
        { this.renderCards() }
      </div>
		);
	}
};

export default FromCard;