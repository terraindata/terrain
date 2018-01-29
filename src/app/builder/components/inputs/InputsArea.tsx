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

// tslint:disable:strict-boolean-expressions

import * as Immutable from 'immutable';
import * as React from 'react';
import { Input } from '../../../../blocks/types/Input';
import { AllBackendsMap } from '../../../../database/AllBackends';
import CreateLine from '../../../common/components/CreateLine';
import InfoArea from '../../../common/components/InfoArea';
import TerrainComponent from '../../../common/components/TerrainComponent';
import Actions from '../../data/BuilderActions';
import InputComponent from '../inputs/InputComponent';

export interface Props
{
  inputs: List<Input>;
  canEdit: boolean;
  language: string;
  action: (keyPath, value) => void; // Need to use to keep track of whether path or cards is used (should change with Xi's parser)
}

class InputsArea extends TerrainComponent<Props>
{
  public handleCreateInput(index: number = -1)
  {
    if (typeof index !== 'number')
    {
      index = -1;
    }
    Actions.createInput(
      Immutable.List(['query', 'inputs']), index,
      AllBackendsMap[this.props.language].inputType,
    );
  }

  public renderNoInputs()
  {
    return (
      <InfoArea
        large={this.props.canEdit ? 'No inputs have been created, yet.' : ''}
        button={this.props.canEdit ? 'Add an Input' : null}
        onClick={this.handleCreateInput}
      />
    );
  }

  public render()
  {
    if (this.props.inputs.size === 0)
    {
      return this.renderNoInputs();
    }

    return (
      <div className='inputs-area'>
        {
          this.props.inputs.map((input, index) =>
            <InputComponent
              input={input}
              index={index}
              canEdit={this.props.canEdit}
              key={input.id}
              onCreateInput={this.handleCreateInput}
              language={this.props.language}
              action={this.props.action}
            />,
          )
        }

        <div className='standard-margin'>
          {
            this.props.canEdit &&
            <CreateLine
              open={false}
              onClick={this.handleCreateInput}
            />
          }
        </div>
      </div>
    );
  }
}

export default InputsArea;
