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

require('./CreateCardTool.less');
import * as React from 'react';
import * as _ from 'underscore';
import PureClasss from '../../../common/components/PureClasss';
import Util from '../../../util/Util';
import Actions from '../../data/BuilderActions';
import CardDropArea from './CardDropArea';
import { Card } from '../../../../../shared/blocks/types/Card';
import { AllBackendsMap } from '../../../../../shared/backends/AllBackends';
import BlockUtils from '../../../../../shared/blocks/BlockUtils';

const AddIcon = require('./../../../../images/icon_add_7x7.svg?name=AddIcon');
const CloseIcon = require('./../../../../images/icon_close_8x8.svg?name=CloseIcon');
const AddCardIcon = require('./../../../../images/icon_addCard_22x17.svg?name=AddCardIcon');

export interface Props
{
  index: number;
  keyPath: KeyPath;
  canEdit: boolean;
  language: string;

  open?: boolean;
  dy?: number;
  className?: string;
  onMinimize?: () => void;
  accepts?: List<string>;
  onToggle?: () => void;
  onClose?: () => void; // like toggle, but only called when explicitly closed
  hidePlaceholder?: boolean;
  cannotClose?: boolean;
}

class CreateCardTool extends PureClasss<Props>
{
  state: {
    closed: boolean;
    opening: boolean;
  } = {
    closed: !this.props.open,
    opening: false,
  };

  createCard(event)
  {
    if (this.props.open && this.props.onMinimize)
    {
      this.props.onMinimize();
    }

    const type = Util.rel(event.target);
    if (this.props.index === null)
    {
      Actions.change(
        this.props.keyPath, 
        BlockUtils.make(AllBackendsMap[this.props.language].blocks[type])
      );
    }
    else
    {
      Actions.create(this.props.keyPath, this.props.index, type);
    }

    this.props.onToggle && this.props.onToggle();
  }

  componentWillReceiveProps(newProps)
  {
    if (newProps.open !== this.props.open)
    {
      if (newProps.open)
      {
        // first set state as not closed, so that the element renders
        // after render, animate element
        this.setState({
          closed: false,
        });
      }
      else
      {
        this.setState({
          opening: true,
        });
        // first animate closed, then set state closed so it doesn't render
        Util.animateToHeight(this.refs['selector'], 0, () =>
          this.setState({
            closed: true,
            opening: false,
          }),
        );
      }
    }
  }

  componentDidUpdate(prevProps, prevState)
  {
    if (!prevState.opening && this.state.opening)
    {
      Util.animateToAutoHeight(this.refs['selector']);
    }
  }

  renderCardSelector()
  {
    if (this.state.closed)
    {
      return null;
    }
    
    return (
     <div className="create-card-selector" ref="selector">
       <div className="create-card-selector-inner">
         {
           AllBackendsMap[this.props.language].cardsList.map((type: string) =>
           {
             if (this.props.accepts && this.props.accepts.indexOf(type) === -1)
             {
               return null;
             }

             const card = BlockUtils.make(
               AllBackendsMap[this.props.language].blocks[type]
             );
                 // data-tip={card.static.manualEntry && card.static.manualEntry.snippet}
             return (
               <a
                 className="create-card-button"
                 key={type}
                 rel={type}
                 onClick={this.createCard}
                 style={{
                   backgroundColor: card.static.colors[0],
                 }}
               >
                 <div className="create-card-button-inner" rel={type}>
                   {
                     card.static.title
                   }
                 </div>
               </a>
             );
           })
         }
         {
           _.map(_.range(0, 10), (i) => <div className="create-card-button-fodder" key={i} />)
         }
       </div>
       {
         !this.props.cannotClose &&
           <div
             className="close create-card-close"
             onClick={this.handleCloseClick}
           >
             <CloseIcon />
           </div>
       }
     </div>
    );
  }

  handleCloseClick()
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

  renderPlaceholder()
  {
    if (this.props.hidePlaceholder || this.props.open)
    {
      return null;
    }

    return (
      <div
        onClick={this.props.onToggle}
        className="create-card-placeholder"
      >
        <AddIcon />
      </div>
    );
  }

  render()
  {
    if (!this.props.canEdit)
    {
      return null;
    }

    let classes = Util.objToClassname({
      'create-card-wrapper': true,
      'create-card-open': this.props.open,
      'create-card-closed': !this.props.open,
      'create-card-opening': this.state.opening,
    });
    classes += ' ' + this.props.className;
    
    let style: React.CSSProperties;

    if (this.props.dy)
    {
      style =
      {
        position: 'relative',
        top: this.props.dy,
      };
    }

    return (
      <div
        className={classes}
        style={style}
      >
        {
          this.renderPlaceholder()
        }
        {
          this.renderCardSelector()
        }
        <CardDropArea
          index={this.props.index}
          keyPath={this.props.keyPath}
          accepts={this.props.accepts}
          renderPreview={typeof this.props.index !== 'number'}
          language={this.props.language}
        />
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
