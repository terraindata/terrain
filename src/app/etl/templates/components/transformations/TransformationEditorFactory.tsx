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
// tslint:disable:no-var-requires import-spacing max-classes-per-file no-invalid-this

import * as classNames from 'classnames';
import TerrainComponent from 'common/components/TerrainComponent';
import * as _ from 'lodash';
import memoizeOne from 'memoize-one';
import * as Radium from 'radium';
import * as React from 'react';
import { backgroundColor, borderColor, buttonColors, Colors, fontColor, getStyle } from 'src/app/colors/Colors';
import Util from 'util/Util';

import * as Immutable from 'immutable';
const { List, Map } = Immutable;

import { TransformationNode } from 'etl/templates/FieldTypes';
import TransformationNodeType from 'shared/transformations/TransformationNodeType';
import TransformationsInfo from 'shared/transformations/TransformationsInfo';

import Autocomplete from 'common/components/Autocomplete';
import CheckBox from 'common/components/CheckBox';
import Dropdown from 'common/components/Dropdown';
import FadeInOut from 'common/components/FadeInOut';

// visitor components must use this
export interface TransformationEditorProps
{
  create: boolean; // whether or not the transformation is being created or edited
  transformation: TransformationNode;
  editTransformation: EditSignature;
  registerConfirmHandler: (childFn: () => void) => void;
}

type EditSignature = (transformationID, fieldNamesOrIDs?, options?) => void;

export type InputDeclarationType<keys extends string = string> =
  {
    [stateName in keys]: InputInfo
  };

interface InputInfo
{
  type: 'string' | 'number' | 'boolean';
  group?: string | number;
  displayName?: string;
  shouldShow?: (state) => boolean;
}

export type StateType<T extends InputDeclarationType<keyof T>> = {
  [st1 in keyof T]: string | number | boolean;
}; // I can't figure out how to narrow the type from the union

const emptyList = List([]);
function UNBOUND_renderInputElement(info: InputInfo, stateName: string, key) // need to be careful to always bind this
{
  if (info.type === 'boolean')
  {
    return (
      <div
        className='te-checkbox-row'
        key={key}
        onClick={() => this.setState({ [stateName]: !this.state[stateName] })}
      >
        <CheckBox
          className='te-checkbox'
          checked={this.state[stateName]}
          onChange={() => null}
        />
        <div className='te-label'> {info.displayName} </div>
      </div>
    );
  }
  else
  {
    return (
      <div className='te-autocomplete-block' key={key}>
        <div className='te-label' style={fontColor(Colors().text2)}> {info.displayName} </div>
        <Autocomplete
          className='te-autocomplete'
          value={this.state[stateName]}
          onChange={this._setStateWrapper(stateName)}
          options={emptyList}
        />
      </div>
    );
  }
}
function renderItemHOC<T extends InputDeclarationType>(
  info: InputInfo,
  stateName: string,
): (state: StateType<T>, index) => any
{
  function unboundRenderItem(state: StateType<T>, index)
  {
    const boundRenderInputElement: typeof UNBOUND_renderInputElement = UNBOUND_renderInputElement.bind(this);
    if (!info.shouldShow(state))
    {
      return null;
    }
    const inputComponent = boundRenderInputElement(info, stateName, index);
    return (inputComponent);
  }
  return unboundRenderItem;
}

type RenderMatrix = List<List<(state, key) => any>>;

function computeRenderMatrix<T extends InputDeclarationType>(inputMap: T)
{
  let renderMatrix: RenderMatrix = List([]);
  const groupToIndex = {};
  for (const stateName of Object.keys(inputMap))
  {
    const { group } = inputMap[stateName];
    const inputInfo = _.defaults(inputMap[stateName], { displayName: stateName, shouldShow: () => true });
    let useIndex = renderMatrix.size;
    if (group !== undefined)
    {
      if (groupToIndex[group] === undefined)
      {
        groupToIndex[group] = useIndex;
      }
      else
      {
        useIndex = groupToIndex[group];
      }
    }
    renderMatrix = renderMatrix.updateIn([useIndex], List([]), (value) =>
    {
      return value.push(renderItemHOC<T>(inputInfo, stateName));
    });
  }
  return renderMatrix;
}

function defaultObject(inputMap: InputDeclarationType)
{
  const defaultObj = {};
  _.forOwn(inputMap, (value, key) =>
  {
    switch (value.type)
    {
      case 'number':
        defaultObj[key] = 0;
        break;
      case 'boolean':
        defaultObj[key] = true;
        break;
      case 'string':
      default:
        defaultObj[key] = '';
    }
  });
  return defaultObj;
}

function computeDefaultStateFromNodeFactory(inputMap, defaultState): (node?: TransformationNode) => object
{
  return (node?: TransformationNode): object =>
  {
    if (node == null || node.meta == null)
    {
      return defaultState;
    }
    else
    {
      const extractedFromNodeMeta = _.pick(node.meta, Object.keys(inputMap));
      return _.defaults(extractedFromNodeMeta, defaultState);
    }
  };
}

export function TransformationEditorFactory<T extends InputDeclarationType>(
  inputMap: T,
  onConfirm?: (state: StateType<T>, editTransformation: EditSignature) => void,
  defaultFromNodeFn?: (node?: TransformationNode) => object,
  validateOptions?: (state: StateType<T>) => { error: string },
  dynamicPreview?: (state: StateType<T>, value) => any,
)
{
  // tslint:disable-next-line:variable-name
  const UNBOUND_RenderMatrix = computeRenderMatrix<T>(inputMap);

  const defaultState = defaultObject(inputMap);
  const defaultFromNode = defaultFromNodeFn !== undefined ?
    defaultFromNodeFn : computeDefaultStateFromNodeFactory(inputMap, defaultState);

  @Radium
  class NodeEditor extends TerrainComponent<TransformationEditorProps>
  {
    public renderMatrix: RenderMatrix = null;

    constructor(props)
    {
      super(props);
      this.renderMatrix = this.bindRenderMatrix(UNBOUND_RenderMatrix);
      this.state = this.getInitialState();
    }

    public getInitialState()
    {
      return defaultFromNode(this.props.transformation);
    }

    public bindRenderMatrix(matrix: RenderMatrix): RenderMatrix
    {
      return matrix.map((row, i) =>
      {
        return row.map((fn, j) =>
        {
          return fn.bind(this);
        }).toList();
      }).toList();
    }

    public confirmHandler()
    {
      // do nothing
    }

    public componentDidMount()
    {
      this.props.registerConfirmHandler(this.confirmHandler);
    }

    public renderMatrixRow(row, i)
    {
      return (
        <div key={i} className='te-matrix-row'>
          {
            row.map((fn, j) => fn(this.state, j)) // ultimately calls unboundRenderItem
          }
        </div>
      );
    }

    public render()
    {
      return (
        <div className='transformation-editor'>
          {
            this.renderMatrix.map(this.renderMatrixRow)
          }
        </div>
      );
    }
  }
  return NodeEditor;
}

const TestMap: InputDeclarationType = {
  from: {
    displayName: 'From Position',
    type: 'number',
  },
  length: {
    displayName: 'Length',
    type: 'number',
    group: 1,
  },
  test: {
    displayName: 'Do you want to do something?',
    type: 'boolean',
    group: 1,
  },
  otherTest: {
    displayName: 'Test String',
    type: 'string',
  },
  randomFlag: {
    displayName: 'How about this?',
    type: 'boolean',
  },
};

export const TestClass = TransformationEditorFactory(TestMap);
