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

// tslint:disable:no-var-requires
import * as classNames from 'classnames';
import TerrainComponent from 'common/components/TerrainComponent';
import * as _ from 'lodash';
import * as Radium from 'radium';
import * as React from 'react';
import { backgroundColor, borderColor, buttonColors, Colors, fontColor, getStyle } from 'src/app/colors/Colors';
import Util from 'util/Util';

import * as Immutable from 'immutable';
const { List, Map } = Immutable;

import ExpandableView from 'common/components/ExpandableView';
import { TemplateEditorActions } from 'etl/templates/data/TemplateEditorRedux';
import { _TemplateField, TemplateEditorState, TemplateField } from 'etl/templates/TemplateTypes';
import { TEMPLATE_TYPES } from 'shared/etl/templates/TemplateTypes';
import { TemplateEditorField, TemplateEditorFieldProps } from './TemplateEditorField';
import './TemplateEditorField.less';
import TemplateEditorFieldPreview from './TemplateEditorFieldPreview';

const AddIcon = require('images/icon_add.svg');

export interface Props extends TemplateEditorFieldProps
{
  arrayKeyPath?: List<number>;
  // below from container
  templateEditor?: TemplateEditorState;
  act?: typeof TemplateEditorActions;
}

@Radium
class TemplateEditorFieldNodeC extends TemplateEditorField<Props>
{
  public state: {
    expandableViewOpen: boolean;
  } = {
      expandableViewOpen: true,
    };

  public renderChildFields()
  {
    const { field, keyPath, canEdit, preview } = this.props;

    return field.children.map((value, index) =>
    {
      const newKeyPath = keyPath.push('children', index);
      const childPreview = preview !== undefined && preview !== null ? preview[value.name] : null;
      return (
        <TemplateEditorFieldNode
          keyPath={newKeyPath}
          field={value}
          canEdit={field.isIncluded && canEdit}
          preview={childPreview}
          key={index}
        />
      );
    }).toList();
  }

  public renderArrayChildren() // TODO: don't hack this; make this work for nested arrays and arrays of nested
  {
    const { field, canEdit, preview, keyPath, arrayKeyPath } = this.props;
    const keyPathBase = arrayKeyPath === undefined || arrayKeyPath === null ?
      List([]) : arrayKeyPath;

    if (Array.isArray(preview))
    {
      return List(preview).map((value, index) =>
      {
        const newArrayKeyPath = keyPathBase.push(index);
        return (
          <TemplateEditorFieldNode
            keyPath={keyPath}
            field={field}
            canEdit={canEdit}
            key={index}
            preview={value}
            arrayKeyPath={newArrayKeyPath}
          />
        );
      }).toList();
    }
  }

  public render()
  {
    const { field, keyPath, canEdit, preview, arrayKeyPath } = this.props;
    let children = null;
    let content = null;

    if (this._isRoot())
    {
      return (
        <div className='template-editor-children-container'>
          {this.renderChildFields()}
        </div>
      );
    }
    else if (this._isArray())
    {
      const hasArrayKeyPath = arrayKeyPath !== undefined && arrayKeyPath !== null;
      const isLeaf = hasArrayKeyPath &&
        arrayKeyPath.size >= this._arrayDepth();
      const arrayIndex = hasArrayKeyPath && arrayKeyPath.size > 0 ? arrayKeyPath.last() : null;
      children = isLeaf ? (this._isNested() ? this.renderChildFields() : null) : this.renderArrayChildren();

      content = (
        <TemplateEditorFieldPreview
          showPreviewValue={!this._isNested() && isLeaf}
          arrayIndex={arrayIndex}
          {...this._passProps() }
        />
      );

    }
    else if (this._isNested())
    {
      children = this.renderChildFields();
      content = (
        <TemplateEditorFieldPreview
          showPreviewValue={false}
          {...this._passProps() }
        />
      );
    }
    else
    {
      content = (
        <TemplateEditorFieldPreview
          showPreviewValue={true}
          {...this._passProps() }
        />
      );
    }
    const childrenComponent = children !== null ?
      <div className='template-editor-children-container'>
        {children}
      </div> : null;

    const childrenStyle = (canEdit === true && field.isIncluded === false) ?
      getStyle('opacity', '0.7') : {};
    return (
      <ExpandableView
        content={content}
        open={this.state.expandableViewOpen}
        onToggle={this.handleExpandArrowClicked}
        children={childrenComponent}
        style={childrenStyle}
      />
    );
  }

  public handleExpandArrowClicked()
  {
    this.setState({
      expandableViewOpen: !this.state.expandableViewOpen,
    });
  }

}

const TemplateEditorFieldNode = Util.createTypedContainer(
  TemplateEditorFieldNodeC,
  ['templateEditor'],
  { act: TemplateEditorActions },
);

export default TemplateEditorFieldNode;
