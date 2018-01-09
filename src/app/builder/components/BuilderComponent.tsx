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

// tslint:disable:strict-boolean-expressions restrict-plus-operands prefer-const no-var-requires

import './BuilderComponent.less';

import FadeInOut from 'common/components/FadeInOut';
import * as React from 'react';
import { Display, DisplayType } from '../../../blocks/displays/Display';
import BuilderTextbox from '../../common/components/BuilderTextbox';
import BuilderTextboxCards from '../../common/components/BuilderTextboxCards';
import Dropdown from '../../common/components/Dropdown';
import TerrainComponent from '../../common/components/TerrainComponent';
import ManualInfo from '../../manual/components/ManualInfo';
import BuilderActions from '../data/BuilderActions';
import { BuilderState, BuilderStore } from '../data/BuilderStore';
import CardField from './cards/CardField';
import CardsArea from './cards/CardsArea';

const ArrowIcon = require('./../../../images/icon_arrow_8x5.svg?name=ArrowIcon');

export interface Props
{
  keyPath: KeyPath;
  data: any; // record
  display?: Display | Display[];
  language: string;
  canEdit: boolean;

  parentData?: any;

  helpOn?: boolean;

  addColumn?: (number, string?) => void;
  columnIndex?: number;

  textStyle?: React.CSSProperties;

  handleCardDrop?: (type: string) => any;

  tuningMode?: boolean;
  // provide parentData if necessary but avoid if possible
  // as it will cause re-renders
}

class BuilderComponent extends TerrainComponent<Props>
{
  public state:
    {
      showExpanded: boolean,
    } = {
      showExpanded: false,
    };

  public addRow(keyPath: KeyPath, index: number, display: Display)
  {
    BuilderActions.create(keyPath, index + 1, display.factoryType);
  }

  public removeRow(keyPath: KeyPath, index: number)
  {
    BuilderActions.remove(keyPath, index);
  }

  public moveRow(keyPath: KeyPath, index: number, newIndex: number)
  {
    BuilderActions.move(keyPath, index, newIndex);
  }

  public renderDisplay(displayArg: Display | Display[],
    parentKeyPath: KeyPath,
    data: IMMap<any, any>,
    options?: {
      className: string;
    }): (El | El[])
  {
    const keySeed = parentKeyPath.join(',');
    if (Array.isArray(displayArg))
    {
      return displayArg.map((di) =>
        <BuilderComponent
          display={di}
          keyPath={parentKeyPath}
          data={data}
          canEdit={this.props.canEdit}
          parentData={this.props.parentData}
          helpOn={this.props.helpOn}
          addColumn={this.props.addColumn}
          columnIndex={this.props.columnIndex}
          language={this.props.language}
          textStyle={this.props.textStyle}
          tuningMode={this.props.tuningMode}
        />,
      ) as El[];
      // return displayArg.map(di => this.renderDisplay(di, parentKeyPath, data)) as El[];
    }

    const d = displayArg as Display;
    let className = '';
    if (d.className)
    {
      if (typeof d.className === 'function')
      {
        className = (d.className as (d: any) => string)(data);
      }
      else
      {
        className = d.className as string;
      }
    }

    if (options && options.className)
    {
      className += ' ' + options.className;
    }

    if (d.displayType === DisplayType.LABEL)
    {
      // special type that is unrelated to the data
      return <div
        className='builder-label'
        key={keySeed + '-label-' + d.label}
        style={d.style}
      >
        {d.label}
      </div>
        ;
    }

    const keyPath = d.key !== null ? this._ikeyPath(parentKeyPath, d.key) : parentKeyPath;
    const value = data.get(d.key);
    let isNumber = false;
    let typeErrorMessage = null;
    let isTextbox = false;
    let acceptsCards = false;
    const key = data.get('id') + ',' + d.key;

    let content;
    switch (d.displayType)
    {
      case DisplayType.NUM:
        isNumber = true;
        typeErrorMessage = 'Must be a number';
        isTextbox = true;
        break;
      case DisplayType.TEXT:
        isTextbox = true;
        break;
      case DisplayType.CARDS:
        const st = data.get('static');
        content = <CardsArea
          canEdit={this.props.canEdit}
          key={key}
          cards={value}
          keyPath={keyPath}
          className={className}
          helpOn={this.props.helpOn}
          addColumn={this.props.addColumn}
          columnIndex={this.props.columnIndex}
          accepts={st && st.accepts}
          card={data}
          singleChild={d.singleChild}
          language={this.props.language}
          hideCreateCardTool={d.hideCreateCardTool}
          handleCardDrop={d.handleCardDrop ? d.handleCardDrop : this.props.handleCardDrop}
          tuningMode={this.props.tuningMode}
        />;
        break;
      case DisplayType.CARDTEXT:
        isTextbox = true;
        acceptsCards = true;
        break;
      case DisplayType.CARDSFORTEXT:
        content = <BuilderTextboxCards
          value={value}
          canEdit={this.props.canEdit}
          keyPath={keyPath}
          key={key + 'cards'}
          className={className}
          helpOn={this.props.helpOn}
          addColumn={this.props.addColumn}
          columnIndex={this.props.columnIndex}
          display={d}
          language={this.props.language}
          tuningMode={this.props.tuningMode}
        />;
        break;
      case DisplayType.DROPDOWN:
        let selectedIndex = d.options.indexOf(typeof value === 'string' ? value : JSON.stringify(value));
        content = (
          <div key={key} className='builder-component-wrapper  builder-component-wrapper-wide'>
            <Dropdown
              canEdit={this.props.canEdit}
              className={className}
              keyPath={keyPath}
              options={d.options}
              selectedIndex={selectedIndex}
              centerAlign={d.centerDropdown}
              optionsDisplayName={d.optionsDisplayName}
              values={d.dropdownUsesRawValues ? d.options : undefined}
              textColor={this.props.textStyle && this.props.textStyle.color}
              tooltips={d.dropdownTooltips}
              icons={d.icons}
              width={d.width}
            />
            {this.props.helpOn && d.help ?
              <ManualInfo
                information={d.help as string}
                className='builder-component-help-right'
              />
              : null
            }
          </div>
        );
        break;
      case DisplayType.EXPANDABLE:
        content = (
          <div key={key}>
            <div
              className={this.state.showExpanded ? 'bc-expandable-expanded' : 'bc-expandable-collapsed'}
              onClick={this._toggle('showExpanded')}
            >
              <ArrowIcon className='bc-minimize-icon' />
              <BuilderComponent
                display={d.expandToggle}
                keyPath={this.props.keyPath}
                data={data}
                canEdit={this.props.canEdit}
                parentData={this.props.parentData}
                language={this.props.language}
                textStyle={this.props.textStyle}
                tuningMode={this.props.tuningMode}
              />
            </div>
            <FadeInOut
              open={this.state.showExpanded}
            >
              <BuilderComponent
                display={d.expandContent}
                keyPath={this.props.keyPath}
                data={data}
                canEdit={this.props.canEdit}
                parentData={this.props.parentData}
                language={this.props.language}
                textStyle={this.props.textStyle}
                tuningMode={this.props.tuningMode}
              />
            </FadeInOut>
          </div>
        );
        break;
      case DisplayType.FLEX:
        content = (
          <div
            key={key}
          >
            {!d.above ? null :
              <BuilderComponent
                display={d.above}
                keyPath={this.props.keyPath}
                data={data}
                canEdit={this.props.canEdit}
                parentData={this.props.parentData}
                language={this.props.language}
                textStyle={this.props.textStyle}
                tuningMode={this.props.tuningMode}
              />
            }
            <div
              className='card-flex'
            >
              <BuilderComponent
                display={d.flex}
                keyPath={this.props.keyPath}
                data={data}
                canEdit={this.props.canEdit}
                parentData={this.props.parentData}
                helpOn={this.props.helpOn}
                addColumn={this.props.addColumn}
                columnIndex={this.props.columnIndex}
                language={this.props.language}
                textStyle={this.props.textStyle}
                tuningMode={this.props.tuningMode}
              />
            </div>
            {!d.below ? null :
              <div
                className='card-flex-below'
              >
                <BuilderComponent
                  display={d.below}
                  keyPath={this.props.keyPath}
                  data={data}
                  canEdit={this.props.canEdit}
                  parentData={this.props.parentData}
                  helpOn={this.props.helpOn}
                  addColumn={this.props.addColumn}
                  columnIndex={this.props.columnIndex}
                  language={this.props.language}
                  textStyle={this.props.textStyle}
                  tuningMode={this.props.tuningMode}
                />
              </div>
            }
          </div>
        );
        break;
      case DisplayType.ROWS:
        content = (
          <div
            key={key}
            className={'card-fields ' + className}
          >
            {
              value.map((v, i) => (
                <CardField
                  index={i}
                  onAdd={this._fn(this.addRow, keyPath, i, d)}
                  onRemove={this._fn(this.removeRow, keyPath, i)}
                  onMove={this._fn(this.moveRow, keyPath)}
                  key={key + ',' + v.get('id')}
                  isSingle={value.size === 1}
                  language={this.props.language}

                  row={d.row}
                  keyPath={this._ikeyPath(keyPath, i)}
                  data={v}
                  canEdit={this.props.canEdit}
                  parentData={d.provideParentData && data}
                  helpOn={this.props.helpOn}
                  addColumn={this.props.addColumn}
                  columnIndex={this.props.columnIndex}
                  isFirstRow={i === 0}
                  isOnlyRow={value.size === 1}
                  handleCardDrop={d.handleCardDrop}
                  tuningMode={this.props.tuningMode}
                />
              ))
            }
          </div>
        );
        break;
      case DisplayType.MAP:
        const MapComp = d.component as any;
        content = (
          <div
            key={key}
            className={'builder-component-wrapper builder-component-wrapper-wide'}
          >
            {
              React.cloneElement(
                <MapComp />,
                {
                  keyPath,
                  data,
                  parentKeyPath,
                  canEdit: this.props.canEdit,
                  helpOn: this.props.helpOn,
                },
              )
            }
          </div>
        );
        break;
      case DisplayType.COMPONENT:
        const Comp = d.component as any;
        content = (
          <div
            key={key}
            className='builder-component-wrapper builder-component-wrapper-wide'
          >
            {
              React.cloneElement(
                <Comp />,
                {
                  keyPath,
                  data,
                  parentData: this.props.parentData,
                  canEdit: this.props.canEdit,
                  helpOn: this.props.helpOn,
                  className,
                  onChange: BuilderActions.change,
                  builderState: d.requiresBuilderState && BuilderStore.getState(),
                  language: this.props.language,
                  handleCardDrop: this.props.handleCardDrop,
                },
              )
            }
            {this.props.helpOn && d.help ?
              (
                <ManualInfo
                  information={d.help as string}
                  className='builder-component-help-right'
                />
              )
              : null
            }
          </div>
        );
        break;
      default:
        content = (
          <div key={key}>
            Data type {d.displayType} not implemented.
          </div>
        );
    }

    if (isTextbox)
    {
      const Comp = d.component || BuilderTextbox;
      content = (
        <div
          key={key}
          className='builder-component-wrapper builder-component-wrapper-wide'
        >
          <Comp
            canEdit={this.props.canEdit}
            top={d.top}
            placeholder={d.placeholder || d.key}
            showWhenCards={d.showWhenCards}
            onFocus={d.onFocus}
            onBlur={d.onBlur}
            options={d.options}
            display={d}
            autoDisabled={d.autoDisabled}
            getAutoTerms={d.getAutoTerms}
            language={this.props.language}
            tuningMode={this.props.tuningMode}
            {...{
              keyPath,
              value,
              acceptsCards,
              isNumber,
              typeErrorMessage,
              className,
            }}
            textStyle={this.props.textStyle}
          />
          {
            this.props.helpOn && d.help ?
              <ManualInfo
                information={d.help as string}
                className='builder-component-help-right'
              />
              : null
          }
        </div>
      );
    }

    if (d.style)
    {
      content = (
        <div
          style={d.style}
          key={key}
        >
          {
            content
          }
        </div>
      );
    }

    return content;
  }

  public render()
  {
    let { data, display } = this.props;
    if (!display)
    {
      if (!data.static || !data.static.display)
      {
        throw new Error('Insufficient props supplied to BuilderComponent');
      }

      display = data.static.display;
    }

    if (Array.isArray(display))
    {
      return (
        <div
          className='builder-comp-list'
        >
          {
            display.map((d, i) => this.renderDisplay(
              d,
              this.props.keyPath,
              this.props.data,
              {
                className: 'builder-comp-list-item',
              },
            ),
            )
          }
        </div>
      );
    }
    else
    {
      return this.renderDisplay(
        display,
        this.props.keyPath,
        this.props.data,
      ) as El;
    }
  }
}

export default BuilderComponent;
