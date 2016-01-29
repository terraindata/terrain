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
import PanelMixin from "../layout/PanelMixin.tsx";

var TabIcon = require("./../../../images/tab_corner_27x31.svg?name=TabIcon");

var Tab = React.createClass<any, any>({
  mixins: [PanelMixin],
  
  propTypes: {
    index: React.PropTypes.number,
    selectedIndex: React.PropTypes.number,
    tab: React.PropTypes.object,
    tabs: React.PropTypes.array,
    onSelect: React.PropTypes.func,
  },
  
  getDefaultProps(): any
  {
    return {
      drag_x: true,
      reorderOnDrag: true,
    }
  },
    
  // Returns z-index so that tabs are layered in a nice fashion
  zIndexStyleForIndex(index: number): {zIndex?: number}
  {
    if(index !== this.props.selectedIndex)
    {
      return {
        zIndex: this.props.tabs.length - index,
      };
    }
    
    return {};
  },

  
  render() {
    return this.renderPanel(
      <div 
        className={Util.objToClassname({
          'tabs-tab': true,
          'tabs-tab-selected': this.props.index === this.props.selectedIndex,
          })}
        key={this.props.index}
        style={this.zIndexStyleForIndex(this.props.index)}
        onClick={this.props.onSelect}>
          <TabIcon className='tab-icon tab-icon-left' />
          <div className='tab-inner'>{this.props.tab.tabName}</div>
          <TabIcon className='tab-icon tab-icon-right' />
      </div>
    );
  },
});

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
	  var onClick = this.props.tabs[index].onClick;	
    
    return () => {
      if(typeof onClick === 'function')
      {
        onClick();
  		}

			this.setState({
				selectedIndex: index,
			});
		};
	},

	render() {
		var content = this.props.tabs[this.state.selectedIndex].content;

		var showTabs = this.props.tabs && this.props.tabs.length >= 2;
    
    var tabsLayout = {
      columns: this.props.tabs.map((tab, index) => ({
      content:
      (
        <Tab 
          index={index}
          tab={tab}
          tabs={this.props.tabs}
          onSelect={this.handleTabSelectFactory(index)}
          selectedIndex={this.state.selectedIndex} />
      ),
    }))
    };

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
							<LayoutManager layout={tabsLayout} moveTo={this.props.moveTo} />
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