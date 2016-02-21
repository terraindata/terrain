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
import * as React from 'react';
import Util from '../../util/Util.tsx';
import Actions from "../../data/Actions.tsx";
import PanelMixin from '../layout/PanelMixin.tsx';
import ThrottledInput from "../common/ThrottledInput.tsx";

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

	render() {
		return this.renderPanel((
			<div className='input'>
				<div className='input-inner'>
					<ThrottledInput value={this.props.input.key} onChange={this.changeKey} className="input-text input-text-first" />
					<ThrottledInput value={this.props.input.value} onChange={this.changeValue} className="input-text input-text-second" />
				</div>
			</div>
			));
	},
});

export default Input;