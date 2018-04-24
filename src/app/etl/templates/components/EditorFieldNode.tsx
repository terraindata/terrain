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
import memoizeOne from 'memoize-one';
import * as Radium from 'radium';
import * as React from 'react';
import { instanceFnDecorator } from 'shared/util/Classes';
import { backgroundColor, borderColor, buttonColors, Colors, fontColor, getStyle } from 'src/app/colors/Colors';
import Util from 'util/Util';

import * as Immutable from 'immutable';
const { List, Map } = Immutable;
import FadeInOut from 'common/components/FadeInOut';

import ExpandableView from 'common/components/ExpandableView';
import { TemplateField } from 'etl/templates/FieldTypes';
import EditorFieldPreview from './EditorFieldPreview';
import EditorFieldSettings from './EditorFieldSettings';
import { mapDispatchKeys, mapStateKeys, TemplateEditorField, TemplateEditorFieldProps } from './TemplateEditorField';
import './TemplateEditorField.less';

export interface Props extends TemplateEditorFieldProps
{
  previewLabel?: string;
}

@Radium
class EditorFieldNodeC extends TemplateEditorField<Props>
{
  public state: {
    expandableViewOpen: boolean;
  } = {
      expandableViewOpen: true,
    };
  constructor(props)
  {
    super(props);
    if (props.noInteract)
    {
      this.state.expandableViewOpen = false;
    }
  }

  public renderChildFields()
  {
    const { canEdit, preview, displayKeyPath } = this.props;
    const field = this._field();
    const childFieldIds = field.childrenIds;
    return childFieldIds.map((childId, index) =>
    {
      const childField = this._field(childId);
      const childPreview = preview != null ? preview[childField.name] : null;
      return (
        <EditorFieldNode
          {...this._passProps({
            fieldId: childId,
            canEdit: field.isIncluded && canEdit,
            preview: childPreview,
          })}
          key={childId}
        />
      );
    }).toList();
  }

  @instanceFnDecorator(memoizeOne)
  public _getAppropriateChild(field: TemplateField, fieldMap: Immutable.Map<number, TemplateField>)
  {
    return _.memoize((arrayIndex) =>
    {
      if (field.childrenIds.size > 0)
      {
        const wildcard = field.childrenIds.find((id) => fieldMap.get(id).isWildcardField());
        return wildcard !== undefined ? wildcard : field.childrenIds.get(0);
      }
      else
      {
        return -1;
      }
    });

  }

  // TODO, if there are special index children that match get those
  public getAppropriateChild(arrayIndex): number
  {
    return this._getAppropriateChild(this._field(), this._fieldMap())(arrayIndex);
  }

  // -1 if there is no available preview
  // previewExists true if preview exists (not null)
  public renderArrayChild(value, index: number, previewExists: boolean = true)
  {
    const { canEdit } = this.props;
    const field = this._field();
    const displayKeyPath = this._getPreviewChildPath(index);
    const childId = this.getAppropriateChild(index);

    if (childId === -1)
    {
      return null;
    }

    const childField = this._field(childId);
    let previewLabel = `[${index}]`;
    if (index === -1)
    {
      previewLabel = previewExists ? '[List Empty]' : '[N/A]';
    }

    return (
      <EditorFieldNode
        {...this._passProps({
          fieldId: childField.fieldId,
          canEdit: field.isIncluded && canEdit,
          preview: value,
          displayKeyPath,
        })}
        previewLabel={previewLabel}
        key={index}
      />
    );
  }

  public renderArrayChildren()
  {
    const { preview } = this.props;
    if (preview == null || !Array.isArray(preview))
    {
      return this.renderArrayChild(null, -1, false);
    }
    if (preview.length === 0)
    {
      return this.renderArrayChild(null, -1, true);
    }
    return List(preview.map((value, index) =>
    {
      return this.renderArrayChild(value, index);
    }));
  }

  public renderSettingsContainer()
  {
    const showSettings = this._settingsAreOpen();

    return (
      <FadeInOut open={showSettings}>
        <div className='injected-content-container'>
          {showSettings ?
            <div className='injected-content-content' style={[backgroundColor(Colors().bg3), borderColor(Colors().border1)]}>
              <EditorFieldSettings
                {...this._passProps()}
              />
            </div> : null
          }
        </div>
      </FadeInOut>
    );
  }

  public getCheckboxState()
  {
    const canEditField = this._field().canEditField();
    const checkedState = this._checkedState();

    return {
      checked: checkedState === true,
      showCheckbox: (canEditField && checkedState !== null),
    };
  }

  public render()
  {
    const { canEdit, preview, displayKeyPath, previewLabel } = this.props;
    const field = this._field();

    const injectedContent = this.renderSettingsContainer();
    const style = (canEdit === true && field.isIncluded === false) ?
      getStyle('opacity', '0.5') : {};

    const { checked, showCheckbox } = this.getCheckboxState();

    if (field.isArray() || field.isNested())
    {
      const content = (
        <EditorFieldPreview
          toggleOpen={this.handleToggleOpen}
          labelOverride={previewLabel}
          {...this._passProps()}
        />
      );

      const childrenComponent = (
        <div className='template-editor-children-container'>
          {
            field.isArray() ?
              this.renderArrayChildren() :
              this.renderChildFields()
          }
        </div>
      );
      return (
        <ExpandableView
          content={content}
          open={this.state.expandableViewOpen}
          onToggle={this.handleToggleOpen}
          children={childrenComponent}
          injectedContent={injectedContent}
          style={style}
          showCheckbox={showCheckbox}
          checked={checked}
          onCheckboxClicked={this.handleCheckboxClicked}
        />
      );
    }
    else
    {
      const content = (
        <EditorFieldPreview
          labelOverride={previewLabel}
          {...this._passProps()}
        />
      );
      return (
        <ExpandableView
          content={content}
          open={false}
          onToggle={doNothing}
          children={null}
          injectedContent={injectedContent}
          style={style}
          showCheckbox={showCheckbox}
          checked={checked}
          onCheckboxClicked={this.handleCheckboxClicked}
        />
      );
    }
  }

  public handleCheckboxClicked()
  {
    const { act, fieldId } = this.props;
    const { checked, showCheckbox } = this.getCheckboxState();
    if (showCheckbox)
    {
      this.props.act({
        actionType: 'updateDisplayState',
        updaters: {
          checkedFields: (fields) => fields.set(fieldId, !Boolean(checked)),
        },
      });
    }
  }

  public handleToggleOpen()
  {
    this.setState({
      expandableViewOpen: !this.state.expandableViewOpen,
    });
  }
}

const doNothing = () => null;

const EditorFieldNode = Util.createTypedContainer(
  EditorFieldNodeC,
  mapStateKeys,
  mapDispatchKeys,
);

export default EditorFieldNode;
