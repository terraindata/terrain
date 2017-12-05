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

import TerrainComponent from 'common/components/TerrainComponent';
import * as _ from 'lodash';
import * as Radium from 'radium';
import * as React from 'react';
import { backgroundColor, borderColor, buttonColors, Colors, fontColor, getStyle } from 'src/app/colors/Colors';
import Util from 'util/Util';

import * as Immutable from 'immutable';
const { List, Map } = Immutable;

import Autocomplete from 'common/components/Autocomplete';
import CheckBox from 'common/components/CheckBox';
import { TemplateEditorActions } from 'etl/templates/data/TemplateEditorRedux';
import { _TemplateField, TemplateEditorState, TemplateField } from 'etl/templates/TemplateTypes';

import './TemplateEditorField.less';

export interface Props
{
  keyPath: KeyPath;
  field: TemplateField;
  canEdit: boolean;
  // below from container
  templateEditor?: TemplateEditorState;
  act?: typeof TemplateEditorActions;
}

const emptyOptions = List([]);

@Radium
class TemplateEditorFieldSettings extends TerrainComponent<Props>
{
  constructor(props)
  {
    super(props);
    this.setFactory = _.memoize(this.setFactory);
  }

  public render()
  {
    const { field, canEdit } = this.props;
    const inputDisabled = this.inputDisabled();
    const disableCheckbox = !canEdit; // only disable checkbox if it is disabled from a parent
    return (
      <div className='template-editor-field-row'>
        <div className='include-field-checkbox-spacer'>
          <CheckBox
            checked={field.isIncluded}
            onChange={this.handleIncludeCheckboxClicked}
            disabled={disableCheckbox}
            large={true}
          />
        </div>
        <div className='template-editor-field-settings'
          style={[
            backgroundColor(Colors().bg3),
            borderColor(Colors().border1)
          ]}
        >
          <Autocomplete
            value={field.name}
            onChange={this.setFactory('name', 'target', 'value')}
            disabled={inputDisabled}
            options={emptyOptions}
          />
        </div>
      </div>
    );
  }

  public handleIncludeCheckboxClicked()
  {
    this.set('isIncluded', !this.props.field.isIncluded)
  }

  // helper to calling setIn() on the TemplateField in the store
  private set<K extends keyof TemplateField>(key: K, value: TemplateField[K])
  {
    const { act, keyPath } = this.props;
    act({
      actionType: 'updateField',
      sourcePath: keyPath,
      key,
      value,
    });
  }

  private isRoot(): boolean
  {
    return this.props.keyPath.size === 0;
  }

  private inputDisabled(): boolean
  {
    return !this.props.field.isIncluded || !this.props.canEdit;
  }

  // similar to setStateWrapper
  private setFactory<K extends keyof TemplateField>(key: K, ...path: string[])
  {
    return (val) =>
    {
      for (const property of path)
      {
        val = val[property];
      }
      this.set(key, val);
    };
  }
}

export default Util.createTypedContainer(
  TemplateEditorFieldSettings,
  ['templateEditor'],
  { act: TemplateEditorActions },
);
