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
import FromCard from './../../builder/components/cards/card-types/FromCard.tsx';
import {BuilderTypes} from './../../builder/BuilderTypes.tsx';
import Card from './../../builder/components/cards/Card.tsx';
import ManualInfo from './ManualInfo.tsx';

var CodeMirror = require('./../../tql/components/Codemirror.js');
require('./../../tql/components/tql.js');
import './../../tql/components/codemirror.less';
import './../../tql/components/monokai.less';

interface Props
{
  entryName: string;
  canEdit: boolean;
  demoEdit: boolean;
  openTerm: (any) => void;
  spotlights?: any[];
  history?: any;
  expanded: boolean;
  phraseType?: boolean;
  manualTab: boolean;
}


class ManualEntry extends Classs<Props>
{
  constructor(props: Props) 
  {
    super(props);
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
  }

  expand()
  {
    this.setState({
      expanded: !this.state.expanded
    }); 
  }

  highlightKeyWords(text)
  {
    if(!text) return;
    var words = text.split(' ');
    var keywords = Object.keys(ManualConfig[0]).map((word) => word.toUpperCase());
    var phraseTypes = Object.keys(ManualConfig[1]).map((word) => word.toUpperCase());
    return (
      <div>
      {words.map((word, index) => 
        {
        var term = word;
        if(word !== word.toLowerCase())
        {
          term = word.toUpperCase().replace(',', '').replace('.', '');
        }
        var isPhraseType = (phraseTypes.indexOf(word.toUpperCase()) >= 0);
        return (keywords.indexOf(term) >= 0) ? 
          <span 
            key={index} 
            className='manual-entry-keyword' 
            onClick={this.props.openTerm}
          >
            {word + ' '} 
          </span> 
          : 
          (isPhraseType) ? 
           <span 
            key={index} 
            className='manual-entry-phrase-type' 
            onClick={this.props.openTerm}
          >
            {word + ' '} 
          </span>
          :
          word + ' '
        }
      )}

      </div>
    );
  }

  renderTqlCardEntryDetail() 
  {
    return (
      <div className='manual-entry-expanded-area'>
        <div className ='manual-entry-row'>
          <b>Type:</b>&nbsp;{this.highlightKeyWords(ManualConfig[0][this.props.entryName].Type)}
        </div> 
        <div className ='manual-entry-row'>
          <b>Syntax:</b>&nbsp;{this.highlightKeyWords(ManualConfig[0][this.props.entryName].Syntax)}
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
          Object.keys(ManualConfig[1][this.props.entryName].Text).map((result, index) => {
              return (
                <div key ={index} className='manual-entry-row'>
                {
                  this.highlightKeyWords(ManualConfig[1][this.props.entryName].Text[index])
                }
                <br/>
                </div> 
                );
          })
        } 
        </div>
    );
  }

  renderEntry() {
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
        {this.props.phraseType ? ManualConfig[1][this.props.entryName].Summary : this.highlightKeyWords(ManualConfig[0][this.props.entryName].Summary)}
      </div>
    </div>    
    );
  }

  renderCardExample(index) {
        // <ManualInfo 
        //   information="Use this handle to change the order of fields by clicking and dragging."
        //   style={{ top: 'calc(50% + 25px)',
        //            left: 'calc(25% + 20px)'
        //   }}
        // />
     
        // <ManualInfo 
        //   information="Use this button to add another field to select."
        //   style={{ top: 'calc(50% + 25px)',
        //            left: 'calc(75% - 45px)'
        //   }}
        // />
                  
        // <ManualInfo 
        //   information="Use this button to remove the selected field"
        //   style={{ top: 'calc(50% + 25px)',
        //            left: 'calc(75% - 24px)'
        //         }}
        // />
                 
        // <ManualInfo 
        //   information="Enter the attribute to select here."
        //   style={{ top: 'calc(50% + 9px)',
        //            left: 'calc(70% - 27px)'
        //         }}
        // />
    return (
      <div className='manual-entry-demo'>
        <Card
          {...this.props}
          card={ManualConfig[0][this.props.entryName].Text[index][0]}
          index={0}
          parentId='CI2XI'
          singleCard={false}
          keys={[]}
        /> 
      </div>
    );
  }

  renderCodeMirrorExample(index) {
    var options = {
      readOnly: true,
      lineNumbers: true,
      mode: 'tql',
      theme: 'monokai',
      foldGutter: true,
      gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
    }
    var value = ManualConfig[0][this.props.entryName].Text[index][1];
    return (
      <CodeMirror 
        options={options}
        value={value}
      />
    );
  }

  renderInDepthDescription()
  {
    var style = this.props.manualTab ? {} : {width: '90%', left: '0%'};
    return (
        <div> 
        {
          Object.keys(ManualConfig[0][this.props.entryName].Text).map((result, index) => {
            if (typeof ManualConfig[0][this.props.entryName].Text[index] === 'string'){
              return (
                <div key ={index}>
                {
                  this.highlightKeyWords(ManualConfig[0][this.props.entryName].Text[index])
                }
                <br/>
                </div> 
                );
            }
            else {
              var numLines = ManualConfig[0][this.props.entryName].Text[index][1].split('\n').length;
              return (
                 <div 
                   key ={index} 
                   className='manual-entry-demo-box'
                   style={style}
                 >
                   {this.renderCardExample(index)}
                   <div 
                     className='manual-entry-codemirror'
                     style={{height: (numLines * 20) + 'px'}}
                   >
                     {this.renderCodeMirrorExample(index)}
                   </div>
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

  render() {
    return (
      <div className ='manual-entry'> 
        {this.props.phraseType ? this.renderPhraseTypeEntry() : this.renderTqlCardEntry()}
        <br />
        <br />
      </div>
    );
  }
};

export default ManualEntry;
