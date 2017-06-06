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
// import * as moment from 'moment';
const moment = require('moment');
import * as classNames from 'classnames';
import * as Immutable from 'immutable';
import * as React from 'react';
import * as _ from 'underscore';
import LibraryActions from '../../../library/data/LibraryActions';
import Util from '../../../util/Util';
import LayoutManager from '../layout/LayoutManager';
import PanelMixin from '../layout/PanelMixin';
import BuilderStore from './../../../builder/data/BuilderStore';
import Classs from './../../../common/components/Classs';
import InfoArea from './../../../common/components/InfoArea';
import PureClasss from './../../../common/components/PureClasss';
import {LibraryState, LibraryStore} from './../../../library/data/LibraryStore';
const {browserHistory} = require('react-router');
const ReactTooltip = require('react-tooltip');

const TabIcon = require('./../../../../images/tab_corner_27x31.svg?name=TabIcon');
const CloseIcon = require('./../../../../images/icon_close_8x8.svg?name=CloseIcon');

const Tab = React.createClass<any, any>({
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

  handleResize(e)
  {
    this.setState({
      zoom: (window.outerWidth - 8) / window.innerWidth,
    });
  },

  componentDidMount()
  {
    this.handleResize();
    window.addEventListener('resize', this.handleResize);
  },

  componentWillUnmount()
  {
    window.removeEventListener('resize', this.handleResize);
  },

  getDefaultProps(): any
  {
    return {
      drag_x: true,
      reorderOnDrag: true,
      dragInsideOnly: true,
      onClick: this.handleClick,
    };
  },

  // Returns z-index so that tabs are layered in a nice fashion
  zIndexStyle(): ({zIndex?: number})
  {
    if (!this.props.selected)
    {
      return {
        zIndex: this.props.index,
      };
    }

    return {};
  },

  handleClick()
  {
    if (!this.state.moved)
    {
      this.props.onClick(this.props.id);
    }
  },

  close(event)
  {
    event.stopPropagation();
    this.props.onClose(this.props.id);
  },

  renderClose()
  {
    if (this.props.fixed)
    {
      return null;
    }

    return (
      <div
        className='tabs-close'
        onClick={this.close}
      >
        <CloseIcon className='close close-icon' />
      </div>
    );
  },

  render()
  {
    let topStyle = '-17px';
    if (this.state.zoom < 0.8)
    {
      topStyle = '-15px';
    }
    if (this.state.zoom < 0.7)
    {
      topStyle = '-13px';
    }
    if (this.state.zoom < 0.6)
    {
      topStyle = '-8px';
    }

    return this.renderPanel(
      <div
        className={classNames({
          'tabs-tab': true,
          'tabs-tab-selected': this.props.selected,
          'tabs-tab-no-bg': this.props.fixed,
        })}
        key={this.props.id}
        onClick={this.handleClick}
        style={this.zIndexStyle()}
      >
          {
            !this.props.fixed &&
              <TabIcon
                className='tab-icon tab-icon-left'
              />
          }
          <div
            className='tab-inner'
            style={{top: topStyle}}
          >
            {
              this.props.name
            }
            {
              this.renderClose()
            }
          </div>
          {
            !this.props.fixed &&
              <TabIcon
                className='tab-icon tab-icon-right'
              />
          }
      </div>,
    );
  },
});

export interface TabAction
{
  text: string;
  icon: any;
  onClick();
  enabled?: boolean;
}

interface TabsProps
{
  config: string;
  actions: List<TabAction>;
  onNoVariant(variantId: string);
}

export class Tabs extends PureClasss<TabsProps> {
  state = {
    variants: LibraryStore.getState().variants,
    tabs: null,
  };
  cancel = null;

  componentDidMount()
  {
    this._subscribe(LibraryStore, {
      stateKey: 'variants',
      storeKeyPath: ['variants'],
      updater: (state) =>
      {
        this.computeTabs(this.props.config);
      },
      isMounted: true,
    });
    this.computeTabs(this.props.config);
  }

  componentWillUnmount()
  {
    this.cancel && this.cancel();
  }

  componentWillReceiveProps(nextProps)
  {
    if (nextProps.config !== this.props.config)
    {
      this.computeTabs(nextProps.config);
    }
  }

  computeTabs(config)
  {
    const {variants} = this.state;
    const tabs = config && variants && config.split(',').map((vId) =>
    {
      const id = this.getId(vId);
      const variant = variants.get(+id);
      let name = 'Loading...';
      if (variant)
      {
        name = variant.name || 'Untitled';
        if (variant.version)
        {
          name += ' @ ' + moment(variants.get(+id).lastEdited).format('ha M/D/YY');
        }
      }
      else
      {
        LibraryActions.variants.fetchVersion(id, this.props.onNoVariant);
      }
      return {
        id,
        name,
        selected: this.isSelected(vId),
      };
    });

    this.setState({
      tabs,
    });
  }

  // shouldComponentUpdate(nextProps, nextState)
  // {
  //   return !_.isEqual(nextState.tabs, this.state.tabs);
  // }

  moveTabs(index: number, destination: number)
  {
    const newTabs = JSON.parse(JSON.stringify(this.state.tabs));
    const tab = newTabs.splice(index, 1)[0];
    newTabs.splice(destination, 0, tab);
    browserHistory.push('/builder/' +
      newTabs.map(
        (tab) => (tab.selected ? '!' : '') + tab.id,
      ).join(','),
    );
  }

  renderActions()
  {
    return (
      <div className='tabs-actions'>
        {
          this.props.actions.map((action, index) =>
            <a
              className={classNames({
                'tabs-action': true,
                'tabs-action-enabled': action.enabled || action.enabled === undefined,
              })}
              key={index}
              onClick={action.onClick}
            >
              {
                action.icon &&
                  <div className='tabs-action-piece'>
                    {
                      action.icon
                    }
                  </div>
              }
              <div className='tabs-action-piece'>
                {
                  action.text
                }
              </div>
            </a>)
        }
      </div>
    );
  }

  getId(idStr: string): string
  {
    if (idStr.substr(0, 1) === '!')
    {
      return idStr.substr(1);
    }
    return idStr;
  }

  isSelected(idStr: string): boolean
  {
    return idStr.substr(0, 1) === '!';
  }

  handleClick(id: ID)
  {
    browserHistory.push(this.getTo(id));
  }

  handleClose(id: ID)
  {
    browserHistory.push(this.getCloseTo(id));
  }

  getTo(id)
  {
    return '/builder/' + this.state.tabs.map(
      (tab) => (tab.id === id ? '!' : '') + tab.id,
    ).join(',');
  }

  getCloseTo(id)
  {
    const {tabs} = this.state;
    const tab = this.state.tabs.find((tab) => tab.id === id);
    const newConfig = (tab.selected && tabs.length > 1 ? '!' : '')
      + tabs.map((tab) =>
        tab.id === id ? null :
          (tab.selected ? '!' : '') + tab.id,
    ).filter((s) => s)
     .join(',');

    localStorage.setItem('config', newConfig); // need to set for closing the last tab to work
    return '/builder/' + newConfig;
  }

	render()
  {
    const { tabs } = this.state;

    const tabsLayout =
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
      : [],
    };

    return (
      <div className='tabs-container'>
        <div className='tabs-row-wrapper'>
          <div className='tabs-row'>
            <div className='tabs-inner-wrapper'>
              <LayoutManager layout={tabsLayout} moveTo={this.moveTabs} />
            </div>
            {
              this.renderActions()
            }
            <div className='tabs-shadow'></div>
          </div>
        </div>
      </div>
     );
	}
}
export default Tabs;
