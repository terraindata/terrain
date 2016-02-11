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

// Libraries
import * as React from 'react';
import * as ReactDOM from "react-dom";
var _ = require("underscore");

// Data
import Store from "./../../data/Store.tsx";
import Actions from "./../../data/Actions.tsx";

// Components
import Tabs from "./../../components/layout/Tabs.tsx";
import LayoutManager from "./../../components/layout/LayoutManager.tsx";
import Card from "./../../components/cards/Card.tsx";
import Result from "./../../components/results/Result.tsx";
import InputsArea from "./../../components/inputs/InputsArea.tsx";
import CardsArea from "./../../components/cards/CardsArea.tsx";
import ResultsArea from "./../../components/results/ResultsArea.tsx";

class Builder extends React.Component<any, any>
{
  constructor()
  {
    super();
    
    Store.subscribe(() => {
      this.setState(Store.getState());
    });
    
    this.state = Store.getState();
  }
  
  handleNewAlgorithmTab() {
    Actions.dispatch.newAlgorithm();
  }
  
	render() {
    var tabs = {};
    _.map(this.state.cardGroups, (cardGroup, algorithmId) => {//_.map(this.state.cardGroups, (cardGroup, algorithmId) => {
      var cardGroup = this.state.cardGroups[algorithmId];
      var resultGroup = this.state.resultGroups[algorithmId];
      var layout = {
        stackAt: 650,
        fullHeight: true,
        columns: [
          {
            content: <InputsArea inputs={this.state.inputs} algorithmId={algorithmId} />,
          },
          {
            colSpan: 2,
            content: <CardsArea cards={cardGroup.cards} algorithmId={algorithmId} />
          },
          {
            content: <ResultsArea results={resultGroup.results} algorithmId={algorithmId} />
          },
        ]
      };

      tabs[algorithmId] = {
        content: <LayoutManager layout={layout} />,
        tabName: 'Algorithm ' + cardGroup.id,
      };
    });

    tabs[-1] = {
      content: null,
      tabName: '+',
      pinnedAtEnd: true,
      onClick: this.handleNewAlgorithmTab,
      selectNewTab: true,
    };

    return (
      <Tabs tabs={tabs} />
    );
	}
};

export default Builder;