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

// tslint:disable:strict-boolean-expressions

import * as classNames from 'classnames';
import { List } from 'immutable';
import * as React from 'react';
import './BuilderTQLColumn.less';

import { cardList } from '../../../database/mysql/blocks/MySQLBlocks';
import Query from '../../../items/types/Query';
import { ResultsState } from '../../builder/components/results/ResultTypes';
import { MenuOption } from '../../common/components/Menu';
import * as LibraryTypes from '../../library/LibraryTypes';
import BuilderActions from './../../builder/data/BuilderActions';
import Menu from './../../common/components/Menu';
import TerrainComponent from './../../common/components/TerrainComponent';
import TQLEditor from './TQLEditor';
import TQLPopup from './TQLPopup';
import TQLResultsBar from './TQLResultsBar';

export interface Props
{
  algorithm?: LibraryTypes.Algorithm;
  query?: Query;
  canEdit?: boolean;
  resultsState: ResultsState;

  params?: any;
  addColumn?: (number, string?) => void;
  columnIndex: number;
  language: string;
}

class BuilderTQLColumn extends TerrainComponent<Props>
{
  public state: {
    tql: string;
    runMode: string;
    highlightedLine: number;
    syntaxHelpOpen: boolean;
    syntaxHelpPos: any;
    cardName: string;
    termDefinitionOpen: boolean;
    termDefinitionPos: any;
    resultsBarOpen: boolean;
  } = {
    tql: this.props.query.tql,
    runMode: 'auto',
    highlightedLine: null,
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
  }

  public componentWillReceiveProps(nextProps: Props)
  {
    if (nextProps.resultsState.errorLine)
    {
      this.highlightError(nextProps.resultsState.errorLine);
    }

    if (nextProps.query.tql !== this.state.tql)
    {
      this.updateTql(nextProps.query.tql, true);
    }
  }

  public updateTql(tql: string, noAction: boolean = false, manualRequest: boolean = false)
  {
    if (this.state.runMode === 'auto')
    {
      // auto mode
      // this.checkForFolding(tql);

      if (tql === this.state.tql)
      {
        return;
      }

      // console.log('unequal tql: "' + this.state.tql + '"\n to \n"'+tql +'"\n');

      this.setState({
        tql,
        highlightedLine: null,
        syntaxHelpOpen: false,
        termDefinitionOpen: false,
      });

      if (!noAction)
      {
        this.sendTqlAction();
      }
    }
    else
    {
      this.setState({
        tql,
        highlightedLine: null,
        syntaxHelpOpen: false,
        termDefinitionOpen: false,
      });
      if (manualRequest === true && noAction === false)
      {
        this.sendTqlAction();
      }
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

  public sendTqlAction()
  {
    BuilderActions.changeTQL(this.state.tql);
  }

  // public changeThemeDefault()
  // {
  //   localStorage.setItem('theme', 'default');
  //   this.setState({
  //     theme: 'default',
  //     theme_index: 0,
  //   });
  // }

  // public changeThemeMonokai()
  // {
  //   localStorage.setItem('theme', 'monokai');
  //   this.setState({
  //     theme: 'monokai',
  //     theme_index: 0,
  //   });
  // }

  // public getThemeIndex()
  // {
  //   switch (this.state.theme)
  //   {
  //     default:
  //       return 0;
  //   }
  // }

  public changeRunModeToAuto()
  {
    this.setState({
      runMode: 'auto',
    });
  }

  public changeRunModeToManual()
  {
    this.setState({
      runMode: 'manual',
    });
  }

  public getMenuOptions(): List<MenuOption>
  {
    const options: List<MenuOption> =
      List([
        {
          text: 'Auto',
          onClick: this.changeRunModeToAuto,
          disabled: this.state.runMode === 'auto',
        },
        {
          text: 'Manual',
          onClick: this.changeRunModeToManual,
          disabled: this.state.runMode === 'manual',
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

  public highlightError(lineNumber: number)
  {
    if (lineNumber !== null)
    {
      this.setState({
        highlightedLine: lineNumber - 1,
      });
    }
  }

  public turnSyntaxPopupOff()
  {
    this.setState({
      syntaxHelpOpen: false,
      termDefinitionOpen: false,
    });
  }

  public findKeyword(line: string)
  {
    const keywords = Object.keys(cardList);
    let cardName = '';
    keywords.map((word) =>
    {
      const words = word.split(' ');
      // For terms like select from, only need to match one of the words
      if (words.length > 1)
      {
        for (let i = 0; i < words.length; i++)
        {
          if (line.toLowerCase().indexOf(words[i].toLowerCase()) >= 0)
          {
            cardName = word;
          }
        }
      }
      else if (line.toLowerCase().indexOf(word.toLowerCase()) >= 0)
      {
        cardName = word;
      }
    });
    return cardName;
  }

  public toggleSyntaxPopup(event, line)
  {
    const cardName = this.findKeyword(line);

    const left = event.clientX - event.offsetX - 8;
    const top = event.clientY - event.offsetY + 17;
    this.setState({
      syntaxHelpOpen: !this.state.syntaxHelpOpen,
      syntaxHelpPos: { left, top },
      cardName,
      termDefinitionOpen: false,
    });
  }

  public defineTerm(value, event)
  {
    const cardName = this.findKeyword(value);
    const left = event.clientX;
    const top = event.clientY - event.offsetY + 22;
    if (cardName)
    {
      this.setState({
        termDefinitionOpen: true,
        termDefinitionPos: { left, top },
        cardName,
        syntaxHelpOpen: false,
      });
    }
  }

  public hideTermDefinition()
  {
    this.setState({
      termDefinitionOpen: false,
    });
  }

  public render()
  {
    const manualEntry = null;

    // cardList[this.state.cardName] &&
    //    BuilderTypes.Blocks[cardList[this.state.cardName]].static.manualEntry;
    return (
      <div
        className={classNames({
          'tql-column': true,
          // [this.state.theme + '-tql-theme']: true,
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
            language={this.props.language}
            canEdit={this.props.canEdit}

            onChange={this.updateTql}

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
            onError={this.highlightError}
            open={this.state.resultsBarOpen}
            onToggle={this._toggle('resultsBarOpen')}
            resultsState={this.props.resultsState}
          />
        </div>
      </div>
    );
  }
}

export default BuilderTQLColumn;
