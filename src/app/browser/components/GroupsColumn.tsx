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
import Classs from './../../components/common/Classs.tsx';
import BrowserColumn from './BrowserColumn.tsx';
import BrowserItem from './BrowserItem.tsx';
import BrowserItemCategory from './BrowserItemCategory.tsx';
import BrowserCreateItem from './BrowserCreateItem.tsx';
import BrowserTypes from './../BrowserTypes.tsx';
import ColorManager from './../../util/ColorManager.tsx';
import InfoArea from './../../components/common/InfoArea.tsx';
import Actions from './../data/BrowserActions.tsx';
type Group = BrowserTypes.Group;

interface Props
{
  groups: Immutable.Map<ID, Group>;
  groupsOrder: Immutable.List<ID>;
}

class GroupsColumn extends Classs<Props>
{
  state = {
    rendered: false,
    lastMoved: null,
  }
  
  componentDidMount()
  {
    this.setState({
      rendered: true,
    });
  }
  
  constructor(props)
  {
    super(props);
  }
  
  handleDuplicate(index: number)
  {
    Actions.groups.duplicate(this.props.groups.get(this.props.groupsOrder.get(index)), index);
  }
  
  handleNameChange(id: ID, name: string)
  {
    Actions.groups.change(
      this.props.groups.get(id)
        .set('name', name) as Group
    );
  }
  
  handleCreate()
  {
    Actions.groups.create();
  }
  
  handleHover(index: number, type: string, id: ID)
  {
    var itemIndex = this.props.groupsOrder.findIndex(v => v === id);
    if(type === 'group' && itemIndex !== index 
      && this.state.lastMoved !== index + ' ' + itemIndex)
    {
      this.setState({
        lastMoved: index + ' ' + itemIndex,
      });
      var target = this.props.groups.get(this.props.groupsOrder.get(index));
      Actions.groups.move(this.props.groups.get(id).set('status', target.status) as Group, index);
    }
  }

  handleDropped(id: ID, targetType: string, targetItem: any, shifted: boolean)
  {
    
  }  
  
  renderGroup(id: ID, index: number)
  {
    const group = this.props.groups.get(id);
    return (
      <BrowserItem
        index={index}
        name={group.name}
        id={id}
        icon={null}
        onDuplicate={this.handleDuplicate}
        color={ColorManager.colorForKey(group.id)}
        key={group.id}
        to={'/browser/' + group.id}
        onNameChange={this.handleNameChange}
        type='group'
        rendered={this.state.rendered}
        onHover={this.handleHover}
        onDropped={this.handleDropped}
        item={group}
      >
      </BrowserItem>
    );
  }
  
  handleCategoryHover(statusString: string, id: ID)
  {
    let g = this.props.groups.get(id);
    let status = BrowserTypes.EGroupStatus[statusString];
    if(g.status !== status)
    {
      Actions.groups.change(g.set('status', status) as Group);  
    }
  }
  
  renderCategory(status: BrowserTypes.EGroupStatus)
  {
    var ids = this.props.groupsOrder.filter(id => this.props.groups.get(id).status === status);
    return (
      <BrowserItemCategory
        status={BrowserTypes.EGroupStatus[status]}
        key={status}
        onHover={this.handleCategoryHover}
        type='group'
        titleHidden={status === BrowserTypes.EGroupStatus.Live}
      >
        {
          ids.map(this.renderGroup)
        }
        {
          ids.size === 0 && <div className='browser-category-none'>None</div>
        }
        {
          status === BrowserTypes.EGroupStatus.Live && 
            <BrowserCreateItem
              name='group'
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
        index={1}
        title='Groups'
      >
        {
          this.props.groups.size ?
            (
              <div>
                { this.renderCategory(BrowserTypes.EGroupStatus.Live) }
                { this.renderCategory(BrowserTypes.EGroupStatus.Archive) }
              </div>
            )
            :
            <InfoArea
              large='No groups created, yet.'
              button='Create a group'
              onClick={this.handleCreate}
            />
        }
      </BrowserColumn>
    );
  }
}

export default GroupsColumn;