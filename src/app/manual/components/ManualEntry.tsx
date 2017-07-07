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

// Copyright 2017 Terrain Data, Inc.
import * as classNames from 'classnames';
import * as $ from 'jquery';
import * as React from 'react';
import * as _ from 'underscore';
import Util from '../../util/Util';
import Classs from './../../common/components/Classs';
import './ManualEntry.less';
const ManualConfig = require('./../ManualConfig.json');
const ArrowIcon = require('./../../../images/icon_smallArrow.svg');
import * as Immutable from 'immutable';
import * as BlockUtils from '../../../../shared/blocks/BlockUtils';
import Card from './../../builder/components/cards/CardComponent';

const CodeMirror = require('./../../tql/components/Codemirror.js');
require('./../../tql/components/tql.js');
import './../../tql/components/codemirror.less';
import './../../tql/components/monokai.less';

const reactStringReplace = require('react-string-replace');

import { cardList } from '../../../../shared/backends/mysql/blocks/MySQLBlocks';

export interface Props
{
  entryName: string;
  canEdit: boolean;
  openTerm: (any) => void;
  spotlights?: any[];
  expanded: boolean;
  phraseType?: boolean;
  manualTab: boolean;
  bottomLine?: boolean;
}

class ManualEntry extends Classs<Props>
{

  public allTqlCards = cardList;

  constructor(props: Props)
  {
    super(props);
    this.state =
      {
        expanded: this.props.expanded,
        // manualEntry: this.props.phraseType ? ManualConfig.phraseTypes[this.props.entryName] :
        //   Blocks[this.allTqlCards[this.props.entryName]].static.manualEntry,
      };
  }

  public componentWillReceiveProps(newProps)
  {
    this.setState({
      expanded: newProps.expanded,
      // manualEntry: this.props.phraseType ? ManualConfig.phraseTypes[newProps.entryName] :
      //   Blocks[this.allTqlCards[newProps.entryName]].static.manualEntry,
    });
  }

  public expand()
  {
    this.setState({
      expanded: !this.state.expanded,
    });
  }

  public findKeywords(text, words, className)
  {
    const matchForm = new RegExp('(' + words.join('[^A-Za-z]|') + '[^A-Za-z])', 'gi');

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

  public highlightKeyWords(text)
  {
    if (!text)
    {
      return;
    }
    let keywords = Object.keys(this.allTqlCards).map((word) => word.replace('/ ', ''));
    // Remove ( ) card
    const index = keywords.indexOf('( )');
    keywords.splice(index, 1);
    // Separate multi-word keywords like 'Take Limit' into sep. keywords
    keywords = keywords.join(' ').split(' ');

    text = this.findKeywords(text, keywords, 'manual-entry-keyword');
    text = this.findKeywords(text, Object.keys(ManualConfig.phraseTypes), 'manual-entry-phrase-type');

    return (
      <div>
        {text}
      </div>
    );
  }

  public renderTqlCardEntryDetail()
  {
    return (
      <div className='manual-entry-expanded-area'>
        <div className='manual-entry-row'>
          <b>Notation:</b>&nbsp;{this.highlightKeyWords(this.state.manualEntry.notation)}
        </div>
        <div className='manual-entry-row'>
          <b>Syntax:</b>&nbsp;{this.highlightKeyWords(this.state.manualEntry.syntax)}
        </div>
        <div className='maunual-entry-indepth'>
          {this.renderInDepthDescription()}
        </div>
      </div>
    );
  }

  public renderPhraseTypeEntryDetail()
  {
    return (
      <div className='manual-entry-expanded-area'>
        <div className='maunual-entry-indepth'>
          {this.renderPhraseTypeInDepth()}
        </div>
      </div>
    );
  }

  public renderPhraseTypeInDepth()
  {
    return (
      <div>
        {
          this.state.manualEntry.text.map((result, index) =>
          {
            return (
              <div key={index} className='manual-entry-row'>
                {this.highlightKeyWords(result)}
                <br />
              </div>
            );
          })
        }
      </div>
    );
  }

  public renderEntry()
  {
    return (
      <div>
        <div className='manual-entry-row'>
          <div
            onClick={this.expand}
            className='manual-entry-expand'
          >
            <ArrowIcon className={classNames({
              'manual-entry-arrow-icon': true,
              'manual-entry-arrow-icon-open': this.state.expanded,
              'manual-entry-arrow-icon-green': this.props.phraseType,
            })}
            />
          </div>
          <div className=
            {classNames({
              'manual-entry-name': true,
              'manual-entry-name-green': this.props.phraseType,
            })}
            onClick={this.expand} >
            {this.props.entryName}
          </div>
        </div>

        <div className='manual-entry-summary'>
          {this.highlightKeyWords(this.state.manualEntry.summary)}
        </div>
      </div>
    );
  }

  public renderCardExample(index)
  {
    return <div>Temporarily disabled</div>;
    // if(Blocks[this.state.manualEntry.text[index].type])
    // {
    //   var card = BlockUtils.make(
    //     Blocks[this.state.manualEntry.text[index].type],
    //     this.state.manualEntry.text[index]
    //   );
    //   return (
    //     <div className='manual-entry-demo'>
    //       <Card
    //         {...this.props}
    //         card={card}
    //         index={0}
    //         parentId='CI2XI'
    //         singleCard={false}
    //         keys={Immutable.List([])}
    //         keyPath={Immutable.List([])}
    //         helpOn={this.state.manualEntry.text[index].helpOn}
    //       />
    //     </div>
    //   );
    // }
  }

  public renderCodeMirrorExample(index)
  {
    return <div>Temporarily disabled</div>;
    // var options = {
    //   readOnly: true,
    //   lineNumbers: true,
    //   theme: 'monokai',
    //   foldGutter: true,
    //   gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
    // }
    // var cards = Immutable.List([BlockUtils.recordFromJS(this.state.manualEntry.text[index])]);
    // var query: any = {
    //   id: 'a',
    //   cards: cards,
    //   inputs: Immutable.List([]),
    //   tql: '',
    //   version: false,
    //   mode: '',
    //   name: '',
    //   lastEdited: '',
    //   db: '',
    //   resultsConfig: null,
    //   deckOpen: false,
    //   isDefault: false,
    // };

    // var value = .toTQL(query);

    // var numLines = value.split('\n').length;
    // var padding = numLines === 1 ? 2 : 8;
    // return (
    //   <div
    //     className='manual-entry-codemirror'
    //     style={{height: (numLines * 17 + padding) + 'px'}}
    //   >
    //     <CodeMirror
    //       options={options}
    //       value={value}
    //     />
    //   </div>
    // );
  }

  public renderInDepthDescription()
  {
    return (
      <div>
        {
          Object.keys(this.state.manualEntry.text).map((result, index) =>
          {
            if (typeof this.state.manualEntry.text[index] === 'string')
            {
              return (
                <div key={index}>
                  {
                    this.highlightKeyWords(this.state.manualEntry.text[index])
                  }
                  <br />
                </div>
              );
            }
            else
            {
              return (
                <div
                  key={index}
                  className={classNames({
                    'manual-entry-demo-box': true,
                    'manual-entry-in-depth': !this.props.manualTab,
                  })}
                >
                  {this.state.manualEntry.text[index].title ? <b className='manual-entry-demo-title'> {this.state.manualEntry.text[index].title} </b> : null}
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

  public renderTqlCardEntry()
  {
    return (
      <div>
        {this.renderEntry()}
        {this.state.expanded ? this.renderTqlCardEntryDetail() : null}
      </div>
    );
  }

  public renderPhraseTypeEntry()
  {
    return (
      <div>
        {this.renderEntry()}
        {this.state.expanded ? this.renderPhraseTypeEntryDetail() : null}
      </div>
    );
  }

  public render()
  {
    return (
      <div className='manual-entry'>
        {this.props.phraseType ? this.renderPhraseTypeEntry() : this.renderTqlCardEntry()}
        {this.props.bottomLine ? <hr className='manual-entry-line' /> : null}
      </div>
    );
  }
}
export default ManualEntry;
