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
// tslint:disable:no-var-requires import-spacing
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

import Autocomplete from 'common/components/Autocomplete';
import PathfinderCreateLine from 'app/builder/components/pathfinder/PathfinderCreateLine';
import { DynamicForm } from 'common/components/DynamicForm';
import { DisplayState, DisplayType, InputDeclarationMap } from 'common/components/DynamicFormTypes';
import Quarantine from 'util/RadiumQuarantine';

import './ObjectForm.less';
const DeleteIcon = require('images/icon_close.svg');

interface Props
{
  items: string[];
  onChange: (newValue: string[], apply?: boolean) => void;
  label?: string;
}

// performance of this component can be optimized
export default class ListForm extends TerrainComponent<Props>
{
  public renderAddNewRow()
  {
    return (
      <PathfinderCreateLine
        text={'New Field'}
        canEdit={true}
        onCreate={this.addRow}
        showText={true}
        style={overrideCreateStyle}
      />
    );
  }

  public renderRow(index: number)
  {
    const value = this.props.items[index];

    return (
      <div
        key={index}
        className='object-form-row'
      >
        <Autocomplete
          value={value}
          onChange={this.rowChangeFactory(index)}
          options={emptyOptions}
          onBlur={this.onBlurFactory(index)}
        />
        <Quarantine>
          <div
            className='object-form-row-delete'
            style={fontColor(Colors().text3, Colors().text2)}
            onClick={this.handleDeleteRowFactory(index)}
          >
            <DeleteIcon />
          </div>
        </Quarantine>
      </div>
    );
  }

  public render()
  {
    const indices = Immutable.Range(0, this.props.items.length);
    return (
      <div className='object-form-container'>
        {
          this.props.label === undefined ? null :
            <div className='object-form-label'>
              {this.props.label}
            </div>
        }
        <div className='object-kv-body' style={borderColor(Colors().border1)}>
          {indices.map(this.renderRow)}
          {this.renderAddNewRow()}
        </div>
      </div>
    );
  }

  @instanceFnDecorator(_.memoize)
  public onBlurFactory(index: number)
  {
    return () => {
      this.props.onChange(this.props.items, true);
    };
  }

  @instanceFnDecorator(_.memoize)
  public handleDeleteRowFactory(index: number)
  {
    return () =>
    {
      let newItems = this.props.items.slice();
      newItems.splice(index, 1);
      this.props.onChange(newItems, true);
    };
  }

  @instanceFnDecorator(_.memoize)
  public rowChangeFactory(index: number)
  {
    return (value) =>
    {
      const newItems = this.props.items.slice();
      newItems[index] = value;
      this.props.onChange(newItems, false);
    };
  }

  public addRow()
  {
    const { items, onChange } = this.props;

    const newItems = items.slice();
    newItems.push('');
    onChange(newItems, true);
  }
}

const emptyOptions = List([]);

const overrideCreateStyle = {
  height: '24px',
};
