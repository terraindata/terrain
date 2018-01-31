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

// tslint:disable:no-var-requires strict-boolean-expressions no-unused-expression

import './BuilderTextbox.less';

import BuilderActions from 'builder/data/BuilderActions';
import * as classNames from 'classnames';
import { List, Map } from 'immutable';
import * as _ from 'lodash';
import * as React from 'react';
import Util from 'util/Util';
import * as BlockUtils from '../../../blocks/BlockUtils';

import { tooltip } from 'common/components/tooltip/Tooltips';
import { SchemaState } from 'schema/SchemaTypes';
import { Display } from '../../../blocks/displays/Display';
import { Card, CardString, getCardTitle } from '../../../blocks/types/Card';
import { isInput, isRuntimeInput } from '../../../blocks/types/Input';
import { AllBackendsMap } from '../../../database/AllBackends';
import * as BuilderHelpers from '../../builder/BuilderHelpers';
import CardDropArea from '../../builder/components/cards/CardDropArea';

import { borderColor, cardStyle, Colors, getCardColors, getStyle } from '../../colors/Colors';
import { ColorsActions } from '../../colors/data/ColorsRedux';
import TerrainComponent from '../../common/components/TerrainComponent';
import Autocomplete from './Autocomplete';

const shallowCompare = require('react-addons-shallow-compare');
const AddCardIcon = require('./../../../images/icon_addCard_22x17.svg?name=AddCardIcon');
const TextIcon = require('./../../../images/icon_text_12x18.svg?name=TextIcon');
const CloseIcon = require('./../../../images/icon_close.svg');
const ArrowIcon = require('./../../../images/icon_arrow_8x5.svg?name=ArrowIcon');

export interface Props
{
  value: CardString | number;
  keyPath: KeyPath; // keypath of value
  onChange?: (value: string | number) => void;
  language: string;
  schema: SchemaState;
  colorsActions: typeof ColorsActions;

  id?: string; // TODO remove

  canEdit?: boolean;
  placeholder?: string;
  help?: string;
  ref?: string;
  className?: string;
  type?: string;
  rel?: string;
  textarea?: boolean;

  acceptsCards?: boolean;
  top?: boolean;
  parentId?: string;

  autoDisabled?: boolean;
  getAutoTerms?: (schemaState, builderState) => List<string>;

  isOverCurrent?: boolean;
  connectDropTarget?: (Element) => JSX.Element;

  isNumber?: boolean;
  typeErrorMessage?: string;

  options?: List<string | El>;
  showWhenCards?: boolean;
  display?: Display;

  onFocus?: (comp: React.Component<any, any>, value: string, event: React.FocusEvent<any>) => void;
  onBlur?: (comp: React.Component<any, any>, value: string, event: React.FocusEvent<any>) => void;

  textStyle?: React.CSSProperties;

  tuningMode?: boolean;

  builder?: any;
  builderActions?: typeof BuilderActions;
}

interface State
{
  // store these in state to avoid unnecessary calls to Store.getState()
  //  might be unnecessary with container components and connect/provide
  valueIsWrongType: boolean;
  valueIsInput: boolean;

  isSwitching: boolean;
  backupString: number | string | Card;
  options: List<string>;

  focused: boolean;
  boxValue: any;

  boxValueBuffer: any;
}

class BuilderTextbox extends TerrainComponent<Props>
{
  public state: State;

  constructor(props: Props)
  {
    super(props);

    this.debouncedChange = _.debounce(this.debouncedChange, 300);

    this.state = {
      // store these in state to avoid unnecessary calls to Store.getState()
      //  might be unnecessary with container components and connect/provide
      valueIsInput: this.valueIsInput(props, props.value),
      valueIsWrongType: this.valueIsWrongType(props, props.value),

      isSwitching: false,
      backupString: props.value,
      options: List([]),

      focused: false,
      boxValue: props.value,
      boxValueBuffer: null,
    };
  }

  public componentWillMount()
  {
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.builder-tb input &::placeholder',
      style: { color: Colors().text3 + '!important' },
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.builder-tb input',
      style: { color: Colors().text1 },
    });
  }

  public getCreatingType(): string
  {
    if (!this.props.language)
    {
      return undefined;
    }
    return AllBackendsMap[this.props.language].creatingType;
  }

  // TODO
  public componentWillReceiveProps(newProps)
  {
    const value: any = newProps.value;

    // If you want two-way backups, use this line
    // (value && this.props.value === '' && value['type'] === this.getCreatingType()) ||
    if (
      this.props.value !== undefined
      && this.props.value['type'] !== undefined && this.props.value['type'] === this.getCreatingType()
      && value === ''
    )
    {
      if (this.state.backupString)
      {
        // was creating, now switched back
        this.executeChange(this.state.backupString);
      }
      this.setState({
        value: this.state.backupString,
      });
      return;
    }

    if (this.refs['input'])
    {
      if (this.refs['input'] !== document.activeElement)
      {
        // if not focused, then update the value
        this.refs['input']['value'] = newProps.value;
      }
    }

    if (!this.state.focused)
    {
      this.setState({
        boxValue: value,
        boxValueBuffer: null,
      });
    }
    else
    {
      this.setState({
        boxValueBuffer: value,
      });
    }
  }

  public componentWillUnmount()
  {
    this.debouncedChange.flush();
  }

  // throttled event handler - becomes a lodash debounce object
  public debouncedChange: any = (value) =>
  {
    // if(this.props.isNumber)
    // {
    //   value = +value;
    // }

    this.props.builderActions.change(this.props.keyPath, value);
    this.props.onChange && this.props.onChange(value);
  }

  public executeChange(value)
  {
    this.setState({
      boxValue: value,
      boxValueBuffer: null,
    });
    this.debouncedChange(value);
  }

  public handleCardDrop(item)
  {
    this.props.onChange && this.props.onChange(item);
  }

  public handleTextareaChange(event)
  {
    this.executeChange(event.target.value);
  }

  public handleAutocompleteChange(value)
  {
    this.executeChange(value);
  }

  public isText()
  {
    // TODO better approach?
    return typeof this.props.value === 'string' || typeof this.props.value === 'number' || !this.props.value;
  }

  public handleSwitch()
  {
    const value = this.isText() ? BlockUtils.make(
      AllBackendsMap[this.props.language].blocks, this.getCreatingType(),
    ) : '';
    this.setState({
      backupString: typeof this.props.value === 'string' ? this.props.value : null,
    });
    this.executeChange(value);
  }

  public handleFocus(event: React.FocusEvent<any>)
  {
    this.props.onFocus && this.props.onFocus(this, event.target['value'], event);
    this.computeOptions(); // need to lazily compute autocomplete options when needed
    this.setState({
      focused: true,
    });
  }

  public handleBlur(event: React.FocusEvent<any>, value: string)
  {
    this.debouncedChange.flush();
    this.props.onBlur && this.props.onBlur(this, value, event);
    this.setState({
      focused: false,
    });
    if (this.state.boxValueBuffer !== null)
    {
      this.setState({
        boxValue: this.state.boxValueBuffer,
        boxValueBuffer: null,
      });
    }
  }

  public handleCardToolClose()
  {
    this.executeChange('');
    this.debouncedChange.flush();
    this.setState({
      value: '',
      focused: false,
    });
  }

  public renderSwitch()
  {
    if (!this.props.canEdit)
    {
      return null;
    }

    return (
      tooltip(
        <a
          className={classNames({
            'builder-tb-switch': this.isText(),
            'close-icon-builder-textbox': !this.isText(),
          })}
          onClick={this.handleSwitch}
        >
          {
            this.isText() ? <AddCardIcon /> : <CloseIcon />
          }
        </a>,
        this.isText() ? 'Convert to cards' : '',
      )
    );
  }

  public toggleClosed()
  {
    const { builder } = this.props;
    const card: Card = this.props.value as Card;
    const key = this.props.tuningMode ? 'tuningClosed' : 'closed';
    let keyPath = this.props.keyPath;
    if (this.props.tuningMode)
    {
      const keyPaths = Map(builder.query.cardKeyPaths);
      if (keyPaths.get(card.id) !== undefined)
      {
        keyPath = List(keyPaths.get(card.id));
      }
    }
    this.props.builderActions.change(keyPath.push(key), !this.props.value[key]);
  }

  public computeOptions()
  {
    const { schema, autoDisabled, builder } = this.props;

    if (autoDisabled)
    {
      return;
    }

    let options: List<string>;

    if (this.props.getAutoTerms)
    {
      options = this.props.getAutoTerms(schema, builder);
    }
    else
    {
      options = BuilderHelpers.getTermsForKeyPath(this.props.keyPath, schema, builder);
    }

    if (options && !options.equals(this.state.options))
    {
      this.setState({
        options,
      });
    }
  }

  public componentWillUpdate(nextProps: Props, nextState)
  {
    this.setState({
      valueIsInput: this.valueIsInput(nextProps, nextState.boxValue),
      valueIsWrongType: this.valueIsWrongType(nextProps, nextState.boxValue),
    });
  }

  public render()
  {
    if (this.isText())
    {
      const { isOverCurrent, connectDropTarget, placeholder } = this.props;
      const { options } = this.state;
      const { valueIsWrongType, valueIsInput } = this.state;

      const textStyle = this.props.textStyle || {};
      if (valueIsInput)
      {
        textStyle.color = getCardColors('parameter', Colors().builder.cards.inputParameter);
      }

      let value;
      if (typeof (this.state.boxValue) === 'number')
      {
        value = this.state.boxValue.toString();
      }
      else
      {
        value = this.state.boxValue as string;
      }

      return (
        <div
          className={classNames({
            'builder-tb': true,
            'builder-tb-drag-over': isOverCurrent,
            'builder-tb-accepts-cards': this.props.acceptsCards,
            'card-drop-target': this.props.acceptsCards,
            [this.props.className]: !!this.props.className,
          })}
        >
          {
            this.props.textarea ?
              <textarea
                ref='input'
                disabled={!this.props.canEdit}
                defaultValue={value || ''}
                onChange={this.handleTextareaChange}
                className={this.props.className}
                placeholder={placeholder}
              />
              :
              <Autocomplete
                ref='input'
                disabled={!this.props.canEdit}
                value={value || ''}
                options={options}
                onChange={this.handleAutocompleteChange}
                placeholder={placeholder}
                help={valueIsWrongType ? this.props.typeErrorMessage : this.props.help}
                helpIsError={valueIsWrongType}
                className={valueIsWrongType ? 'ac-wrong-type' : null}
                onFocus={this.handleFocus}
                onBlur={this.handleBlur}
                style={this.props.textStyle}
              />
          }
          {this.props.acceptsCards && this.renderSwitch()}
          {this.props.acceptsCards &&
            <CardDropArea
              keyPath={this.props.keyPath}
              index={null}
              accepts={this.props.display && this.props.display.accepts}
              renderPreview={true}
              afterDrop={this.handleCardDrop}
              language={this.props.language}
              builder={this.props.builder}
              builderActions={this.props.builderActions}
            />
          }
        </div>
      );
    }

    // We're in card mode

    if (!this.props.showWhenCards)
    {
      return null;
    }

    const card: Card = this.props.value as Card;
    // var cards = this.props.value['cards'];
    // if(cards.size)
    // {
    // var card = cards.get(0);
    const color = card.static.colors[0] as string;
    const title: string = getCardTitle(card);
    const preview = BlockUtils.getPreview(card);
    // }
    // else
    // {
    //   var color = "#aaa";
    //   var title = "Add a Card";
    // }
    const chipStyle = cardStyle(color, Colors().bg3, null, true);
    const arrowLineStyle = borderColor(color);
    const arrowHeadStyle = getStyle('borderTopColor', color);
    return (
      <div
        className={classNames({
          'builder-tb': true,
          'builder-tb-cards': true,
          'builder-tb-cards-top': this.props.top,
          'builder-tb-cards-closed': this.props.tuningMode ? card.tuningClosed : card.closed,
        })}
        ref='cards'
        onClick={this.toggleClosed}
      >
        <div className='builder-tb-cards-input'>
          <div
            className='builder-tb-cards-input-value'
            style={chipStyle}
          >
            <div
              className='builder-tb-cards-toggle'
            >
              <ArrowIcon />
            </div>
            <div className='builder-tb-cards-input-value-text'>
              {
                preview
              }
            </div>
            {
              !card['cannotBeMoved'] &&
              this.renderSwitch()
            }
          </div>
          <div className='builder-tb-cards-arrow' style={arrowLineStyle}>
            <div className='builder-tb-cards-arrow-inner' style={arrowHeadStyle} />
          </div>
        </div>
      </div>
    );
  }

  private valueIsInput(props: Props, value): boolean
  {
    const { builder } = this.props;

    if (typeof value === 'string' &&
      (isInput(value as string, builder.query.inputs) || isRuntimeInput(value as string)))
    {
      return true;
    }

    return false;
  }

  private valueIsWrongType(props: Props, value): boolean
  {
    const { isNumber } = props;

    if (!isNumber || this.valueIsInput(props, value))
    {
      return false;
    }

    return isNaN(value as number);
  }
}

// const btbTarget =
// {
//   canDrop(props, monitor)
//   {
//     console.log(props.acceptsCards && props.display
//       && props.display.accepts.indexOf(monitor.getItem().type) !== -1);
//     return props.acceptsCards && props.display
//       && props.display.accepts.indexOf(monitor.getItem().type) !== -1;
//   },
export default Util.createContainer(
  BuilderTextbox,
  ['builder', 'schema'],
  {
    colorsActions: ColorsActions,
    builderActions: BuilderActions,
  },
);
