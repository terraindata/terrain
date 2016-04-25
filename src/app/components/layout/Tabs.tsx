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
import * as _ from 'underscore';
import Util from '../../util/Util.tsx';
import LayoutManager from "../layout/LayoutManager.tsx";
import PanelMixin from "../layout/PanelMixin.tsx";
import InfoArea from "./../common/InfoArea.tsx";

var TabIcon = require("./../../../images/tab_corner_27x31.svg?name=TabIcon");
var CloseIcon = require("./../../../images/icon_close_8x8.svg?name=CloseIcon");

var Tab = React.createClass<any, any>({
  mixins: [PanelMixin],
  
  test: 'abc',
  
  propTypes:
  {
    index: React.PropTypes.number,
    selectedIndex: React.PropTypes.number,
    tab: React.PropTypes.object,
    tabOrder: React.PropTypes.array,
    onSelect: React.PropTypes.func,
    actions: React.PropTypes.array,
  },
  
  getDefaultProps(): any
  {
    return {
      drag_x: true,
      reorderOnDrag: true,
      dragInsideOnly: true,
    }
  },
    
  // Returns z-index so that tabs are layered in a nice fashion
  zIndexStyleForIndex(index: number): {zIndex?: number}
  {
    if(index !== this.props.selectedIndex)
    {
      return {
        zIndex: this.props.tabOrder.length - index,
      };
    }
    
    return {};
  },

  handleClick()
  {
    if(!this.state.moved)
    {
      this.props.onSelect(this.props.tab.key);
    }
  },
  
  close(event) {
    event.stopPropagation();
    this.props.tab.onClose(this.props.tab.key);
  },
  
  renderClose() {
    if(!this.props.tab.closeable)
    {
      return null;
    }
    
    return (
      <div className='tabs-close' onClick={this.close}>
        <CloseIcon />
      </div>
    );
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
        onClick={this.handleClick}>
          <TabIcon className='tab-icon tab-icon-left' />
          <div className='tab-inner'>
            { this.props.tab.tabName }
            { this.renderClose() }
          </div>
          <TabIcon className='tab-icon tab-icon-right' />
      </div>
    );
  },
});

var Tabs = React.createClass<any, any>({
	propTypes:
	{
		tabs: React.PropTypes.object.isRequired,
		title: React.PropTypes.string,
	},
  
  shouldComponentUpdate(nextProps, nextState)
  {
    return !_.isEqual(this.props, nextProps) || !_.isEqual(this.state, nextState);
  },

	getInitialState()
	{
		return {
      tabOrder: _.map(this.props.tabs, (tab, key) => _.extend(tab, 
      {
        key: key,
      })),
      selectedIndex: 0,
      selectingIndex: null,
		};
	},
  
  componentWillReceiveProps(newProps)
  {
    var tabOrder = this.state.tabOrder;
    
    _.map(newProps.tabs, (tab, key) => 
    {
      var index = tabOrder.findIndex((tab) => tab.key === key);
      if(index !== -1)
      {
        tabOrder[index] = _.extend(tabOrder[index], tab);
      }
      else
      {
        index = tabOrder.length - 1;
        
        while(tabOrder[index] && tabOrder[index]['pinnedAtEnd'])
        {
          index --;
        }

        if(index === this.state.selectedIndex)
        {
          tab['onClick'](this.state.selectedIndex);
        }
        
        tabOrder.splice(index + 1, 0, _.extend(tab,
        {
          key: key,
        }));
      }
    });
    
    tabOrder = tabOrder.reduce((newTabOrder, tab) => {
      if(newProps.tabs[tab.key])
        newTabOrder.push(tab);
      return newTabOrder;
    }, []);
    
    var state:any = {
      tabOrder: tabOrder,
    }
    
    this.setState(state);
  },

  _onTabSelect: {},
	handleTabSelectFactory(index)
	{
    if(!this._onTabSelect[index])
    {
      this._onTabSelect[index] = () => {
        if(index === this.state.selectedIndex)
        {
          return;
        }
        
        if(!this.state.tabOrder[index].unselectable)
        {
          this.setState({
            selectedIndex: index,
            selectingIndex: index
          });
          setTimeout(() => {
            this.setState({
              selectingIndex: null
            });
          }, 250);
        }
        
        var key = this.state.tabOrder[index].key;  
        var onClick = this.props.tabs[key].onClick;
        
        if(typeof onClick === 'function')
        {
          onClick(key);
        }
      };
    }
    
    return this._onTabSelect[index];
	},
  
  moveTabs(index: number, destination: number)
  {
    var tabOrder = Util.deeperCloneArr(this.state.tabOrder);
    while(tabOrder[destination]['noDrag'])
    {
      destination --;
    }
    
    var selectedKey = tabOrder[this.state.selectedIndex].key;
    var tab = tabOrder.splice(index, 1)[0];
    tabOrder.splice(destination, 0, tab);
    
    this.setState({
      tabOrder: tabOrder,
      selectedIndex: tabOrder.findIndex(tab => tab.key === selectedKey),
    });
  },
  
  renderActions()
  {
    if(!this.props.actions)
    {
      return null;
    }
    
    return (
      <div className='tabs-actions'>
        {
          this.props.actions.map((action, index) => 
            <a
              className={'tabs-action' + (action.noDivider ? ' tabs-action-no-divider' : '')}
              key={index}
              onClick={action.onClick}>
              {action.icon} {action.text}
            </a>)
        }
      </div>
    );
  },
  
	render()
  {
    var selectedIndex = this.state.selectedIndex;
		var content = this.state.tabOrder[selectedIndex].content;
    if(this.state.selectingIndex !== null)
    {
      content = null;
    }

    var tabsLayout = 
    {
      compact: true,
      columns: this.state.tabOrder.map((tab, index) => (
      {
        noDrag: tab.noDrag,
        key: tab.key,
        content:
        (
          <Tab 
            index={index}
            tab={tab}
            tabOrder={this.state.tabOrder}
            drag_x={!tab.noDrag}
            onSelect={this.handleTabSelectFactory(index)}
            selectedIndex={selectedIndex} />
        ),
      }))
    };
    
		return (<div className='tabs-container'>
			<div className='tabs-row-wrapper'>
				{ 
					this.props.title ? (
						<div className='tabs-title'>
							{this.props.title}
						</div>
					) : null
				}
				{
					<div className='tabs-row'>
						<LayoutManager layout={tabsLayout} moveTo={this.moveTabs} />
            { this.renderActions() }
            <div className='tabs-shadow'></div>
					</div>
				}
			</div>
			<div className='tabs-content'>
				{content}
			</div>
      <div className={this.state.selectingIndex !== null ? 'tabs-loading' : 'tabs-loading-hidden'}>
        <InfoArea large='Loading...' />
      </div>
		 </div>);
	},
});

export default Tabs;