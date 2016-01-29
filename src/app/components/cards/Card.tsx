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

require('./Card.less');
import Actions from "../../data/Actions.tsx";
import * as React from 'react';
import Util from '../../util/Util.tsx';
import PanelMixin from '../layout/PanelMixin.tsx';
import LayoutManager from "../layout/LayoutManager.tsx";
import SelectCard from './card-types/SelectCard.tsx';
import FromCard from './card-types/FromCard.tsx';
import SortCard from './card-types/SortCard.tsx';
import FilterCard from './card-types/FilterCard.tsx';
import CreateCardTool from './CreateCardTool.tsx';
import Menu from '../common/Menu.tsx';

var Card = React.createClass({
	mixins: [PanelMixin],

	propTypes:
	{
		card: React.PropTypes.object.isRequired,
    index: React.PropTypes.number.isRequired,
	},

	getDefaultProps():any
	{
		return {
			drag_x: false,
			drag_y: true,
			reorderOnDrag: true,
			handleRef: 'handle',
		};
	},

	getInitialState()
	{
		return {
			open: true,
		}
	},
  
	handleTitleClick()
	{
		if(!this.state.moved)
		{
			// this.state.moved is updated in panelMixin
			this.setState({
				open: !this.state.open,
			});
		}
	},
  
  handleDelete()
  {
    console.log('delete');
    Actions.dispatch.cards.remove(this.props.index);
  },
  
  handleCopy()
  {
    console.log('do you copy');
    console.log('nope');
    console.log('roger that');
  },

	render() {

		var CardComponent;
		var subBar;

		switch(this.props.card.type)
		{
			case 'select':
				CardComponent = SelectCard;
				subBar = 
				{
					content: '+',
					onClick: () => 
					{
						Actions.dispatch.cards.select.createProperty(this.props.card);
					},
				};

				break;
			case 'from':
				CardComponent = FromCard;
				subBar =
				{
					content: '+',
					onClick: () => 
					{
						Actions.dispatch.cards.from.join.create(this.props.card);
					},
				};

				break;
   case 'sort':
     CardComponent = SortCard;
     break;
   case 'filter':
    CardComponent = FilterCard;
    subBar = 
        {
          content: '+',
          onClick: () => 
          {
            Actions.dispatch.cards.filter.create(this.props.card);
          },
        };
    break;
		}
    
    var content = <div>This card has not been implemented yet.</div>;
    if(CardComponent)
    {
      content = <CardComponent {...this.props} />
    }

		var contentToDisplay;
		var subBarToDisplay;
		if(this.state.open)
		{
			contentToDisplay = (
				<div className='card-content'>
					{content}
				</div>
			);

			if(subBar)
			{
				subBarToDisplay = (
					<div className='card-sub-bar' onClick={subBar.onClick}>
						<div className='card-sub-bar-inner'>
							{subBar.content}
						</div>
					</div>
				);
			}
		}

    var menuOptions = 
    [
      {
        text: 'Copy',
        onClick: this.handleCopy,
      },
      {
        text: 'Hide',
        onClick: this.handleTitleClick,
      },
      {
        text: 'Delete',
        onClick: this.handleDelete,
      },
    ];

		var title = this.props.card.type.charAt(0).toUpperCase() + this.props.card.type.substr(1);
		return this.renderPanel((
			<div className='card'>
        <CreateCardTool index={this.props.index} />
				<div className='card-inner'>
					<div className='card-title' ref='handle' onClick={this.handleTitleClick}>
						{title}
            <Menu options={menuOptions} />
					</div>
					{ contentToDisplay }
					{ subBarToDisplay }
				</div>
			</div>
			));
	},
});

export default Card;