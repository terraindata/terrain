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

require('./Input.less');
var _ = require('underscore');
import * as React from 'react';
import Util from '../../../util/Util.tsx';
import Actions from "../../data/BuilderActions.tsx";
import PanelMixin from '../layout/PanelMixin.tsx';
import BuilderTextbox from "../../../common/components/BuilderTextbox.tsx";
import Menu from '../../../common/components/Menu.tsx';
import CreateLine from '../../../common/components/CreateLine.tsx';
import DatePicker from '../../../common/components/DatePicker.tsx';
import { BuilderTypes } from './../../BuilderTypes.tsx';

var TextIcon = require("./../../../../images/icon_textDropdown.svg");
var DateIcon = require("./../../../../images/icon_dateDropdown.svg");
var NumberIcon = require("./../../../../images/icon_numberDropdown.svg");
var CloseIcon = require("./../../../../images/icon_close_8x8.svg");

type IInput = BuilderTypes.IInput;
let InputType = BuilderTypes.InputType;

var Input = React.createClass<any, any>({
	mixins: [PanelMixin],

	propTypes:
	{
		input: React.PropTypes.object.isRequired,
    index: React.PropTypes.number.isRequired,
	},

	getDefaultProps() 
	{
		return {
			drag_x: false,
			drag_y: true,
			reorderOnDrag: true,
		};
	},
  
	changeKey(value: string)
	{
		Actions.inputs.changeKey(this.props.input, value, this.props.index);
	},

	changeValue(value: string)
	{
		Actions.inputs.changeValue(this.props.input, value, this.props.index);
	},
  
  convertToDate()
  {
    Actions.inputs.changeType(this.props.input, BuilderTypes.InputType.DATE, this.props.index);
  },
  
  convertToText()
  {
    Actions.inputs.changeType(this.props.input, BuilderTypes.InputType.TEXT, this.props.index);
  },
  
  convertToNumber()
  {
    Actions.inputs.changeType(this.props.input, BuilderTypes.InputType.NUMBER, this.props.index);
  },

  closeInput()
  {
    Util.animateToHeight(this.refs.input, 0);
    setTimeout(() => {
      Actions.inputs.remove(this.props.input)
    }, 250);
  },
  
  createInput()
  {
    Actions.inputs.create(this.props.input.parentId, this.props.index);
  },

  getMenuOptions()
  {
    return [
      {
        text: 'Number',
        onClick: this.convertToNumber,
        disabled: this.props.input.type === InputType.NUMBER,
        icon: <NumberIcon />, 
        iconColor: '#805DA8',
      },
      {
        text: 'Text',
        onClick: this.convertToText,
        disabled: this.props.input.type === InputType.TEXT,
        icon: <TextIcon />, 
        iconColor: '#31B2BC',
      },
      {
        text: 'Date',
        onClick: this.convertToDate,
        disabled: this.props.input.type === InputType.DATE,
        icon: <DateIcon />, 
        iconColor: '#FF735B',
      },
    ];
  },

  
  renderInputValue()
  {
    if(this.props.input.type === BuilderTypes.InputType.DATE)
    {
      return (
        <div>
          <DatePicker
            date={this.props.input.value}
            onChange={this.changeValue}
            canEdit={true}
          />
        </div>
      );
    }
    
    return (
      <BuilderTextbox
        {...this.props}
        canEdit={true}
        value={this.props.input.value}
        className="input-text input-text-second"
        id={this.props.input.id}
        keyPath={['value']}
      />
    );
  },
  
  componentDidMount()
  {
    Util.animateToAutoHeight(this.refs.input);
  },

	render() {
		return this.renderPanel((
			<div className='input' ref='input'>
        <CreateLine open={false} onClick={this.createInput} />
        <div className='input-inner'>
          <div className='input-top-row'>
            <BuilderTextbox
              {...this.props}
              canEdit={true}
              value={this.props.input.key}
              className="input-text input-text-first input-borderless"
              id={this.props.input.id}
              keyPath={['key']}
            />
            <Menu 
              options={this.getMenuOptions()} 
              style={{right:'28px'}}
            />
            <div onClick={this.closeInput}> 
              <CloseIcon className ='close input-close'/> 
            </div>
          </div>
          <div className='input-bottom-row'>
          {
            this.renderInputValue()
          }
          </div>
        </div>
			</div>
		));
	},
});

export default Input;
