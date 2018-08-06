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
import CheckBox from 'common/components/CheckBox';
import FloatingInput from 'common/components/FloatingInput';
import Modal from 'common/components/Modal';
import { tooltip } from 'common/components/tooltip/Tooltips';

import { DynamicForm } from 'common/components/DynamicForm';
import { DisplayState, DisplayType, InputDeclarationMap } from 'common/components/DynamicFormTypes';
import GraphHelpers from 'etl/helpers/GraphHelpers';
import { TemplateField } from 'etl/templates/FieldTypes';
import { TemplateEditorActions } from 'etl/templates/TemplateEditorRedux';
import { TemplateEditorState } from 'etl/templates/TemplateEditorTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import TransformationNodeType from 'shared/transformations/TransformationNodeType';
import { KeyPath as EnginePath } from 'shared/util/KeyPath';
import { mapDispatchKeys, mapStateKeys, TemplateEditorField, TemplateEditorFieldProps } from './TemplateEditorField';

import * as Utils from 'shared/transformations/util/EngineUtils';

const ErrorIcon = require('images/icon_info.svg');
import './EditorFieldModal.less';

interface Props
{
  // below from container
  templateEditor?: TemplateEditorState;
  editorAct?: typeof TemplateEditorActions;
}

class MultiPromoteModal extends TerrainComponent<Props>
{
  public state: {
    checked: Immutable.Map<number, boolean>;
    renames: Immutable.Map<number, string>;
  } = {
      checked: Map<number, boolean>(),
      renames: Map<number, string>(),
    };

  public componentWillReceiveProps(nextProps)
  {
    const { engineVersion, promoteFieldRoot } = this.props.templateEditor.uiState;
    if (
      (engineVersion !== nextProps.templateEditor.uiState.engineVersion) ||
      (promoteFieldRoot !== nextProps.templateEditor.uiState.promoteFieldRoot)
    )
    {
      this.setState({
        checked: Map<number, boolean>(),
        renames: Map<number, string>(),
      });
    }
  }

  // multi-layered cached function
  @instanceFnDecorator(memoizeOne)
  public _validationFactoryComputer(rootId: number, engine: TransformationEngine, engineVersion: number)
    : (id: number) =>
      ((name: string, renames: Immutable.Map<number, string>, checked: Immutable.Map<number, boolean>) =>
        string)
  {
    const rootPath = engine.getFieldPath(rootId);
    const nameValidatorFactory = (id: number) =>
    {
      const nameValidator = (name: string, renames: Immutable.Map<number, string>, checked: Immutable.Map<number, boolean>) =>
      {
        const thisPath = engine.getFieldPath(id);
        const finalPath = thisPath.splice(rootPath.size - 1, 1).toList().set(rootPath.size - 1, name);
        if (engine.getFieldID(finalPath) !== undefined)
        {
          return `There is already a field named ${name}`;
        }
        const matchingNames = checked
          .filter((v, fId) => v)
          .filter((v, fId) =>
          {
            const origName = engine.getFieldPath(fId).get(rootPath.size);
            const nameToUse = renames.get(fId) === undefined ? origName : renames.get(fId);
            return nameToUse === name;
          });
        if (matchingNames.size > 1)
        {
          return `You cannot promote multiple fields to the same name`;
        }
        return '';
      };
      return memoizeOne(nameValidator);
    };
    return _.memoize(nameValidatorFactory);
  }

  public validateName(id: number, name: string): string
  {
    const { renames, checked } = this.state;
    const { engineVersion, promoteFieldRoot } = this.props.templateEditor.uiState;
    const engine = this.props.templateEditor.getCurrentEngine();
    return this._validationFactoryComputer(promoteFieldRoot, engine, engineVersion)(id)(name, renames, checked);
  }

  public canConfirm()
  {
    const { renames, checked } = this.state;
    const { engineVersion, promoteFieldRoot } = this.props.templateEditor.uiState;
    if (promoteFieldRoot == null)
    {
      return false;
    }
    const engine = this.props.templateEditor.getCurrentEngine();
    const rootPath = engine.getFieldPath(promoteFieldRoot);
    const anyErrors = checked.find((isChecked, id) =>
    {
      if (isChecked)
      {
        const thisPath = engine.getFieldPath(id);
        const origName = thisPath.get(rootPath.size);
        const nameToShow = renames.get(id) === undefined ? origName : renames.get(id);
        return this.validateName(id, nameToShow as string) !== '';
      }
      return false;
    });
    const anyChecked = checked.find((isChecked, id) => isChecked);
    return anyErrors == null && anyChecked != null;
  }

  public renderRow(id: number)
  {
    const { checked, renames } = this.state;
    const { promoteFieldRoot } = this.props.templateEditor.uiState;
    const engine = this.props.templateEditor.getCurrentEngine();
    const rootPath = engine.getFieldPath(promoteFieldRoot);
    const thisPath = engine.getFieldPath(id);
    const origName = thisPath.get(rootPath.size);
    const nameToShow = renames.get(id) === undefined ? origName : renames.get(id);
    const style = fontColor(Colors().logLevels.warn);
    const validation = this.validateName(id, nameToShow as string);
    return (
      <div
        key={id}
        className='promote-field-row'
      >
        <CheckBox
          checked={checked.get(id)}
          onChange={this.checkboxFactory(id)}
          large={true}
        />
        <FloatingInput
          value={nameToShow}
          label={'Field'}
          isTextInput={true}
          canEdit={checked.get(id) === true}
          onChange={this.nameInputFactory(id)}
        />
        <div
          className='promote-field-verification-spacer'
          key={id}
        >
          {
            validation !== '' &&
            tooltip(
              <div
                style={fontColor(Colors().logLevels.error)}
                className='promote-field-verification-icon'
              >
                <ErrorIcon />
              </div>,
              {
                title: `${validation}`,
                theme: 'error',
                key: id,
              },
            )
          }
        </div>
      </div>
    );
  }

  public checkboxFactory(id: number)
  {
    return () =>
    {
      const checked = this.state.checked.get(id);
      const newVal = !checked;
      this.setState({
        checked: this.state.checked.set(id, newVal),
      });
    };
  }

  public nameInputFactory(id: number)
  {
    return (newVal: string) =>
    {
      this.setState({
        renames: this.state.renames.set(id, newVal),
      });
    };
  }

  @instanceFnDecorator(memoizeOne)
  public _computeOptions(rootId: number, engine: TransformationEngine, engineVersion: number)
  {
    const tree = engine.createTree();
    const children = tree.get(rootId);
    return children;
  }

  public computeOptions(): List<number>
  {
    const { engineVersion, promoteFieldRoot } = this.props.templateEditor.uiState;
    const engine = this.props.templateEditor.getCurrentEngine();
    const options = this._computeOptions(promoteFieldRoot, engine, engineVersion);
    return options;
  }

  public renderInner()
  {
    return (
      <div className='multi-promote-modal'>
        {this.computeOptions().map((id) => this.renderRow(id))}
      </div>
    );
  }

  public render()
  {
    const { promoteFieldRoot } = this.props.templateEditor.uiState;
    return (
      <Modal
        open={promoteFieldRoot !== null}
        title={'Select Fields To Promote'}
        confirm={true}
        confirmDisabled={promoteFieldRoot !== null && !this.canConfirm()}
        closeOnConfirm={true}
        onClose={this.handleCloseModal}
        onConfirm={this.handleConfirmModal}
        allowOverflow={true}
      >
        {promoteFieldRoot !== null ? this.renderInner() : null}
      </Modal>
    );
  }

  public handleCloseModal()
  {
    this.props.editorAct({
      actionType: 'setDisplayState',
      state: {
        promoteFieldRoot: null,
      },
    });
  }

  public handleConfirmModal()
  {
    const { checked, renames } = this.state;
    const { promoteFieldRoot } = this.props.templateEditor.uiState;
    const engine = this.props.templateEditor.getCurrentEngine();
    const rootPath = engine.getFieldPath(promoteFieldRoot);

    const renameMapping: Immutable.Iterable<number, KeyPath> = checked.filter((isChecked) => isChecked)
      .map((isChecked, id) =>
      {
        const thisPath = engine.getFieldPath(id);
        const origName = thisPath.get(rootPath.size);
        const nameToUse = renames.get(id) === undefined ? origName : renames.get(id);
        return thisPath.splice(rootPath.size - 1, 1).toList().set(rootPath.size - 1, nameToUse);
      });

    GraphHelpers.mutateEngine((proxy) =>
    {
      renameMapping.forEach((path, id) =>
      {
        const fieldProxy = proxy.makeFieldProxy(id);
        fieldProxy.structuralChangeName(path);
      });
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
          message: `Could not promote some fields: ${String(e)}`,
          error: true,
        },
      });
    });
  }
}

export default Util.createTypedContainer(
  MultiPromoteModal,
  ['templateEditor'],
  { editorAct: TemplateEditorActions },
);
