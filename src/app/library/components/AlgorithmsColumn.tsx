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
import CreateItem from '../../common/components/CreateItem';
import RolesStore from '../../roles/data/RolesStore';
import RoleTypes from '../../roles/RoleTypes';
import UserStore from '../../users/data/UserStore';
import UserTypes from '../../users/UserTypes';
import Util from '../../util/Util';
import InfoArea from './../../common/components/InfoArea';
import PureClasss from './../../common/components/PureClasss';
import Scoreline from './../../common/components/Scoreline';
import UserThumbnail from './../../users/components/UserThumbnail';
import ColorManager from './../../util/ColorManager';
import Actions from './../data/LibraryActions';
import LibraryTypes from './../LibraryTypes';
import LibraryColumn from './LibraryColumn';
import LibraryItem from './LibraryItem';
import LibraryItemCategory from './LibraryItemCategory';

const AlgorithmIcon = require('./../../../images/icon_algorithm_16x13.svg?name=AlgorithmIcon');

type Algorithm = LibraryTypes.Algorithm;
type Variant = LibraryTypes.Variant;

export interface Props
{
  algorithms: Immutable.Map<ID, Algorithm>;
  variants: Immutable.Map<ID, Variant>;
  algorithmsOrder: Immutable.List<ID>;
  groupId: ID;
}

class AlgorithmsColumn extends PureClasss<Props>
{
  state: {
    rendered: boolean,
    me: UserTypes.User,
    roles: RoleTypes.RoleMap,
    lastMoved: string;
    draggingItemIndex: number;
    draggingOverIndex: number;
  } = {
    rendered: false,
    me: null,
    roles: null,
    lastMoved: '',
    draggingItemIndex: -1,
    draggingOverIndex: -1,
  };

  componentWillMount()
  {
    this._subscribe(UserStore, {
      stateKey: 'me',
      storeKeyPath: ['currentUser'],
      // isMounted: true,
    });
    this._subscribe(RolesStore, {
      stateKey: 'roles',
      // isMounted: true
    });
  }

  componetDidMount()
  {
    this.setState({
      rendered: true,
    });
  }

  componentDidUpdate()
  {
    if (!this.state.rendered)
    {
      this.setState({
        rendered: true,
      });
    }
  }

  componentWillReceiveProps(nextProps)
  {
    if (nextProps.groupId !== this.props.groupId)
    {
      this.setState({
        rendered: false,
      });
    }
  }

  handleDuplicate(id: ID)
  {
    Actions.algorithms.duplicate(
      this.props.algorithms.get(id),
      this.props.algorithmsOrder.findIndex((iid) => iid === id),
    );
  }

  handleArchive(id: ID)
  {
    Actions.algorithms.change(
      this.props.algorithms.get(id)
        .set('status', LibraryTypes.EAlgorithmStatus.Archive) as Algorithm,
      );
  }

  handleCreate()
  {
    Actions.algorithms.create(this.props.groupId);
  }

  handleNameChange(id: ID, name: string)
  {
    Actions.algorithms.change(
      this.props.algorithms.get(id)
        .set('name', name) as Algorithm,
    );
  }

  handleHover(index: number, type: string, id: ID)
  {
    const itemIndex = this.props.algorithmsOrder.indexOf(id);
    if (type === 'algorithm'
      && this.state.lastMoved !== index + ' ' + itemIndex)
    {
      this.setState({
        lastMoved: index + ' ' + itemIndex,
        draggingItemIndex: itemIndex,
        draggingOverIndex: index,
      });
    }
  }

  handleDropped(id: ID, targetType: string, targetItem: any, shiftKey: boolean)
  {
    switch (targetType) {
      case 'group':
        if (shiftKey)
        {
          Actions.algorithms.duplicate(
            this.props.algorithms.get(id),
            0,
            targetItem.id,
          );
        }
        else
        {
          Actions.algorithms.move(
            this.props.algorithms.get(id),
            0,
            targetItem.id,
          );
        }
        break;
      case 'algorithm':
        Actions.algorithms.move(
          this.props.algorithms.get(id),
          this.props.algorithmsOrder.indexOf(targetItem.id),
          this.props.groupId,
        );
        break;
      case 'variant':
        // no good
        break;
    }

    this.setState({
      draggingItemIndex: -1,
      draggingOverIndex: -1,
    });
  }

  renderAlgorithm(id: ID, fadeIndex: number)
  {
    const algorithm = this.props.algorithms.get(id);
    const index = this.props.algorithmsOrder.indexOf(id);
    const scores = [
      {
        score: 0,
        color: LibraryTypes.colorForStatus(LibraryTypes.EVariantStatus.Archive),
        name: 'Variants in Archived Status',
      },
      {
        score: 0,
        color: LibraryTypes.colorForStatus(LibraryTypes.EVariantStatus.Build),
        name: 'Variants in Build Status',
      },
      {
        score: 0,
        color: LibraryTypes.colorForStatus(LibraryTypes.EVariantStatus.Approve),
        name: 'Variants in Approve Status',
      },
      {
        score: 0,
        color: LibraryTypes.colorForStatus(LibraryTypes.EVariantStatus.Live),
        name: 'Variants in Live Status',
      },
    ];

    const variants = this.props.variants.filter(
      (v: Variant) =>
        v.algorithmId === id,
    );

    variants.map(
      (v: Variant) =>
        scores[v.status].score ++,
    );

    scores.splice(0, 1); // remove Archived count

    const {me, roles} = this.state;
    const canArchive = me && roles && roles.getIn([algorithm.groupId, me.username, 'admin']);
    const canDuplicate = canArchive;
    const canDrag = canArchive; // TODO change to enable Library drag and drop
    const canEdit = canDrag ||
      (me && roles && roles.getIn([algorithm.groupId, me.username, 'builder']));

    const lastTouched: Variant = variants.reduce(
      (lastTouched: Variant, v: Variant) =>
      {
        const date = new Date(v.lastEdited);
        const lastTouchedDate = new Date(lastTouched && lastTouched.lastEdited);
        if (!lastTouched || (lastTouchedDate < date || isNaN(lastTouchedDate.getTime())))
        {
          return v;
        }
        return lastTouched;
      },
      null,
    );

    let date = 'There are no variants';
    let username = 'There are no variants';
    if (lastTouched) {
      date = lastTouched.lastEdited;
      username = lastTouched.lastUsername;
    }

    let role = 'Viewer';
    if (roles && roles.getIn([this.props.groupId, username]))
    {
      if (roles && roles.getIn([this.props.groupId, username]).admin)
      {
        role = 'Admin';
      }
      else if (roles && roles.getIn([this.props.groupId, username]).builder)
      {
        role = 'Builder';
      }
    }

    return (
      <LibraryItem
        index={index}
        fadeIndex={fadeIndex}
        draggingItemIndex={this.state.draggingItemIndex}
        draggingOverIndex={this.state.draggingOverIndex}
        name={algorithm.name}
        icon={<AlgorithmIcon />}
        onDuplicate={this.handleDuplicate}
        onArchive={this.handleArchive}
        color={ColorManager.colorForKey(this.props.groupId)}
        key={algorithm.id}
        to={`/library/${this.props.groupId}/${algorithm.id}`}
        className="library-item-lighter"
        id={id}
        onNameChange={this.handleNameChange}
        type="algorithm"
        rendered={this.state.rendered}
        onHover={this.handleHover}
        onDropped={this.handleDropped}
        item={algorithm}
        canEdit={canEdit}
        canDrag={canDrag}
        canCreate={canDrag}
        canArchive={canArchive}
        canDuplicate={canDuplicate}
      >
        <div className="flex-container">
          <UserThumbnail username={username} medium={true} extra={role}/>
          <div className="flex-grow">
            <div className="library-item-line">
              <Scoreline
                scores={scores}
                hideZeroes={true}
              />
            </div>
            <div
              className="library-item-line"
            >
              { Util.formatDate(date) }

            </div>
          </div>
        </div>
      </LibraryItem>
    );
  }

  handleCategoryHover(statusString: string, id: ID)
  {
    const a = this.props.algorithms.get(id);
    const status = LibraryTypes.EAlgorithmStatus[statusString];
    if (a.status !== status)
    {
      Actions.algorithms.change(a.set('status', status) as Algorithm);
    }
  }

  renderCategory(status: LibraryTypes.EAlgorithmStatus)
  {
    const {algorithms} = this.props;
    const ids = this.props.algorithmsOrder.filter((id) => algorithms.get(id) && algorithms.get(id).status === status);
    const {me, roles} = this.state;
    const canCreate = me && roles && roles.getIn([this.props.groupId, me.username, 'admin']);

    return (
      <LibraryItemCategory
        status={LibraryTypes.EAlgorithmStatus[status]}
        key={status}
        onHover={this.handleCategoryHover}
        type="algorithm"
        titleHidden={status === LibraryTypes.EAlgorithmStatus.Live}
      >
        {
          ids.map(this.renderAlgorithm)
        }
        {
          ids.size === 0 && <div className="library-category-none">None</div>
        }
        {
          status === LibraryTypes.EAlgorithmStatus.Live && canCreate &&
            <CreateItem
              name="algorithm"
              onCreate={this.handleCreate}
            />
        }
      </LibraryItemCategory>
    );
  }

  render()
  {
    return (
      <LibraryColumn
        index={2}
        title="Algorithms"
      >
        {
          this.props.algorithmsOrder ?
            (
              this.props.algorithmsOrder.size ?
              (
                <div>
                  { this.renderCategory(LibraryTypes.EAlgorithmStatus.Live) }
                  { this.renderCategory(LibraryTypes.EAlgorithmStatus.Archive) }
                </div>
              )
              :
              <InfoArea
                large="No algorithms created, yet."
                button={
                  Util.haveRole(this.props.groupId, 'admin', UserStore, RolesStore)
                    ? 'Create a algorithm' : null
                  }
                onClick={this.handleCreate}
              />
            )
          : null
        }
      </LibraryColumn>
    );
  }
}

export default AlgorithmsColumn;
