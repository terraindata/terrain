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
import * as $ from 'jquery';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import Util from '../../util/Util.tsx';
import InfoArea from '../common/InfoArea.tsx';
import Actions from "../../data/Actions.tsx";
import Card from "../cards/Card.tsx";
import LayoutManager from "../layout/LayoutManager.tsx";
import { DropZone, DropZoneManager } from "../layout/DropZoneManager.tsx";
import CreateCardTool from "./CreateCardTool.tsx";
import CardsContainerMixin from "./CardsContainerMixin.tsx";

var CardsArea = React.createClass<any, any>({
  mixins: [CardsContainerMixin],
  
	propTypes:
	{
		cards: React.PropTypes.array.isRequired,
    parentId: React.PropTypes.string.isRequired,
    spotlights: React.PropTypes.array.isRequired,
    topLevel: React.PropTypes.bool,
    draggingOver: React.PropTypes.bool,
    draggingPlaceholder: React.PropTypes.object,
  },
  
  getDefaultProps()
  {
    return {
      cardsPropKeyPath: ['cards'],
      parentIdPropKeyPath: ['parentId'],
      dropZoneRef: 'cardsArea',
    };
  },
  
  hasCardsArea()
  {
    return this.props.topLevel;
  },
  
  componentWillReceiveProps(nextProps)
  {
    if(!_.isEqual(nextProps, this.props))
    {
      this.setState({
        layout:
        {
          rows: this.getRows(nextProps),
          useDropZones: true,
        }
      });
    }
  },
  
  shouldComponentUpdate(nextProps, nextState)
  {
    return !_.isEqual(this.props, nextProps) || !_.isEqual(this.state, nextState);
  },
  
  getInitialState()
  {
    return {
      id: Util.randInt(123456789),
      layout:
      {
        rows: this.getRows(this.props),
        useDropZones: true,
      }
    };
  },
  
  getRows(props)
  {
    return props.cards.map((card, index) => (
      {
        content: <Card 
          index={index}
          card={card}
          onDropOutside={this.onDropOutside}
          parentId={props.parentId}
          cards={props.cards}
          spotlights={props.spotlights}
          onHover={$({})}
          />,
        key: card.id,
      }
    )).concat({
      content: (
        <CreateCardTool
          index={props.cards.length}
          open={props.topLevel || props.cards.length === 0}
          parentId={props.parentId}
          className={props.topLevel ? 'standard-margin standard-margin-top' : 'nested-create-card-tool-wrapper'}
          />
      ),
      key: 'end-tool',
    })
  },
  
  copy() {},
  
  clear() {},
  
  createFromCard() {
    Actions.cards.create(this.props.parentId, 'from', this.props.index);
  },
  
  // when a child card is dropped outside of its CardsArea
  onDropOutside(coords, originalCoords, key)
  {
    
  },
  
  render() {
    if(!this.props.cards.length && this.props.topLevel)
    {
      return <InfoArea
        large="No cards have been created, yet."
        small="Most people start with the From card."
        button="Create a From card"
        onClick={this.createFromCard}
        />;
    }

    return (
      <div
        className={'cards-area' + (this.props.topLevel ? ' cards-area-top-level' : '')}
        ref='cardsArea'>
        <LayoutManager
          layout={this.state.layout}
          placeholder={this.state.draggingPlaceholder || this.props.draggingPlaceholder}
          />
      </div>
    );
  },
});

export default CardsArea;