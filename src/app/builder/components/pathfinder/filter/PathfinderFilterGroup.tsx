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

// Copyright 2018 Terrain Data, Inc.

// tslint:disable:no-var-requires restrict-plus-operands strict-boolean-expressions

import * as classNames from 'classnames';
import * as Immutable from 'immutable';
import * as $ from 'jquery';
import * as _ from 'lodash';
import * as React from 'react';
import TerrainComponent from './../../../../common/components/TerrainComponent';
const { List } = Immutable;
import PathfinderText from 'app/builder/components/pathfinder/PathfinderText';
import Colors, { backgroundColor, borderColor, getStyle } from 'app/colors/Colors';
import BuilderTextbox from 'app/common/components/BuilderTextbox';
import LinearSelector from 'app/common/components/LinearSelector';
import ExpandIcon from 'common/components/ExpandIcon';
import { PathfinderLine } from '../PathfinderLine';
import { FilterGroup, FilterLine } from '../PathfinderTypes';
const CarrotIcon = require('images/icon_carrot.svg?name=CarrotIcon');
const CloseIcon = require('images/icon_close_8x8.svg?name=CloseIcon');
export interface Props
{
  filterGroup: FilterGroup;
  canEdit: boolean;
  depth?: number;
  keyPath: KeyPath;
  isSoftFilter?: boolean; // does this section apply to soft filters?
  onChange(keyPath: KeyPath, filterGroup: FilterGroup | FilterLine, notDirty?: boolean, fieldChange?: boolean);
  onDelete(keyPath: KeyPath);
}

const filterDropdownOptions = List(
  [
    'all',
    'any',
  ]);

class PathfinderFilterGroup extends TerrainComponent<Props>
{
  public state: {
    editingName: boolean,
  } = {
      editingName: false,
    };

  public render()
  {
    const { filterGroup, canEdit, depth } = this.props;
    return (
      <div
        className='pf-filter-group-header'
        style={_.extend({},
          backgroundColor(Colors().blockBg),
          borderColor(Colors().blockOutline))}
      >
        {
          this.state.editingName
            ?
            <BuilderTextbox
              value={filterGroup.name}
              keyPath={this._ikeyPath(this.props.keyPath, 'name')}
              canEdit={canEdit}
              action={this.props.onChange}
              // onBlur={this._toggle('editingName')}
              onKeyDown={this.handleKeyDown}
              autoFocus={true}
              autoDisabled={true}
            />
            :
            <div className='pf-filter-group-name-wrapper'>
              <ExpandIcon
                onClick={this._fn(
                  this.props.onChange,
                  this._ikeyPath(this.props.keyPath, 'collapsed'),
                  !filterGroup.collapsed)
                }
                open={!filterGroup.collapsed}
              />
              <div
                onClick={this._toggle('editingName')}
                className='pf-filter-group-name'
              >
                {filterGroup.name}
              </div>
            </div>
        }
        {
          canEdit &&
          <CloseIcon
            className='close'
            onClick={this.handleDelete}
          />
        }
        {
          !this.props.isSoftFilter &&
          <LinearSelector
            options={filterDropdownOptions}
            keyPath={this._ikeyPath(this.props.keyPath, 'minMatches')}
            selected={this.props.filterGroup.minMatches}
            allowCustomInput={false}
            canEdit={canEdit}
            action={this.props.onChange}
            hideOptions={true}
          />
        }
      </div>

    );
  }

  private handleKeyDown(e)
  {
    if (e.keyCode === 13 || e.keyCode === 9 || e.keyCode === 27)
    {
      this.setState({
        editingName: false,
      });
    }
  }

  // have to trim off the `filterGroup` key for onDelete to work
  private handleDelete()
  {
    this.props.onDelete(this.props.keyPath.butLast().toList());
  }
}

export default PathfinderFilterGroup;
