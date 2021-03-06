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

// tslint:disable:strict-boolean-expressions

import * as Immutable from 'immutable';
import * as _ from 'lodash';
import * as React from 'react';
const { List } = Immutable;
import PathfinderText from 'app/builder/components/pathfinder/PathfinderText';
import BuilderActions from 'app/builder/data/BuilderActions';
import Colors from 'app/colors/Colors';
import { ColorsActions } from 'app/colors/data/ColorsRedux';
import CustomDragLayer from 'app/common/components/CustomDragLayer';
import DragDropGroup from 'app/common/components/DragDropGroup';
import DragDropItem from 'app/common/components/DragDropItem';
import DropZone from 'app/common/components/DropZone';
import { RouteSelectorOption, RouteSelectorOptionSet } from 'app/common/components/RouteSelector';
import Util from 'app/util/Util';
import FadeInOut from 'common/components/FadeInOut';
import PathfinderCreateLine from '../PathfinderCreateLine';
import PathfinderSectionTitle from '../PathfinderSectionTitle';
import
{
  _FilterGroup, _FilterLine, _ScoreLine, FilterGroup, FilterLine, Path,
  PathfinderContext, PathfinderSteps,
} from '../PathfinderTypes';
import TerrainComponent from './../../../../common/components/TerrainComponent';
import PathfinderFilterGroup from './PathfinderFilterGroup';
import PathfinderFilterLine from './PathfinderFilterLine';
import './PathfinderFilterStyle.less';

import * as TerrainLog from 'loglevel';

export interface Props
{
  pathfinderContext: PathfinderContext;
  filterGroup: FilterGroup;
  valueOptions: List<RouteSelectorOption>;
  keyPath: KeyPath;
  onStepChange?: (oldStep: PathfinderSteps) => void;
  toSkip?: number;
  isSoftFilter?: boolean; // does this section apply to soft filters?
  onAddScript?: (fieldName: string, lat: any, lon: any, name: string) => string;
  onDeleteScript?: (scriptName: string) => void;
  onUpdateScript?: (fieldName: string, name: string, lat?: any, lon?: any) => void;
  builderActions?: typeof BuilderActions;
  colorsActions?: typeof ColorsActions;
  path?: Path;
}

class PathfinderFilterSection extends TerrainComponent<Props>
{
  public state:
    {
      dragging: boolean,
      canDrag: boolean,
      fieldOptionSet: RouteSelectorOptionSet,
      addingFilterLine: boolean,
    } = {
      dragging: false,
      canDrag: true,
      fieldOptionSet: undefined,
      addingFilterLine: false,
    };

  public componentWillMount()
  {
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.drag-drop-item-header .pf-filter-group-header',
      style: { background: Colors().blockBg, border: 'none' },
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.drag-drop-item-header .pf-filter-group-header .close',
      style: { display: 'none' },
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.drag-drop-item-is-over',
      style: { background: Colors().blockBg },
    });
    this.setState({
      fieldOptionSet: this.getFieldOptionSet(this.props),
    });
  }

  public componentWillReceiveProps(nextProps: Props)
  {
    const newOptions = this.getFieldOptionSet(nextProps);
    if (Immutable.is(newOptions.options, this.state.fieldOptionSet.options) === false)
    {
      TerrainLog.debug('Update options, new size ' + String(newOptions.options.size));
      this.setState({
        fieldOptionSet: newOptions,
      });
    }
  }

  public getFieldOptionSet(props: Props)
  {
    const { pathfinderContext, isSoftFilter } = props;
    const { source } = pathfinderContext;
    const fieldOptions = source.dataSource.getChoiceOptions({
      type: 'fields',
      source,
      schemaState: pathfinderContext.schemaState,
      builderState: pathfinderContext.builderState,
      // subtype: isSoftFilter ? 'match' : undefined,
    });

    const fieldSet: RouteSelectorOptionSet = {
      key: 'field',
      options: fieldOptions,
      shortNameText: 'Data Field',
      headerText: '', // 'Choose on which field to impose a condition',
      column: true,
      hideSampleData: true,
      hasSearch: true,
      forceFloat: true,
      // hasOther: false,
    };
    return fieldSet;
  }

  public handleAddFilter()
  {
    if (!this.state.addingFilterLine)
    {
      const newLines = this.props.filterGroup.lines.push(_FilterLine());
      this.props.builderActions.changePath(this._ikeyPath(this.props.keyPath, 'lines'), newLines);
      // When a line is created, it is automatically open so we should disable dradgging
      this.setState({
        canDrag: false,
        addingFilterLine: true,
      });

      const { path, isSoftFilter } = this.props;
      if (isSoftFilter && path !== undefined)
      {
        const hasMatchQuality = path.score.lines.some(
          (line) => line.field === '_score',
        );
        if (!hasMatchQuality)
        {
          // create a match quality score
          const newScoreLines = path.score.lines.push(_ScoreLine({
            field: '_score',
            transformData: {
              autoBound: true,
              scorePoints: [
                {
                  value: 0,
                  score: 0,
                  id: String(Math.random()),
                },
                {
                  value: 10,
                  score: 1,
                  id: String(Math.random()),
                },
              ],
              domain: [0, 10],
              dataDomain: [0, 10],
            },
          }));
          this.props.builderActions.changePath(
            this.props.keyPath.butLast().toList().push('score').push('lines'),
            newScoreLines,
          );
        }
      }
    }
  }

  public insertIn(items, keyPath, item): List<any>
  {
    // If key path is just a single value, do a normal insert
    if (keyPath.size === 1)
    {
      return items.insert(keyPath.first(), item);
    }
    // get the sub-list that item will be inserted into
    let listToInsert = items.getIn(keyPath.butLast());
    // Insert the item into the list at the position that is the last value of keypath
    listToInsert = listToInsert.insert(keyPath.last(), item);
    // Update the whole list of items to have the inserted list
    return items.setIn(keyPath.butLast(), listToInsert);
  }

  // Check if something in a nested list moved "down" (visually moved to a lower position on the screen)
  public movedDown(oldKeyPath, newKeyPath): boolean
  {
    let i = 0;
    while (i < oldKeyPath.size && i < newKeyPath.size)
    {
      if (oldKeyPath.get(i) < newKeyPath.get(i))
      {
        return true;
      }
      if (oldKeyPath.get(i) > newKeyPath.get(i))
      {
        return false;
      }
      i++;
    }
  }

  public handleFilterChange(
    keyPath: KeyPath,
    filter: FilterGroup | FilterLine,
    notDirty?: boolean,
    fieldChange?: boolean,
  )
  {
    const { isSoftFilter, filterGroup } = this.props;
    if (isSoftFilter)
    {
      if ((filter as any).boost !== undefined)
      {
        const skip: number = this.props.toSkip !== undefined ? this.props.toSkip : 3;
        const filterLine = filter as FilterLine;
        const oldFilterLine = filterGroup.getIn(keyPath.skip(skip).toList());
        if (filterLine.boost > filterGroup.maxBoost)
        {
          this.props.builderActions.changePath(this._ikeyPath(this.props.keyPath, 'maxBoost'), filterLine.boost);
        }
        else if (oldFilterLine.boost === filterGroup.maxBoost && filterLine.boost !== oldFilterLine.boost)
        {
          // Gets the set of lines that filterLine is a part of, and updates filterLine to its changed value so
          // that these lines can be used to calculate the maxBoost
          const newFilterGroup = filterGroup.setIn(keyPath.skip(skip).toList(), filterLine);
          const newBoost = findMaxBoost(newFilterGroup);
          if (newBoost !== filterGroup.maxBoost)
          {
            this.props.builderActions.changePath(this._ikeyPath(this.props.keyPath, 'maxBoost'), newBoost);
          }
        }
      }
    }
    this.props.builderActions.changePath(keyPath, filter, notDirty, fieldChange);
  }

  public handleFilterDelete(keyPath: KeyPath, filter?: FilterLine | FilterGroup)
  {
    if (filter && (filter as FilterLine).addScript)
    {
      this.props.onDeleteScript((filter as FilterLine).scriptName);
    }
    const skip: number = this.props.toSkip !== undefined ? this.props.toSkip : 3;
    const parentKeyPath = keyPath.butLast().toList();
    const parent = this.props.filterGroup.getIn(parentKeyPath.skip(skip).toList());
    const index = keyPath.last();
    const newLines = parent.splice(index, 1);
    this.props.builderActions.changePath(parentKeyPath, newLines);
    if (this.props.isSoftFilter && (!filter || (filter as any).boost === this.props.filterGroup.maxBoost))
    {
      const newBoost = findMaxBoost(
        this.props.filterGroup.setIn(parentKeyPath.skip(skip).toList(),
          newLines,
        ),
      );
      if (newBoost !== this.props.filterGroup.maxBoost)
      {
        this.props.builderActions.changePath(this._ikeyPath(this.props.keyPath, 'maxBoost'), newBoost);
      }
    }
  }

  public renderFilterLine(filterLine, keyPath: List<string | number>)
  {
    const { pathfinderContext, isSoftFilter } = this.props;

    const successorKeyPath = keyPath.unshift('lines').set(keyPath.size, (keyPath.last() as number) + 1);
    const successor = this.props.filterGroup.getIn(successorKeyPath);

    // make key path relative to entire Path object
    keyPath = this.props.keyPath.push('lines').concat(keyPath).toList();

    return (
      <PathfinderFilterLine
        filterLine={filterLine}
        canEdit={pathfinderContext.canEdit}
        keyPath={keyPath}
        onChange={this.handleFilterChange}
        onDelete={this.handleFilterDelete}
        pathfinderContext={pathfinderContext}
        comesBeforeAGroup={successor && this.isGroup(successor)}
        isSoftFilter={isSoftFilter}
        fieldOptionSet={this.state.fieldOptionSet}
        valueOptions={this.props.valueOptions}
        onToggleOpen={this.handleFilterOpen}
        onAddScript={this.props.onAddScript}
        onDeleteScript={this.props.onDeleteScript}
        onUpdateScript={this.props.onUpdateScript}
        maxBoost={Math.max(10, this.props.filterGroup.maxBoost)}
      />
    );
  }

  public handleFilterOpen(open: boolean)
  {
    this.setState({
      canDrag: !open,
      addingFilterLine: open,
    });
  }

  public renderGroupHeader(group, keyPath)
  {
    const { pathfinderContext, isSoftFilter } = this.props;
    // make key path relative to entire Path object
    keyPath = this.props.keyPath.push('lines').concat(keyPath).toList();

    return (
      <PathfinderFilterGroup
        filterGroup={group}
        canEdit={pathfinderContext.canEdit}
        keyPath={keyPath}
        onChange={this.handleFilterChange}
        onDelete={this.handleFilterDelete}
        isSoftFilter={isSoftFilter}
      />
    );
  }

  public changeCollapsed(keyPath, value)
  {
    const kp = this.props.keyPath
      .push('lines')
      .concat(keyPath).toList()
      .push('filterGroup')
      .push('collapsed');
    this.props.builderActions.changePath(
      kp,
      value);
  }

  // When something is dropped into a drop zone (to reorder)
  public handleDrop(itemKeyPath, dropKeyPath, keepCollapse?)
  {
    // If the item did not move up or down, do nothing
    if (itemKeyPath.equals(dropKeyPath))
    {
      return;
    }
    let lines = this.props.filterGroup.lines;
    let item = lines.getIn(itemKeyPath);
    // When dropping a group into another group, keep it collapsed
    if (dropKeyPath.indexOf('filterGroup') !== undefined && this.isGroup(item))
    {
      item = item.setIn(['filterGroup', 'collapsed'], true);
    }
    else if (this.isGroup(item) && !keepCollapse)
    {
      item = item.setIn(['filterGroup', 'collapsed'], false);
    }
    lines = this.updateLines(lines, itemKeyPath, dropKeyPath, item, true);
    // Update the lines
    this.props.builderActions.changePath(this._ikeyPath(this.props.keyPath, 'lines'), lines);
  }

  // When something is dropped into a group
  public handleGroupDrop(dropKeyPath, dragKeyPath)
  {
    if (dropKeyPath.equals(dragKeyPath))
    {
      return;
    }
    let lines = this.props.filterGroup.lines;
    const droppedInto = lines.getIn(dropKeyPath);
    let dropped = lines.getIn(dragKeyPath);
    if (this.isGroup(dropped))
    {
      dropped = dropped.setIn(['filterGroup', 'collapsed'], true);
    }
    // if you dropped into a group, just do a normal "Reordering" because a new group isn't being created
    if (this.isGroup(droppedInto))
    {
      // act as if it was dropped into the last slot of droppedInto
      const lineSize = droppedInto.filterGroup.lines.size;
      this.handleDrop(dragKeyPath,
        dropKeyPath.concat(List(['filterGroup', 'lines', lineSize]).toList()), true);
      return;
    }
    let newItem;
    // If they were both single filters, create a new group
    if (!this.isGroup(dropped) && !this.isGroup(droppedInto))
    {
      const { groupCount } = this.props.filterGroup;
      const groupNumber: string = groupCount < 10 ? '0' + String(groupCount) : String(groupCount);
      newItem = _FilterLine({
        filterGroup: {
          lines: [droppedInto, dropped],
          name: 'Group ' + groupNumber,
        },
      });
      this.props.builderActions.changePath(this._ikeyPath(this.props.keyPath, 'groupCount'), groupCount + 1, true);
    }
    // If the dropped item was already a group, keep it's name and minMatches and append the line it was dropped onto
    else
    {
      newItem = _FilterGroup({
        lines: dropped.filterGroup.lines.insert(0, droppedInto),
        minMatches: dropped.filterGroup.minMatches,
        name: dropped.filterGroup.name,
      });
      // only update the group, not the line
      dropKeyPath = dropKeyPath.push('filterGroup');
    }
    lines = this.updateLines(lines, dragKeyPath, dropKeyPath, newItem);
    // Look for the thing that you dropped, if it is somewhere other than keyPath, remove it
    this.props.builderActions.changePath(this._ikeyPath(this.props.keyPath, 'lines'), lines);
  }

  // Given the lines and the new item, move the item from the dragKeyPath to the dropKeyPath
  public updateLines(lines, dragKeyPath, dropKeyPath, item, insert?)
  {
    // If the item moved down, insert it and then remove it
    if (this.movedDown(dragKeyPath, dropKeyPath))
    {
      // If the group that the item left is now empty, remove it too
      if (insert)
      {
        lines = this.insertIn(lines, dropKeyPath, item);
      }
      else
      {
        lines = lines.setIn(dropKeyPath, item);
      }
      lines = lines.deleteIn(dragKeyPath);
      const oldGroup = lines.getIn(dragKeyPath.butLast());
      if (oldGroup.size === 0)
      {
        lines = lines.removeIn(dragKeyPath.slice(0, -3));
      }
    }
    // If it moved up, remove it and then insert it
    else
    {
      lines = lines.deleteIn(dragKeyPath);
      const oldGroup = lines.getIn(dragKeyPath.butLast());
      // If the group that the item left is now empty, remove it too
      if (oldGroup.size === 0)
      {
        lines = lines.removeIn(dragKeyPath.slice(0, -3));
      }
      if (insert)
      {
        lines = this.insertIn(lines, dropKeyPath, item);
      }
      else
      {
        lines = lines.setIn(dropKeyPath, item);
      }
    }
    return lines;
  }

  public isGroup(item)
  {
    return item && item.filterGroup;
  }

  public handleStepChange()
  {
    const { step } = this.props.pathfinderContext;
    if (step === PathfinderSteps.Filter)
    {
      this.props.onStepChange(step);
    }
  }

  public toggleExpanded(expanded)
  {
    this.props.builderActions.changePath(this._ikeyPath(this.props.keyPath, 'collapsed'),
      !expanded);
  }

  public render()
  {
    const { filterGroup, pathfinderContext, isSoftFilter } = this.props;
    const { dragging } = this.state;
    const dropZoneStyle = { zIndex: dragging ? 20 : -1 };
    const itemStyle = { opacity: dragging ? 0.7 : 1 };
    const groupStyle = { opacity: dragging ? 0.7 : 1, zIndex: dragging ? 99 : 5 };
    const { canEdit } = this.props.pathfinderContext;
    let title = PathfinderText.hardFilterSectionTitle;
    let tooltip = PathfinderText.hardFilterSectionSubtitle;
    if (isSoftFilter)
    {
      title = PathfinderText.softFilterSectionTitle;
      tooltip = PathfinderText.softFilterSectionSubtitle;
    }

    return (
      <div
        className='pf-section pf-filter-section'
      >
        <PathfinderSectionTitle
          title={title}
          tooltipText={tooltip}
          canExpand={true}
          onExpand={this.toggleExpanded}
          expanded={!filterGroup.collapsed}
          contentCount={filterGroup.lines.count()}
        />
        <FadeInOut
          open={!filterGroup.collapsed}
        >
          <CustomDragLayer />
          <DropZone
            keyPath={List([0])}
            onDrop={this.handleDrop}
            style={dropZoneStyle}
          />
          {
            filterGroup.lines.map((line, i) =>
              <div
                key={line.id === -1 ? i : line.id /* dealing with id-less lines */}
              >
                {
                  !this.isGroup(line) ?
                    <DragDropItem
                      children={this.renderFilterLine(line, List([i]))}
                      keyPath={List([i])}
                      onDrop={this.handleGroupDrop}
                      canDrop={true}
                      data={line}
                      hoverHeader={this.renderGroupHeader(_FilterGroup(), List([]))}
                      style={itemStyle}
                      onDragStart={this._toggle('dragging')}
                      onDragStop={this._toggle('dragging')}
                      dropZoneStyle={dropZoneStyle}
                      canDrag={canEdit && this.state.canDrag}
                      useCustomDragLayer={true}
                    />
                    :
                    <DragDropGroup
                      canDrag={canEdit && this.state.canDrag}
                      items={line.filterGroup.lines}
                      data={line.filterGroup}
                      onDrop={this.handleGroupDrop}
                      keyPath={List([i])}
                      onReorder={this.handleDrop}
                      isGroup={this.isGroup}
                      keyPathStarter={List(['filterGroup', 'lines'])}
                      renderChildren={this.renderFilterLine}
                      renderHeader={this.renderGroupHeader}
                      setCollapsed={this.changeCollapsed}
                      hoverHeader={this.renderGroupHeader(_FilterGroup(), List([]))}
                      onDragStart={this._toggle('dragging')}
                      onDragStop={this._toggle('dragging')}
                      style={groupStyle}
                      dropZoneStyle={dropZoneStyle}
                      itemStyle={itemStyle}
                    />
                }
                <DropZone
                  keyPath={List([i + 1])}
                  onDrop={this.handleDrop}
                  style={_.extend(
                    {},
                    dropZoneStyle,
                    i === filterGroup.lines.size - 1 ? { top: 20 } : {})
                  }
                />
              </div>,
            )
          }
          {
            canEdit &&
            <PathfinderCreateLine
              canEdit={pathfinderContext.canEdit && !this.state.addingFilterLine}
              text={isSoftFilter ? PathfinderText.softFilterAdd : PathfinderText.hardFilterAdd}
              onCreate={this.handleAddFilter}
            />
          }
        </FadeInOut>
      </div>
    );
  }
}

export function applyToAllFilters(filterGroup: FilterGroup, fn: (filter: FilterLine) => void)
{
  filterGroup.lines.map((line) =>
  {
    fn(line);
    if (line.filterGroup !== null)
    {
      applyToAllFilters(line.filterGroup, fn);
    }
  });
}

export function findMaxBoost(filterGroup: FilterGroup): number
{
  let max = 0;
  applyToAllFilters(filterGroup, (line) =>
  {
    if (line.boost > max)
    {
      max = line.boost;
    }
  });
  return max;
}

export default Util.createTypedContainer(
  PathfinderFilterSection,
  [],
  {
    builderActions: BuilderActions,
    colorsActions: ColorsActions,
  },
);
