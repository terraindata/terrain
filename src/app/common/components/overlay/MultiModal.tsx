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
// tslint:disable:max-classes-per-file strict-boolean-expressions no-shadowed-variable

import * as Immutable from 'immutable';
const { List, Map } = Immutable;
import * as _ from 'lodash';
import * as React from 'react';
import { BaseClass, makeConstructor, New, WithIRecord } from 'src/app/Classes';

import Modal from 'common/components/Modal';
import { Props as _ModalProps } from 'common/components/Modal';
import TerrainComponent from 'common/components/TerrainComponent';

export type ModalProps = {
  [key in keyof _ModalProps]?: _ModalProps[key];
};
// ModalProps is the same as the Props type from Modal.tsx, however all the props are optional.
// This is important because MultiModal overrides the open prop.
// MultiModal also wraps around the onClose prop if it is provided;

export interface Props
{
  requests: List<ModalProps>;
  onCloseModal: (newRequests: List<ModalProps>) => void;
  // onCloseModal gets called whenever requests should change. It's just like onChange for a textbox.
}

export class MultiModal extends TerrainComponent<Props>
{
  // handleRequest is like a reducer in that it takes in a previous state and returns a new state.
  // This allows it to be more easily integrated inside a redux store.
  public static handleRequest(requests: List<ModalProps>, newRequest: ModalProps): List<ModalProps>
  {
    return requests.push(newRequest);
  }

  public handleCloseModal()
  {
    if (this.props.requests === undefined || this.props.requests.size === 0)
    {
      return;
    }
    const firstProps = this.props.requests.first();
    const hasOnClose = firstProps !== undefined && firstProps.onClose !== undefined;
    const newRequests = this.props.requests.delete(0);
    if (hasOnClose)
    {
      firstProps.onClose();
    }
    this.props.onCloseModal(newRequests);
  }

  public render()
  {
    const firstProps = this.props.requests !== undefined && this.props.requests.first();
    if (firstProps === undefined)
    {
      return null;
    }
    else
    {
      return (
        <Modal
          {...firstProps}
          onClose={this.handleCloseModal}
          open={true}
        />
      );
    }

  }
}

export default MultiModal;
