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
import { CardModels } from './../../../models/CardModels.tsx';
import Card from './../Card.tsx';
import CardsArea from './../CardsArea.tsx';
import FilterArea from './FilterArea.tsx';

interface Props {
  card: CardModels.IIfCard;
  spotlights: any;
  singleCard?: boolean;
  keys: string[];
}

class IfCard extends React.Component<Props, any>
{
  constructor(props:Props)
  {
    super(props);
    Util.bind(this, 'addElse', 'addElseIf');
  }
  
  shouldComponentUpdate(nextProps, nextState)
  {
    return !_.isEqual(this.props, nextProps) || !_.isEqual(this.state, nextState);
  }
  
  addElse()
  {
    Actions.cards.if.else(this.props.card);
  }
  
  addElseIf(event)
  {
    var index = parseInt(Util.rel(event.target), 10);
    Actions.cards.filter.create(this.props.card.elses[index]);
  }

      //Note: the draggingover in the CardsArea may cause problems
  render()
  {
    var card = this.props.card;
    var elses = card.elses;
    return (
      <div ref='card'>
        <FilterArea {...this.props} hideNoFilterMessage={this.props.singleCard} />
        { this.props.card.filters.length ?
          <div className='if-card-else'>
            Then
          </div>
        : null }
        <CardsArea
          {...this.props}
          cards={this.props.card.cards}
          parentId={this.props.card.id}
        />
        {
          elses.map((els, index) =>
          (
            <div key={els.id}>
              <div className='if-card-else'>
                Else { els.filters.length !== 0 && 'If' }
              </div>
              {
                els.filters.length
                  ? null 
                  : <div className='button' onClick={this.addElseIf} rel={""+index}>+ If</div>
              }
              <Card
                {...this.props}
                singleCard={true}
                card={els}
                index={0}
                />
            </div>
          ))
        }
        { 
          elses.length || !this.props.card.filters.length ? null :
            <div className='button if-card-button' onClick={this.addElse}>+ Else</div>
        }
      </div>
    );
  }
};

export default IfCard;