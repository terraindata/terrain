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
import Util from '../../util/Util.tsx';
import InfoArea from '../common/InfoArea.tsx';
import Actions from "../../data/Actions.tsx";
import Card from "../cards/Card.tsx";
import LayoutManager from "../layout/LayoutManager.tsx";
import CreateCardTool from "./CreateCardTool.tsx";
import BuilderColumn from '../builder/BuilderColumn.tsx';
import TQLView from '../tql/TQLView.tsx';

var CardsArea = React.createClass<any, any>(_.extend({}, BuilderColumn, {
	propTypes:
	{
		cards: React.PropTypes.array.isRequired,
    algorithmId: React.PropTypes.string.isRequired,
    spotlights: React.PropTypes.array.isRequired,
  },
  
  getInitialState()
  {
    return {
      showTQL: false,
      title: 'Builder',
      menuOptions:
      [
        {
          text: 'TQL',
          onClick: this.switchView
        },
        {
          text: 'Copy',
          onClick: this.copy
        },
        {
          text: 'Clear',
          onClick: this.clear
        }
      ],
    };
  },
  
  getDefaultProps()
  {
    return {
      
    }  
  },
  
  copy() {},
  
  clear() {},
  
  switchView() {
    this.setState({
      showTQL: !this.state.showTQL,
    });
  },
  
  getMenuOptions() {
    return [
      {
        text: this.state.showTQL ? 'Cards' : 'TQL',
        onClick: this.switchView
      },
      {
        text: 'Copy',
        onClick: this.copy
      },
      {
        text: 'Clear',
        onClick: this.clear
      }
    ];
  },
  
  renderTQL() {
    if(!this.state.showTQL)
    {
      return null;
    }
    
    return <TQLView />
  },
  
  createFromCard() {
    Actions.cards.create(this.props.algorithmId, 'from', this.props.index);
  },
  
  renderNoCards() {
    return <InfoArea
      large="No cards have been created, yet."
      small="Most people start with the From card."
      button="Create a From card"
      onClick={this.createFromCard}
      />;
  },
  
  renderCards() {
    if(this.state.showTQL)
    {
      return null;
    }
    
    if(!this.props.cards.length)
    {
      return this.renderNoCards();
    }
    
    var layout = {
      rows: this.props.cards.map((card, index) => {
        return {
          content: <Card 
            index={index}
            card={card}
            {...this.props} />,
          key: card.id,
        };
      }),
      fullHeight: true,
    };
    
    layout.rows.push({
      content: (
        <div className='standard-margin standard-margin-top'>
          <CreateCardTool index={this.props.cards.length} alwaysOpen={true} algorithmId={this.props.algorithmId} />
        </div>
      ),
      key: 'end-tool',
    });

    var moveTo = (curIndex, newIndex) =>
    {
      Actions.cards.move(this.props.cards[curIndex], newIndex);
    };

    return <LayoutManager layout={layout} moveTo={moveTo} />;
  },

	renderContent() {
		return (
      <div>
        { this.renderTQL() }
        { this.renderCards() }
      </div>
    );
	},
}));

export default CardsArea;