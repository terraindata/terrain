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

require('./BrowserItem.less');
import * as React from 'react';
import Classs from './../../components/common/Classs.tsx';
import Menu from './../../components/common/Menu.tsx';
import { Link } from 'react-router';
import * as classNames from 'classnames';

interface Props
{
  index: number;
  name: string;
  onDuplicate: (index: number) => void;
  icon: Element;
  color: string;
  to: string;
  type: string;
  onNameChange: (id: ID, name: string) => void;
  id: ID;
  rendered: boolean; // has the parent been mounted?
  className?: string;
}

class BrowserItem extends Classs<Props>
{
  state = {
    nameEditing: false,
    focusField: false,
    mounted: false,
    timeout: null,
  }
  
  menuOptions = [
    {
      text: 'Duplicate',
      // icon: '',
      onClick: this.handleDuplicate,   
    },
  ];
  
  componentDidMount()
  {
    this.setState({
      timeout: 
        setTimeout(() =>
        {
          this.setState({
            mounted: true,
          })
        }, this.props.rendered ? 0 : Math.min(this.props.index * 100, 1000)),
    })
    
    if(!this.props.name.length)
    {
      this.showTextfield();
    }
  }
  
  componentWillUnmount()
  {
    if(this.state.timeout)
    {
      clearTimeout(this.state.timeout);
    }
  }
  
  handleDuplicate()
  {
    this.props.onDuplicate(this.props.index);
  }
  
  handleChange(event)
  {
    this.props.onNameChange(this.props.id, event.target.value);
  }
  
  handleKeyDown(event)
  {
    if(event.keyCode === 13)
    {
      event.target.blur();
    }
  }
  
  showTextfield(event?)
  {
    this.setState({
      nameEditing: true,
      focusField: true,
    });
    event && event.preventDefault();
    event && event.stopPropagation();
  }
  
  componentDidUpdate()
  {
    if(this.state.focusField)
    {
      this.refs['input']['focus']();
      this.setState({
        focusField: false,
      });
    }
  }
  
  hideTextfield(event)
  {
    this.setState({
      nameEditing: false,
    })
  }
  
  render()
  {
    return (
      <Link to={this.props.to} className='browser-item-link' activeClassName='browser-item-active'>
        <div
          className={classNames({
            'browser-item-wrapper': true,
            'browser-item-wrapper-mounted': this.state.mounted,
          })}
          style={{borderColor:this.props.color}}
        >
          <div className={'browser-item ' + this.props.className} style={{background:this.props.color}}>
            <div
              className={classNames({
                'browser-item-title-bar': true,
                'browser-item-title-bar-editing': this.state.nameEditing,
              })}
            >
              { this.props.icon }
              <div
                className='browser-item-name'
                onDoubleClick={this.showTextfield}
              >
                { this.props.name.length ? this.props.name : <em>Untitled</em> }
              </div>
              <input
                className='browser-item-name-input'
                value={ this.props.name }
                placeholder={this.props.type + ' name'}
                onChange={ this.handleChange }
                onBlur={ this.hideTextfield }
                onKeyDown={ this.handleKeyDown }
                ref='input'
              />
              <Menu
                options={this.menuOptions}
              />
            </div>
            <div className='browser-item-content'>
              { this.props['children'] }
            </div>
          </div>
        </div>
      </Link>
    );
  }
}

export default BrowserItem;