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

require('./ManualEntry.less');
import * as $ from 'jquery';
import * as _ from 'underscore';
import * as React from 'react';
import Util from '../../util/Util.tsx';
import * as classNames from 'classnames';
import Classs from './../../common/components/Classs.tsx';
var ManualConfig = require('./../ManualConfig.json');
var ArrowIcon = require("./../../../images/icon_smallArrow.svg");
import BuilderTypes from './../../builder/BuilderTypes.tsx';
import Card from './../../builder/components/cards/Card.tsx';
import ManualInfo from './ManualInfo.tsx';
import * as Immutable from 'immutable';
import TQLConverter from '../../tql/TQLConverter.tsx';


var CodeMirror = require('./../../tql/components/Codemirror.js');
require('./../../tql/components/tql.js');
import './../../tql/components/codemirror.less';
import './../../tql/components/monokai.less';

const reactStringReplace = require('react-string-replace')

interface Props
{
  entryName: string;
  canEdit: boolean;
  openTerm: (any) => void;
  spotlights?: any[];
  history?: any;
  expanded: boolean;
  phraseType?: boolean;
  manualTab: boolean;
}


class ManualEntry extends Classs<Props>
{

  allTqlCards = BuilderTypes.cardList;

  manualEntry: any;

  constructor(props: Props) 
  {
    super(props);
    this.manualEntry = this.props.phraseType ? ManualConfig.phraseTypes[this.props.entryName] : 
      BuilderTypes.Blocks[this.allTqlCards[this.props.entryName]].static.manualEntry;
    this.state =
      {
        expanded: this.props.expanded,
      }
  }

  componentWillReceiveProps(newProps)
  {
    if(this.state.expanded !== newProps.expanded)
    {
      this.setState({
        expanded: newProps.expanded
      });
    }
    this.manualEntry = this.props.phraseType ? ManualConfig.phraseTypes[newProps.entryName] : 
      BuilderTypes.Blocks[this.allTqlCards[newProps.entryName]].static.manualEntry;
  }

  expand()
  {
    this.setState({
      expanded: !this.state.expanded
    }); 
  }

  findKeywords(text, words, className)
  {
    var matchForm = new RegExp('(' + words.join('[^A-Za-z]|') + '[^A-Za-z])', 'gi');

    text = reactStringReplace(text, matchForm, (match, i) => (
      <span       
        className={className} 
        onClick={this.props.openTerm}
        key={Math.random()}
      >
        {match}
      </span>
    ));
    return text;
  }


  highlightKeyWords(text)
  {
    if (!text) return;
    var keywords = Object.keys(this.allTqlCards);
    //Remove ( ) card
    var index = keywords.indexOf('( )');
    keywords.splice(index, 1);
    //Separate multi-word keywords like 'Take Limit' into sep. keywords
    keywords = keywords.join(' ').split(' ');

    text = this.findKeywords(text, keywords, 'manual-entry-keyword');
    text = this.findKeywords(text, Object.keys(ManualConfig.phraseTypes), 'manual-entry-phrase-type');

    return (
      <div> 
        {text}
      </div>
    );
  }

  renderTqlCardEntryDetail() 
  {
    return (
      <div className='manual-entry-expanded-area'>
        <div className ='manual-entry-row'>
          <b>Notation:</b>&nbsp;{this.highlightKeyWords(this.manualEntry.notation)}
        </div> 
        <div className ='manual-entry-row'>
          <b>Syntax:</b>&nbsp;{this.highlightKeyWords(this.manualEntry.syntax)}
        </div> 
        <div className ='maunual-entry-indepth'>
           {this.renderInDepthDescription()}
        </div>
      </div>
        );
  }

  renderPhraseTypeEntryDetail()
  {  
    return (
      <div className='manual-entry-expanded-area'>
        <div className ='maunual-entry-indepth'>
          {this.renderPhraseTypeInDepth()}
        </div>
      </div>
    );
  }

  renderPhraseTypeInDepth()
  {
    return (
      <div> 
        {
        Object.keys(this.manualEntry.text).map((result, index) => {
          return (
            <div key ={index} className='manual-entry-row'>
              {this.highlightKeyWords(result)}
              <br/>
            </div> 
          );
        })
        } 
      </div>
    );
  }

  renderEntry() 
  {
    return(
      <div>
      <div className ='manual-entry-row'>
        <div 
          onClick={this.expand}
          className='manual-entry-expand'
        >
          <ArrowIcon className = {classNames ({ 
            'manual-entry-arrow-icon': true,
            'manual-entry-arrow-icon-open': this.state.expanded,
            'manual-entry-arrow-icon-green': this.props.phraseType
            })}
          />
        </div>
        <div className = 
          {classNames ({ 
            'manual-entry-name': true,
            'manual-entry-name-green': this.props.phraseType,
            })}
          onClick={this.expand} >
          {this.props.entryName}
        </div>
      </div>

      <div className ='manual-entry-summary'>
        {this.highlightKeyWords(this.manualEntry.summary)}
      </div>
    </div>    
    );
  }

  renderCardExample(index) 
  {
    var card = BuilderTypes.recordFromJS(this.manualEntry.text[index]);
    return (
      <div className='manual-entry-demo'>
        <Card
          {...this.props}
          card={card}
          index={0}
          parentId='CI2XI'
          singleCard={false}
          keys={Immutable.List([])}
          keyPath={Immutable.List([])}
          helpOn={this.manualEntry.text[index].helpOn}
        /> 
      </div>
    );
  }

  renderCodeMirrorExample(index) 
  {
    var options = {
      readOnly: true,
      lineNumbers: true,
      mode: 'tql',
      theme: 'monokai',
      foldGutter: true,
      gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
    }
    var cards = Immutable.List([BuilderTypes.recordFromJS(this.manualEntry.text[index])]);
    var query: BuilderTypes.IQuery = {
      id: 'a',
      cards: cards,
      inputs: Immutable.List([]),
      tql: '',
      version: false,
      mode: '',
      name: '',
      lastEdited: '',
    };

    var value = TQLConverter.toTQL(query);

    var numLines = value.split('\n').length;
    var padding = numLines === 1 ? 2 : 8;
    return (
      <div 
        className='manual-entry-codemirror'
        style={{height: (numLines * 17 + padding) + 'px'}}
      >
        <CodeMirror 
          options={options}
          value={value}
        />
      </div>
    );
  }

  renderInDepthDescription()
  {
    var style = this.props.manualTab ? {} : {width: '90%', left: '0%'};
    return (
        <div> 
        {
          Object.keys(this.manualEntry.text).map((result, index) => {
            if (typeof this.manualEntry.text[index] === 'string'){
              return (
                <div key ={index}>
                {
                  this.highlightKeyWords(this.manualEntry.text[index])
                }
                <br/>
                </div> 
                );
            }
            else {
              return (
                 <div 
                   key ={index} 
                   className='manual-entry-demo-box'
                   style={style}
                 >
                   {this.renderCardExample(index)}
                   {this.renderCodeMirrorExample(index)}

                 </div>
              );
            }
          })
        } 
        </div>
    );
  }

  renderTqlCardEntry()
  {
    return (
        <div>
        {this.renderEntry()}
        {this.state.expanded ? this.renderTqlCardEntryDetail() : null }
        </div>
    );
  }

  renderPhraseTypeEntry()
  {
    return (
      <div> 
        {this.renderEntry()}
         {this.state.expanded ? this.renderPhraseTypeEntryDetail() : null }
      </div>
    );
  }

  render() 
  {
    return (
      <div className ='manual-entry'> 
        {this.props.phraseType ? this.renderPhraseTypeEntry() : this.renderTqlCardEntry()}
        <hr className ='manual-entry-line'/>
      </div>
    );
  }
};

export default ManualEntry;
