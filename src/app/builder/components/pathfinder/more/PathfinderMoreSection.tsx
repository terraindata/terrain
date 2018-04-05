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
import { backgroundColor, borderColor, Colors, fontColor, getStyle } from '../../../../colors/Colors';
import TerrainComponent from './../../../../common/components/TerrainComponent';
const { List } = Immutable;
import { ColorsActions } from 'app/colors/data/ColorsRedux';
import FadeInOut from 'app/common/components/FadeInOut';
import FloatingInput from 'app/common/components/FloatingInput';
import MultiInput from 'app/common/components/MultiInput';
import RadioButtons from 'app/common/components/RadioButtons';
import { tooltip } from 'app/common/components/tooltip/Tooltips';
import TQLEditor from 'app/tql/components/TQLEditor';
import Util from 'app/util/Util';
import ExpandIcon from 'common/components/ExpandIcon';
import RouteSelector from 'common/components/RouteSelector';
import { FieldType } from '../../../../../../shared/builder/FieldTypes';
import BuilderActions from '../../../data/BuilderActions';
import PathfinderArea from '../PathfinderArea';
import PathfinderCreateLine from '../PathfinderCreateLine';
import PathfinderSectionTitle from '../PathfinderSectionTitle';
import PathfinderText from '../PathfinderText';
import
{
  _AggregationLine, _ChoiceOption, _Param, _Path, _Script,
  More, Path, PathfinderContext, Script, Source,
} from '../PathfinderTypes';
import DragAndDrop, { DraggableItem } from './../../../../common/components/DragAndDrop';
import DragHandle from './../../../../common/components/DragHandle';
import PathfinderAggregationLine from './PathfinderAggregationLine';
import './PathfinderMoreStyle.less';

const RemoveIcon = require('images/icon_close_8x8.svg?name=RemoveIcon');

export interface Props
{
  pathfinderContext: PathfinderContext;
  count: number;
  scoreType: string;
  minMatches: number;
  more: More;
  keyPath: KeyPath;
  hideTitle?: boolean;
  colorsActions?: typeof ColorsActions;
  toSkip?: number;
  builderActions?: typeof BuilderActions;
}

class PathfinderMoreSection extends TerrainComponent<Props>
{

  public state: {
    sourceOpen: boolean,
    fieldOptions: List<any>,
  } = {
      sourceOpen: false,
      fieldOptions: List([]),
    };

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
    const { pathfinderContext } = this.props;
    const { source } = pathfinderContext;
    // this.setState({
    //   fieldOptions: source.dataSource.getChoiceOptions({
    //     type: 'fields',
    //     source,
    //     schemaState: pathfinderContext.schemaState,
    //     builderState: pathfinderContext.builderState,
    //     noNested: true,
    //   }),
    // });
  }

  // public componentWillReceiveProps(nextProps: Props)
  // {
  //   if (this.props.pathfinderContext.source.dataSource
  //     !== nextProps.pathfinderContext.source.dataSource)
  //   {
  //     const { pathfinderContext } = nextProps;
  //     const { source } = pathfinderContext;
  //     this.setState({
  //       fieldOptions: source.dataSource.getChoiceOptions({
  //         type: 'fields',
  //         source,
  //         schemaState: pathfinderContext.schemaState,
  //         builderState: pathfinderContext.builderState,
  //         noNested: true,
  //       }),
  //     });
  //   }
  // }

  public shouldComponentUpdate(nextProps: Props, nextState)
  {
    return !_.isEqual(nextProps, this.props) || !_.isEqual(nextState, this.state);
  }

  public handleAddScript()
  {
    const newScript = _Script();
    const keyPath = this._ikeyPath(this.props.keyPath, 'scripts');
    this.props.builderActions.changePath(keyPath, this.props.more.scripts.push(newScript));
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

  public getScoreTypeOptionSets()
  {
    const options = List([
      {
        value: 'terrain',
        displayName: PathfinderText.terrainTypeName,
        hasOther: false,
        extraContent: PathfinderText.terrainTypeExplanation,
      },
      {
        value: 'linear',
        displayName: PathfinderText.fieldTypeName,
        hasOther: false,
        extraContent: PathfinderText.fieldTypeExplanation,
      },
      {
        value: 'random',
        displayName: PathfinderText.randomTypeName,
        hasOther: false,
        extraContent: PathfinderText.randomTypeExplanation,
      },
      {
        value: 'elastic',
        displayName: PathfinderText.elasticTypeName,
        hasOther: false,
        extraContent: PathfinderText.elasticTypeExplanation,
      },
    ]);
    const optionSet = {
      key: 'type',
      options,
      shortNameText: PathfinderText.scoreTypeLabel,
      headerText: PathfinderText.scoreTypeExplanation,
      column: true,
      hideSampleData: true,
      hasSearch: false,
      forceFloat: true,
    };
    return List([optionSet]);
  }
  public getTrackScoresOptionSets()
  {
    const optionSet = {
      key: 'trackScore',
      options: List([{
        value: true,
        displayName: 'True',
      },
      {
        value: false,
        displayName: 'False',
      }]),
      shortNameText: PathfinderText.trackScoreTitle,
      headerText: PathfinderText.trackScoreTooltip,
      column: true,
      hideSampleData: true,
      hasSearch: false,
      forceFloat: true,
    };
    return List([optionSet]);
  }

  public getCollapseOptionSets()
  {
    const { pathfinderContext } = this.props;
    const { source } = pathfinderContext;
    const noneOption = _ChoiceOption({
      value: undefined,
      displayName: 'None',
    });
    const fieldOptions = List([noneOption]).concat(this.state.fieldOptions).toList();
    const fieldSet = {
      key: 'field',
      options: fieldOptions,
      shortNameText: PathfinderText.collapseTitle,
      headerText: PathfinderText.collapseTootlip, // 'Choose on which field to impose a condition',
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
            value: 0,
            displayName: 'None',
            hasOther: true,
            sampleData: List([]),
          },
          {
            value: 1,
            displayName: '1',
            hasOther: true,
            sampleData: List([]),
          },
          {
            value: 2,
            displayName: '2',
            hasOther: true,
            sampleData: List([]),
          },
          {
            value: 3,
            displayName: '3',
            hasOther: true,
            sampleData: List([]),
          },
          {
            value: 5,
            displayName: '5',
            hasOther: true,
            sampleData: List([]),
          },
          {
            value: 10,
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

  public handleMinMatchesChange(optionSetIndex: number, value: any)
  {
    const { keyPath } = this.props;
    const nestedKeyPath = this._ikeyPath(keyPath.skipLast(3).toList(), 'minMatches');
    this.props.builderActions.changePath(nestedKeyPath, value, true);
    this.props.builderActions.changePath(this._ikeyPath(keyPath.butLast().toList(), 'minMatches'), value);
  }

  public handleCollapseChange(optionSetIndex: number, value)
  {
    // if it is a text field, need to append .keyword
    const option = this.state.fieldOptions && this.state.fieldOptions.filter((opt) =>
      opt.value === value,
    ).toList().get(0);
    if (option && option.meta && option.meta.fieldType === FieldType.Text)
    {
      value += '.keyword';
    }
    this.props.builderActions.changePath(this._ikeyPath(this.props.keyPath, 'collapse'), value);
  }

  public handleTrackScoresChange(optionSetIndex: number, value)
  {
    this.props.builderActions.changePath(this._ikeyPath(this.props.keyPath, 'trackScores'), value);
  }

  public handleScoreTypeChange(optionSetIndex: number, value)
  {
    const keyPath = this._ikeyPath(this.props.keyPath.butLast().toList(), 'score', 'type');
    this.props.builderActions.changePath(keyPath, value);
  }

  public handleScriptValueChange(keys, value)
  {
    this.props.builderActions.changePath(
      this._ikeyPath(this.props.keyPath, ['scripts'].concat(keys)),
      value,
    );
  }

  public handleAddScriptParameter(i)
  {
    this.props.builderActions.changePath(
      this._ikeyPath(this.props.keyPath, 'scripts', i, 'params'),
      this.props.more.scripts.get(i).params.push(_Param({ name: '', value: '' })),
    );
  }

  public deleteScript(i)
  {
    const { pathfinderContext, keyPath, more } = this.props;
    const canEdit = pathfinderContext.canEdit && more.scripts.get(i).userAdded;
    if (!canEdit)
    {
      return;
    }
    this.props.builderActions.changePath(
      this._ikeyPath(keyPath, 'scripts'),
      more.scripts.splice(i, 1),
    );
  }

  public deleteParam(i, j)
  {
    const { pathfinderContext, keyPath, more } = this.props;
    const canEdit = pathfinderContext.canEdit && more.scripts.get(i).userAdded;
    if (!canEdit)
    {
      return;
    }
    this.props.builderActions.changePath(
      this._ikeyPath(keyPath, 'scripts', i, 'params'),
      more.scripts.get(i).params.splice(j, 1),
    );
  }

  public renderScripts(scripts)
  {
    const { canEdit } = this.props.pathfinderContext;
    const style = _.extend({}, backgroundColor(Colors().blockBg), borderColor(Colors().blockOutline));
    return (
      <div className='pf-more-scripts-wrapper'>
        {
          scripts.map((script: Script, i) =>
          {
            if (!script.userAdded)
            {
              return null;
            }
            const canEditScript = canEdit && script.userAdded;
            return (
              <div
                className='pf-more-script'
                key={i}
                style={style}
              >
                <div className='pf-more-script-name-wrapper'>
                  <ExpandIcon
                    open={script.expanded}
                    onClick={this._fn(this.handleScriptValueChange, [i, 'expanded'], !script.expanded)}
                  />
                  <FloatingInput
                    label='Script Name'
                    value={script.name}
                    onChange={this._fn(this.handleScriptValueChange, [i, 'name'])}
                    isTextInput={true}
                    debounce={true}
                    canEdit={canEditScript}
                  />
                  {
                    canEditScript &&
                    <RemoveIcon
                      onClick={this._fn(this.deleteScript, i)}
                      className='close pf-more-delete-script'
                    />
                  }
                </div>
                <FadeInOut
                  open={script.expanded}
                >
                  <div className='pf-more-paramater-label'>
                    Parameters
                  </div>
                  {
                    script.params.map((param, j) =>
                      <div
                        className='pf-more-script-param-wrapper'
                        key={j}
                      >
                        <FloatingInput
                          label='Paramater Name'
                          value={script.params.get(j).name}
                          onChange={this._fn(this.handleScriptValueChange, [i, 'params', j, 'name'])}
                          isTextInput={true}
                          canEdit={canEditScript}
                          debounce={true}
                        />
                        <FloatingInput
                          label='Paramater Value'
                          value={script.params.get(j).value}
                          onChange={this._fn(this.handleScriptValueChange, [i, 'params', j, 'value'])}
                          isTextInput={true}
                          canEdit={canEditScript}
                          debounce={true}
                        />
                        {
                          canEditScript &&
                          <RemoveIcon
                            onClick={this._fn(this.deleteParam, i, j)}
                            className='close pf-more-delete-param'
                          />
                        }
                      </div>,
                    )
                  }
                  {
                    canEditScript &&
                    <PathfinderCreateLine
                      canEdit={canEditScript}
                      onCreate={this._fn(this.handleAddScriptParameter, i)}
                      text={'Parameter'}
                      style={{ marginBottom: 2 }}
                      showText={true}
                    />
                  }
                  <TQLEditor
                    tql={script.script}
                    canEdit={canEditScript}
                    onChange={this._fn(this.handleScriptValueChange, [i, 'script'])}
                    placeholder={'Enter a script here'}
                    className='pf-more-script-script'
                    style={style}
                  />
                </FadeInOut>
              </div>
            );
          })}
      </div>
    );
  }

  public toggleExpanded(expanded)
  {
    this.props.builderActions.changePath(this._ikeyPath(this.props.keyPath, 'expanded'),
      expanded);
  }

  public renderSourceInputs(source: List<string>, customSource)
  {
    return (
      <div
        className='more-section-source-inputs'
      >
        <MultiInput
          canEdit={this.props.pathfinderContext.canEdit && customSource}
          items={source}
          onChange={this.handleSourceChange}
        />
      </div>
    );
  }

  public handleSourceChange(items: List<string>)
  {
    this.props.builderActions.changePath(this._ikeyPath(this.props.keyPath, 'source'), items);
  }

  public handleSourceTypeChange(key)
  {
    this.props.builderActions.changePath(this._ikeyPath(this.props.keyPath, 'customSource'), key === 'custom');
  }

  public renderSourceSection(source: List<string>, customSource: boolean)
  {
    const { sourceOpen } = this.state;
    return (
      <div
        className={classNames({
          'more-section-source-wrapper': true,
          'more-section-source-wrapper-closed': !sourceOpen,
        })}
        style={backgroundColor(Colors().fontWhite)}
      >
        <div
          className='more-section-source-title-wrapper'
          onClick={this._toggle('sourceOpen')}
          style={borderColor(Colors().blockOutline)}
        >
          <div
            className='more-section-source-title'
            style={fontColor(Colors().text3)}
          >
            {PathfinderText.sourceTitle}
          </div>
          {
            <div
              className='more-section-source-preview'
              style={fontColor(Colors().active)}
            >
              {
                !customSource ? 'All' :
                  source.map((val, i) => i === 0 ? val : ', ' + val)
              }
            </div>
          }
        </div>
        <FadeInOut
          open={sourceOpen}
        >
          <RadioButtons
            selected={customSource ? 'custom' : 'all'}
            canEdit={this.props.pathfinderContext.canEdit}
            options={List([
              {
                key: 'all',
                label: 'All',
              },
              {
                key: 'custom',
                label: 'Select Fields',
                display: this.renderSourceInputs(source, customSource),
              },
            ])}
            onSelectOption={this.handleSourceTypeChange}
          />
        </FadeInOut>
      </div>
    );
  }

  public render()
  {
    const { more } = this.props;
    const { canEdit } = this.props.pathfinderContext;
    const collapseValue = this.props.more.collapse ?
      this.props.more.collapse.replace('.keyword', '') : undefined;
    return (
      <div>
        <div
          className='pf-section pf-more-section'
        >
          {!this.props.hideTitle &&
            <PathfinderSectionTitle
              title={PathfinderText.moreSectionTitle}
              tooltipText={PathfinderText.moreSectionSubtitle}
              onExpand={this.toggleExpanded}
              canExpand={true}
              expanded={more.expanded}
            />
          }
          <FadeInOut
            open={more.expanded}
          >
            {
              <RouteSelector
                optionSets={this.getSizeOptionSets() /* TODO store in state? */}
                values={List([this.props.count])}
                onChange={this.handleSizePickerChange}
                canEdit={canEdit}
                defaultOpen={false}
                hideLine={true}
                autoFocus={true}
              />
            }
            <RouteSelector
              optionSets={this.getTrackScoresOptionSets()}
              values={List([more.trackScores])}
              onChange={this.handleTrackScoresChange}
              canEdit={canEdit}
              defaultOpen={false}
              autoFocus={true}
            />
            <RouteSelector
              optionSets={this.getScoreTypeOptionSets()}
              values={List([this.props.scoreType])}
              onChange={this.handleScoreTypeChange}
              canEdit={canEdit}
              defaultOpen={false}
            />
            {
              this.renderSourceSection(more.source, more.customSource)
            }
            {
              this.props.keyPath.includes('nested') ?
                <RouteSelector
                  optionSets={this.getMinMatchesOptionSets() /* TODO store in state? */}
                  values={List([this.props.minMatches])}
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
              {
                canEdit &&
                tooltip(
                  <PathfinderCreateLine
                    canEdit={canEdit}
                    onCreate={this.handleAddScript}
                    text={PathfinderText.addScript}
                    style={{ marginTop: -1, marginBottom: 2 }}
                    showText={true}
                  />,
                  {
                    title: PathfinderText.scriptExplanation,
                    arrow: false,
                  },
                )
              }
            </div>

          </FadeInOut>
        </div>
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
