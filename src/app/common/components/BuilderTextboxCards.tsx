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

import { Card, CardString } from '../../../blocks/types/Card';

import * as classNames from 'classnames';
import FadeInOut from 'common/components/FadeInOut';
import * as React from 'react';
import { Display } from '../../../blocks/displays/Display';
import { AllBackendsMap } from '../../../database/AllBackends';
import CardComponent from '../../builder/components/cards/CardComponent';

export interface Props
{
  value: CardString;
  keyPath: KeyPath;
  canEdit: boolean;
  className: string;
  helpOn?: boolean;
  addColumn?: (number, string?) => void;
  columnIndex: number;
  display: Display;
  language: string;
  tuningMode?: boolean;
}

class BuilderTextboxCards extends React.Component<Props, any>
{
  constructor(props: Props)
  {
    super(props);
  }

  public isText()
  {
    return typeof this.props.value !== 'object';
  }

  public isCreating()
  {
    return this.props.value
      && this.props.value['type'] === AllBackendsMap[this.props.language].creatingType;
  }

  public render()
  {
    if (this.isText() || this.isCreating())
    {
      return null;
    }

    const closedKey = this.props.tuningMode ? 'tuningClosed' : 'closed';

    // We're in card mode
    return (
      <FadeInOut
        open={!this.props.value[closedKey]}
      >
        <div
          className={classNames({
            'builder-tb-cards-area': true,
            [this.props.className]: !!this.props.className,
          })}
        >
          <CardComponent
            {...this.props}
            singleCard={true}
            card={this.props.value as Card}
            index={null}
            display={this.props.display}
            tuningMode={this.props.tuningMode}
          />
        </div>
      </FadeInOut>
    );
  }
}
export default BuilderTextboxCards;
