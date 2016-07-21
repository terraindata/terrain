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

 require('./AccountEntry.less');
import * as $ from 'jquery';
import * as _ from 'underscore';
import * as React from 'react';
import Util from '../../util/Util.tsx';
import * as classNames from 'classnames';
import Classs from './../../common/components/Classs.tsx';
var MoreIcon = require("./../../../images/icon_more_12x3.svg?name=MoreIcon");



interface Props
{
  title: string;
  getDescription?: JSX.Element;
  getContent?: JSX.Element;
  getButtonText?: JSX.Element;
  lastEntry?: boolean;
}


class AccountEntry extends Classs<Props>
{
  constructor(props: Props) 
  {
    super(props);
    this.state =
      {
        expanded: false,
        expandedInfo: <div />,
      }
  }

  expand()
  {
    this.setState({
      expanded: !this.state.expanded
    }); 
  }

  renderContent()
  {
    if (this.state.expanded) 
    {
      return this.props.getContent;
    }
  }

  renderDescription()
  {
    if (this.props.getDescription)
     {
      return <div className='account-entry-description'>{this.props.getDescription}</div>;
    }
  }

  renderDefaultButton()
  {
    return (
        <div className='account-entry-expand-button button' onClick={this.expand}>
            {this.state.expanded ? 'Collapse' : 'Expand'}
        </div>
      );
  }

  renderButton()
  {
    if (this.props.getButtonText)
    {
      return (
        <div> 
          {this.props.getButtonText} 
        </div>
      );
    }
    return this.renderDefaultButton();
  }

  renderLine() 
  {
    if(!this.props.lastEntry)
    {
      return (<hr className ='account-entry-line'/>);
    }
    return <hr className ='account-entry-line settings-line-hidden'/>;
  }

  render() {
    return (
        <div className='account-entry'> 
          <div className='account-entry-top-bar'> 
            <div className='account-entry-title'>
              {this.props.title}   
            </div> 
            <div className='account-entry-white-space' />
            {this.renderButton()}
          </div> 
            {this.renderDescription()}
          <div className='account-entry-expanded-info'>
            {this.renderContent()}
          </div>
          {this.renderLine()}
        </div>
    );
  }
};

export default AccountEntry;
