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

import Autocomplete from 'common/components/Autocomplete';
import { DynamicForm } from 'common/components/DynamicForm';
import { DisplayState, DisplayType, InputDeclarationMap } from 'common/components/DynamicFormTypes';
import Modal from 'common/components/Modal';
import GraphHelpers from 'etl/helpers/GraphHelpers';
import { TemplateField } from 'etl/templates/FieldTypes';
import { TemplateEditorActions } from 'etl/templates/TemplateEditorRedux';
import { TemplateEditorState } from 'etl/templates/TemplateEditorTypes';
import { FieldTypes } from 'shared/etl/types/ETLTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import TransformationNodeType from 'shared/transformations/TransformationNodeType';
import EngineUtil from 'shared/transformations/util/EngineUtil';
import { kpToString, stringToKP, validateNewFieldName } from 'shared/transformations/util/TransformationsUtil';
import { KeyPath as EnginePath } from 'shared/util/KeyPath';
import { mapDispatchKeys, mapStateKeys, TemplateEditorField, TemplateEditorFieldProps } from './TemplateEditorField';

import './EditorFieldModal.less';

interface Props
{
  // below from container
  templateEditor?: TemplateEditorState;
  editorAct?: typeof TemplateEditorActions;
}

interface FormState
{
  name: string;
  index: string | number;
}

class ExtractFieldModal extends TerrainComponent<Props>
{
  public state: FormState;

  public inputMap: InputDeclarationMap<FormState> = {
    name: {
      type: DisplayType.TextBox,
      displayName: 'New Field Name',
      group: 'row 1',
    },
    index: {
      type: DisplayType.TextBox,
      displayName: 'Array Index',
      group: 'row 1',
    },
  };

  constructor(props)
  {
    super(props);
    this.state = this.computeStateFromProps(props);
  }

  public computeStateFromProps(props): FormState
  {
    const { extractField } = props.templateEditor.uiState;

    if (extractField === null)
    {
      return {
        name: '',
        index: -1,
      };
    }
    else
    {
      const displayIndex = extractField.index !== -1 ? extractField.index : 0;
      return {
        name: `Item ${displayIndex}`,
        index: String(displayIndex),
      };
    }
  }

  public componentWillReceiveProps(nextProps)
  {
    if (nextProps.templateEditor.uiState.extractField !== this.props.templateEditor.uiState.extractField)
    {
      this.setState(this.computeStateFromProps(nextProps));
    }
  }

  public renderInnerForm()
  {
    const { isValid, message } = this.validateState();

    return (
      <div className='editor-field-form-wrapper'>
        <DynamicForm
          inputMap={this.inputMap}
          inputState={this.state}
          onStateChange={this.handleFormChange}
        />
        <div
          className='editor-field-message-wrapper'
          style={fontColor(Colors().error)}
        >
          {message}
        </div>
      </div>
    );
  }

  public render()
  {
    const { extractField } = this.props.templateEditor.uiState;
    const { isValid, message } = this.validateState();

    return (
      <Modal
        open={extractField !== null}
        title='Extract Array Element'
        confirm={true}
        confirmDisabled={!isValid}
        closeOnConfirm={true}
        onClose={this.handleCloseModal}
        onConfirm={this.handleConfirmModal}
        allowOverflow={true}
      >
        {extractField !== null ? this.renderInnerForm() : null}
      </Modal>
    );
  }

  @instanceFnDecorator(memoizeOne)
  public _computeKeyPath(fieldId: number, name: string): EnginePath
  {
    if (fieldId === -1)
    {
      return List([name]);
    }
    else
    {
      const { templateEditor } = this.props;
      const engine = templateEditor.getCurrentEngine();
      const okp = engine.getOutputKeyPath(fieldId);

      if (okp === undefined)
      {
        return List([name]);
      }
      else
      {
        const lastIndex = okp.findLastIndex((val, i) => EngineUtil.isNamedField(okp, i));
        if (lastIndex === -1)
        {
          return List([name]);
        }
        else
        {
          return okp.slice(0, lastIndex).toList().push(name);
        }
      }
    }
  }

  public computeKeyPath(): EnginePath
  {
    const { extractField } = this.props.templateEditor.uiState;
    return this._computeKeyPath(extractField !== null ? extractField.fieldId : -1, this.state.name);
  }

  @instanceFnDecorator(memoizeOne)
  public _validateState(
    engine: TransformationEngine,
    engineVersion: number,
    fieldId: number,
    keypath: EnginePath,
    index: string | number,
  ): { isValid: boolean, message: string }
  {
    const asNum = Number(index);
    if (!Number.isInteger(asNum) || asNum < 0)
    {
      return {
        isValid: false,
        message: 'Index is Invalid',
      };
    }
    return validateNewFieldName(engine, -1, keypath);
  }

  public validateState(): { isValid: boolean, message: string }
  {
    const { templateEditor } = this.props;
    const { extractField, engineVersion } = templateEditor.uiState;
    if (extractField === null)
    {
      return {
        isValid: false,
        message: 'Selected field is null',
      };
    }
    const engine = templateEditor.getCurrentEngine();
    const keypath = this.computeKeyPath();
    return this._validateState(engine, engineVersion, extractField.fieldId, keypath, this.state.index);
  }

  public handleFormChange(state)
  {
    this.setState(state);
  }

  public handleCloseModal()
  {
    this.props.editorAct({
      actionType: 'setDisplayState',
      state: {
        extractField: null,
      },
    });
  }

  public handleConfirmModal()
  {
    const newKeypath = this.computeKeyPath();
    const { extractField } = this.props.templateEditor.uiState;
    if (extractField === null)
    {
      return;
    }
    GraphHelpers.mutateEngine((proxy) =>
    {
      let extractedKeypath = proxy.getEngine().getInputKeyPath(extractField.fieldId);
      extractedKeypath = extractedKeypath.set(extractedKeypath.size - 1, String(this.state.index));
      proxy.extractArrayField(extractField.fieldId, Number(this.state.index), newKeypath);
    }).then((isStructural) =>
    {
      this.props.editorAct({
        actionType: 'rebuildFieldMap',
      });
    }).catch((e) =>
    {
      this.props.editorAct({
        actionType: 'addModal',
        props: {
          title: 'Error',
          message: `Could not extract field: ${String(e)}`,
          error: true,
        },
      });
    });
  }
}

export default Util.createTypedContainer(
  ExtractFieldModal,
  ['templateEditor'],
  { editorAct: TemplateEditorActions },
);
