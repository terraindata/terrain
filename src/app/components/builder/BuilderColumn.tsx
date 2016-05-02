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

import * as _ from 'underscore';
require('./BuilderColumn.less');
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import Util from '../../util/Util.tsx';
import Menu from '../common/Menu.tsx';
import { MenuOption } from '../common/Menu.tsx';
import PanelMixin from '../layout/PanelMixin.tsx';
import InputsArea from "./../../components/inputs/InputsArea.tsx";
import CardsArea from "./../../components/cards/CardsArea.tsx";
import ResultsArea from "./../../components/results/ResultsArea.tsx";
import TQLView from '../tql/TQLView.tsx';

enum COLUMNS {
  Builder,
  Results,
  TQL,
  Inputs,
};
var NUM_COLUMNS = 4;

// interface Props
// {
//   title: string;
//   children?: any;
//   className?: string;
  
//   // Options not yet supported
//   menuOptions?: {
//     text: string;
//     onClick: () => void;
//   }[];
// }

var BuilderColumn = React.createClass<any, any>(
{
  mixins: [PanelMixin],
  
  propTypes:
  {
    algorithm: React.PropTypes.object.isRequired,
    className: React.PropTypes.string,
  },
  
  getInitialState()
  {
    return {
      column: this.props.index,
      loading: false,
    }
  },
  
  getDefaultProps()
  {
    return {};
  },
  
  handleLoadStart()
  {
    this.setState({
      loading: true,
    })
  },
  
  handleLoadEnd()
  {
    this.setState({
      loading: false,
    });
  },
  
  renderContent()
  {
    var algorithm = this.props.algorithm;
    var parentId = algorithm.id;
    
    switch(this.state.column)
    {
      case COLUMNS.Builder:
        // this should be temporary; remove when middle tier arrives
        var spotlights = algorithm.results.reduce((spotlights, result) =>
        {
          if(result.spotlight)
          {
            spotlights.push(result);
          }
          return spotlights;
        }, []);
        return <CardsArea 
          cards={algorithm.cards} 
          parentId={parentId} 
          spotlights={spotlights} 
          topLevel={true}
        />;
        
      case COLUMNS.Inputs:
        return <InputsArea
          inputs={algorithm.inputs}
          parentId={parentId}
        />;
      
      case COLUMNS.Results:
        return <ResultsArea 
          algorithm={algorithm}
          onLoadstart={this.handleLoadStart}
        />;
      
      case COLUMNS.TQL:
        return <TQLView
          algorithm={algorithm}
        />;
        
    }
    return <div>No column content.</div>;
  },
  
  switchView(index)
  {
    this.setState({
      column: index,
    });
  },
  
  getMenuOptions(): MenuOption[]
  {
    var options: MenuOption[] = _.range(0, NUM_COLUMNS).map(index => ({
      text: COLUMNS[index],
      onClick: this.switchView,
    }));
    
    options[this.state.column].disabled = true;
    
    return options;
  },
  
  render() {
    return this.renderPanel((
      <div className='builder-column'>
        <div className='builder-title-bar'>
          { 
            this.props.index === 0 ? null : (
              <div className='builder-resize-handle' ref='resize-handle'>
                <div className='builder-resize-handle-line'></div>
                <div className='builder-resize-handle-line'></div>
              </div>
            )
          }
          <div className='builder-title-bar-title'>
            { COLUMNS[this.state.column] }
            { this.state.loading ? 'Loading...' : '' }
          </div>
          <div className='builder-title-bar-options'>
            <Menu options={this.getMenuOptions()} />
          </div>
        </div>
        <div className={
            'builder-column-content' + 
            (this.state.column === COLUMNS.Builder ? ' builder-column-content-scroll' : '')
          }>
          { this.renderContent() }
        </div>
      </div>
    ));
  }
});

export default BuilderColumn;