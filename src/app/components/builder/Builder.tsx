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

import Util from "./../../util/Util.tsx";

// Components
import Tabs from "./../../components/layout/Tabs.tsx";
import LayoutManager from "./../../components/layout/LayoutManager.tsx";
import Card from "./../../components/cards/Card.tsx";
import Result from "./../../components/results/Result.tsx";
import InputsArea from "./../../components/inputs/InputsArea.tsx";
import CardsArea from "./../../components/cards/CardsArea.tsx";
import ResultsArea from "./../../components/results/ResultsArea.tsx";

var NewIcon = require("./../../../images/icon_new_8x10.svg?name=NewIcon");
var OpenIcon = require("./../../../images/icon_open_11x10.svg?name=OpenIcon");
var DuplicateIcon = require("./../../../images/icon_duplicate_11x12.svg?name=DuplicateIcon");
var SaveIcon = require("./../../../images/icon_save_10x10.svg?name=SaveIcon");

class Builder extends React.Component<any, any>
{
  // This variable is needed because React's state has not been working well with
  //  Redux's state. For instance, if I just do:
  //   this.setState(Store.getState().toJS())
  //  then I can't close tabs. React doesn't seem to pick up
  //  on keys being deleted from the state correctly.
  reduxState: any;
  
  constructor()
  {
    super();
    
    Store.subscribe(() => {
      var newState = Store.getState().toJS();
      this.reduxState = newState;
      this.setState({
        random: Math.random()
      });
    });

    // Some day in the distant future, you may consider
    //  removing this 'toJS()' call and making
    //  the whole Builder app built upon Immutable state.    
    this.reduxState = Store.getState().toJS();
    this.state = {
      random: Math.random(),
      selectedAlgorithmId: 100, // TODO change
    };
    
    Util.bind(this, 'duplicateAlgorithm', 'handleNewAlgorithmTab');
  }
  
  handleNewAlgorithmTab()
  {
    Actions.newAlgorithm();
  }
  
  duplicateAlgorithm()
  {
    Actions.duplicateAlgorithm(this.state.selectedAlgorithmId);
  }
  
  getTabActions()
  {
    return [
      {
        text: 'new',
        icon: <NewIcon />,
        onClick: this.handleNewAlgorithmTab,
      },
      {
        text: 'open',
        icon: <OpenIcon />,
        onClick: () => alert("Not yet implemented."),
      },
      {
        text: 'duplicate',
        icon: <DuplicateIcon />,
        onClick: this.duplicateAlgorithm
      },
      {
        text: 'save',
        icon: <SaveIcon />,
        onClick: () => alert("Not yet implemented."),
      },
    ];
  }
  
	render() {
    var tabs = {};
    
    
    _.map(this.reduxState, (algorithm, algorithmId) => {
      // this should be temporary; remove when middle tier arrives
      var spotlights = algorithm.results.reduce((spotlights, result) =>
      {
        if(result.spotlight)
        {
          spotlights.push(result);
        }
        return spotlights;
      }, []);
      
      var layout = {
        stackAt: 650,
        fullHeight: true,
        columns: [
          {
            width: 316,
            minWidth: 316,
            resizeable: true,
            resizeHandleRef: 'resize-handle',
            content: <InputsArea inputs={algorithm.inputs} algorithmId={algorithmId} />,
          },
          {
            colSpan: 3,
            minWidth: 350,
            resizeable: true,
            resizeHandleRef: 'resize-handle',
            content: <CardsArea cards={algorithm.cards} algorithmId={algorithmId} spotlights={spotlights} />
          },
          {
            colSpan: 2,
            minWidth: 200,
            resizeable: true,
            resizeHandleRef: 'resize-handle',
            content: <ResultsArea results={algorithm.results} algorithmId={algorithmId} resultsPage={algorithm.resultsPage} resultsPages={algorithm.resultsPages} />
          },
        ]
      };
      
      var closeFn = () => 
      {
        Actions.closeAlgorithm(algorithmId);
      }

      tabs[algorithmId] = {
        content: <LayoutManager layout={layout} />,
        tabName: algorithm.algorithmName || 'New Algorithm',
        closeable: true,
        onClose: closeFn,
        onClick: () => {
          this.setState({
            selectedAlgorithmId: algorithmId,
          });
        }
      };
      
      if(!this.state.selectedAlgorithmId)
      {
        setTimeout(() => this.setState({ selectedAlgorithmId: algorithmId }));
      }
    });

    tabs[-1] = {
      content: null,
      tabName: '+',
      pinnedAtEnd: true,
      onClick: this.handleNewAlgorithmTab,
      selectNewTab: true,
      noDrag: true,
    };
    
    return (
      <Tabs tabs={tabs} actions={this.getTabActions()} ref='tabs' />
    );
	}
};

export default Builder;