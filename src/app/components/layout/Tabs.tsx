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

require('./Tabs.less');
import * as React from 'react';
import Util from '../../util/Util.tsx';
import LayoutManager from "../layout/LayoutManager.tsx";

var TabIcon = require("./../../../images/tab_corner_27x31.svg?name=TabIcon");

var Tabs = React.createClass<any, any>({
	propTypes:
	{
		tabs: React.PropTypes.array.isRequired,
		selectedIndex: React.PropTypes.number,
		title: React.PropTypes.string,
	},

	getInitialState()
	{
		return {
			selectedIndex: this.props.selectedIndex || 0,
		};
	},

	handleTabSelectFactory(index)
	{
		return () => {
			if(typeof this.props.tabs[index].onClick === 'function')
			{
				this.props.tabs[index].onClick();	
			}

			this.setState({
				selectedIndex: index,
			});
		};
	},
  
  // Returns z-index so that tabs are layered in a nice fashion
  zIndexStyleForIndex(index: number): {zIndex?: number}
  {
    if(index !== this.state.selectedIndex)
    {
      return {
        zIndex: this.props.tabs.length - index,
      };
    }
    
    return {};
  },

	render() {
		var content = this.props.tabs[this.state.selectedIndex].content;

		var showTabs = this.props.tabs && this.props.tabs.length >= 2;

		return (<div className='tabs-container'>
			<div className='tabs-row-wrapper'>
				{ 
					this.props.title ? (
						<div className={'tabs-title' + (!showTabs ? ' tabs-title-no-tabs' : '')}>
							{this.props.title}
						</div>
					) : null
				}
				{
					showTabs ? (
						<div className='tabs-row'>
							{
								this.props.tabs.map((tab, index) => 
									<div 
										className={Util.objToClassname({
											'tabs-tab': true,
											'tabs-tab-selected': index === this.state.selectedIndex,
											})}
										key={index}
                    style={this.zIndexStyleForIndex(index)}
										onClick={this.handleTabSelectFactory(index)}>
                      <TabIcon className='tab-icon tab-icon-left' />
                      <div className='tab-inner'>{tab.tabName}</div>
                      <TabIcon className='tab-icon tab-icon-right' />
									</div>)
							}
              <div className='tabs-shadow'></div>
						</div>
					) : null
				}
			</div>
			<div className='tabs-content'>
				{content}
			</div>
		 </div>);
	},
});

export default Tabs;