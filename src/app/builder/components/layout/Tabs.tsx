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
import * as Immutable from 'immutable';
import * as React from 'react';
import * as _ from 'underscore';
import Util from '../../../util/Util.tsx';
import LayoutManager from "../layout/LayoutManager.tsx";
import PanelMixin from "../layout/PanelMixin.tsx";
import InfoArea from "./../../../common/components/InfoArea.tsx";
import Classs from './../../../common/components/Classs.tsx';
import BrowserStore from './../../../browser/data/BrowserStore.tsx';
import BrowserActions from './../../../browser/data/BrowserActions.tsx';
import BrowserTypes from './../../../browser/BrowserTypes.tsx';
import * as classNames from 'classnames';
var ReactTooltip = require("react-tooltip");

var TabIcon = require("./../../../../images/tab_corner_27x31.svg?name=TabIcon");
var CloseIcon = require("./../../../../images/icon_close_8x8.svg?name=CloseIcon");

var Tab = React.createClass<any, any>({
  mixins: [PanelMixin],
  
  propTypes:
  {
    id: React.PropTypes.string.isRequired,
    name: React.PropTypes.string.isRequired,
    selected: React.PropTypes.bool.isRequired,
    index: React.PropTypes.number.isRequired,
    onClick: React.PropTypes.func.isRequired,
    onClose: React.PropTypes.func.isRequired,
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
  zIndexStyle(): {zIndex?: number}
  {
    if(!this.props.selected)
    {
      return {
        zIndex: this.props.index,
      };
    }
    
    return {};
  },

  handleClick()
  {
    if(!this.state.moved)
    {
      this.props.onClick(this.props.id);
    }
  },
  
  close(event) {
    event.stopPropagation();
    this.props.onClose(this.props.id);
  },
  
  renderClose() {
    if(this.props.fixed)
    {
      return null;
    }
    
    return (
      <div
        className='tabs-close'
        onClick={this.close}
        data-tip='Close'
      >
        <CloseIcon className='close' />
      </div>
    );
  },
  
  render() {
    return this.renderPanel(
      <div 
        className={Util.objToClassname({
          'tabs-tab': true,
          'tabs-tab-selected': this.props.selected,
          'tabs-tab-no-bg': this.props.fixed,
          })}
        key={this.props.id}
        style={this.zIndexStyle()}
        onClick={this.handleClick}>
          { this.props.fixed ? null :
            <TabIcon className='tab-icon tab-icon-left' />
          }
          <div className='tab-inner'>
            { this.props.name }
            { this.renderClose() }
          </div>
          { this.props.fixed ? null :
            <TabIcon className='tab-icon tab-icon-right' />
          }
      </div>
    );
  },
});

interface TabsProps
{
  config: string;
  actions: Immutable.List<{
    text: string;
    icon: any;
    onClick: () => void;
  }>;
  history: any;
}

class Tabs extends Classs<TabsProps> {
  state = {
    variants: null,
    tabs: null,
  }
  cancel = null;
  
  componentDidMount()
  {
    BrowserActions.fetch();
    
    let a = () => 
    {
      let groups = BrowserStore.getState().get('groups');
      if(groups)
      {
        var variants: {[id: string]: BrowserTypes.Variant} = {};

        // todo consider a different approach
        groups.map(group =>
          group.algorithms.map(algorithm =>
            algorithm.variants.map(variant =>
              variants[variant.id] = variant)
            )
        );
        
        this.computeTabs(this.props.config, variants);
      }
    }
    
    this.cancel = BrowserStore.subscribe(a);
    a();
  }
  
  componentWillUnmount()
  {
    this.cancel && this.cancel();
  }
  
  componentWillReceiveProps(nextProps)
  {
    if(nextProps.config !== this.props.config)
    {
      this.computeTabs(nextProps.config);
    }
  }
  
  computeTabs(config, variants?)
  {
    variants = variants || this.state.variants;
    
    let tabs = config && variants && config.split(',').map(vId =>
    ({
      id: this.getId(vId),
      name: variants[this.getId(vId)] ? variants[this.getId(vId)].name : null,
      selected: this.isSelected(vId),
    }));
    
    this.setState({
      tabs,
      variants,
    });
  }
  
  shouldComponentUpdate(nextProps, nextState)
  {
    return !_.isEqual(nextState.tabs, this.state.tabs);
  }
  
  moveTabs(index: number, destination: number)
  {
    var newTabs = JSON.parse(JSON.stringify(this.state.tabs));
    var tab = newTabs.splice(index, 1)[0];
    newTabs.splice(destination, 0, tab);
    this.props.history.pushState({}, '/builder/' + 
      newTabs.map(
        tab => (tab.selected ? '!' : '') + tab.id
      ).join(',')
    );
  }
  
  renderActions()
  {
    return (
      <div className='tabs-actions'>
        {
          this.props.actions.map((action, index) => 
            <a
              className='tabs-action'
              key={index}
              onClick={action.onClick}
              data-tip={action.text}
            >
              {action.icon}
            </a>)
        }
      </div>
    );
  }
  
  getId(idStr:string):string
  {
    if(idStr.substr(0, 1) === '!')
    {
      return idStr.substr(1);
    }
    return idStr;
  }
  
  isSelected(idStr:string):boolean
  {
    return idStr.substr(0, 1) === '!';
  }
  
  handleClick(id:ID)
  {
    this.props.history.pushState({ state: { config: this.props.config }}, this.getTo(id));
  }
  
  handleClose(id:ID)
  {
    this.props.history.pushState({}, this.getCloseTo(id));
  }
  
  getTo(id)
  {
    return '/builder/' + this.state.tabs.map(
      tab => (tab.id === id ? "!" : "") + tab.id
    ).join(",");
  }
  
  getCloseTo(id)
  {
    let tab = this.state.tabs.find(tab => tab.id === id);
    return '/builder/' + (tab.selected && this.state.tabs.length > 1 ? '!' : '')
      + this.state.tabs.map(tab => 
        tab.id === id ? null : 
          (tab.selected ? "!" : "") + tab.id
    ).filter(s => s)
     .join(",");
  }
  
	render()
  {
    let { tabs } = this.state;
    
    var tabsLayout =
    {
      compact: true,
      columns: tabs ? tabs.map((tab, index) => (
      {
        key: tab.id,
        content:
          <Tab 
            name={tab.name}
            selected={tab.selected}
            id={tab.id}
            index={index}
            onClick={this.handleClick}
            onClose={this.handleClose}
          />
        ,
      }))
      : []
    };
    
    return (
      <div className='tabs-container'>
        <div className='tabs-row-wrapper'>
          <div className='tabs-row'>
            <LayoutManager layout={tabsLayout} moveTo={this.moveTabs} />
            { this.renderActions() }
            <div className='tabs-shadow'></div>
          </div>
        </div>
      </div>
     );
	}
};

export default Tabs;