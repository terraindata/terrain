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

require('./BuilderTextbox.less');

import * as _ from 'underscore';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import Util from '../../util/Util.tsx';
import { CardModels } from '../../models/CardModels.tsx';
// import CardsArea from '../cards/CardsArea.tsx';
import Card from '../cards/Card.tsx';

interface Props
{
  value: CardModels.CardString;
  onChange: (value: string, event?: any) => void;
  
  placeholder?: string;
  ref?: string;
  className?: string;
  type?: string;
  rel?: string;
  textarea?: boolean;

  acceptsCards?: boolean;
  top?: boolean;
  parentId?: string;
}

class BuilderTextbox extends React.Component<Props, any>
{
  value: CardModels.CardString;
  
  constructor(props: Props) {
    super(props);
    
    // see: http://stackoverflow.com/questions/23123138/perform-debounce-in-react-js
    this.executeChange = _.debounce(this.executeChange, 750);
    Util.bind(this, ['executeChange', 'handleChange', 'renderSwitch', 'handleSwitch']);
    
    this.value = props.value;
  }
  
  componentWillReceiveProps(newProps)
  {
    if(this.refs['input'])
    {
      if(this.refs['input'] !== document.activeElement)
      {
        // if not focused, then update the value
        this.refs['input']['value'] = newProps.value;
      }
    }
    
    this.value = newProps.value;
  }
  
  // throttled event handler
  executeChange(event)
  {
    this.value = event.target.value;
    this.props.onChange(event.target.value, event);
  }
  
  // persists the event and calls the throttled handler
  // see: http://stackoverflow.com/questions/23123138/perform-debounce-in-react-js/24679479#24679479
  handleChange(event)
  {
    event.persist();
    this.executeChange(event);
  }
  
  isText()
  {
    return typeof this.props.value === 'string';
  }
  
  handleSwitch()
  {
    if(!this.isText())
    {
      this.value = '';
      this.executeChange({
        target: {
          value: '',
        },
        switched: true,
      })  
    }
    else
    {
      var newCard:CardModels.IParenthesesCard =
      {
        id: 'c-' + Math.random(),
        parentId: this.props.parentId,
        type: 'parentheses',
        cards: [],
      };
      
      this.value = newCard;
      this.executeChange({
        target: {
          value: newCard,
        },
        switched: true,
      });
    }
  }
  
  renderSwitch()
  {
    return (
      <div className='builder-tb-switch' onClick={this.handleSwitch}>
        [ ]
      </div>
    );
  }
  
  render() {
    if(this.isText())
    {
      var element = this.props.textarea ? <textarea ref='input' /> : <input ref='input' />;
      
      var props =
      {
        type: this.props.type || 'text',
        defaultValue: this.props.value,
        onChange: this.handleChange,
        className: this.props.className,
        placeholder: this.props.placeholder,
        rel: this.props.rel,
      };
      
      return (
        <div className={'builder-tb ' + (this.props.acceptsCards ? 'builder-tb-accepts-cards' : '')}>
          { React.cloneElement(element, props) }
          { this.props.acceptsCards && this.renderSwitch() }
        </div>
      );
    }
    
    // We're in card mode
    return (
      <div className='builder-tb builder-tb-cards'>
        <div className='builder-tb-cards-input'>
          { this.renderSwitch() }
          <div className='builder-tb-cards-input-value'>
            Cards
          </div>
        </div>
      </div>
    );
  }
};

export default BuilderTextbox;