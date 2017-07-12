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

// tslint:disable:no-invalid-this

import * as classNames from 'classnames';
import * as Immutable from 'immutable';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as _ from 'underscore';
import './BuilderColumn.less';
const { List } = Immutable;
import InfoArea from '../../common/components/InfoArea';
import Menu from '../../common/components/Menu';
import { MenuOption } from '../../common/components/Menu';
import RolesStore from '../../roles/data/RolesStore';
import UserStore from '../../users/data/UserStore';
import Util from '../../util/Util';
import PanelMixin from './layout/PanelMixin';
const shallowCompare = require('react-addons-shallow-compare');
import Query from '../../../../shared/items/types/Query';
import Ajax from './../../util/Ajax';

import { backgroundColor, Colors, fontColor } from '../../common/Colors';
import SchemaView from '../../schema/components/SchemaView';
import BuilderTQLColumn from '../../tql/components/BuilderTQLColumn';
import Manual from './../../manual/components/Manual';
import CardsColumn from './cards/CardsColumn';
import InputsArea from './inputs/InputsArea';
import ResultsArea from './results/ResultsArea';

const SplitScreenIcon = require('./../../../images/icon_splitScreen_13x16.svg?name=SplitScreenIcon');
const CloseIcon = require('./../../../images/icon_close_8x8.svg?name=CloseIcon');
const LockedIcon = require('./../../../images/icon_lock.svg?name=LockedIcon');

const BuilderIcon = require('./../../../images/icon_builder.svg');
const ResultsIcon = require('./../../../images/icon_resultsDropdown.svg');
const TQLIcon = require('./../../../images/icon_tql.svg');
const InputsIcon = require('./../../../images/icon_input.svg');
const ManualIcon = require('./../../../images/icon_info.svg');

enum COLUMNS
{
  Builder,
  Results,
  Editor,
  Inputs,
  Schema,
}
// Manual,
const NUM_COLUMNS = 5;

const menuIcons = [
  { icon: <BuilderIcon />, color: '#76a2c1' },
  { icon: <ResultsIcon />, color: '#71bca2' },
  { icon: <TQLIcon />, color: '#d47884' },
  { icon: <InputsIcon />, color: '#c2b694' },
  { icon: <ManualIcon />, color: '#a98abf' },
]; // TODO add schema icon above

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

const BuilderColumn = React.createClass<any, any>(
  {
    mixins: [PanelMixin],

    propTypes:
    {
      query: React.PropTypes.object.isRequired,
      resultsState: React.PropTypes.object.isRequired,
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
      const colKeyTypes = JSON.parse(localStorage.getItem('colKeyTypes') || '{}');
      let column = colKeyTypes[this.props.colKey];
      if (column === undefined)
      {
        column = this.props.index;
        colKeyTypes[this.props.colKey] = this.props.index;
        localStorage.setItem('colKeyTypes', JSON.stringify(colKeyTypes));
      }

      return {
        column: this.props.columnType ? this.props.columnType : column,
      };
    },

    componentDidMount()
    {
      if (this.state.column === 4)
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
      const rejigger = () => this.setState({ rand: Math.random() });
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

    renderContent()
    {
      if (!this.props.query)
      {
        return (
          <div
            className='builder-column-loading'
          >
            Loading...
        </div>
        );
      }

      const query: Query = this.props.query;
      const { canEdit } = this.props;
      switch (this.state.column)
      {
        case COLUMNS.Builder:
          return <CardsColumn
            cards={query.cards}
            deckOpen={query.deckOpen}
            canEdit={canEdit}
            addColumn={this.props.onAddManualColumn}
            columnIndex={this.props.index}
            cardsAndCodeInSync={query.cardsAndCodeInSync}
            parseError={query.parseError}
            language={query.language}
          />;

        case COLUMNS.Inputs:
          return <InputsArea
            inputs={query.inputs}
            canEdit={canEdit}
            language={query.language}
          />;

        case COLUMNS.Results:
          return <ResultsArea
            query={query}
            canEdit={canEdit}
            db={this.props.variant.db}
            variantName={this.props.variant.name}
            onNavigationException={this.props.onNavigationException}
            resultsState={this.props.resultsState}
          />;

        case COLUMNS.Editor:
          return <BuilderTQLColumn
            canEdit={canEdit}
            addColumn={this.props.onAddManualColumn}
            columnIndex={this.props.index}
            query={query}
            variant={this.props.variant}
            resultsState={this.props.resultsState}
            language={query.language}
          />;

        case COLUMNS.Schema:
          return <SchemaView
            fullPage={false}
            showSearch={true}
          />;
        // case COLUMNS.Manual:
        //   return <Manual
        //     selectedKey={this.props.selectedCardName}
        //     changeCardName={this.props.changeSelectedCardName}
        //   />;
      }
      return <div>No column content.</div>;
    },

    switchView(index)
    {
      if (index === 4)
      {
        this.props.switchToManualCol(this.props.index);
      }
      else if (this.state.column === 4)
      {
        this.props.switchToManualCol(-1);
      }

      this.setState({
        column: index,
      });

      const colKeyTypes = JSON.parse(localStorage.getItem('colKeyTypes') || '{}');
      colKeyTypes[this.props.colKey] = index;
      localStorage.setItem('colKeyTypes', JSON.stringify(colKeyTypes));
    },

    getMenuOptions(): List<MenuOption> // TODO
    {
      const options: List<MenuOption> = Immutable.List(_.range(0, NUM_COLUMNS).map((index) => ({
        text: COLUMNS[index],
        onClick: this.switchView,
        disabled: index === this.state.column,
        icon: menuIcons[index].icon,
        iconColor: menuIcons[index].color,
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

      const colKeyTypes = JSON.parse(localStorage.getItem('colKeyTypes') || '{}');
      delete colKeyTypes[this.props.colKey];
      localStorage.setItem('colKeyTypes', JSON.stringify(colKeyTypes));
    },

    render()
    {
      const { query, canEdit, cantEditReason } = this.props;

      return this.renderPanel((
        <div
          className={'builder-column builder-column-' + this.props.index}
          style={backgroundColor(Colors().base)}
        >
          <div
            className='builder-title-bar'
            style={backgroundColor(Colors().builder.builderColumn.background)}
          >
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
            </div>
            <div className='builder-title-bar-options'>
              {
                this.props.canCloseColumn &&
                <CloseIcon
                  onClick={this.handleCloseColumn}
                  className='close close-builder-title-bar'
                  data-tip='Close Column'
                />
              }
              {
                this.props.canAddColumn &&
                <SplitScreenIcon
                  onClick={this.handleAddColumn}
                  className='bc-options-svg builder-split-screen'
                  data-tip='Add Column'
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
              // 'builder-column-manual': this.state.column === COLUMNS.Manual,
              'builder-column-content-scroll':
              this.state.column === COLUMNS.Builder ||
              this.state.column === COLUMNS.Inputs,
            })}
            style={backgroundColor(Colors().builder.builderColumn.background)}
          >
            {
              this.renderContent(canEdit)
            }
          </div>
        </div>
      ));
    },
  },
);

export default BuilderColumn;
