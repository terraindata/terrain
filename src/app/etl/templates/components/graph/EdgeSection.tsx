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
// tslint:disable:no-var-requires import-spacing
import * as classNames from 'classnames';
import TerrainComponent from 'common/components/TerrainComponent';
import * as Immutable from 'immutable';
import * as _ from 'lodash';
import memoizeOne from 'memoize-one';
import * as Radium from 'radium';
import * as React from 'react';
import { backgroundColor, borderColor, Colors, fontColor, getStyle } from 'src/app/colors/Colors';
import Util from 'util/Util';

const Color = require('color');
import Dropdown from 'common/components/Dropdown';
import { DynamicForm } from 'common/components/DynamicForm';
import { DisplayState, DisplayType, InputDeclarationMap } from 'common/components/DynamicFormTypes';
import ExpandableView from 'common/components/ExpandableView';
import Modal from 'common/components/Modal';
import { instanceFnDecorator } from 'shared/util/Classes';
import Quarantine from 'util/RadiumQuarantine';

import DocumentsHelpers from 'etl/helpers/DocumentsHelpers';
import GraphHelpers from 'etl/helpers/GraphHelpers';
import { TemplateEditorActions } from 'etl/templates/TemplateEditorRedux';
import { TemplateEditorState } from 'etl/templates/TemplateEditorTypes';
import
{
  _FileConfig,
  _SourceConfig,
  FileConfig,
  SinkConfig,
  SourceConfig,
} from 'shared/etl/immutable/EndpointRecords';
import { ETLTemplate } from 'shared/etl/immutable/TemplateRecords';
import { Sinks, Sources } from 'shared/etl/types/EndpointTypes';
import { NodeTypes } from 'shared/etl/types/ETLTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';

import './EdgeSection.less';
import ETLEdgeComponent from './ETLEdgeComponent';

const { List, Map } = Immutable;

export interface Props
{
  // below from container
  templateEditor: TemplateEditorState;
  act?: typeof TemplateEditorActions;
}

interface MergeFormState
{
  rightIdIndex: number;
  leftJoinKey: string;
  rightJoinKey: string;
  outputKey: string;
}

class EdgeSection extends TerrainComponent<Props>
{
  public state: {
    formState: MergeFormState,
  } = {
      formState: {
        rightIdIndex: -1,
        leftJoinKey: '',
        rightJoinKey: '',
        outputKey: '',
      },
    };

  public inputMap: InputDeclarationMap<MergeFormState> = {
    rightIdIndex: {
      type: DisplayType.Pick,
      displayName: 'Source to Merge (Right)',
      options: {
        pickOptions: (s) => this.calculateRightJoinOptions(),
      },
    },
    leftJoinKey: {
      type: DisplayType.TextBox,
      displayName: 'Left Join Field',
      options: {
        acOptions: (s) => this.calculateJoinKeys().left,
      },
    },
    rightJoinKey: {
      type: DisplayType.TextBox,
      displayName: 'Right Join Field',
      options: {
        acOptions: (s) => this.calculateJoinKeys().right,
      },
    },
    outputKey: {
      type: DisplayType.TextBox,
      displayName: 'Output Field Name',
    },
  };

  @instanceFnDecorator(memoizeOne)
  public _calculateRightJoinNodes(template: ETLTemplate): List<number>
  {
    return template.getMergeableNodes();
  }

  @instanceFnDecorator(memoizeOne)
  public _calculateRightJoinOptions(template: ETLTemplate): List<string>
  {
    return this._calculateRightJoinNodes(template).map((id) =>
    {
      const node = template.getNode(id);
      switch (node.type)
      {
        case NodeTypes.Source:
          return template.getSourceName(node.endpoint);
        case NodeTypes.Sink:
          return template.getSinkName(node.endpoint);
        default:
          return template.getNodeName(id);
      }
    }).toList();
  }

  public calculateRightJoinOptions(): List<string>
  {
    const { template } = this.props.templateEditor;
    return this._calculateRightJoinOptions(template);
  }

  public getRootFieldNames(engine: TransformationEngine): List<string>
  {
    return engine.getAllFieldIDs()
      .filter((id) => engine.getOutputKeyPath(id).size === 1)
      .map((id) => engine.getOutputKeyPath(id).get(0))
      .toList();
  }

  @instanceFnDecorator(memoizeOne)
  public _calculateJoinKeys(rightIdIndex: number, template: ETLTemplate, mergeIntoEdgeId: number)
  {
    try
    {
      const rightId = rightIdIndex !== -1 ?
        this._calculateRightJoinNodes(template).get(rightIdIndex)
        :
        -1;

      const leftEngine = template.getTransformationEngine(mergeIntoEdgeId);
      const rightEdgeId = template.findEdges((edge) => edge.from === rightId).first();
      const rightEngine = template.getTransformationEngine(rightEdgeId);

      const left = leftEngine !== undefined ? this.getRootFieldNames(leftEngine) : List([]);
      const right = rightEngine !== undefined ? this.getRootFieldNames(rightEngine) : List([]);

      return {
        left,
        right,
      };
    }
    catch (e)
    {
      return {
        left: List([]),
        right: List([]),
      };
    }
  }

  public calculateJoinKeys(): { left: List<string>, right: List<string> }
  {
    return this._calculateJoinKeys(
      this.state.formState.rightIdIndex,
      this.props.templateEditor.template,
      this.props.templateEditor.uiState.mergeIntoEdgeId,
    );
  }

  public renderMergeForm()
  {
    return (
      <DynamicForm
        inputMap={this.inputMap}
        inputState={this.state.formState}
        onStateChange={this._setStateWrapper('formState')}
      />
    );
  }

  public renderEdge(edge, edgeId)
  {
    return (
      <div
        key={edgeId}
      >
        <ETLEdgeComponent
          edge={edge}
          edgeId={edgeId}
        />
      </div>
    );
  }

  public validateMergeFormState()
  {
    const { rightIdIndex, leftJoinKey, rightJoinKey, outputKey } = this.state.formState;
    return rightIdIndex !== -1 && leftJoinKey !== '' && rightJoinKey !== '' && outputKey !== '';
  }

  public render()
  {
    const { templateEditor } = this.props;
    const { mergeIntoEdgeId } = templateEditor.uiState;
    return (
      <div className='edge-section'>
        {templateEditor.template.getEdges().map(this.renderEdge).toList()}
        <Modal
          open={mergeIntoEdgeId !== null}
          title='Merge Documents'
          onClose={this.closeMergeModal}
          onConfirm={this.confirmMerge}
          confirm={true}
          closeOnConfirm={this.validateMergeFormState()}
          allowOverflow={true}
        >
          {this.renderMergeForm()}
        </Modal>
      </div>
    );
  }

  public confirmMerge()
  {
    const { rightIdIndex, leftJoinKey, rightJoinKey, outputKey } = this.state.formState;
    const { templateEditor } = this.props;
    const { mergeIntoEdgeId } = templateEditor.uiState;

    const leftId = templateEditor.uiState.mergeIntoEdgeId;
    const rightId = rightIdIndex !== -1 ?
      this._calculateRightJoinNodes(templateEditor.template).get(rightIdIndex)
      :
      -1;
    GraphHelpers.createMergeJoin(leftId, rightId, leftJoinKey, rightJoinKey, outputKey);
  }

  public closeMergeModal()
  {
    this.props.act({
      actionType: 'setDisplayState',
      state: {
        mergeIntoEdgeId: null,
      },
    });
  }
}

// memoized
let getButtonStyle = (active: boolean, disabled: boolean) =>
{
  if (active)
  {
    return disabled ? [
      fontColor(Colors().activeText),
      backgroundColor(Colors().activeHover, Colors().activeHover),
      borderColor(Colors().altBg2),
    ] : [
        backgroundColor(Colors().active, Colors().activeHover),
        borderColor(Colors().active, Colors().activeHover),
        fontColor(Colors().activeText),
      ];
  }
  else
  {
    return disabled ? [
      fontColor(Colors().text3, Colors().text3),
      backgroundColor(Color(Colors().bg2).alpha(0.5).toString(), Color(Colors().bg2).alpha(0.5).toString()),
      borderColor(Colors().bg2),
    ] : [
        fontColor(Colors().text2, Colors().text3),
        backgroundColor(Colors().bg2, Color(Colors().bg2).alpha(0.5).toString()),
        borderColor(Colors().bg1),
      ];
  }
};
function resolveBooleans(a, b)
{
  return a ? (b ? 'tt' : 'tf') : (b ? 'ft' : 'ff');
}
getButtonStyle = _.memoize(getButtonStyle, resolveBooleans);

export default Util.createContainer(
  EdgeSection,
  [
    ['templateEditor'],
  ],
  { act: TemplateEditorActions },
);
