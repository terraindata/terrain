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
// tslint:disable:no-var-requires max-classes-per-file

import * as classNames from 'classnames';
import TerrainComponent from 'common/components/TerrainComponent';
import * as Immutable from 'immutable';
import * as _ from 'lodash';
import memoizeOne from 'memoize-one';
import * as Radium from 'radium';
import * as React from 'react';
import { instanceFnDecorator } from 'shared/util/Classes';
import { backgroundColor, borderColor, buttonColors, Colors, fontColor, getStyle } from 'src/app/colors/Colors';
import Util from 'util/Util';
const { List, Map } = Immutable;

import { DynamicForm } from 'common/components/DynamicForm';
import { DisplayState, DisplayType, InputDeclarationMap } from 'common/components/DynamicFormTypes';
import Modal from 'common/components/Modal';

import GraphHelpers from 'etl/helpers/GraphHelpers';
import { TemplateEditorActions } from 'etl/templates/TemplateEditorRedux';
import { TemplateEditorState } from 'etl/templates/TemplateEditorTypes';
import { etlFieldTypesList, etlFieldTypesNames, FieldTypes } from 'shared/etl/types/ETLTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import TransformationNodeType from 'shared/transformations/TransformationNodeType';
import { KeyPath as EnginePath } from 'shared/util/KeyPath';
import { mapDispatchKeys, mapStateKeys, TemplateEditorField, TemplateEditorFieldProps } from './TemplateEditorField';

import { TypeTracker } from 'shared/transformations/util/TypeTracker';

import * as Utils from 'shared/transformations/util/EngineUtils';
import * as yadeep from 'shared/util/yadeep';

const ErrorIcon = require('images/icon_info.svg');
import './EditorFieldModal.less';

interface Props
{
  // below from container
  uiState?: TemplateEditorState['uiState'];
  editorAct?: typeof TemplateEditorActions;
}

interface FormState
{
  type: FieldTypes;
  childType?: FieldTypes;
}

function computeType(docs: List<object>, path: KeyPath): { type: FieldTypes, childType?: FieldTypes }
{
  const errs = [];
  const tracker = new TypeTracker(path);

  docs.forEach((doc) => {
    for (const { value, location } of yadeep.search(doc, path))
    {
      tracker.push(value);
    }
  });
  const type = tracker.getType();
  let childType = FieldTypes.String;
  if (type === FieldTypes.Array)
  {
    const arrPath = path.push(-1);
    const arrTracker = new TypeTracker(arrPath);
    docs.forEach((doc) => {
      for (const { value, location } of yadeep.search(doc, arrPath))
      {
        arrTracker.push(value);
      }
    });
    childType = arrTracker.getType();
  }
  return {
    type,
    childType,
  };
}

class AddUnrecognizedFieldModal extends TerrainComponent<Props>
{
  public state: {
    suggestedType: FieldTypes,
    suggestedChildType: FieldTypes,
    formState: FormState,
  } = {
    suggestedType: null,
    suggestedChildType: null,
    formState: {
      type: FieldTypes.String,
      childType: FieldTypes.String,
    },
  };

  public inputMap: InputDeclarationMap<FormState> = {
    type: {
      type: DisplayType.Pick,
      displayName: 'New Type',
      options: {
        pickOptions: (s) => etlFieldTypesList,
        indexResolver: (value) => etlFieldTypesList.indexOf(value),
        displayNames: (s) => etlFieldTypesNames,
      },
    },
    childType: {
      type: DisplayType.Pick,
      displayName: 'Array Type',
      getDisplayState: (s) => s.type === FieldTypes.Array ? DisplayState.Active : DisplayState.Hidden,
      options: {
        pickOptions: (s) => etlFieldTypesList,
        indexResolver: (value) => etlFieldTypesList.indexOf(value),
        displayNames: (s) => etlFieldTypesNames,
      },
    },
  };

  public computeIfNecessary(path: KeyPath)
  {
    try {
      const { formState, suggestedType, suggestedChildType } = this.state;
      if (path !== null && suggestedType === null)
      {
        const docs = this.props.uiState.documents;
        if (docs != null && docs.size > 0)
        {
          const { type, childType } = computeType(docs, path);
          this.setState({
            suggestedType: type,
            suggestedChildType: childType,
            formState: {
              type,
              childType,
            },
          });
        }
      }
    }
    catch (e)
    {
      this.setState({
        suggestedType: FieldTypes.String,
        suggestedChildType: FieldTypes.String,
        formState: {
          type: FieldTypes.String,
          childType: FieldTypes.String,
        },
      });
      this.props.editorAct({
        actionType: 'addModal',
        props: {
          title: 'Error',
          message: `Could Not Detect Type: ${e}`,
          error: true,
        },
      });
    }
  }

  public componentDidMount()
  {
    this.computeIfNecessary(this.props.uiState.addUnrecognizedPath);
  }

  public componentWillReceiveProps(nextProps)
  {
    const currPath = this.props.uiState.addUnrecognizedPath;
    const nextPath = nextProps.uiState.addUnrecognizedPath;
    if (nextPath !== null && !nextPath.equals(currPath))
    {
      this.computeIfNecessary(nextPath);
    }
  }

  public componentWillUnmount()
  {
    this.props.editorAct({
      actionType: 'setDisplayState',
      state: {
        addUnrecognizedPath: null,
      },
    });
  }

  public renderInner()
  {
    const { formState, suggestedType, suggestedChildType } = this.state;
    let message;
    if (suggestedType === null)
    {
      message = 'Detecting Type... ';
    }
    else if (suggestedType === formState.type && suggestedChildType === formState.childType)
    {
      message = `Add field with recommended type: ${etlFieldTypesNames.get(formState.type)}`;
    }
    else
    {
      message = `Add field with custom type: ${etlFieldTypesNames.get(formState.type)}`;
    }

    return (
      <div className='unrecognized-field-modal'>
        <div>
          {message}
        </div>
        {
          suggestedType !== null ?
            <DynamicForm
              inputMap={this.inputMap}
              inputState={formState}
              onStateChange={this._setStateWrapper('formState')}
            />
            :
            null
        }
      </div>
    );
  }

  public render()
  {
    const { addUnrecognizedPath } = this.props.uiState;
    return (
      <Modal
        open={addUnrecognizedPath !== null}
        title={'Add Field'}
        confirm={true}
        confirmButtonText={'Create'}
        closeOnConfirm={true}
        onClose={this.handleCloseModal}
        onConfirm={this.handleConfirmModal}
        allowOverflow={true}
      >
        {addUnrecognizedPath !== null ? this.renderInner() : null}
      </Modal>
    );
  }

  public handleCloseModal()
  {
    this.setState({
      suggestedType: null,
      suggestedChildType: null,
    });
    this.props.editorAct({
      actionType: 'setDisplayState',
      state: {
        addUnrecognizedPath: null,
      },
    });
  }

  public handleConfirmModal()
  {

  }
}

export default Util.createTypedContainer(
  AddUnrecognizedFieldModal,
  [['templateEditor', 'uiState']],
  { editorAct: TemplateEditorActions },
);
