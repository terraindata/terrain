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
require('./BuilderColumn.less');
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as Immutable from 'immutable';
import * as classNames from 'classnames';
const {List} = Immutable;
import Util from '../../util/Util';
import Menu from '../../common/components/Menu';
import { MenuOption } from '../../common/components/Menu';
import PanelMixin from './layout/PanelMixin';
import InputsArea from "./inputs/InputsArea";
import CardsColumn from "./cards/CardsColumn";
import ResultsArea from "./results/ResultsArea";
import UserStore from '../../users/data/UserStore';
import RolesStore from '../../roles/data/RolesStore';
import LibraryTypes from '../../library/LibraryTypes';
import BuilderTQLColumn from '../../tql/components/BuilderTQLColumn';
import InfoArea from '../../common/components/InfoArea';
const shallowCompare = require('react-addons-shallow-compare');
import * as moment from 'moment';
import Ajax from "./../../util/Ajax";
import Manual from './../../manual/components/Manual';
import BuilderTypes from '../BuilderTypes';
type Query = BuilderTypes.Query;

var SplitScreenIcon = require("./../../../images/icon_splitScreen_13x16.svg?name=SplitScreenIcon");
var CloseIcon = require("./../../../images/icon_close_8x8.svg?name=CloseIcon");
var LockedIcon = require("./../../../images/icon_lock.svg?name=LockedIcon");

var BuilderIcon = require("./../../../images/icon_builder.svg");
var ResultsIcon = require("./../../../images/icon_resultsDropdown.svg");
var TQLIcon = require("./../../../images/icon_tql.svg");
var InputsIcon = require("./../../../images/icon_input.svg");
var ManualIcon = require('./../../../images/icon_info.svg');

enum COLUMNS {
  Builder,
  Results,
  TQL,
  Inputs,
  Manual,
};
var NUM_COLUMNS = 5;

var menuIcons = [
    {icon: <BuilderIcon />, color: '#76a2c1'},
    {icon: <ResultsIcon />, color: '#71bca2'},
    {icon: <TQLIcon />, color: '#d47884'},
    {icon: <InputsIcon />, color: '#c2b694'},
    {icon: <ManualIcon />, color: "#a98abf"}
];

// interface Props
// {
//   title: string;
//   children?: any;
//   className?: string;
  
//   // Options not yet supported
//   menuOptions?: {
//     text: string;
//     onClick: () => void;
//   }[];
// }

var BuilderColumn = React.createClass<any, any>(
{
  mixins: [PanelMixin],
  
  propTypes:
  {
    query: React.PropTypes.object.isRequired,
    variant: React.PropTypes.object.isRequired,
    className: React.PropTypes.string,
    index: React.PropTypes.number,
    canAddColumn: React.PropTypes.bool,
    canCloseColumn: React.PropTypes.bool,
    onAddColumn: React.PropTypes.func.isRequired,
    onAddManualColumn: React.PropTypes.func.isRequired,
    onCloseColumn: React.PropTypes.func.isRequired,
    colKey: React.PropTypes.number.isRequired,
    history: React.PropTypes.any,
    columnType: React.PropTypes.number,
    selectedCardName: React.PropTypes.string,
    switchToManualCol: React.PropTypes.func,
    changeSelectedCardName: React.PropTypes.func,
    canEdit: React.PropTypes.bool.isRequired,
    cantEditReason: React.PropTypes.string,
    onNavigationException: React.PropTypes.func,
  },
  
  getInitialState()
  {
    let colKeyTypes = JSON.parse(localStorage.getItem('colKeyTypes') || '{}');
    var column = colKeyTypes[this.props.colKey];
    if(column === undefined)
    {
      column = this.props.index;
      colKeyTypes[this.props.colKey] = this.props.index;
      localStorage.setItem('colKeyTypes', JSON.stringify(colKeyTypes));
    }

    return {
      column: this.props.columnType ? this.props.columnType : column,
      loading: false,
      // rand: 1,
    }
  },

  componentDidMount()
  {
    if(this.state.column === 4)
    {
      this.props.switchToManualCol(this.props.index);
    }
  },
  
  shouldComponentUpdate(nextProps, nextState)
  {
    return shallowCompare(this, nextProps, nextState);
  },
  
  componentWillMount()
  {
    // TODO fix
    let rejigger = () => this.setState({ rand: Math.random() });
    this.unsubUser = UserStore.subscribe(rejigger);
    this.unsubRoles = RolesStore.subscribe(rejigger);
  },
  
  componentWillUnmount()
  {
    this.unsubUser && this.unsubUser();  
    this.unsubRoles && this.unsubRoles();  
  },
  
  getDefaultProps()
  {
    return {
      drag_x: true,
      dragInsideOnly: true,
      reorderOnDrag: true,
      handleRef: 'handle',
    };
  },
  
  handleLoadStart()
  {
    this.setState({
      loading: true,
    })
  },
  
  handleLoadEnd()
  {
    this.setState({
      loading: false,
    });
  },
  
  renderContent()
  {
    if(!this.props.query)
    {
      return (
        <div
          className='builder-column-loading'
        >
          Loading...
        </div>
      );
    }
    
    let query: BuilderTypes.Query = this.props.query;
    const {canEdit} = this.props;
    switch(this.state.column)
    {
      case COLUMNS.Builder:
        return <CardsColumn 
          cards={query.cards} 
          deckOpen={query.deckOpen}
          canEdit={canEdit}
          addColumn={this.props.onAddManualColumn}
          columnIndex={this.props.index}
          tqlCardsInSync={query.tqlCardsInSync}
          parseTreeError={query.parseTreeError}
        />;
        
      case COLUMNS.Inputs:
        return <InputsArea
          inputs={query.inputs}
          canEdit={canEdit}
        />;
      
      case COLUMNS.Results:
        return <ResultsArea 
          query={query}
          onLoadStart={this.handleLoadStart}
          onLoadEnd={this.handleLoadEnd}
          canEdit={canEdit}
          db={this.props.variant.db}
          variantName={this.props.variant.name}
          onNavigationException={this.props.onNavigationException}
        />;

      case COLUMNS.TQL:
        return <BuilderTQLColumn
          canEdit={canEdit}
          onLoadStart={this.handleLoadStart}
          onLoadEnd={this.handleLoadEnd}
          addColumn={this.props.onAddManualColumn}
          columnIndex={this.props.index}
          query={query}
          variant={this.props.variant}
        />;
        
      case COLUMNS.Manual:
        return <Manual 
          selectedKey={this.props.selectedCardName}
          changeCardName={this.props.changeSelectedCardName}
        />;
    }
    return <div>No column content.</div>;
  },
  
  switchView(index)
  {
    if(index === 4)
    {
      this.props.switchToManualCol(this.props.index);
    }
    else if(this.state.column === 4)
    {
      this.props.switchToManualCol(-1);
    }
    
    this.setState({
      column: index,
    });
    
    var colKeyTypes = JSON.parse(localStorage.getItem('colKeyTypes') || '{}');
    colKeyTypes[this.props.colKey] = index;
    localStorage.setItem('colKeyTypes', JSON.stringify(colKeyTypes));
  },
  
  getMenuOptions(): List<MenuOption> //TODO
  {
    var options: List<MenuOption> = Immutable.List(_.range(0, NUM_COLUMNS).map(index => ({
      text: COLUMNS[index],
      onClick: this.switchView,
      disabled: index === this.state.column,
      icon: menuIcons[index].icon,
      iconColor: menuIcons[index].color
    })));
    
    return options;
  },
  
  handleAddColumn()
  {
    this.props.onAddColumn(this.props.index);
  },
  
  handleCloseColumn()
  {
    this.props.onCloseColumn(this.props.index);
    
    var colKeyTypes = JSON.parse(localStorage.getItem('colKeyTypes') || '{}');
    delete colKeyTypes[this.props.colKey];
    localStorage.setItem('colKeyTypes', JSON.stringify(colKeyTypes));
  },
  
  render() 
  {
    let {query, canEdit, cantEditReason} = this.props;
    
    return this.renderPanel((
      <div className={'builder-column builder-column-' + this.props.index}>
        <div className='builder-title-bar'>
          { 
            this.props.index === 0 ? null : (
              <div className='builder-resize-handle' ref='resize-handle'>
                <div className='builder-resize-handle-line'></div>
                <div className='builder-resize-handle-line'></div>
              </div>
            )
          }
          <div className='builder-title-bar-title'>
            <span ref='handle'>
              { 
                COLUMNS[this.state.column]
              }
              {
                !canEdit &&
                  <LockedIcon 
                    data-tip={cantEditReason}
                  />
              }
            </span>
            {
              this.state.loading &&
              (this.state.column === COLUMNS.Results || this.state.column === COLUMNS.TQL) &&
                <div 
                  className='builder-column-loading'
                >
                  Loading...
                </div>
            }
          </div>
          <div className='builder-title-bar-options'>
            {
              this.props.canCloseColumn && 
                <CloseIcon
                  onClick={this.handleCloseColumn}
                  className='close close-builder-title-bar'
                  data-tip="Close Column"
                />
            }
            {
              this.props.canAddColumn && 
                <SplitScreenIcon
                  onClick={this.handleAddColumn}
                  className='bc-options-svg builder-split-screen'
                  data-tip="Add Column"
                />
            }
            <Menu 
              options={this.getMenuOptions()}
            />
          </div>
        </div>
        <div
          className={classNames({
            'builder-column-content': true,
            'builder-column-manual': this.state.column === COLUMNS.Manual,
            'builder-column-content-scroll': 
              this.state.column === COLUMNS.Builder ||
                this.state.column === COLUMNS.Inputs,
          })
        }>
          { 
            this.renderContent(canEdit)
          }
        </div>
      </div>
    ));
  }
}
);

export default BuilderColumn;
