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
require('./BuilderTextbox.less');

import * as classNames from 'classnames';
import * as Immutable from 'immutable';
import * as React from 'react';
import { DragSource, DropTarget } from 'react-dnd';
import * as ReactDOM from 'react-dom';
import * as _ from 'underscore';
import { AllBackendsMap } from '../../../../shared/backends/AllBackends';
import BlockUtils from '../../../../shared/blocks/BlockUtils';
import { Display } from '../../../../shared/blocks/displays/Display';
import { Block } from '../../../../shared/blocks/types/Block';
import { Card, CardString } from '../../../../shared/blocks/types/Card';
import BuilderHelpers from '../../builder/BuilderHelpers';
import CardComponent from '../../builder/components/cards/CardComponent';
import CardDropArea from '../../builder/components/cards/CardDropArea';
import CreateCardTool from '../../builder/components/cards/CreateCardTool';
import Actions from '../../builder/data/BuilderActions';
import PureClasss from '../../common/components/PureClasss';
import ManualInfo from '../../manual/components/ManualInfo';
import Util from '../../util/Util';
import Autocomplete from './Autocomplete';

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
  autoTerms?: List<string>;

  isOverCurrent?: boolean;
  connectDropTarget?: (Element) => JSX.Element;

  isNumber?: boolean;
  typeErrorMessage?: string;

  showWhenCards?: boolean;
  display?: Display;

  onFocus?: (comp: React.Component<any, any>, value: string, event: React.FocusEvent<any>) => void;
  onBlur?: (comp: React.Component<any, any>, value: string, event: React.FocusEvent<any>) => void;
}

class BuilderTextbox extends PureClasss<Props>
{
  public state: {
    wrongType: boolean;
    isSwitching: boolean;
    value: CardString;
    backupString: CardString;
    options: List<string>;
  };

  constructor(props: Props)
  {
    super(props);

    // TODO?
    // this.executeChange = _.debounce(this.executeChange, 750);

    const value: any = this.props.value;
    this.state = {
      wrongType: this.props.isNumber ? isNaN(value) : false,
      isSwitching: false,
      value,
      backupString: value,
      options: Immutable.List([]),
    };
  }

  public getCreatingType(): string
  {
    return AllBackendsMap[this.props.language].creatingType;
  }

  // TODO
  public componentWillReceiveProps(newProps)
  {
    const value: any = newProps.value;

    // If you want two-way backups, use this line
    // (value && this.props.value === '' && value['type'] === this.getCreatingType()) ||
    if (
      (this.props.value && this.props.value['type'] === this.getCreatingType() && value === '')
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

    this.setState({
      wrongType: newProps.isNumber ? isNaN(value) : false,
    });
    if (this.refs['input'])
    {
      if (this.refs['input'] !== document.activeElement)
      {
        // if not focused, then update the value
        this.refs['input']['value'] = newProps.value;
      }
    }
  }

  // throttled event handler
  public executeChange(value)
  {
    // if(this.props.isNumber)
    // {
    //   value = +value;
    // }

    Actions.change(this.props.keyPath, value);
    this.props.onChange && this.props.onChange(value);
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
    if (this.props.isNumber)
    {
      this.setState({
        wrongType: isNaN(value),
      });
    }
  }

  public isText()
  {
    // TODO better approach?
    return typeof this.props.value === 'string' || typeof this.props.value === 'number' || !this.props.value;
  }

  public handleSwitch()
  {
    const value = this.isText() ? BlockUtils.make(
      AllBackendsMap[this.props.language].blocks[this.getCreatingType()],
    ) : '';
    this.setState({
      value,
      backupString: typeof this.props.value === 'string' ? this.props.value : null,
    });
    this.executeChange(value);

  }

  public handleFocus(event: React.FocusEvent<any>)
  {
    this.props.onFocus && this.props.onFocus(this, event.target['value'], event);
    this.computeOptions(); // need to lazily compute autocomplete options when needed
  }

  public handleBlur(event: React.FocusEvent<any>, value: string)
  {
    this.props.onBlur && this.props.onBlur(this, value, event);
  }

  public handleCardToolClose()
  {
    this.executeChange('');
    this.setState({
      value: '',
    });
  }

  public renderSwitch()
  {
    if (!this.props.canEdit)
    {
      return null;
    }

    return (
      <a
        className={classNames({
          'builder-tb-switch': this.isText(),
          'close-icon-builder-textbox': !this.isText(),
        })}
        onClick={this.handleSwitch}
        data-tip={this.isText() ? 'Convert to cards' : ''}
      >
        {
          this.isText() ? <AddCardIcon /> : <CloseIcon />
        }
      </a>
    );
  }

  public toggleClosed()
  {
    Actions.change(this.props.keyPath.push('closed'), !this.props.value['closed']);
  }

  public computeOptions()
  {
    if (this.props.autoTerms || this.props.autoDisabled)
    {
      return;
    }

    const options = BuilderHelpers.getTermsForKeyPath(this.props.keyPath);

    if (!options.equals(this.state.options))
    {
      this.setState({
        options,
      });
    }
  }

  public render()
  {
    if (this.isText())
    {
      const { isOverCurrent, connectDropTarget, placeholder } = this.props;

      let { options } = this.state;
      if (this.props.autoTerms)
      {
        options = this.props.autoTerms;
      }
      if (this.props.autoDisabled)
      {
        options = null;
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
                defaultValue={this.props.value as string}
                onChange={this.handleTextareaChange}
                className={this.props.className}
                placeholder={placeholder}
                rel={this.props.rel}
              />
              :
              <Autocomplete
                ref='input'
                disabled={!this.props.canEdit}
                value={this.props.value as string}
                options={options}
                onChange={this.handleAutocompleteChange}
                placeholder={placeholder}
                help={this.state && this.state.wrongType ? this.props.typeErrorMessage : this.props.help}
                className={this.state && this.state.wrongType ? 'ac-wrong-type' : null}
                onFocus={this.handleFocus}
                onBlur={this.handleBlur}
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
    const title: string = card.closed ? card.static.title : '';
    const preview = BlockUtils.getPreview(card);
    // }
    // else
    // {
    //   var color = "#aaa";
    //   var title = "Add a Card";
    // }

    const chipStyle =
      {
        background: color,
      };
    const arrowLineStyle =
      {
        borderColor: color,
      };
    const arrowHeadStyle =
      {
        borderLeftColor: color,
      };

    return (
      <div className={classNames({
        'builder-tb': true,
        'builder-tb-cards': true,
        'builder-tb-cards-top': this.props.top,
        'builder-tb-cards-closed': card.closed,
      })} ref='cards'>
        <div className='builder-tb-cards-input'>
          <div className='builder-tb-cards-input-value' style={chipStyle}>
            <div
              className='builder-tb-cards-toggle'
              onClick={this.toggleClosed}
            >
              <ArrowIcon />
            </div>
            <div className='builder-tb-cards-input-value-text'>
              {title}
            </div>
            {!preview ? null :
              <div className='card-preview'>
                {preview}
              </div>
            }
            {this.renderSwitch()}
          </div>
          <div className='builder-tb-cards-arrow' style={arrowLineStyle}>
            <div className='builder-tb-cards-arrow-inner' style={arrowHeadStyle} />
          </div>
        </div>
      </div>
    );
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

export default BuilderTextbox;
