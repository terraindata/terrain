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
import * as _ from "underscore";
import * as $ from 'jquery';
import * as classNames from 'classnames';
import { DragDropContext } from 'react-dnd';
var HTML5Backend = require('react-dnd-html5-backend');

// Data
import Store from "./../data/BuilderStore.tsx";
import Actions from "./../data/BuilderActions.tsx";

import Util from "./../../util/Util.tsx";

// Components
import BuilderColumn from "./BuilderColumn.tsx";
import Tabs from "./layout/Tabs.tsx";
import LayoutManager from "./layout/LayoutManager.tsx";
import Card from "./cards/Card.tsx";
import Result from "./results/Result.tsx";
import Ajax from "./../../util/Ajax.tsx";

var NewIcon = require("./../../../images/icon_new_21x17.svg?name=NewIcon");
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
      this.reduxState = newState.algorithms;
      this.setState({
        random: Math.random()
      });
    });

    // Some day in the distant future, you may consider
    //  removing this 'toJS()' call and making
    //  the whole Builder app built upon Immutable state.    
    this.reduxState = Store.getState().toJS().algorithms;
    const algorithmId = _.first(_.keys(this.reduxState));
    
    var colKeys = [Math.random(), Math.random()];
    this.state =
    {
      random: Math.random(),
      algorithmId: algorithmId,
      colKeys,
      noColumnAnimation: false,
    };
    
    Util.bind(this, 'duplicateAlgorithm', 'createAlgorithm',
      'tabClick',
      'save');
  }
  
  createAlgorithm()
  {
    Actions.algorithm.create();
  }
  
  duplicateAlgorithm()
  {
    Actions.algorithm.duplicate(this.state.algorithmId);
  }
  
  loadAlgorithm()
  {
    Actions.algorithm.load(JSON.parse(prompt("Paste Algorithm state here")));
  }
  
  getTabActions()
  {
    return [
      {
        text: 'Duplicate',
        icon: <DuplicateIcon />,
        onClick: this.duplicateAlgorithm,
      },
      {
        text: 'Open',
        icon: <OpenIcon />,
        onClick: this.loadAlgorithm,
      },
      {
        text: 'Save',
        icon: <SaveIcon />,
        onClick: this.save,
      },
    ];
  }
  
  save()
  {
    console.log(JSON.stringify(this.reduxState));
  }
  
  tabClose = (algorithmId) =>
  {
    if(this.state.algorithmId === algorithmId)
    {
      this.setState({
        algorithmId: _.keys(this.reduxState).reduce(
            (memo, id) =>
              memo || (id !== algorithmId && id)
          , null),
      })
    }
    Actions.algorithm.remove(algorithmId);
  }
  
  tabClick(algorithmId)
  {
    this.setState({
      algorithmId,
    });
  }
  
  getLayout = () =>
  (
    {
      stackAt: 650,
      fullHeight: true,
      columns:
        _.range(0, this.state.colKeys.length).map(index => 
          this.getColumn(this.reduxState[this.state.algorithmId], index, this.state.colKeys)
        )
    }
  )
  
  getColumn = (algorithm, index, colKeys: number[]) =>
  (
    {
      minWidth: 316,
      resizeable: true,
      resizeHandleRef: 'resize-handle',
      content: algorithm && <BuilderColumn
        algorithm={algorithm} 
        index={index}
        onAddColumn={this.handleAddColumn}
        onCloseColumn={this.handleCloseColumn}
        canAddColumn={colKeys.length < 3}
        canCloseColumn={colKeys.length > 1}
      />,
      hidden: this.state && this.state.closingIndex === index,
      key: colKeys[index],
    }
  )
  
  handleAddColumn = (index) =>
  {
    index = index + 1;
    var colKeys = _.clone(this.state.colKeys);
    colKeys.splice(index, 0, Math.random());
    this.setState({
      colKeys,
    }); 
  }
  
  handleCloseColumn = (index) =>
  {
    var colKeys = _.clone(this.state.colKeys);
    colKeys.splice(index, 1);
    this.setState({
      colKeys,
    }); 
  }
  
  moveColumn= (curIndex, newIndex) =>
  {
    var colKeys = _.clone(this.state.colKeys);
    var tmp = colKeys.splice(curIndex, 1)[0];
    colKeys.splice(newIndex, 0, tmp);
    this.setState({
      colKeys,
      noColumnAnimation: true,
    })
    setTimeout(() => this.setState({
      noColumnAnimation: false,
    }), 250);
  }
  
  
	render() {
    var tabs = {};
    
    _.map(this.reduxState, (algorithm, algorithmId) => {
      tabs[algorithmId] = {
        tabName: algorithm['algorithmName'] || 'New Algorithm',
        closeable: true,
        onClose: this.tabClose,
        onClick: this.tabClick,
      };
      
      if(!this.state.algorithmId)
      {
        setTimeout(() => this.setState({ algorithmId }));
      }
    });

    tabs[-1] = {
      tabName: <NewIcon data-tip="New" />,
      noBackground: true,
      pinnedAtEnd: true,
      onClick: this.createAlgorithm,
      selectNewTab: true,
      noDrag: true,
      unselectable: true,
    };
    
    return (
      <div className={classNames({
        'builder': true,
        'builder-no-column-animation': this.state.noColumnAnimation,
      })}>
        <Tabs tabs={tabs} actions={this.getTabActions()} ref='tabs' />
        {
          !_.keys(this.reduxState).length ? null :
            <div className='tabs-content'>
              <LayoutManager layout={this.getLayout()} moveTo={this.moveColumn} />
            </div>
        }
      </div>
    );
	}
};

export default DragDropContext(HTML5Backend)(Builder);