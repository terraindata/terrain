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

require('./Browser.less');
import * as React from 'react';
import Classs from './../../common/components/Classs.tsx';
import Store from './../data/BrowserStore.tsx';
import Actions from './../data/BrowserActions.tsx';
import BrowserTypes from './../BrowserTypes.tsx';
import GroupsColumn from './GroupsColumn.tsx';
import AlgorithmsColumn from './AlgorithmsColumn.tsx';
import VariantsColumn from './VariantsColumn.tsx';
import BrowserInfoColumn from './BrowserInfoColumn.tsx';
import { DragDropContext } from 'react-dnd';
import InfoArea from './../../common/components/InfoArea.tsx';
var HTML5Backend = require('react-dnd-html5-backend');

interface Props
{
  params?: any;
  history?: any;
}

class Browser extends Classs<Props>
{
  cancelSubscription = null;
  
  constructor(props)
  {
    super(props);
    
    this.state = {
      istate: Store.getState()
    };
    
    this.cancelSubscription = 
      Store.subscribe(() => this.setState({
        istate: Store.getState()
      }))
  }
  
  componentWillMount()
  {
    Actions.fetch();
  }
  
  componentWillUnmount()
  {
    this.cancelSubscription && this.cancelSubscription();
  }
  
  render()
  {
    const state = this.state.istate;

    if(state.get('loading'))
    {
      return (
          <InfoArea large='Loading...' />
      );
    }
    
    var { groupId, algorithmId, variantId } = this.props.params;
    if(groupId)
    {
      var group = state.getIn(['groups', groupId]) as BrowserTypes.Group;
      var { algorithms, algorithmsOrder } = group;
      
      if(algorithmId)
      {
        var algorithm = algorithms.get(algorithmId);
        var { variants, variantsOrder } = algorithm;
        
        if(variantId)
        {
          var variant = variants.get(variantId);
        }
      }
    }
    
    return (
      <div className='browser'>
        <GroupsColumn
          groups={state.get('groups')}
          groupsOrder={state.get('groupsOrder')}
        />
        <AlgorithmsColumn
          {...{
            algorithms,
            algorithmsOrder,
            groupId
          }}
        />
        <VariantsColumn
          history={this.props.history}
          {...{
            variants,
            variantsOrder,
            groupId,
            algorithmId,
          }}
        />
        <BrowserInfoColumn
          {...{
            group,
            algorithm,
            variant,
          }}
        />
      </div>
    );
  }
}

export default DragDropContext(HTML5Backend)(Browser);