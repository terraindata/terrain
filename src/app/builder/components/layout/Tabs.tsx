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

// Copyright 2017 Terrain Data, Inc.

// tslint:disable:no-invalid-this no-var-requires no-shadowed-variable strict-boolean-expressions restrict-plus-operands no-unused-expression max-line-length

import './Tabs.less';
// import * as moment from 'moment';
const moment = require('moment');
import * as classNames from 'classnames';
import { tooltip, TooltipProps } from 'common/components/tooltip/Tooltips';
import createReactClass = require('create-react-class');
import { LibraryState } from 'library/LibraryTypes';
import * as _ from 'lodash';
import * as PropTypes from 'prop-types';
import * as React from 'react';
import { browserHistory } from 'react-router';
import { backgroundColor, Colors, fontColor, getStyle } from '../../../colors/Colors';
import LibraryActions from '../../../library/data/LibraryActions';
import Util from '../../../util/Util';
import LayoutManager from '../layout/LayoutManager';
import PanelMixin from '../layout/PanelMixin';
import { ColorsActions } from './../../../colors/data/ColorsRedux';
import TerrainComponent from './../../../common/components/TerrainComponent';

// const TabIcon = require('./../../../../images/tab_corner_27x31.svg?name=TabIcon');
const CloseIcon = require('./../../../../images/icon_close_8x8.svg?name=CloseIcon');

const Tab = createReactClass<any, any>({
  mixins: [PanelMixin],

  propTypes:
    {
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      selected: PropTypes.bool.isRequired,
      index: PropTypes.number.isRequired,
      onClick: PropTypes.func.isRequired,
      onClose: PropTypes.func.isRequired,
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
  zIndexStyle(): number
  {
    if (!this.props.selected)
    {
      return this.props.index;
    }

    return undefined;
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
        <CloseIcon
          className='close-icon'
          style={getStyle('fill', this.props.selected ? Colors().sidebarBg : Colors().iconColor)}
        />
      </div>
    );
  },

  render()
  {
    const style = _.extend({},
      fontColor(this.props.selected ? Colors().sidebarBg : Colors().fontColor2),
      // backgroundColor(this.props.selected ? Colors().active : '')
    );
    return this.renderPanel(
      <div
        className={classNames({
          'tabs-tab': true,
          'tabs-tab-selected': this.props.selected,
          'tabs-tab-no-bg': this.props.fixed,
        })}
        key={this.props.id}
        onClick={this.handleClick}
        style={{
          zIndex: this.zIndexStyle(),
        }}
        ref={this.props.name}
      >
        <div
          className='tab-inner'
          style={style}
        >
          {
            this.props.name
          }
          {
            this.renderClose()
          }
        </div>
      </div>,
    );
  },
});

export interface TabAction
{
  text?: string;
  tooltip?: string;
  icon: any;
  style?: any;
  enabled?: boolean;
  onClick();
}

interface TabsProps
{
  config: string;
  actions: List<TabAction>;
  colorsActions: typeof ColorsActions;
  library?: LibraryState;
  algorithmActions: typeof LibraryActions.algorithms;
  onNoAlgorithm(algorithmId: string);
}

class Tabs extends TerrainComponent<TabsProps> {
  public state = {
    tabs: null,
    selectorLeft: 0,
    selectorWidth: 0,
  };

  public cancel = null;

  public setSelectedPosition()
  {
    if (this.state.tabs === null || this.state.tabs.length === 0)
    {
      return;
    }
    const selected = this.state.tabs.filter((tab) => tab.selected)[0];
    const key = selected.name;
    const cr = this.refs[key]['refs'][key]['getBoundingClientRect']();
    const parentCr = this.refs['all-tabs']['getBoundingClientRect']();
    this.setState({
      selectorLeft: cr.left - parentCr.left,
      selectorWidth: cr.width,
    });
  }

  public componentWillMount()
  {
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.tabs-container .tabs-actions .tabs-action svg',
      style: { fill: Colors().fontWhite },
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.tabs-container .tabs-actions .tabs-action',
      style: { 'border-color': Colors().fontWhite },
    });

    this.computeTabs(this.props.config, this.props);
  }

  public componentWillUnmount()
  {
    this.cancel && this.cancel();
  }

  public componentWillReceiveProps(nextProps)
  {
    if (nextProps.config !== this.props.config ||
      nextProps.library.algorithms !== this.props.library.algorithms)
    {
      this.computeTabs(nextProps.config, nextProps);
    }
  }

  public computeTabs(config, props)
  {
    const { library } = props;
    const { algorithms } = library;
    const tabs = config && algorithms && config.split(',').map((vId) =>
    {
      const id = this.getId(vId);
      const algorithm = algorithms.get(+id);
      let name = 'Loading...';
      if (algorithm)
      {
        name = algorithm.name || 'Untitled';
        if (algorithm.version)
        {
          name += ' @ ' + moment(algorithms.get(+id).lastEdited).format('ha M/D/YY');
        }
      }
      else
      {
        this.props.algorithmActions.fetchVersion(id, this.props.onNoAlgorithm);
      }
      return {
        id,
        name,
        selected: this.isSelected(vId),
      };
    });

    this.setState({
      tabs,
    }, () => { this.setSelectedPosition(); });
  }

  // shouldComponentUpdate(nextProps, nextState)
  // {
  //   return !_.isEqual(nextState.tabs, this.state.tabs);
  // }

  public moveTabs(index: number, destination: number)
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

  public renderActions()
  {
    return (
      <div className='tabs-actions'>
        {
          this.props.actions.map((action, index) =>
            tooltip(
              <a
                className={classNames({
                  'tabs-action': true,
                  'tabs-action-text': action.text !== undefined && action.text !== '',
                  'tabs-action-enabled': action.enabled || action.enabled === undefined,
                })}
                key={index}
                onClick={action.onClick}
                style={_.extend({},
                  action.text ? backgroundColor(action.enabled ? Colors().sidebarBg : Colors().blockBg) : {},
                  action.style,
                )
                }
              >
                {
                  action.icon &&
                  <div className='tabs-action-piece'>
                    {
                      action.icon
                    }
                  </div>
                }
                {
                  action.text &&
                  <div
                    className='tabs-action-piece'
                    style={_.extend({},
                      fontColor(action.enabled ? Colors().active : Colors().fontColor),
                    )}
                  >
                    {
                      action.text
                    }
                  </div>
                }
              </a>,
              {
                title: action.tooltip,
                distance: 24,
                key: index,
              },
            ),
          )
        }
      </div>
    );
  }

  public getId(idStr: string): string
  {
    if (idStr.substr(0, 1) === '!')
    {
      return idStr.substr(1);
    }
    return idStr;
  }

  public isSelected(idStr: string): boolean
  {
    return idStr.substr(0, 1) === '!';
  }

  public handleClick(id: ID)
  {
    browserHistory.push(this.getTo(id));
  }

  public handleClose(id: ID)
  {
    browserHistory.push(this.getCloseTo(id));
  }

  public getTo(id)
  {
    return '/builder/' + this.state.tabs.map(
      (tab) => (tab.id === id ? '!' : '') + tab.id,
    ).join(',');
  }

  public getCloseTo(id)
  {
    const { tabs } = this.state;
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

  public render()
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
                ref={tab.name}
              />
            ,
          }))
          : [],
      };

    return (
      <div
        className='tabs-container'
      >
        <div
          className='tabs-row-wrapper'
        >
          <div
            className='tabs-row'
          >
            <div
              className='tabs-inner-wrapper'
              ref={'all-tabs'}
            >
              <div
                className='tabs-selected-marker'
                style={{
                  width: this.state.selectorWidth,
                  left: this.state.selectorLeft,
                  backgroundColor: Colors().active,
                }}
              />
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

const TabsContainer = Util.createContainer(
  Tabs,
  ['library'],
  {
    colorsActions: ColorsActions,
    algorithmActions: LibraryActions.algorithms,
  },
);

export { TabsContainer as Tabs };

export default TabsContainer;
