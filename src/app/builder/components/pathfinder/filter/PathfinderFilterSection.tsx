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

// tslint:disable:strict-boolean-expressions

import * as classNames from 'classnames';
import * as Immutable from 'immutable';
import * as $ from 'jquery';
import * as React from 'react';
import { altStyle, backgroundColor, borderColor, Colors, fontColor } from '../../../../colors/Colors';
import TerrainComponent from './../../../../common/components/TerrainComponent';
const { List, Map } = Immutable;
import PathfinderText from 'app/builder/components/pathfinder/PathfinderText';
import BuilderActions from 'app/builder/data/BuilderActions';
import DragAndDrop from 'app/common/components/DragAndDrop';
import DragHandle from 'app/common/components/DragHandle';
import { FilterGroup, FilterLine, Path, PathfinderContext, Source } from '../PathfinderTypes';
import PathfinderFilterCreate from './PathfinderFilterCreate';
import PathfinderFilterGroup from './PathfinderFilterGroup';
import PathfinderFilterLine from './PathfinderFilterLine';

export interface Props
{
  pathfinderContext: PathfinderContext;
  filterGroup: FilterGroup;
}

class PathfinderFilterSection extends TerrainComponent<Props>
{
  public state: {

  } = {

  };

  public render()
  {
    const { source, step, canEdit } = this.props.pathfinderContext;
    const { filterGroup } = this.props;

    // flatten tree
    const entries: FilterEntry[] = [];
    this.buildFilterTree(filterGroup, entries, 0, List(['query', 'path']));
    return (
      <div
        className='pf-section'
      >
        {
          entries.map(this.renderFilterEntry)
        }
      </div>
    );
  }

  private handleFilterChange(keyPath: KeyPath, filter: FilterGroup | FilterLine)
  {
    BuilderActions.change(keyPath, filter);
  }

  private handleFilterDelete(keyPath: KeyPath)
  {
    const parentKeyPath = keyPath.butLast().toList();
    const parent = this.props.filterGroup.getIn(parentKeyPath.skip(3).toList());
    const index = keyPath.last();
    console.log(keyPath, parentKeyPath, parent, index);
    BuilderActions.change(parentKeyPath, parent.splice(index, 1));
    // TODO consider 'removeIn' instead
  }

  private buildFilterTree(filterGroup: FilterGroup, entries: FilterEntry[], depth: number, keyPath: KeyPath): void
  {
    keyPath = keyPath.push('filterGroup');

    entries.push({
      filterGroup,
      depth,
      keyPath,
    });

    depth++;

    keyPath = keyPath.push('lines');

    filterGroup.lines.map((filterLine, index) =>
    {
      if (filterLine.filterGroup)
      {
        // it is a filter group
        this.buildFilterTree(filterLine.filterGroup, entries, depth, keyPath.push(index));
      }
      else
      {
        entries.push({
          filterLine,
          depth,
          keyPath: keyPath.push(index),
        });
      }
    });

    entries.push({
      isCreateSection: true,
      depth,
      keyPath: keyPath.push(filterGroup.lines.size),
    });
  }

  private renderFilterEntry(filterEntry: FilterEntry, index: number): El
  {
    const { pathfinderContext } = this.props;
    const { source, canEdit } = pathfinderContext;

    if (filterEntry.filterGroup)
    {
      return (
        <PathfinderFilterGroup
          filterGroup={filterEntry.filterGroup}
          canEdit={canEdit}
          depth={filterEntry.depth}
          keyPath={filterEntry.keyPath}
          onChange={this.handleFilterChange}
          key={index}
        />
      );
    }

    if (filterEntry.filterLine)
    {
      return (
        <PathfinderFilterLine
          filterLine={filterEntry.filterLine}
          canEdit={canEdit}
          depth={filterEntry.depth}
          keyPath={filterEntry.keyPath}
          onChange={this.handleFilterChange}
          onDelete={this.handleFilterDelete}
          key={index}
          pathfinderContext={pathfinderContext}
        />
      );
    }

    if (filterEntry.isCreateSection)
    {
      return (
        <PathfinderFilterCreate
          canEdit={canEdit}
          depth={filterEntry.depth}
          keyPath={filterEntry.keyPath}
          onChange={this.handleFilterChange}
          key={index}
        />
      );
    }

    throw new Error('Uncrecognized filter entry: ' + JSON.stringify(filterEntry));
  }
}

interface FilterEntry
{
  filterGroup?: FilterGroup;
  filterLine?: FilterLine;
  isCreateSection?: boolean;
  depth: number;
  keyPath: KeyPath;
}

export default PathfinderFilterSection;
