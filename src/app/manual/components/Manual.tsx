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

require('./Manual.less');
var _ = require('underscore');
import * as React from 'react';
import Classs from './../../common/components/Classs.tsx';
import { Link } from 'react-router';
import * as classNames from 'classnames';
import Autocomplete from './../../common/components/Autocomplete.tsx';
import ManualEntry from './ManualEntry.tsx';
import { DragDropContext } from 'react-dnd';
var HTML5Backend = require('react-dnd-html5-backend');


var CloseIcon = require('./../../../images/icon_close.svg');
var SearchIcon = require('./../../../images/icon_search.svg');
var HomeIcon = require('./../../../images/icon_home.svg');
var ManualConfig = require('./../ManualConfig.json');

interface Props
{
  location?: any;
  children?: any;
}

class Manual extends Classs<Props>
{
  constructor(props)
  {
    super(props);
    var value = this.props.location && 
                this.props.location.state && 
                this.props.location.state.cardName ? 
                  this.props.location.state.cardName : '';
    var keys = Object.keys(ManualConfig[0]).filter((key) =>
    {
       return key.toLowerCase().indexOf(value.toLowerCase()) >= 0;
    });
    this.state = {
      visibleKeys: keys,
      value,
      selectedKey: '',
    }
  }

  renderEntriesList()
  {
    
    return (
      <div className='manual-content-area'>
        {
          Object.keys(ManualConfig[0]).map((result, index) =>
            <div key ={index}>
              <div 
                className={classNames({
                  'manual-left-column-entry': true,
                  'manual-entry-left-selected': this.state.selectedKey === result,
                })}
                onClick={this.search.bind(this, result)}
              > 
                {result} 
              </div>
              <br />
           
            </div> 
          )
        }
      </div>
    );
  }

  renderManualEntries()
  {
    if(this.state.visibleKeys.length === 0)
    {
      return (
        <div className='manual-content-area'>
          No results found.
        </div>
      );
    }
    return (
      <div className='manual-content-area'>
        {
          this.state.visibleKeys.map((result, index) =>
            <div key ={index}>
              <ManualEntry
                entryName={result}
                canEdit={false}
                demoEdit={true}
                spotlights={[]}
              />
            </div> 
          )
        }
      </div>
    );
  }

  search(value)
  {
    var visibleKeys = Object.keys(ManualConfig[0]).filter((key) => {
      return (key.toLowerCase().indexOf(value.toLowerCase()) >= 0);
    });


    var selectedKey = '';
    Object.keys(ManualConfig[0]).forEach(function(key, index) {
        if (value.toLowerCase() === key.toLowerCase())
        {
          selectedKey = key;
        }
    });
    this.setState({
      visibleKeys,
      value,
      selectedKey,
    });
  }

  clearInput()
  {
    this.search('');
  }

  renderManualTopbar()
  {
    var closeOpacity = this.state.value.length ? 1 : 0;
    return (
       <div className ='manual-topbar'>
          <div>
            <HomeIcon 
              className = 'manual-home-icon' 
              onClick= {this.clearInput}
            />
          </div>
          <div className='manual-search-bar'>
              <SearchIcon className ='manual-search-icon'/>
              <Autocomplete
               className='manual-search-input'
               value={this.state.value as string}
               onChange={this.search}
               placeholder='Search'
               options={Object.keys(ManualConfig[0])}
              />
              <CloseIcon 
               className='manual-close-icon'
               style={{
                 opacity: closeOpacity,
               }}
               onClick={this.clearInput}
              />
            </div>
        </div>
    );
  }
  render()
  {
    
    return (
      <div className ='manual-area'>
        {this.renderManualTopbar()}
        <div className='manual-left-column'>
          {this.renderEntriesList()}
        </div>
        <div className='manual-right-column'>
          {this.renderManualEntries()}
        </div>
      </div>
    );
  }
}

export default DragDropContext(HTML5Backend)(Manual);