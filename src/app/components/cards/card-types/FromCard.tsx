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
import CardField from './../CardField.tsx';
import Dropdown from './../../common/Dropdown.tsx';
import { Operators } from './../../../CommonVars.tsx';

import { CardModels } from './../../../models/CardModels.tsx';

interface Props {
  card: CardModels.FromCard;
}

var OPERATOR_WIDTH: number = 30;
var CARD_PADDING: number = 12;

class FromCard extends React.Component<Props, any>
{
  constructor(props:Props)
  {
    super(props);
    this.renderJoin = this.renderJoin.bind(this);
  }

  renderJoin(join: CardModels.Join, index: number)
  {
    var refBase = 'join-ref-' + index + '-' + this.props.card.id + '-';
    var groupRef = refBase + 'group';
    var firstRef = refBase + 'first';
    var secondRef = refBase + 'second';
    var operatorRef = refBase + 'operator';

    var changeJoin = () =>
    {
        var group = this.refs[groupRef]['value'];
        var first = this.refs[firstRef]['value'];
        var second = this.refs[secondRef]['value'];
        var operator = this.refs[operatorRef]['value'];
        
        Actions.dispatch.cards.from.join.change(this.props.card, index, {
          group: group,
          comparison:
          {
            first: first,
            second: second,
            operator: operator,
          }
        });
    }

    var joinLayout =
    {
      columns: [
        {
          content: (
            <input type='text' value={join.group} onChange={changeJoin} ref={groupRef} />
          ),
          colSpan: 2,
        },
        {
          content: (
            <input type='text' value={join.comparison.first} onChange={changeJoin} ref={firstRef} />
          ),
        },
        {
          content: (
            <div>
             <Dropdown ref={operatorRef} circle={true} options={Operators} selectedIndex={join.comparison.operator} onChange={changeJoin} />
            </div>
          ),
          width: OPERATOR_WIDTH,
        },
        {
          content: (
            <input type='text' value={join.comparison.second} onChange={changeJoin} ref={secondRef} />
          ),
        }
      ],
      colPadding: CARD_PADDING,
    };

    var deleteFn = () =>
    {
        Actions.dispatch.cards.from.join.delete(this.props.card, index);
    }

    return (
      <CardField
        key={index}
        draggable={false}
        removable={true}
        onDelete={deleteFn} >
        <LayoutManager layout={joinLayout} />
      </CardField>
    );
  }

	render() {
    var handleChange = (event) => 
    {
      Actions.dispatch.cards.from.changeGroup(this.props.card, event.target.value);
    }

    var joinContent = null;
    if (this.props.card.joins) 
    {
        joinContent = this.props.card.joins.map(this.renderJoin);
    }

		return (
      <div>
        <CardField
          draggable={false}
          removable={false}
          drag_y={true}>
          <input type="text" 
            value={this.props.card.group}
            onChange={handleChange} />
        </CardField>
        { joinContent }
      </div>
		);
	}
};

export default FromCard;