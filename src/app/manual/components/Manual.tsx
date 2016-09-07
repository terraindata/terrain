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

import * as Immutable from 'immutable';
const {List} = Immutable;
import BuilderTypes from './../../builder/BuilderTypes.tsx';

var CloseIcon = require('./../../../images/icon_close.svg');
var SearchIcon = require('./../../../images/icon_search.svg');
var HomeIcon = require('./../../../images/icon_home.svg');
var ManualConfig = require('./../ManualConfig.json');
var ArrowIcon = require("./../../../images/icon_smallArrow.svg");


interface Props
{
  location?: any;
  children?: any;
  history?: any;
  selectedKey?: string;
  manualTab?: boolean;
  changeCardName?: (string) => void;
}

class Manual extends Classs<Props>
{
  allTqlCards = Object.keys(BuilderTypes.cardList);

  allPhraseTypes = Object.keys(ManualConfig[1]).sort();
  autocompleteOptions = Immutable.List(this.allPhraseTypes.concat(this.allTqlCards).sort());

  constructor(props: Props)
  {
    super(props);
    var value = this.props.selectedKey || '';
    var tqlCards = this.allTqlCards.filter((key) =>
    {
       return key.toLowerCase().indexOf(value.toLowerCase()) >= 0;
    });
    var phraseTypes = this.allPhraseTypes.filter((key) =>
    {
       return key.toLowerCase().indexOf(value.toLowerCase()) >= 0;
    });
    this.state = {
      expanded: this.props.selectedKey,
      visibleTqlCards: tqlCards,
      visiblePhraseTypes: phraseTypes,
      value,
      selectedKey: this.props.selectedKey || '',
      expandTqlCards: true,
      expandPhraseTypes: true,
      expandSidebar: true,
    }
  }

  componentWillReceiveProps(nextProps)
  {
    if((this.state.selectedKey !== nextProps.selectedKey) && !this.props.manualTab)
    {
      this.setState({
        selectedKey: nextProps.selectedKey
      });
      this.search(nextProps.selectedKey);
    }
  }

  shouldComponentUpdate(nextProps, nextState)
  {
    return !_.isEqual(this.props, nextProps) || !_.isEqual(this.state, nextState);
  }

  renderTqlCardsList()
  {
   var height = 22 * this.allTqlCards.length;
   var style = this.state.expandTqlCards ? {maxHeight: height + 'px'} : {maxHeight: '0px'};
    return (
      <div className='manual-sidebar-section' style={style}>
        {
          this.allTqlCards.map((result, index) =>
            <div key ={index} className='manual-left-column-row'>
              <div 
                className={classNames({
                  'manual-left-column-entry': true,
                  'manual-entry-left-selected': this.state.selectedKey === result,
                })}
                onClick={this.search.bind(this, result, false)}
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

  renderPhraseTypesList()
  {
    var height = 22 * Object.keys(ManualConfig[1]).length;
    var style = this.state.expandPhraseTypes ? {maxHeight: height + 'px'} : {maxHeight: '0px'};
    return (
      <div className='manual-sidebar-section' style={style}>
        {
          this.allPhraseTypes.map((result, index) =>
            <div key ={index} className='manual-left-column-row'>
              <div 
                className={classNames({
                  'manual-left-column-entry': true,
                  'manual-entry-left-selected': this.state.selectedKey === result,
                })}
                onClick={this.search.bind(this, result, false)}
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

  openTerm(e)
  {  
    var cardName = e.target.textContent.trim().replace(',', '').replace('.', '');
    this.setState ({
      value: cardName,
    });
    this.search(cardName);
  }

  renderManualEntries()
  {
    if(this.state.visibleTqlCards.length === 0 && this.state.visiblePhraseTypes.length === 0)
    {
      return (
        <div className={classNames({
            'manual-content-area': true,
            'manual-content-area-builder-tab': !this.props.manualTab,
        })}>
          No results found.
        </div>
      );
    }
    var style = this.props.manualTab ? {height: 'calc(100% - 60px)'} : {height: 'calc(100% - 25px)'};
    return (
      <div className={classNames({
            'manual-content-area': true,
            'manual-content-area-builder-tab': !this.props.manualTab,
        })}
        style={style}
      >
        {
          this.state.visibleTqlCards.sort().map((result, index) =>
            <div key ={index}>
              <ManualEntry
                entryName={result}
                canEdit={false}
                openTerm={this.openTerm}
                spotlights={[]}
                history={this.props.history}
                expanded={this.state.expanded}
                manualTab={this.props.manualTab}
              />
            </div> 
          )
        }
        {
          this.state.visiblePhraseTypes.sort().map((result, index) =>
            <div key={index}>
              <ManualEntry
                entryName={result}
                canEdit={false}
                openTerm={this.openTerm}
                spotlights={[]}
                history={this.props.history}
                phraseType={true}
                expanded={this.state.expanded}
                manualTab={this.props.manualTab}
              />
            </div>
          )
        }
      </div>
    );
  }

  search(value)
  {
    var visibleTqlCards = this.allTqlCards.filter((key) => {
      return (key.toLowerCase().indexOf(value.toLowerCase()) >= 0);
    }).sort();

    var visiblePhraseTypes = this.allPhraseTypes.filter((key) => {
      return (key.toLowerCase().indexOf(value.toLowerCase()) >= 0);
    });

    var selectedKey = '';
    this.allTqlCards.forEach(function(key, index) {
        if (value.toLowerCase() === key.toLowerCase())
        {
          selectedKey = key;
        }
    });
    this.allPhraseTypes.forEach(function(key, index) {
        if (value.toLowerCase() === key.toLowerCase())
        {
          selectedKey = key;
        }
    });

    if(this.props.manualTab)
    {
      this.props.history.pushState({}, '/manual/' + value);
    }
    this.props.changeCardName && this.props.changeCardName(selectedKey);
    this.setState({
      visibleTqlCards,
      visiblePhraseTypes,
      value,
      selectedKey,
      expanded: (visibleTqlCards.length + visiblePhraseTypes.length) <= 1,
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
       <div className = {classNames({
         'manual-topbar': true,
         'builder-manual-topbar': !this.props.manualTab,
       })}
       >

          <div className= {classNames({
           'manual-search-bar': true,
           'manual-tab-search-bar': this.props.manualTab,
          })}>
              <SearchIcon className ='manual-search-icon'/>
              <Autocomplete
                className='manual-search-input'
                value={this.state.value as string}
                onChange={this.search}
                placeholder='Search'
                options={this.autocompleteOptions}
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

  showTqlCards()
  {
    this.setState({
      visibleTqlCards: this.allTqlCards,
      visiblePhraseTypes: [],
      expanded: false, 
      selectedKey: 'TQL Cards',
      value: '',
      expandTqlCards: this.state.selectedKey === 'TQL Cards' ? !this.state.expandTqlCards : true
    });
    this.props.history.pushState({}, '/manual/');
  }

  showPhraseTypes()
  {
    this.setState({
      visiblePhraseTypes: this.allPhraseTypes,
      visibleTqlCards: [],
      expanded: false, 
      selectedKey: 'Phrase Types',
      value: '',
      expandPhraseTypes: this.state.selectedKey === 'Phrase Types' ? !this.state.expandPhraseTypes : true
    });
    this.props.history.pushState({}, '/manual/');
  }

  toggleTqlCardList()
  {
    this.setState({
      expandTqlCards: !this.state.expandTqlCards,
    });
  }

  togglePhraseTypeList()
  {
    this.setState({
      expandPhraseTypes: !this.state.expandPhraseTypes,
    });
  }

  toggleSidebar()
  {
    this.setState({
      expandSidebar: !this.state.expandSidebar
    })
  }

  showAllTerms()
  {
    this.setState({
      expandSidebar: this.state.selectedKey === '' ? !this.state.expandSidebar : true
    });
    this.search('');
  }

  renderLeftColumnMenu()
  {
    var height = 22 * (this.allPhraseTypes.length + this.allTqlCards.length) + 2 * 26;
    var style = this.state.expandSidebar ? {maxHeight: height + 'px'} : {maxHeight: '0px'}; 

     return (
      <div className='manual-sidebar' style={style}>
        <div className={classNames({
          'manual-left-column-section-heading': true, 
          'manual-left-column-section-heading-blue': true,
          'manual-left-column-entry': true,
          'manual-entry-left-selected': this.state.selectedKey == 'TQL Cards'
        })}>
          <ArrowIcon className = {classNames ({ 
            'manual-arrow-icon': true,
            'manual-arrow-icon-open': this.state.expandTqlCards,
          })}
            onClick={this.toggleTqlCardList}
          />
          <span 
            onClick={this.showTqlCards}
            style={{paddingRight: '70px'}}
          >
          TQL Cards</span>
        </div>
        {this.renderTqlCardsList()}
        <div className={classNames({
          'manual-left-column-section-heading': true, 
          'manual-left-column-section-heading-green': true,
          'manual-left-column-entry': true,
          'manual-entry-left-selected': this.state.selectedKey == 'Phrase Types'
        })}>
          <ArrowIcon className = {classNames ({ 
            'manual-arrow-icon': true,
            'manual-arrow-icon-open': this.state.expandPhraseTypes,
            'manual-arrow-icon-green': true
            })}
            onClick={this.togglePhraseTypeList}
          /> 
          <span 
            onClick={this.showPhraseTypes} 
            style={{paddingRight: '52px'}}
          >Phrase Types</span>
        </div>
        {this.renderPhraseTypesList()}
      </div>
    );
  }

  renderLeftColumn()
  {
    var style = this.props.manualTab ? {height: 'calc(100% - 60px)'} : {height: 'calc(100% - 25px)'};
    var closeOpacity = this.state.value.length ? 1 : 0;

    return (
      <div 
        className ='manual-content-area'
        style={style}
      >

       <div  className= {classNames({
           'manual-search-bar': true,
           'manual-tab-search-bar': this.props.manualTab,
           'manual-sidebar-search': true,
          })}>
       <SearchIcon className ='manual-search-icon'/>
              <Autocomplete
                className='manual-search-input'
                value={this.state.value as string}
                onChange={this.search}
                placeholder='Search'
                options={this.autocompleteOptions}
              />
              <CloseIcon 
               className='manual-close-icon'
               style={{
                 opacity: closeOpacity,
               }}
               onClick={this.clearInput}
              />
      </div> 

      <div className={classNames({
        'manual-left-column-title': true,
        'manual-left-column-entry': true,
        'manual-entry-left-selected': this.state.value == '' && !this.state.selectedKey
      })}>
        <ArrowIcon className = {classNames ({
          'manual-arrow-icon': true,
          'manual-arrow-icon-open': this.state.expandSidebar,
        })} 
          onClick={this.toggleSidebar}
        />
         <span onClick={this.showAllTerms} > Manual </span>
       </div>
       {this.renderLeftColumnMenu()}
      </div>
    );
  }

  render()
  {
    console.log(this.allTqlCards);
    return (
      <div className ='manual-area'>
          {this.props.manualTab ? null : this.renderManualTopbar()}        {
          this.props.manualTab ? 
          <div className='manual-left-column'>
           {this.renderLeftColumn()}
          </div>
          : 
          null
        }
        <div className={classNames({
            'manual-right-column': this.props.manualTab,
        })}>
          {this.renderManualEntries()}
        </div>
      </div>
    );
  }
}

export default Manual;