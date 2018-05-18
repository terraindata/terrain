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
import TerrainComponent from 'common/components/TerrainComponent';
import { Map } from 'immutable';
import * as Immutable from 'immutable';
import * as _ from 'lodash';
import memoizeOne from 'memoize-one';
import * as Radium from 'radium';
import * as React from 'react';
import { backgroundColor, borderColor, Colors, fontColor, getStyle } from 'src/app/colors/Colors';
import Util from 'util/Util';

import Modal from 'common/components/Modal';
import { instanceFnDecorator } from 'shared/util/Classes';

import GraphHelpers from 'etl/helpers/GraphHelpers';
import TemplateList from 'etl/templates/components/TemplateList';
import { EngineProxy, FieldProxy } from 'etl/templates/FieldProxy';
import { TemplateField } from 'etl/templates/FieldTypes';
import { TemplateEditorActions } from 'etl/templates/TemplateEditorRedux';
import { ColumnOptions, columnOptions, TemplateEditorState } from 'etl/templates/TemplateEditorTypes';
import { ETLTemplate } from 'shared/etl/immutable/TemplateRecords';

const { List } = Immutable;

export interface Props
{
  // below from container
  fieldMap?: Map<ID, TemplateField>;
  editorAct?: typeof TemplateEditorActions;
}

@Radium
class EditorColumnActionsSection extends TerrainComponent<Props>
{

  public shouldComponentUpdate(nextProps, nextState)
  {
    return this.props !== nextProps;
  }

  public render()
  {
    return (
      <div className='template-editor-title-bar-actions'>
        <div
          key='all'
          className='title-bar-action'
          style={backgroundColor('rgba(0,0,0,0)', Colors().highlight)}
          onClick={this.handleSelectAll}
        >
          Select All
        </div>
        <div
          key='none'
          className='title-bar-action'
          style={backgroundColor('rgba(0,0,0,0)', Colors().highlight)}
          onClick={this.handleSelectNone}
        >
          Select None
        </div>
        <div
          key='num-selected'
          className='title-bar-action'
          style={{ cursor: 'default' }}
        >
          {`${this.numFieldsSelected()} fields selected`}
        </div>
      </div>
    );
  }

  public numFieldsSelected()
  {
    return this.props.fieldMap.count((field) =>
    {
      return field.isIncluded;
    });
  }

  public handleSelectAll()
  {
    this.mutateCheckedFields((proxy, id) =>
    {
      proxy.setFieldEnabled(id, true);
    });
  }

  public handleSelectNone()
  {
    this.mutateCheckedFields((proxy, id) =>
    {
      proxy.setFieldEnabled(id, false);
    });
  }

  private mutateCheckedFields(fn: (proxy: EngineProxy, id: number) => void)
  {
    const { fieldMap } = this.props;
    GraphHelpers.mutateEngine((proxy) =>
    {
      fieldMap.forEach((field, id) =>
      {
        fn(proxy, Number(id));
      });
    }).then((structural) =>
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
          message: `Could not perform that action: ${String(e)}`,
          error: true,
        },
      });
    });
  }
}

export default Util.createContainer(
  EditorColumnActionsSection,
  [['templateEditor', 'fieldMap']],
  {
    editorAct: TemplateEditorActions,
  },
);
