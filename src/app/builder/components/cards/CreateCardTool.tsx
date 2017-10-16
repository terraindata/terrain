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

// tslint:disable:restrict-plus-operands strict-boolean-expressions no-var-requires member-ordering no-unused-expression member-access max-line-length

import * as classNames from 'classnames';
import * as _ from 'lodash';
import * as Radium from 'radium';
import * as React from 'react';

import Actions from 'builder/data/BuilderActions';
import CreateLine from 'common/components/CreateLine';
import KeyboardFocus from 'common/components/KeyboardFocus';
import TerrainComponent from 'common/components/TerrainComponent';
import * as BlockUtils from 'src/blocks/BlockUtils';
import { AllBackendsMap } from 'src/database/AllBackends';
import Util from 'util/Util';

import { CardConfig } from '../../../../blocks/types/Card';
import { backgroundColor, Colors } from '../../../colors/Colors';

import CardDropArea from './CardDropArea';
import CardSelector from './CardSelector';
import './CreateCardTool.less';

const AddIcon = require('images/icon_add_7x7.svg?name=AddIcon');
const CloseIcon = require('images/icon_close_8x8.svg?name=CloseIcon');
const AddCardIcon = require('images/icon_addCard_22x17.svg?name=AddCardIcon');

export interface Props
{
  index: number;
  keyPath: KeyPath;
  canEdit: boolean;
  language: string;

  open?: boolean;
  dy?: number;
  className?: string;
  accepts: List<string>;
  onToggle?: () => void;
  onClose?: () => void; // like toggle, but only called when explicitly closed
  onMinimize?: () => void; // TODO see if these should be consolidated
  hidePlaceholder?: boolean;
  cannotClose?: boolean;

  overrideText?: List<{
    text: string;
    type: string;
  }>; // can override the options displayed
  overrideClick?: (index: number) => void; // override the click handler

  handleCardDrop?: (cardType: string) => any;
}

@Radium
class CreateCardTool extends TerrainComponent<Props>
{
  public state: {
    focusedIndex: number;
  } = {
    focusedIndex: -1,
  };

  public handleCardClick(block, index)
  {
    if (this.props.overrideClick)
    {
      this.props.overrideClick(index);
    }
    else
    {
      const type = this.getCardTypeList().get(index);
      this.createCard(type);
    }
  }

  public createCard(type)
  {
    if (this.props.open && this.props.onMinimize)
    {
      this.props.onMinimize();
    }

    if (this.props.index === null)
    {
      Actions.change(
        this.props.keyPath,
        BlockUtils.make(AllBackendsMap[this.props.language].blocks, type),
      );
    }
    else
    {
      Actions.create(this.props.keyPath, this.props.index, type);
    }

    this.props.onToggle && this.props.onToggle();
  }

  public getCardTypeList(): List<string>
  {
    if (this.props.overrideText)
    {
      // TODO consider memoizing this.
      return this.props.overrideText.map((t) => t.type).toList();
    }
    return this.props.accepts || AllBackendsMap[this.props.language].cardsList;
  }

  public handleCloseClick()
  {
    if (this.props.onClose)
    {
      this.props.onClose();
    }
    else
    {
      this.props.onToggle();
    }
  }

  public renderPlaceholder()
  {
    if (this.props.hidePlaceholder || (this.props.cannotClose && this.props.open))
    {
      return null;
    }

    return (
      <CreateLine
        onClick={this.props.onToggle}
        open={this.props.open}
      />
    );

    // return (
    //   <div
    //     onClick={this.props.onToggle}
    //     className='create-card-placeholder'
    //     style={{
    //       borderColor: Colors().inactiveHover,
    //       ':hover': {
    //         background: Colors().inactiveHover,
    //       }
    //     }}
    //   >
    //     {
    //       this.props.open ? <CloseIcon /> : <AddIcon />
    //     }
    //   </div>
    // );
  }

  // handleFocus()
  // {
  //   this.setState({
  //     focusedIndex: 0,
  //   });
  // }

  // handleFocusLost()
  // {
  //   this.setState({
  //     focusedIndex: -1,
  //   });
  // }

  // handleFocusedIndexChange(focusedIndex: number)
  // {
  //   this.setState({
  //     focusedIndex,
  //   });
  // }

  // handleKeyboardSelect(index: number)
  // {
  //   const type = this.getCardTypeList().get(index);
  //   this.createCard(type);
  // }

  public render()
  {
    if (!this.props.canEdit)
    {
      return null;
    }

    let classes = Util.objToClassname({
      'create-card-wrapper': true,
      'create-card-open': this.props.open,
      'create-card-closed': !this.props.open,
    });
    classes += ' ' + this.props.className;

    let style: React.CSSProperties = {};

    if (this.props.dy)
    {
      style =
        {
          position: 'relative',
          top: this.props.dy,
        };
    }

    const cardTypeList = this.getCardTypeList();

    return (
      <div
        className={classes}
        style={_.extend(
          style,
          {}, // backgroundColor(Colors().bg1),
        )}
      >
        {
          this.renderPlaceholder()
        }
        <CardSelector
          cardTypeList={this.getCardTypeList()}
          open={this.props.open}
          language={this.props.language}
          handleCardClick={this.handleCardClick}
          overrideText={this.props.overrideText}
        />
        <CardDropArea
          index={this.props.index}
          keyPath={this.props.keyPath}
          accepts={cardTypeList}
          renderPreview={typeof this.props.index !== 'number'}
          language={this.props.language}
          handleCardDrop={this.props.handleCardDrop}
        />
        {
          // <KeyboardFocus
          //   onFocus={this.handleFocus}
          //   onFocusLost={this.handleFocusLost}
          //   index={this.state.focusedIndex}
          //   onIndexChange={this.handleFocusedIndexChange}
          //   length={cardTypeList.size}
          //   onSelect={this.handleKeyboardSelect}
          // />
        }
      </div>
    );
  }
}
export default CreateCardTool;

// const cardTarget =
// {
//   canDrop(props, monitor)
//   {
//     return true;
//   },

//   drop(props, monitor, component)
//   {
//     const item = monitor.getItem();
//     if(monitor.isOver({ shallow: true}))
//     {
//       props.dndListener && props.dndListener.trigger('droppedCard', monitor.getItem());

//       setTimeout(() =>
//       {
//         // Actions.cards.move(item, props.index || 0, props.parentId); // TODO
//       }, 250);
//     }
//   }
// }

// const dropCollect = (connect, monitor) =>
// ({
//   connectDropTarget: connect.dropTarget(),
// });

// export default DropTarget('CARD', cardTarget, dropCollect)(CreateCardTool);
