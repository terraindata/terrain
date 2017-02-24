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

require('./BuilderTQLColumn.less');
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as classNames from 'classnames';
import * as Immutable from 'immutable';
const {List} = Immutable;
import TQLResultsBar from './TQLResultsBar';
import Menu from './../../common/components/Menu';
import { MenuOption } from '../../common/components/Menu';
import Switch from './../../common/components/Switch';
import TQLConverter from '../TQLConverter';
import BuilderActions from './../../builder/data/BuilderActions';
import BuilderTypes from '../../builder/BuilderTypes';
import * as _ from 'underscore';
import PureClasss from './../../common/components/PureClasss';
import LibraryTypes from '../../library/LibraryTypes';

import TQLEditor from './TQLEditor';

import TQLPopup from './TQLPopup';

interface Props {
  variant?: LibraryTypes.Variant;
  query?: BuilderTypes.Query;
  canEdit?: boolean;
  
  params?: any;
  onLoadStart: () => void;
  onLoadEnd: () => void;
  addColumn?: (number, string?) => void;
  columnIndex: number;
}

class BuilderTQLColumn extends PureClasss<Props>
{
  state: {
    tql: string;
    theme: string;
    focused: boolean;
    highlightedLine: number;
    theme_index: number;
    syntaxHelpOpen: boolean;
    syntaxHelpPos: any;
    cardName: string;
    termDefinitionOpen: boolean;
    termDefinitionPos: any;
    resultsBarOpen: boolean;
  } = {
    tql: this.props.query.tql,
    theme: localStorage.getItem('theme') || 'monokai',
    focused: false,
    highlightedLine: null,
    theme_index: 0,
    syntaxHelpOpen: false,
    syntaxHelpPos: {},
    cardName: '',
    termDefinitionOpen: false,
    termDefinitionPos: {},
    resultsBarOpen: false,
  };

  constructor(props: Props) 
  {
    super(props);
    // this.sendTqlAction = _.debounce(this.sendTqlAction, 1000);
  }

  componentWillReceiveProps(nextProps:Props)
  {
    if(!this.state.focused && nextProps.query.tql !== this.state.tql)
    {
      this.updateTql(nextProps.query.tql, true);
    }
  }

  updateTql(tql: string, noAction?: boolean) 
  {
    if(tql === this.state.tql)
    {
      return;
    }
    
    // this.checkForFolding(tql);
    this.setState({
      tql,
      highlightedLine: null,
      syntaxHelpOpen: false,
      termDefinitionOpen: false,
    });
    
    if(!noAction && tql !== this.props.query.tql)
    {
      this.sendTqlAction();
    }
  }

  // TODO move
  // checkForFolding(newTql) 
  // {
  //   var x: any = this.refs['cm'];
  //   if (x) 
  //   {
  //     x.findTqlToFold();
  //   }
  // }

  sendTqlAction()
  {
    BuilderActions.changeTQL(this.state.tql);
  }

  changeThemeDefault() 
  {
    localStorage.setItem('theme', 'default');
    this.setState({
      theme: 'default',
      theme_index: 0,
    });
  }

  changeThemeNeo() 
  {
    localStorage.setItem('theme', 'neo');
    this.setState({
      theme: 'neo',
      theme_index: 1,
    });
  }

  changeThemeCobalt() 
  {
    localStorage.setItem('theme', 'cobalt');
    this.setState({
      theme: 'cobalt',
      theme_index: 2,
    });
  }

  changeThemeMonokai() 
  {
    localStorage.setItem('theme', 'monokai');
    this.setState({
      theme: 'monokai',
      theme_index: 3,
    });
  }

  getThemeIndex() 
  {
    switch (this.state.theme) 
    {
      case 'monokai':
        return 3;
      case 'cobalt':
        return 2;
      case 'neo':
        return 1;
      default:
        return 0;
    }
  }

  getMenuOptions(): List<MenuOption> 
  {
    var options: List<MenuOption> =
      List([
        {
          text: 'Plain',
          onClick: this.changeThemeDefault,
          disabled: this.getThemeIndex() === 0,
        },
        {
          text: 'Neo',
          onClick: this.changeThemeNeo,
          disabled: this.getThemeIndex() === 1,
        },
        {
          text: 'Cobalt',
          onClick: this.changeThemeCobalt,
          disabled: this.getThemeIndex() === 2,
        },
        {
          text: 'Monokai',
          onClick: this.changeThemeMonokai,
          disabled: this.getThemeIndex() === 3,
        },
        // {
        //   spacer: true,
        //   text: null,
        //   onClick: null,
        // },
        // {
        //   text: 'Kill Running Queries',
        //   onClick: this.killQueries,
        // }
      ]);
    return options;
  }

  highlightError(lineNumber: number) 
  {
    if(lineNumber !== null) 
    {
      this.setState({
        highlightedLine: lineNumber - 1,
      });
    }
  }

  turnSyntaxPopupOff()
  {
    this.setState({
      syntaxHelpOpen: false,
      termDefinitionOpen: false,
    })
  }

  findKeyword(line: string) 
  {
    var keywords = Object.keys(BuilderTypes.cardList);
    var cardName = '';
    keywords.map(function(word) {
      var words = word.split(' ');
      //For terms like select from, only need to match one of the words
      if(words.length > 1)
      {
        for(var i = 0; i < words.length; i++)
        {
          if(line.toLowerCase().indexOf(words[i].toLowerCase()) >= 0)
          {
            cardName = word;
          }
        }
      }
      else if(line.toLowerCase().indexOf(word.toLowerCase()) >= 0)
      {
        cardName = word;
      }
    });
    return cardName;
  }

  toggleSyntaxPopup(event, line)
  {
    var cardName = this.findKeyword(line);

    var left = event.clientX - event.offsetX - 8;
    var top = event.clientY - event.offsetY + 17;
    this.setState({
      syntaxHelpOpen: !this.state.syntaxHelpOpen,
      syntaxHelpPos: {left, top},
      cardName,
      termDefinitionOpen: false,
    });
  }

  defineTerm(value, event)
  {
    var cardName = this.findKeyword(value);
    var left = event.clientX;
    var top = event.clientY - event.offsetY + 22;
    if(cardName)
    {
      this.setState({
        termDefinitionOpen: true,
        termDefinitionPos: {left, top},
        cardName,
        syntaxHelpOpen: false,
      })
    }
  }

  hideTermDefinition()
  {
    this.setState({
      termDefinitionOpen: false,
    })
  }
  
  handleFocusChange(focused)
  {
    this.setState({
      focused,
    });
  }

  render() 
  {
    var manualEntry = BuilderTypes.cardList[this.state.cardName] &&
        BuilderTypes.Blocks[BuilderTypes.cardList[this.state.cardName]].static.manualEntry;
        
    return (
      <div
        className={classNames({
          'tql-column': true,
          [this.state.theme + '-tql-theme']: true,
          'tql-column-results-bar-open': this.state.resultsBarOpen,
        })}
      >
        <Menu 
          options={this.getMenuOptions()} 
          small={true}
        />
        
        <div
          className='tql-section'
        >
          <TQLEditor
            tql={this.state.tql}
            canEdit={this.props.canEdit}
            theme={this.state.theme}
            
            onChange={this.updateTql}
            onFocusChange={this.handleFocusChange}
            
            highlightedLine={this.state.highlightedLine}
            toggleSyntaxPopup={this.toggleSyntaxPopup}
            defineTerm={this.defineTerm}
            turnSyntaxPopupOff={this.turnSyntaxPopupOff}
            hideTermDefinition={this.hideTermDefinition}
          />
          { 
            this.state.syntaxHelpOpen &&
              <TQLPopup 
                 cardName={this.state.cardName}
                 text={manualEntry ? manualEntry.syntax : 'No syntax help available'}
                 style={this.state.syntaxHelpPos}
                 addColumn={this.props.addColumn}
                 columnIndex={this.props.columnIndex}
                 onClick={this.turnSyntaxPopupOff}  
              />
          }
          {
            this.state.termDefinitionOpen &&
              <TQLPopup 
                cardName={this.state.cardName}
                text={manualEntry ? manualEntry.summary : 'No definition available'}
                 style={this.state.termDefinitionPos}
                 addColumn={this.props.addColumn}
                 columnIndex={this.props.columnIndex}  
                 onClick={this.turnSyntaxPopupOff}  
              />
          }
          
          <TQLResultsBar
            tql={this.state.tql}
            query={this.props.query}
            db={this.props.variant && this.props.variant.db}
            onError={this.highlightError}
            onLoadStart={this.props.onLoadStart}
            onLoadEnd={this.props.onLoadEnd}
            open={this.state.resultsBarOpen}
            onToggle={this._toggle('resultsBarOpen')}
          />
        </div>
      </div>
    );
  }
}

export default BuilderTQLColumn;
