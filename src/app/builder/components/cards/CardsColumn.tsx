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

require('./CardsColumn.less');
import * as classNames from 'classnames';
import * as Immutable from 'immutable';
import * as _ from 'underscore';
import * as React from 'react';
import Util from '../../../util/Util.tsx';
import Actions from "../../data/BuilderActions.tsx";
import PureClasss from './../../../common/components/PureClasss.tsx';
import BuilderTypes from '../../BuilderTypes.tsx';
import Switch from './../../../common/components/Switch.tsx';
import CardsArea from './CardsArea.tsx';
import CardDropArea from './CardDropArea.tsx';
import InfoArea from '../../../common/components/InfoArea.tsx';
import CardsDeck from './CardsDeck.tsx';
type ICard = BuilderTypes.ICard;
type ICards = BuilderTypes.ICards;
let {List, Map} = Immutable;
let ExpandIcon = require("./../../../../images/icon_expand_12x12.svg?name=ExpandIcon");

interface Props
{
  cards: ICards;
  queryId: ID;
  keys: List<string>;
  canEdit: boolean;
  addColumn: (number, string?) => void;
  columnIndex: number;
  spotlights: List<any>;
}

class CardsColumn extends PureClasss<Props>
{
  state: {
    keyPath: KeyPath;
    learningMode: boolean;
    deckOpen: boolean;
  } = {
    keyPath: this.computeKeyPath(this.props),
    learningMode: false,
    deckOpen: true,
  };
  
  computeKeyPath(props:Props):KeyPath
  {
    return List(this._keyPath('queries', props.queryId, 'cards'));
  }
  
  componentWillReceiveProps(props:Props)
  {
    if(props.queryId !== this.props.queryId)
    {
      this.setState({
        keyPath: this.computeKeyPath(props),
      });
    }
  }
  
  createFromCard()
  {
    Actions.create(this.state.keyPath, 0, 'sfw');
  }
  
  toggleLearningMode()
  {
    this.setState({
      learningMode: !this.state.learningMode,
    })
  }

  renderTopbar()
  {
    return (
      <div className='cards-area-top-bar'>
        <div className = 'cards-area-white-space' />
        <Switch
          first='Standard'
          second='Learning'
          onChange={this.toggleLearningMode}
          selected={this.state.learningMode ? 2 : 1}
          small={true}
        />
      </div>
    );
  }
  
  toggleDeck()
  {
    this.setState({
      deckOpen: !this.state.deckOpen,
    });
  }
  
  render()
  {
    let {props} = this;
    let {cards, canEdit} = props;
    let {keyPath} = this.state;
    
    return (
      <div
        className={classNames({
          'cards-column': true,
          'cards-column-deck-open': this.state.deckOpen,
        })}
      >
        <div className='cards-deck'>
          <CardsDeck
            open={this.state.deckOpen}
          />
        </div>
        <div className='cards-column-cards-area'>
          <CardDropArea
            half={true}
            index={0}
            keyPath={keyPath}
            height={12}
          />
          <CardDropArea
            half={true}
            lower={true}
            index={cards.size}
            keyPath={keyPath}
            heightOffset={12}
          />
          <CardsArea 
            cards={cards}
            keyPath={keyPath}
            spotlights={this.props.spotlights} 
            keys={this.props.keys}
            canEdit={canEdit}
            addColumn={this.props.addColumn}
            columnIndex={this.props.columnIndex}
            noCardTool={true}
          />
          {
            !cards.size ? 
              <InfoArea
                large="No cards have been created, yet."
                small={canEdit && "Create one below. Most people start with the Select/From card."}
                button={canEdit && "Create a Select/From card"}
                onClick={this.createFromCard}
                inline={true}
              />
            : null
          }
        </div>
        <div
          className='cards-deck-knob'
          onClick={this.toggleDeck}
        >
          <ExpandIcon />
          Card Deck
        </div>
      </div>
    );
  }
}

export default CardsColumn;
