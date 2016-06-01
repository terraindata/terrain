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

import * as React from 'react';
import Classs from './../../common/components/Classs.tsx';
import BrowserColumn from './BrowserColumn.tsx';
import BrowserItem from './BrowserItem.tsx';
import BrowserItemCategory from './BrowserItemCategory.tsx';
import CreateItem from '../../common/components/CreateItem.tsx';
import BrowserTypes from './../BrowserTypes.tsx';
import ColorManager from './../../util/ColorManager.tsx';
import InfoArea from './../../common/components/InfoArea.tsx';
import Actions from './../data/BrowserActions.tsx';
import UserThumbnail from './../../users/components/UserThumbnail.tsx';
import Scoreline from './../../common/components/Scoreline.tsx';

let live = '#48b14b';
let approve = '#bf5bff';
let design = '#00a7f7';
let archive = '#ff735b';

var AlgorithmIcon = require('./../../../images/icon_algorithm_16x13.svg?name=AlgorithmIcon');

type Algorithm = BrowserTypes.Algorithm;

interface Props
{
  algorithms: Immutable.Map<ID, Algorithm>;
  algorithmsOrder: Immutable.List<ID>;
  groupId: ID;
}

class AlgorithmsColumn extends Classs<Props>
{
  state = {
    rendered: false,
    lastMoved: null,
  }
  
  componentDidUpdate()
  {
    if(!this.state.rendered)
    {
      this.setState({
        rendered: true,
      });
    }
  }
  
  componentWillReceiveProps(nextProps)
  {
    if(nextProps.groupId !== this.props.groupId)
    {
      this.setState({
        rendered: false,
      });
    }
  }
  
  handleDuplicate(index: number)
  {
    Actions.algorithms.duplicate(this.props.algorithms.get(this.props.algorithmsOrder.get(index)), index);
  }
  
  handleArchive(index: number)
  {
    Actions.algorithms.change(this.props.algorithms.get(this.props.algorithmsOrder.get(index))
      .set('status', BrowserTypes.EAlgorithmStatus.Archive) as Algorithm);
  }
  
  handleCreate()
  {
    Actions.algorithms.create(this.props.groupId);
  }
  
  handleNameChange(id: ID, name: string)
  {
    Actions.algorithms.change(
      this.props.algorithms.get(id)
        .set('name', name) as Algorithm
    );
  }
    
  handleHover(index: number, type: string, id: ID)
  {
    var itemIndex = this.props.algorithmsOrder.findIndex(v => v === id);
    if(type === 'algorithm' && itemIndex !== index 
      && this.state.lastMoved !== index + ' ' + itemIndex)
    {
      this.setState({
        lastMoved: index + ' ' + itemIndex,
      });
      var target = this.props.algorithms.get(this.props.algorithmsOrder.get(index));
      Actions.algorithms.move(this.props.algorithms.get(id).set('status', target.status) as Algorithm, index, this.props.groupId);
    }
  }
  
  handleDropped(id: ID, targetType: string, targetItem: any, shiftKey: boolean)
  {
    switch (targetType) {
      case "group":
        // move this one to the new group
        if(shiftKey)
        {
          Actions.algorithms.duplicate(this.props.algorithms.get(id), 0, targetItem.id);
        }
        else
        {
          Actions.algorithms.move(this.props.algorithms.get(id), 0, targetItem.id);
        }
        break;
      case "algorithm":
        // maybe the code for moving one algorithm to a specific spot in another group goes here?
        break;
      case "variant":
        // no good
        break;
    }
  }

  renderAlgorithm(id: ID, index: number)
  {
    const algorithm = this.props.algorithms.get(id);
    var scores = [
      {
        score: 0,
        color: live, 
      },
      {
        score: 0,
        color: approve,
      },
      {
        score: 0,
        color: design,
      },
      {
        score: 0,
        color: archive,
      }
    ];
    algorithm.variants.map(v => scores[v.status].score ++);
    
    return (
      <BrowserItem
        index={index}
        name={algorithm.name}
        icon={<AlgorithmIcon />}
        onDuplicate={this.handleDuplicate}
        onArchive={this.handleArchive}
        color={ColorManager.colorForKey(this.props.groupId)}
        key={algorithm.id}
        to={`/browser/${this.props.groupId}/${algorithm.id}`}
        className='browser-item-lighter'
        id={id}
        onNameChange={this.handleNameChange}
        type='algorithm'
        rendered={this.state.rendered}
        onHover={this.handleHover}
        onDropped={this.handleDropped}
        item={algorithm}
      >
        <div className='flex-container'>
          <UserThumbnail username={algorithm.lastUsername} />
          
          <div className='flex-grow'>
            <div className='browser-item-line'>
              <Scoreline 
                scores={scores}
                hideZeroes={true}
              />
            </div>
            <div className='browser-item-line'>
              Last Edited: { algorithm.lastEdited }
            </div>
          </div>
        </div>
      </BrowserItem>
    );
  }
  
  handleCategoryHover(statusString: string, id: ID)
  {
    let a = this.props.algorithms.get(id);
    let status = BrowserTypes.EAlgorithmStatus[statusString];
    if(a.status !== status)
    {
      Actions.algorithms.change(a.set('status', status) as Algorithm);  
    }
  }
  
  renderCategory(status: BrowserTypes.EAlgorithmStatus)
  {
    var ids = this.props.algorithmsOrder.filter(id => this.props.algorithms.get(id).status === status);
    return (
      <BrowserItemCategory
        status={BrowserTypes.EAlgorithmStatus[status]}
        key={status}
        onHover={this.handleCategoryHover}
        type='algorithm'
        titleHidden={status === BrowserTypes.EAlgorithmStatus.Live}
      >
        {
          ids.map(this.renderAlgorithm)
        }
        {
          ids.size === 0 && <div className='browser-category-none'>None</div>
        }
        {
          status === BrowserTypes.EAlgorithmStatus.Live && 
            <CreateItem
              name='algorithm'
              onCreate={this.handleCreate}
            />
        }
      </BrowserItemCategory>
    );
  }
  
  render()
  {
    return (
      <BrowserColumn
        index={2}
        title='Algorithms'
      >
        { 
          this.props.algorithms ?
            (
              this.props.algorithms.size ?
              (
                <div>
                  { this.renderCategory(BrowserTypes.EAlgorithmStatus.Live) }
                  { this.renderCategory(BrowserTypes.EAlgorithmStatus.Archive) }
                </div>
              )
              :
              <InfoArea
                large='No algorithms created, yet.'
                button='Create a algorithm'
                onClick={this.handleCreate}
              />
            )
          : null
        }
      </BrowserColumn>
    );
  }
}

export default AlgorithmsColumn;