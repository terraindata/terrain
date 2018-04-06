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

// tslint:disable:no-invalid-this no-var-requires switch-default strict-boolean-expressions restrict-plus-operands no-unused-expression

import * as classNames from 'classnames';
import createReactClass = require('create-react-class');
import { List } from 'immutable';
import * as _ from 'lodash';
import * as PropTypes from 'prop-types';
import * as React from 'react';
import './BuilderColumn.less';

import Menu from '../../common/components/Menu';
import { MenuOption } from '../../common/components/Menu';
import RolesStore from '../../roles/data/RolesStore';
import PanelMixin from './layout/PanelMixin';
const shallowCompare = require('react-addons-shallow-compare');
import Query from '../../../items/types/Query';

import { tooltip } from 'common/components/tooltip/Tooltips';
import Util from 'util/Util';
import { backgroundColor, borderColor, Colors, fontColor, getStyle } from '../../colors/Colors';
import { ColorsActions } from '../../colors/data/ColorsRedux';
import DragHandle from '../../common/components/DragHandle';
import SchemaView from '../../schema/components/SchemaView';
import BuilderTQLColumn from '../../tql/components/BuilderTQLColumn';
import BuilderActions from '../data/BuilderActions';
import CardsColumn from './cards/CardsColumn';
import TuningColumn from './cards/TuningColumn';
import InputsArea from './inputs/InputsArea';
import PathfinderColumn from './pathfinder/PathfinderColumn';
import ResultsColumn from './results/ResultsColumn';

const AddIcon = require('./../../../images/icon_add.svg?name=AddIcon');
const CloseIcon = require('./../../../images/icon_close_8x8.svg?name=CloseIcon');
const LockedIcon = require('./../../../images/icon_lock.svg?name=LockedIcon');
const ArrowIcon = require('images/icon_carrot.svg?name=ArrowIcon');

const BuilderIcon = require('./../../../images/icon_builder.svg');
const ResultsIcon = require('./../../../images/icon_resultsDropdown.svg');
const TQLIcon = require('./../../../images/icon_tql.svg');
const InputsIcon = require('./../../../images/icon_input.svg');
const ManualIcon = require('./../../../images/icon_info.svg');
const TuningIcon = require('./../../../images/icon_tuning.svg');

enum COLUMNS
{
  Pathfinder,
  Results,
  Cards,
  Editor,
  Inputs,
  Schema,
  Tuning,
}
// Manual,
const NUM_COLUMNS = 7;

const menuIcons = [
  { icon: <BuilderIcon />, color: '#76a2c1' },
  { icon: <ResultsIcon />, color: '#71bca2' },
  { icon: <BuilderIcon />, color: '#76a2c1' },
  { icon: <TQLIcon />, color: '#d47884' },
  { icon: <InputsIcon />, color: '#c2b694' },
  { icon: <ManualIcon />, color: '#a98abf' },
  { icon: <TuningIcon />, color: 'black' },
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

const BuilderColumn = createReactClass<any, any>(
  {
    mixins: [PanelMixin],

    propTypes:
      {
        query: PropTypes.object.isRequired,
        resultsState: PropTypes.object.isRequired,
        exportState: PropTypes.object.isRequired,
        algorithm: PropTypes.object.isRequired,
        className: PropTypes.string,
        index: PropTypes.number,
        canAddColumn: PropTypes.bool,
        canCloseColumn: PropTypes.bool,
        onAddColumn: PropTypes.func.isRequired,
        onAddManualColumn: PropTypes.func.isRequired,
        onCloseColumn: PropTypes.func.isRequired,
        colKey: PropTypes.number.isRequired,
        history: PropTypes.any,
        columnType: PropTypes.number,
        selectedCardName: PropTypes.string,
        switchToManualCol: PropTypes.func,
        changeSelectedCardName: PropTypes.func,
        canEdit: PropTypes.bool.isRequired,
        cantEditReason: PropTypes.string,
        onNavigationException: PropTypes.func,
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
        showColumnOptions: false,
      };
    },

    componentDidMount()
    {
      if (this.state.column === 4)
      {
        this.props.switchToManualCol(this.props.index);
      }
    },

    componentWillMount()
    {
      // TODO fix
      const rejigger = () => this.setState({ rand: Math.random() });
      this.unsubRoles = RolesStore.subscribe(rejigger);

      this.props.colorsActions({
        actionType: 'setStyle',
        selector: '.builder-column .builder-title-bar-options .bc-options-svg .cls-1',
        style: { fill: Colors().iconColor },
      });
      this.props.colorsActions({
        actionType: 'setStyle',
        selector: '.builder-column .builder-title-bar-options .menu-wrapper',
        style: { fill: Colors().iconColor },
      });
      this.props.colorsActions({
        actionType: 'setStyle',
        selector: '.builder-column .builder-title-bar .builder-title-bar-title svg .cls-1',
        style: { fill: Colors().iconColor },
      });
    },

    componentWillReceiveProps(nextProps)
    {
      if (this.props.users !== nextProps.users)
      {
        this.setState({ rand: Math.random() });
      }
    },

    componentWillUnmount()
    {
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

    shouldShowExport()
    {
      return ['DEPLOYED', 'LIVE', 'DEFAULT'].indexOf(this.props.algorithm.status) > -1;
    }

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
        case COLUMNS.Cards:
          return <CardsColumn
            cards={query.cards}
            deckOpen={query.deckOpen}
            canEdit={canEdit}
            addColumn={this.props.onAddManualColumn}
            columnIndex={this.props.index}
            cardsAndCodeInSync={query.cardsAndCodeInSync}
            language={query.language}
          />;

        case COLUMNS.Inputs:
          return <InputsArea
            inputs={query.inputs}
            canEdit={canEdit}
            language={query.language}
            action={query.path === undefined ?
              this.props.builderActions.change :
              this.props.builderActions.changePath
            }
          />;

        case COLUMNS.Results:
          return <ResultsColumn
            query={query}
            canEdit={canEdit}
            db={this.props.algorithm.db}
            algorithmName={this.props.algorithm.name}
            onNavigationException={this.props.onNavigationException}
            resultsState={this.props.resultsState}
            showExport={this.shouldShowExport()}
            showCustomizeView={true}
            allowSpotlights={true}
            exportState={this.props.exportState}
          />;

        case COLUMNS.Editor:
          return <BuilderTQLColumn
            canEdit={canEdit}
            addColumn={this.props.onAddManualColumn}
            columnIndex={this.props.index}
            query={query}
            algorithm={this.props.algorithm}
            resultsState={this.props.resultsState}
            language={query.language}
          />;

        case COLUMNS.Schema:
          return <SchemaView
            fullPage={false}
            showSearch={true}
            showResults={false}
          />;
        case COLUMNS.Tuning:
          return <TuningColumn
            canEdit={canEdit}
            addColumn={this.props.onAddManualColumn}
            columnIndex={this.props.index}
            cardsAndCodeInSync={query.cardsAndCodeInSync}
            language={query.language}
          />;

        case COLUMNS.Pathfinder:
          return <PathfinderColumn
            canEdit={canEdit}
            path={query.path}
            schema={this.props.schema}
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
        showColumnOptions: false,
      });

      const colKeyTypes = JSON.parse(localStorage.getItem('colKeyTypes') || '{}');
      colKeyTypes[this.props.colKey] = index;
      localStorage.setItem('colKeyTypes', JSON.stringify(colKeyTypes));
    },

    getMenuOptions(): List<MenuOption> // TODO
    {
      const options: List<MenuOption> = List(_.range(0, NUM_COLUMNS).map((index) => ({
        text: COLUMNS[index],
        onClick: this.switchView,
        selected: index === this.state.column,
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

    toggleColumnOptions()
    {
      this.setState({
        showColumnOptions: !this.state.showColumnOptions,
      });
    },

    render()
    {
      const { query, canEdit, cantEditReason } = this.props;

      return this.renderPanel((
        <div
          className={'builder-column builder-column-' + this.props.index}
        >
          <div
            className='builder-title-bar'
            style={borderColor(Colors().fontColorLightest)}
          >
            {
              //  <div ref='handle' className='builder-title-bar-drag-handle'>
              //               <DragHandle
              //                 key={'builder-column-handle-' + this.props.index}
              //                 showWhenHoveringClassName='builder-title-bar'
              //               />
              //             </div>
            }
            <div
              className={
                classNames({
                  'builder-title-bar-title': true,
                  'builder-title-bar-title-locked': !canEdit,
                })}
              style={fontColor(Colors().text2)}
            >
              <span>
                <span
                  onClick={this.toggleColumnOptions}
                  ref='handle'
                >
                  {
                    COLUMNS[this.state.column]
                  }
                  <ArrowIcon
                    className='builder-title-bar-arrow'
                  />
                  {
                    this.state.showColumnOptions ?
                      <Menu
                        options={this.getMenuOptions()}
                        title={''}
                        expanded={true}
                        openRight={true}
                      />
                      :
                      null
                  }
                </span>
              </span>
              {
                !canEdit &&
                tooltip(<LockedIcon style={getStyle('fill', Colors().fontWhite)} />,
                  cantEditReason)
              }
            </div>
            <div className='builder-title-bar-options'>
              {
                this.props.canAddColumn &&
                tooltip(
                  <AddIcon
                    onClick={this.handleAddColumn}
                    className='bc-options-svg builder-split-screen'
                    style={getStyle('fill', Colors().iconColor)}
                  />,
                  'Add Column',
                )
              }
              {
                this.props.canCloseColumn &&
                tooltip(
                  <CloseIcon
                    onClick={this.handleCloseColumn}
                    className='bc-options-svg close-builder-title-bar'
                    style={getStyle('fill', Colors().iconColor)}
                  />,
                  'Close Column',
                )
              }
            </div>
          </div>
          {
            this.props.index === 0 ? null : (
              <div
                className='builder-resize-handle'
                ref='resize-handle'
              >
                <div
                  className='builder-resize-handle-line'
                  style={borderColor('rgba(0,0, 0, 0.15)')}
                ></div>
                <div
                  className='builder-resize-handle-line'
                  style={borderColor('rgba(0,0, 0, 0.15)')}
                ></div>
              </div>
            )
          }
          <div
            className={classNames({
              'builder-column-content': true,
              // 'builder-column-manual': this.state.column === COLUMNS.Manual,
              'builder-column-content-scroll':
                this.state.column === COLUMNS.Cards ||
                this.state.column === COLUMNS.Inputs,
            })}
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

export default Util.createTypedContainer(
  BuilderColumn,
  ['auth'],
  {
    colorsActions: ColorsActions,
    builderActions: BuilderActions,
  },
);
