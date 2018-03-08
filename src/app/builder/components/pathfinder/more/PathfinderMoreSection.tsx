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

// tslint:disable:no-var-requires restrict-plus-operands strict-boolean-expressions

import * as classNames from 'classnames';
import * as Immutable from 'immutable';
import * as _ from 'lodash';
import * as React from 'react';
import { Colors, getStyle } from '../../../../colors/Colors';
import TerrainComponent from './../../../../common/components/TerrainComponent';
const { List } = Immutable;
import { ColorsActions } from 'app/colors/data/ColorsRedux';
import FadeInOut from 'app/common/components/FadeInOut';
import FloatingInput from 'app/common/components/FloatingInput';
import { tooltip } from 'app/common/components/tooltip/Tooltips';
import Util from 'app/util/Util';
import ExpandIcon from 'common/components/ExpandIcon';
import RouteSelector from 'common/components/RouteSelector';
import BuilderActions from '../../../data/BuilderActions';
import PathfinderArea from '../PathfinderArea';
import PathfinderCreateLine from '../PathfinderCreateLine';
import PathfinderSectionTitle from '../PathfinderSectionTitle';
import PathfinderText from '../PathfinderText';
import { _AggregationLine, _ChoiceOption, _Path, More, Path, PathfinderContext, Source } from '../PathfinderTypes';
import DragAndDrop, { DraggableItem } from './../../../../common/components/DragAndDrop';
import DragHandle from './../../../../common/components/DragHandle';
import PathfinderAggregationLine from './PathfinderAggregationLine';
import './PathfinderMoreStyle.less';
const RemoveIcon = require('images/icon_close_8x8.svg?name=RemoveIcon');

export interface Props
{
  pathfinderContext: PathfinderContext;
  path: Path;
  more: More;
  keyPath: KeyPath;
  hideTitle?: boolean;
  colorsActions?: typeof ColorsActions;
  toSkip?: number;
  builderActions?: typeof BuilderActions;
}

class PathfinderMoreSection extends TerrainComponent<Props>
{
  public componentWillMount()
  {
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.pf-line-wrapper .expand',
      style: getStyle('fill', Colors().iconColor),
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.pf-aggregation-arrow-open',
      style: { fill: Colors().active + ' !important' },
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.pf-aggregation-arrow-advanced',
      style: getStyle('fill', Colors().iconColor),
    });
  }

  public shouldComponentUpdate(nextProps, nextState)
  {
    return !_.isEqual(nextProps, this.props) || !_.isEqual(nextState, this.state);
  }

  public handleReferenceChange(i, value)
  {
    const { keyPath } = this.props;
    this.props.builderActions.changePath(this._ikeyPath(keyPath, 'references', i), value);
    if (this.props.path.nested.get(i) === undefined)
    {
      const nestedKeyPath = this._ikeyPath(keyPath.butLast().toList(), 'nested', i);
      this.props.builderActions.changePath(nestedKeyPath, _Path({ name: '', step: 0 }), true);
    }
  }

  public handleAddNested()
  {
    this.props.builderActions.changePath(this._ikeyPath(this.props.keyPath, 'references'),
      this.props.more.references.push(''));
    const nestedKeyPath = this._ikeyPath(this.props.keyPath.butLast().toList(), 'nested');
    this.props.builderActions.changePath(nestedKeyPath, this.props.path.nested.push(undefined));
  }

  public handleDeleteNested(i)
  {
    if (this.props.pathfinderContext.canEdit)
    {
      this.props.builderActions.changePath(
        this._ikeyPath(this.props.keyPath, 'references'),
        this.props.more.references.splice(i, 1),
        true,
      );
      const nestedKeyPath = this._ikeyPath(this.props.keyPath.butLast().toList(), 'nested');
      this.props.builderActions.changePath(
        nestedKeyPath,
        this.props.path.nested.splice(i, 1));
    }
  }

  public handleAddLine()
  {
    const newLines = this.props.more.aggregations.push(_AggregationLine());
    this.props.builderActions.changePath(this._ikeyPath(this.props.keyPath, 'aggregations'), newLines);
  }

  public handleDeleteLine(index)
  {
    const newLines = this.props.more.aggregations.delete(index);
    this.props.builderActions.changePath(this._ikeyPath(this.props.keyPath, 'aggregations'), newLines);
  }

  public handleLinesReorder(items)
  {
    const newOrder = items.map((line) => line.key);
    const newLines = newOrder.map((index) =>
    {
      return this.props.more.aggregations.get(index);
    });
    this.props.builderActions.changePath(this._ikeyPath(this.props.keyPath, 'aggregations'), newLines);
  }

  public getAggregationLines()
  {
    const lines: List<DraggableItem> = this.props.more.aggregations.map((agg, i) =>
    {
      return {
        content: <PathfinderAggregationLine
          pathfinderContext={this.props.pathfinderContext}
          aggregation={agg}
          keyPath={this._ikeyPath(this.props.keyPath, 'aggregations').push(i)}
          onDelete={this.handleDeleteLine}
          index={i}
          key={i}
        />,
        key: i,
        draggable: true,
        dragHandle: <DragHandle />,
      };
    }).toList();
    return lines;
  }

  public renderPath(path: Path, i: number)
  {
    return (
      <PathfinderArea
        path={path}
        canEdit={this.props.pathfinderContext.canEdit}
        schema={this.props.pathfinderContext.schemaState}
        keyPath={this.props.keyPath.butLast().toList().push('nested').push(i)}
        toSkip={this.props.toSkip + 2} // Every time you nest, the filter section needs to know how nested it is
      />
    );
  }

  public getSizeOptionSets()
  {
    return List([
      {
        key: 'value',
        options: List([
          {
            value: 'all',
            displayName: 'All',
            hasOther: true,
            sampleData: List([]),
          },
          {
            value: '1',
            displayName: '1',
            hasOther: true,
            sampleData: List([]),
          },
          {
            value: '3',
            displayName: '3',
            hasOther: true,
            sampleData: List([]),
          },
          {
            value: '10',
            displayName: '10',
            hasOther: true,
            sampleData: List([]),
          },
          {
            value: '100',
            displayName: '100',
            hasOther: true,
            sampleData: List([]),
          },
        ]),
        hasOther: true,
        shortNameText: 'Size',
        headerText: 'Size',
        column: true,
        hideSampleData: true,
        // hasOther: false,
      },
    ]);
  }

  public getCollapseOptionSets()
  {
    const { pathfinderContext } = this.props;
    const { source } = pathfinderContext;
    let fieldOptions = source.dataSource.getChoiceOptions({
      type: 'fields',
      source,
      schemaState: pathfinderContext.schemaState,
      builderState: pathfinderContext.builderState,
      // subtype: isSoftFilter ? 'match' : undefined,
    });
    const noneOption = _ChoiceOption({
      value: undefined,
      displayName: 'None',
    });
    fieldOptions = List([noneOption]).concat(fieldOptions).toList();
    const fieldSet = {
      key: 'field',
      options: fieldOptions,
      shortNameText: 'Collapse',
      headerText: 'Collapse results with the same', // 'Choose on which field to impose a condition',
      column: true,
      hideSampleData: true,
      hasSearch: true,
      forceFloat: true,
      getCustomDisplayName: (value, index) => value || 'None',
    };

    return List([fieldSet]);
  }

  public getMinMatchesOptionSets()
  {
    return List([
      {
        key: 'value',
        options: List([
          {
            value: '1',
            displayName: '1',
            hasOther: true,
            sampleData: List([]),
          },
          {
            value: '2',
            displayName: '2',
            hasOther: true,
            sampleData: List([]),
          },
          {
            value: '3',
            displayName: '3',
            hasOther: true,
            sampleData: List([]),
          },
          {
            value: '5',
            displayName: '5',
            hasOther: true,
            sampleData: List([]),
          },
          {
            value: '10',
            displayName: '10',
            hasOther: true,
            sampleData: List([]),
          },
        ]),
        hasOther: true,
        shortNameText: 'Drop If Less Than',
        headerText: 'Drop If Less Than',
        column: true,
        hideSampleData: true,
        // hasOther: false,
      },
    ]);
  }

  public handleSizePickerChange(optionSetIndex: number, value: any)
  {
    if (value !== '')
    {
      this.props.builderActions.changePath(
        this
          .props
          .keyPath
          .butLast()
          .toList()
          .concat(
            List(['source', 'count'],
            )).toList(),
        value,
      );
    }
  }

  public handleNestedSizePickerChange(i: number, optionSetIndex: number, value: any)
  {
    const nestedKeyPath = this._ikeyPath(this.props.keyPath.butLast().toList(), 'nested', i);

    this.props.builderActions.changePath
      (nestedKeyPath.concat(List(['source', 'count'])).toList(), value);
  }

  public handleAlgorithmNameChange(i: number, value: any)
  {
    const nestedKeyPath = this._ikeyPath(this.props.keyPath.butLast().toList(), 'nested', i, 'name');
    this.props.builderActions.changePath(nestedKeyPath, value);
  }

  public handleMinMatchesChange(optionSetIndex: number, value: any)
  {
    const { keyPath } = this.props;
    const nestedKeyPath = this._ikeyPath(keyPath.butLast().toList(), 'minMatches');
    this.props.builderActions.changePath(nestedKeyPath, value);
  }

  public handleCollapseChange(optionSetIndex: number, value)
  {
    this.props.builderActions.changePath(this._ikeyPath(this.props.keyPath.push('collapse')), value);
  }

  public handleExpandNested(keyPath, expanded)
  {
    this.props.builderActions.changePath(keyPath, expanded);
  }

  public renderNestedPaths()
  {
    const { references } = this.props.more;
    const { nested } = this.props.path;
    const { canEdit } = this.props.pathfinderContext;
    const { keyPath } = this.props;
    return (
      <div>
        {
          references.map((ref, i) =>
          {
            const expanded = nested.get(i) !== undefined ? nested.get(i).expanded : false;
            return (
              <div
                className='pf-more-nested'
                key={i}
              >
                <div className='pf-more-nested-reference'>
                  <ExpandIcon
                    onClick={this._fn(
                      this.handleExpandNested,
                      this._ikeyPath(keyPath.butLast().toList(), 'nested', i, 'expanded'),
                      !expanded)}
                    open={expanded}
                  />
                  {
                    tooltip(
                      <FloatingInput
                        label={PathfinderText.referenceName}
                        isTextInput={true}
                        value={ref}
                        onChange={this._fn(this.handleReferenceChange, i)}
                        canEdit={canEdit}
                        className='pf-more-nested-reference-input'
                        noBg={true}
                        debounce={true}
                      />,
                      PathfinderText.referenceExplanation,
                    )
                  }
                  <FadeInOut
                    open={nested.get(i) !== undefined && nested.get(i).name !== undefined}
                  >
                    <FloatingInput
                      value={nested.get(i) !== undefined ? nested.get(i).name : undefined}
                      onChange={this._fn(this.handleAlgorithmNameChange, i)}
                      label={PathfinderText.innerQueryName}
                      isTextInput={true}
                      canEdit={canEdit}
                      className='pf-more-nested-name-input'
                      noBg={true}
                      debounce={true}
                    />
                  </FadeInOut>
                  {
                    canEdit &&
                    <RemoveIcon
                      onClick={this._fn(this.handleDeleteNested, i)}
                      className='pf-more-nested-remove close'
                    />
                  }
                </div>
                <FadeInOut
                  open={expanded}
                >
                  {this.renderPath(nested.get(i), i)}
                </FadeInOut>
              </div>
            );
          })
        }
      </div>
    );
  }

  public renderScripts(scripts)
  {
    return (
      <div>
        {
          scripts.map((script) =>
            <div>
              <div>{script.name}</div>
              <div>Params: </div>
              <textarea>{script.script}</textarea>
            </div>
          )
        }
      </div>
    );
  }

  public toggleExpanded(expanded)
  {
    this.props.builderActions.changePath(this._ikeyPath(this.props.keyPath, 'expanded'),
      expanded);
  }

  public render()
  {
    const { canEdit } = this.props.pathfinderContext;
    return (
      <div
        className='pf-section pf-more-section'
      >
        {!this.props.hideTitle &&
          <PathfinderSectionTitle
            title={PathfinderText.moreSectionTitle}
            tooltipText={PathfinderText.moreSectionSubtitle}
            onExpand={this.toggleExpanded}
            canExpand={true}
            expanded={this.props.more.expanded}
          />
        }
        {
          // <RouteSelector
          //   optionSets={this.getSizeOptionSets() /* TODO store in state? */}
          //   values={List([this.props.path.source.count])}
          //   onChange={this.handleSizePickerChange}
          //   canEdit={canEdit}
          //   defaultOpen={false}
          //   hideLine={true}
          //   autoFocus={true}
          // />
        }
        <FadeInOut
          open={this.props.more.expanded}
        >
          <RouteSelector
            optionSets={this.getCollapseOptionSets()}
            values={List([this.props.more.collapse])}
            onChange={this.handleCollapseChange}
            canEdit={canEdit}
            defaultOpen={false}
            autoFocus={true}
          />
          {
            this.props.keyPath.includes('nested') ?
              <RouteSelector
                optionSets={this.getMinMatchesOptionSets() /* TODO store in state? */}
                values={List([this.props.path.minMatches])}
                onChange={this.handleMinMatchesChange}
                canEdit={canEdit}
                defaultOpen={false}
                autoFocus={true}
              /> : null
          }
          {
            // <DragAndDrop
            //   draggableItems={this.getAggregationLines()}
            //   onDrop={this.handleLinesReorder}
            //   className='more-aggregations-drag-drop'
            // />
            // <PathfinderCreateLine
            //   canEdit={canEdit}
            //   onCreate={this.handleAddLine}
            //   text={PathfinderText.createAggregationLine}
            // />
          }
          {
            this.renderScripts(this.props.more.scripts)
          }
          <div>
            {this.renderNestedPaths()}
            {
              !this.props.keyPath.includes('nested') ?
                tooltip(
                  <PathfinderCreateLine
                    canEdit={canEdit}
                    onCreate={this.handleAddNested}
                    text={PathfinderText.createNestedLine}
                    style={{ marginTop: 12 }}
                  />,
                  PathfinderText.nestedExplanation,
                ) : null
            }
          </div>
        </FadeInOut>
      </div>
    );
  }
}

export default Util.createContainer(
  PathfinderMoreSection,
  ['colors'],
  {
    colorsActions: ColorsActions,
    builderActions: BuilderActions,
  },
);
