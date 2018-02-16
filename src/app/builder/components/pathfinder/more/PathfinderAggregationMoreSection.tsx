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

// tslint:disable:no-var-requires restrict-plus-operands strict-boolean-expressions

import { backgroundColor, borderColor, Colors } from 'app/colors/Colors';
import TerrainComponent from 'app/common/components/TerrainComponent';
import * as classNames from 'classnames';
import * as Immutable from 'immutable';
import * as _ from 'lodash';
import * as React from 'react';
const { List, Map } = Immutable;
import BuilderActions from 'app/builder/data/BuilderActions';
import FadeInOut from 'app/common/components/FadeInOut';
import Util from 'util/Util';

const ArrowIcon = require('images/icon_arrow.svg?name=ArrowIcon');
const RemoveIcon = require('images/icon_close_8x8.svg?name=RemoveIcon');

export interface Props
{
  canEdit: boolean;
  title: string;
  content: string | El;
  keyPath: KeyPath;

  builderActions?: typeof BuilderActions;
}

export class PathfinderAggregationMoreSection extends TerrainComponent<Props>
{
  public state: {
    expanded: boolean;
  } = {
      expanded: false,
    };

  public handleDelete()
  {
    this.props.builderActions.changePath(this.props.keyPath, undefined);
  }

  public render()
  {
    return (
      <div
        className='pf-aggregation-more-section'
        style={_.extend({}, backgroundColor(Colors().bg2), borderColor(Colors().border1))}
      >
        <div
          className='pf-aggregation-more-section-title'
          onClick={this._toggle('expanded')}
        >
          <div className={classNames({
            'pf-aggregation-arrow': true,
            'pf-aggregation-arrow-advanced': true,
            'pf-aggregation-arrow-open': this.state.expanded,
          })}
          >
            <ArrowIcon />
          </div>
          {this.props.title}
          {
            this.props.canEdit &&
            <div
              className='close'
              onClick={this._fn(this.handleDelete)}
            >
              <RemoveIcon />
            </div>
          }
        </div>
        <FadeInOut
          open={this.state.expanded}
          children={<div className='pf-aggregation-more-section-content'>{this.props.content}</div>}
        />
      </div>
    );

  }
}

export default Util.createTypedContainer(
  PathfinderAggregationMoreSection,
  [],
  { builderActions: BuilderActions }
);
