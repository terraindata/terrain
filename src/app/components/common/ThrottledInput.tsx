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

var _ = require('underscore');

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import Util from '../../util/Util.tsx';

interface Props
{
  value: string;
  onChange: (value: string, event?: any) => void;
  placeholder?: string;
  ref?: string;
  className?: string;
  type?: string;
  rel?: string;
}

class ThrottledInput extends React.Component<Props, any>
{
  value: string;
  
  constructor(props: Props) {
    super(props);
    
    // see: http://stackoverflow.com/questions/23123138/perform-debounce-in-react-js
    this.executeChange = _.debounce(this.executeChange, 750);
    Util.bind(this, ['executeChange', 'handleChange']);
    
    this.value = props.value;
  }
  
  componentWillReceiveProps(newProps)
  {
    if(ReactDOM.findDOMNode(this) !== document.activeElement)
    {
      // if not focused, then update the value
      ReactDOM.findDOMNode(this)['value'] = newProps.value;
    }
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
  
  render() {
    return (
      <input
        type={ this.props.type || 'text' }
        defaultValue={ this.props.value }
        onChange={this.handleChange}
        className={this.props.className}
        placeholder={this.props.placeholder}
        rel={this.props.rel}
        />
    );
  }
};

export default ThrottledInput;