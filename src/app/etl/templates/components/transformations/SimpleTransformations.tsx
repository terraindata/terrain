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
// tslint:disable:no-var-requires no-empty-interface max-classes-per-file
import TerrainComponent from 'common/components/TerrainComponent';
import * as _ from 'lodash';
import memoizeOne from 'memoize-one';
import * as Radium from 'radium';
import * as React from 'react';

import { instanceFnDecorator } from 'shared/util/Classes';

import { DisplayState, DisplayType, InputDeclarationMap } from 'common/components/DynamicFormTypes';
import { TransformationNode } from 'etl/templates/FieldTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import TransformationNodeType from 'shared/transformations/TransformationNodeType';
import { NodeOptionsType } from 'shared/transformations/TransformationNodeType';
import { TransformationArgs, TransformationForm, TransformationFormProps } from './TransformationFormBase';

import { DynamicForm } from 'common/components/DynamicForm';
import { KeyPath as EnginePath } from 'shared/util/KeyPath';

import * as Immutable from 'immutable';
const { List, Map } = Immutable;

type SubstringOptions = NodeOptionsType<TransformationNodeType.SubstringNode>;
export class SubstringTFF extends TransformationForm<SubstringOptions, TransformationNodeType.SubstringNode>
{
  protected readonly type = TransformationNodeType.SubstringNode;
  protected readonly inputMap: InputDeclarationMap<SubstringOptions> = {
    from: {
      type: DisplayType.NumberBox,
      displayName: 'From Position',
    },
    length: {
      type: DisplayType.NumberBox,
      displayName: 'SubstringLength',
    },
  };
  protected readonly initialState = {
    from: 0,
    length: 5,
  };

  protected computeArgs()
  {
    const { from, length } = this.state;
    return _.extend({}, super.computeArgs(), {
      from: Number(from),
      length: Number(length),
    });
  }
}

type UppercaseOptions = NodeOptionsType<TransformationNodeType.UppercaseNode>;
export class UppercaseTFF extends TransformationForm<UppercaseOptions, TransformationNodeType.UppercaseNode>
{
  protected readonly type = TransformationNodeType.UppercaseNode;
  protected readonly inputMap: InputDeclarationMap<UppercaseOptions> = {};
  protected readonly initialState = {};
}

type HashOptions = NodeOptionsType<TransformationNodeType.HashNode>;
export class HashTFF extends TransformationForm<HashOptions, TransformationNodeType.HashNode>
{
  protected readonly type = TransformationNodeType.HashNode;
  protected readonly inputMap: InputDeclarationMap<HashOptions> = {
    salt: {
      type: DisplayType.TextBox,
      displayName: 'Salt',
    },
  };
  protected readonly initialState = {
    salt: '',
  };
}

type AddOptions = NodeOptionsType<TransformationNodeType.AddNode>;
export class AddTFF extends TransformationForm<AddOptions, TransformationNodeType.AddNode>
{
  protected readonly type = TransformationNodeType.AddNode;
  protected readonly inputMap: InputDeclarationMap<AddOptions> = {
    shift: {
      type: DisplayType.NumberBox,
      displayName: 'Add Value',
    },
  };
  protected readonly initialState = {
    shift: 0,
  };

  protected computeArgs()
  {
    const { shift } = this.state;
    const args = super.computeArgs();

    const options = _.extend({}, args.options, {
      shift: Number(shift),
    });
    return _.extend({}, args, { options });
  }
}

type SubtractOptions = NodeOptionsType<TransformationNodeType.SubtractNode>;
export class SubtractTFF extends TransformationForm<SubtractOptions, TransformationNodeType.SubtractNode>
{
  protected readonly type = TransformationNodeType.SubtractNode;
  protected readonly inputMap: InputDeclarationMap<SubtractOptions> = {
    shift: {
      type: DisplayType.NumberBox,
      displayName: 'Subtract Value',
    },
  };
  protected readonly initialState = {
    shift: 0,
  };

  protected computeArgs()
  {
    const { shift } = this.state;
    const args = super.computeArgs();

    const options = _.extend({}, args.options, {
      shift: Number(shift),
    });
    return _.extend({}, args, { options });
  }
}

type MultiplyOptions = NodeOptionsType<TransformationNodeType.MultiplyNode>;
export class MultiplyTFF extends TransformationForm<MultiplyOptions, TransformationNodeType.MultiplyNode>
{
  protected readonly type = TransformationNodeType.MultiplyNode;
  protected readonly inputMap: InputDeclarationMap<MultiplyOptions> = {
    factor: {
      type: DisplayType.NumberBox,
      displayName: 'Multiply Value',
    },
  };
  protected readonly initialState = {
    factor: 0,
  };

  protected computeArgs()
  {
    const { factor } = this.state;
    const args = super.computeArgs();

    const options = _.extend({}, args.options, {
      factor: Number(factor),
    });
    return _.extend({}, args, { options });
  }
}

type DivideOptions = NodeOptionsType<TransformationNodeType.DivideNode>;
export class DivideTFF extends TransformationForm<DivideOptions, TransformationNodeType.DivideNode>
{
  protected readonly type = TransformationNodeType.DivideNode;
  protected readonly inputMap: InputDeclarationMap<DivideOptions> = {
    factor: {
      type: DisplayType.NumberBox,
      displayName: 'Divide Value',
    },
  };
  protected readonly initialState = {
    factor: 0,
  };

  protected computeArgs()
  {
    const { factor } = this.state;
    const args = super.computeArgs();

    const options = _.extend({}, args.options, {
      factor: Number(factor),
    });
    return _.extend({}, args, { options });
  }
}

type FindReplaceOptions = NodeOptionsType<TransformationNodeType.FindReplaceNode>;
export class FindReplaceTFF extends TransformationForm<FindReplaceOptions, TransformationNodeType.FindReplaceNode>
{
  protected readonly type = TransformationNodeType.FindReplaceNode;
  protected readonly inputMap: InputDeclarationMap<FindReplaceOptions> = {
    find: {
      type: DisplayType.TextBox,
      displayName: 'Find',
    },
    replace: {
      type: DisplayType.TextBox,
      displayName: 'Replace',
    },
    regex: {
      type: DisplayType.CheckBox,
      displayName: 'Use Regex',
    },
  };
  protected readonly initialState = {
    find: '',
    replace: '',
    regex: false,
  };
}

export class EncryptTFF extends TransformationForm<{}, TransformationNodeType.EncryptNode>
{
  protected readonly type = TransformationNodeType.EncryptNode;
  protected readonly inputMap = {};
  protected readonly initialState = {};
}

export class DecryptTFF extends TransformationForm<{}, TransformationNodeType.DecryptNode>
{
  protected readonly type = TransformationNodeType.DecryptNode;
  protected readonly inputMap = {};
  protected readonly initialState = {};
}
