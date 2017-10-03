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

// tslint:disable:restrict-plus-operands no-var-requires no-shadowed-variable strict-boolean-expressions switch-default

import * as Immutable from 'immutable';
import * as _ from 'lodash';
import memoizeOne from 'memoize-one';
import * as React from 'react';
import { browserHistory } from 'react-router';
import BackendInstance from '../../../database/types/BackendInstance';
import { ItemStatus } from '../../../items/types/Item';
import CreateLine from '../../common/components/CreateLine';
import Modal from '../../common/components/Modal';
import RolesStore from '../../roles/data/RolesStore';
import * as RoleTypes from '../../roles/RoleTypes';
import UserStore from '../../users/data/UserStore';
import * as UserTypes from '../../users/UserTypes';
import Util from '../../util/Util';
import Dropdown from './../../common/components/Dropdown';
import InfoArea from './../../common/components/InfoArea';
import Scoreline from './../../common/components/Scoreline';
import TerrainComponent from './../../common/components/TerrainComponent';
import UserThumbnail from './../../users/components/UserThumbnail';
import * as LibraryTypes from './../LibraryTypes';
import LibraryColumn from './LibraryColumn';
import LibraryItem from './LibraryItem';
import LibraryItemCategory from './LibraryItemCategory';

import './AlgorithmsColumn.less';

import { tooltip } from 'common/components/tooltip/Tooltips';

const AlgorithmIcon = require('./../../../images/icon_algorithm_16x13.svg?name=AlgorithmIcon');

type Group = LibraryTypes.Group;
type Algorithm = LibraryTypes.Algorithm;
type Variant = LibraryTypes.Variant;

export interface Props
{
  basePath: string;
  dbs: List<BackendInstance>;
  groups: Immutable.Map<ID, Group>;
  algorithms: Immutable.Map<ID, Algorithm>;
  variants: Immutable.Map<ID, Variant>;
  algorithmsOrder: Immutable.List<ID>;
  groupId: ID;
  params: any;
  isFocused: boolean; // is this the last thing focused / selected?
  algorithmActions: any;
}

class AlgorithmsColumn extends TerrainComponent<Props>
{
  public state: {
    rendered: boolean,
    me: UserTypes.User,
    roles: RoleTypes.RoleMap,
    lastMoved: string;
    draggingItemIndex: number;
    draggingOverIndex: number;
    creatingNewAlgorithm: boolean;
    newAlgorithmTextboxValue: string;
    newAlgorithmDbIndex: number;
    duplicatingAlgorithm: boolean;
    duplicateAlgorithmTextboxValue: string;
    duplicateAlgorithmId: ID;
    duplicateAlgorithmGroupIndex: number;
  } = {
    rendered: false,
    me: null,
    roles: null,
    lastMoved: '',
    draggingItemIndex: -1,
    draggingOverIndex: -1,
    creatingNewAlgorithm: false,
    newAlgorithmTextboxValue: '',
    newAlgorithmDbIndex: -1,
    duplicatingAlgorithm: false,
    duplicateAlgorithmTextboxValue: '',
    duplicateAlgorithmId: '',
    duplicateAlgorithmGroupIndex: 0,
  };

  constructor(props)
  {
    super(props);
    this.getSortedDatabases = memoizeOne(this.getSortedDatabases);
  }

  public componentWillMount()
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

  public componentDidMount()
  {
    this.setState({
      rendered: true,
    });
  }

  public componentDidUpdate()
  {
    if (!this.state.rendered)
    {
      this.setState({
        rendered: true,
      });
    }
  }

  public componentWillReceiveProps(nextProps)
  {
    if (nextProps.groupId !== this.props.groupId)
    {
      this.setState({
        rendered: false,
      });
    }
  }

  public getSortedDatabases(dbs)
  {
    return Util.sortDatabases(dbs);
  }

  public getNewAlgorithmIndex(): number
  {
    const { groups } = this.props;
    const dbs = this.getSortedDatabases(this.props.dbs);
    const group = groups.get(this.props.groupId);

    if (this.state.newAlgorithmDbIndex !== -1)
    {
      return this.state.newAlgorithmDbIndex;
    }
    else
    {
      return dbs && group.db && dbs.findIndex((db) => db.id === group.db.id);
    }
  }

  public handleAlgorithmDuplicateClose()
  {
    this.setState({
      duplicatingAlgorithm: false,
      duplicateAlgorithmTextboxValue: '',
    });
  }

  public handleAlgorithmDuplicateConfirm()
  {
    const id = this.state.duplicateAlgorithmId;
    const index = this.props.algorithmsOrder.findIndex((iid) => iid === id);
    const dbs = this.getSortedDatabases(this.props.dbs);
    const dbIndex = this.getNewAlgorithmIndex();
    const sorted = this.props.groups.sortBy((group) => group.id);
    this.props.algorithmActions.duplicate(
      this.props.algorithms.get(id),
      this.props.algorithmsOrder.findIndex((iid) => iid === id),
      this.state.duplicateAlgorithmTextboxValue,
      dbs.get(dbIndex),
      sorted[this.state.duplicateAlgorithmGroupIndex].id,
    );
    this.setState({
      duplicatingAlgorithm: false,
      duplicateAlgorithmTextboxValue: '',
    });
  }

  public handleDuplicateAlgorithmTextboxChange(value)
  {
    this.setState({
      duplicateAlgorithmTextboxValue: value,
    });
  }

  public handleDuplicateAlgorithmGroupChange(value)
  {
    this.setState({
      duplicateAlgorithmGroupIndex: value,
    });
  }

  public handleDuplicate(id: ID)
  {
    const dbs = this.getSortedDatabases(this.props.dbs);
    const options = dbs ? dbs.filter((db) => db.type === 'elastic').map((db) => db.name + ` (${db.type})`).toList() : [];
    let selected;
    const algorithm = this.props.algorithms.get(id);
    if (algorithm !== undefined)
    {
      selected = algorithm.db.name + ` (${algorithm.db.type})`;
    }

    const groupNames = this.getSortedGroupNames();
    const currGroupName = this.props.groups.get(algorithm.groupId).name;
    this.setState({
      duplicateAlgorithmId: id,
      duplicateAlgorithmTextboxValue: Util.duplicateNameFor(this.props.algorithms.get(id).name),
      duplicatingAlgorithm: true,
      newAlgorithmDbIndex: options.indexOf(selected),
      duplicateAlgorithmGroupIndex: groupNames.indexOf(currGroupName),
    });
  }

  public getSortedGroupNames()
  {
    const groupNames = [];
    const sorted = this.props.groups.sortBy((group) => group.id);
    sorted.map((value) =>
    {
      groupNames.push(value.name);
    });
    return groupNames;
  }

  public handleArchive(id: ID)
  {
    this.props.algorithmActions.change(
      this.props.algorithms.get(id)
        .set('status', ItemStatus.Archive) as Algorithm,
    );
  }

  public handleUnarchive(id: ID)
  {
    this.props.algorithmActions.change(
      this.props.algorithms.get(id)
        .set('status', ItemStatus.Build) as Algorithm,
    );
  }

  public handleCreate()
  {
    this.props.algorithmActions.create(this.props.groupId);
  }

  public handleNameChange(id: ID, name: string)
  {
    this.props.algorithmActions.change(
      this.props.algorithms.get(id)
        .set('name', name) as Algorithm,
    );
  }

  public handleNewAlgorithmModalOpen()
  {
    let index = this.getNewAlgorithmIndex();
    if (index === -1)
    {
      index = 0;
    }
    this.setState({
      creatingNewAlgorithm: true,
      newAlgorithmDbIndex: index,
      newAlgorithmTextboxValue: '',
    });
  }

  public handleNewAlgorithmModalClose()
  {
    this.setState({
      creatingNewAlgorithm: false,
      newAlgorithmDbIndex: -1,
    });
  }

  public handleNewAlgorithmTextboxChange(value)
  {
    this.setState({
      newAlgorithmTextboxValue: value,
    });
  }

  public handleNewAlgorithmDbChange(dbIndex: number)
  {
    this.setState({
      newAlgorithmDbIndex: dbIndex,
    });
  }

  public handleNewAlgorithmCreated(algorithmId)
  {
    const { algorithms } = this.props;
    const groupId = algorithms.get(algorithmId).groupId;
    browserHistory.push(`/library/${groupId}/${algorithmId}`);
  }

  public handleNewAlgorithmCreate()
  {
    const dbs = this.getSortedDatabases(this.props.dbs);
    const index = this.getNewAlgorithmIndex();

    this.props.algorithmActions.createAs(
      this.props.groupId,
      this.state.newAlgorithmTextboxValue,
      dbs.get(index),
      this.handleNewAlgorithmCreated,
    );
  }

  public handleHover(index: number, type: string, id: ID)
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

  public handleDropped(id: ID, targetType: string, targetItem: any, shiftKey: boolean)
  {
    switch (targetType)
    {
      case 'group':
        if (shiftKey)
        {
          this.props.algorithmActions.duplicate(
            this.props.algorithms.get(id),
            0,
            targetItem.id,
          );
        }
        else
        {
          this.props.algorithmActions.move(
            this.props.algorithms.get(id),
            0,
            targetItem.id,
          );
        }
        break;
      case 'algorithm':
        this.props.algorithmActions.move(
          this.props.algorithms.get(id),
          this.props.algorithmsOrder.indexOf(targetItem.id),
          this.props.groupId,
        );
        break;
      case 'variant':
        // no good
        break;
    }
  }

  public handleDragFinish()
  {
    this.setState({
      draggingItemIndex: -1,
      draggingOverIndex: -1,
    });
  }

  public renderAlgorithm(id: ID, fadeIndex: number)
  {
    const { params, basePath } = this.props;
    const algorithm = this.props.algorithms.get(id);
    const index = this.props.algorithmsOrder.indexOf(id);
    const scores = {
      [ItemStatus.Archive]:
      {
        score: 0,
        color: LibraryTypes.colorForStatus(ItemStatus.Archive),
        name: 'Variants in Archived Status',
      },
      [ItemStatus.Build]:
      {
        score: 0,
        color: LibraryTypes.colorForStatus(ItemStatus.Build),
        name: 'Variants in Build Status',
      },
      [ItemStatus.Approve]:
      {
        score: 0,
        color: LibraryTypes.colorForStatus(ItemStatus.Approve),
        name: 'Variants in Approve Status',
      },
      [ItemStatus.Live]:
      {
        score: 0,
        color: LibraryTypes.colorForStatus(ItemStatus.Live),
        name: 'Variants in Live Status',
      },
      [ItemStatus.Default]:
      {
        score: 0,
        color: LibraryTypes.colorForStatus(ItemStatus.Default),
        name: 'Variants in Default Status',
      },
    };

    const variants = this.props.variants.filter(
      (v: Variant) =>
        v.algorithmId === id,
    );

    variants.map(
      (v: Variant) =>
      {
        if (v.status !== undefined)
        {
          scores[v.status].score++;
        }
      },
    );

    // scores.splice(0, 1); // remove Archived count
    const { me, roles } = this.state;
    const canArchive = (algorithm.status !== ItemStatus.Archive); // me && roles && roles.getIn([algorithm.groupId, me.id, 'admin']);
    const canDuplicate = true;
    const canRename = (scores[ItemStatus.Live].score === 0 && scores[ItemStatus.Default].score === 0);
    const canDrag = true; // me && roles && roles.getIn([algorithm.groupId, me.id, 'admin']);
    const canEdit = canDrag; // ||me && roles && roles.getIn([algorithm.groupId, me.id, 'admin']);
    // (me && roles && roles.getIn([algorithm.groupId, me.id, 'builder']));

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

    let date: string;
    let userId: string | number = 'There are no variants';
    if (lastTouched)
    {
      date = lastTouched.lastEdited;
      userId = lastTouched.lastUserId;
    }

    let role = 'Viewer';
    if (roles && roles.getIn([this.props.groupId, userId]))
    {
      if (roles && roles.getIn([this.props.groupId, userId]).admin)
      {
        role = 'Admin';
      }
      else if (roles && roles.getIn([this.props.groupId, userId]).builder)
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
        key={algorithm.id}
        to={`/${basePath}/${this.props.groupId}/${algorithm.id}`}
        className='library-item-lighter'
        id={id}
        onNameChange={this.handleNameChange}
        type='algorithm'
        rendered={this.state.rendered}
        onHover={this.handleHover}
        onDropped={this.handleDropped}
        onDragFinish={this.handleDragFinish}
        item={algorithm}
        canEdit={canEdit}
        canDrag={canDrag}
        canCreate={canDrag}
        canArchive={canArchive}
        canDuplicate={canDuplicate}
        canRename={canRename}
        isSelected={+algorithm.id === +params.algorithmId}
        isFocused={this.props.isFocused}
        canUnarchive={algorithm.status === ItemStatus.Archive}
        onUnarchive={this.handleUnarchive}
      >
        <div className='flex-container'>
          <UserThumbnail userId={userId} medium={true} />
          <div className='flex-grow'>
            <div className='library-item-line'>
              <Scoreline
                scores={_.values(scores)}
                hideZeroes={true}
              />
            </div>
            <div
              className='library-item-line'
            >
              {
                date === undefined ? 'There are no variants' :
                  'Most Recent Change: ' + Util.formatDate(date)
              }
            </div>
          </div>
        </div>
      </LibraryItem>
    );
  }

  public handleCategoryHover(statusString: string, id: ID)
  {
    const a = this.props.algorithms.get(id);
    if (a.status !== statusString && statusString !== undefined)
    {
      this.props.algorithmActions.change(a.set('status', statusString) as Algorithm);
    }
  }

  public renderCategory(status: ItemStatus)
  {
    const { algorithms } = this.props;
    const ids = this.props.algorithmsOrder.filter((id) => algorithms.get(id) && algorithms.get(id).status === status);
    const { me, roles } = this.state;
    const canCreate = true; // me && roles && roles.getIn([this.props.groupId, me.id, 'admin']);

    return (
      <LibraryItemCategory
        status={status}
        key={status}
        onHover={this.handleCategoryHover}
        type='algorithm'
        titleHidden={status === ItemStatus.Build}
      >
        {
          ids.map(this.renderAlgorithm)
        }
        {
          ids.size === 0 && <div className='library-category-none'>None</div>
        }
        {
          status === ItemStatus.Build && canCreate &&
          tooltip(
            <CreateLine onClick={this.handleNewAlgorithmModalOpen} open={false} />,
            {
              title: 'Create a New Algorithm',
              position: 'top',
            },
          )
        }
      </LibraryItemCategory>
    );
  }

  public renderDatabaseDropdown()
  {
    const dbs = this.getSortedDatabases(this.props.dbs);
    const options = dbs ? dbs.filter((db) => db.type === 'elastic').map((db) => db.name + ` (${db.type})`).toList() : [];
    return (
      <div className='new-algorithm-modal-child'>
        <div className='database-dropdown-wrapper'>
          <Dropdown
            selectedIndex={this.state.newAlgorithmDbIndex}
            options={options}
            onChange={this.handleNewAlgorithmDbChange}
            canEdit={true}
            directionBias={90}
            className='bic-db-dropdown'
          />
        </div>
      </div>
    );
  }

  public renderGroupDropdown()
  {
    const groupNames = this.getSortedGroupNames();
    return (
      <div className='new-algorithm-modal-child'>
        <div className='database-dropdown-wrapper'>
          <div className='duplicate-algorithm-child-message'>Please select a group for the duplicate algorithm.</div>
          <Dropdown
            selectedIndex={this.state.duplicateAlgorithmGroupIndex}
            options={Immutable.List(groupNames)}
            onChange={this.handleDuplicateAlgorithmGroupChange}
            canEdit={true}
            directionBias={90}
            className={'bic-db-dropdown'}
          />
        </div>
      </div>
    );
  }

  public renderDuplicateDropdowns()
  {
    return (
      <div>
        {this.renderDatabaseDropdown()}
        {this.renderGroupDropdown()}
      </div>
    );
  }

  public renderDuplicateAlgorithmModal()
  {
    const dbs = this.getSortedDatabases(this.props.dbs);
    const algorithm = this.props.algorithms.get(this.state.duplicateAlgorithmId);
    return (<Modal
      open={this.state.duplicatingAlgorithm}
      showTextbox={true}
      confirm={true}
      onClose={this.handleAlgorithmDuplicateClose}
      onConfirm={this.handleAlgorithmDuplicateConfirm}
      onTextboxValueChange={this.handleDuplicateAlgorithmTextboxChange}
      textboxValue={this.state.duplicateAlgorithmTextboxValue}
      title='Duplicate Algorithm'
      confirmButtonText='Duplicate'
      message='What would you like to name the duplicate algorithm?'
      textboxPlaceholderValue='Algorithm Name'
      children={this.renderDuplicateDropdowns()}
      childrenMessage='Please select a database for the duplicate algorithm.'
      allowOverflow={true}
      inputClassName='duplicate-algorithm-modal-input'
    />);
  }

  public renderCreateAlgorithmModal()
  {
    const dbs = this.getSortedDatabases(this.props.dbs);
    const canCreateAlgorithm: boolean = dbs && dbs.size > 0;

    return canCreateAlgorithm ?
      (<Modal
        open={this.state.creatingNewAlgorithm}
        showTextbox={true}
        confirm={true}
        onClose={this.handleNewAlgorithmModalClose}
        onConfirm={this.handleNewAlgorithmCreate}
        onTextboxValueChange={this.handleNewAlgorithmTextboxChange}
        title='New Algorithm'
        confirmButtonText='Create'
        message='What would you like to name the algorithm?'
        textboxPlaceholderValue='Algorithm Name'
        children={this.renderDatabaseDropdown()}
        childrenMessage='Please select a database'
        allowOverflow={true}
      />) :
      (<Modal
        open={this.state.creatingNewAlgorithm}
        onClose={this.handleNewAlgorithmModalClose}
        onTextboxValueChange={this.handleNewAlgorithmTextboxChange}
        title='Cannot Create New Algorithm'
        message='No databases available'
      />);
  }

  public render()
  {
    const { algorithms, algorithmsOrder, groupId } = this.props;

    return (
      <LibraryColumn
        index={2}
        title='Algorithms'
      >
        {
          this.renderCreateAlgorithmModal()
        }
        {
          this.renderDuplicateAlgorithmModal()
        }
        {
          algorithmsOrder ?
            (
              algorithmsOrder.size ?
                (
                  <div>
                    {
                      this.renderCategory('BUILD')
                    }
                    {
                      this.renderCategory('ARCHIVE')
                    }
                  </div>
                )
                :
                <InfoArea
                  large='No algorithms created, yet.'
                  button={
                    Util.haveRole(groupId, 'admin', UserStore, RolesStore)
                      ? 'Create a algorithm' : null
                  }
                  onClick={this.handleNewAlgorithmModalOpen}
                />
            )
            : null
        }
      </LibraryColumn>
    );
  }
}

export default AlgorithmsColumn;
