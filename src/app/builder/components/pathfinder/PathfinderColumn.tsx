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

// tslint:disable:no-var-requires restrict-plus-operands strict-boolean-expressions

import { ColorsActions } from 'app/colors/data/ColorsRedux';
import { ColorsState } from 'app/colors/data/ColorsTypes';
import { List } from 'immutable';
import * as Radium from 'radium';
import * as React from 'react';
import { SchemaState } from 'schema/SchemaTypes';
import Util from 'util/Util';
import { backgroundColor, Colors, fontColor } from '../../../colors/Colors';
import TerrainComponent from './../../../common/components/TerrainComponent';
import './Pathfinder.less';
import PathfinderArea from './PathfinderArea';
import { Path } from './PathfinderTypes';

export interface Props
{
  path: Path;
  canEdit: boolean;
  schema: SchemaState;
  keyPath?: KeyPath;
  colorsActions: typeof ColorsActions;
  colors: ColorsState;
  toSkip?: number;
}

@Radium
class PathfinderColumn extends TerrainComponent<Props>
{

  public componentWillMount()
  {
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.pf-section-title',
      style: { color: Colors().text1 },
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.pf-step-button:hover',
      style: { color: Colors().active },
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.pf-score-line-transform .linear-selector-option',
      style: { color: Colors().fontColorLightest },
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.pf-section',
      style: { 'background-color': Colors().blockBg },
    });
  }

  public render()
  {
    return (
      <div
        className='pathfinder-column-wrapper'
        style={[
          backgroundColor(Colors().bg3),
          fontColor(Colors().text3),
        ]}
        id='pf-column'
      >
        <PathfinderArea
          {...this.props}
          keyPath={List(['query', 'path'])}
        />
      </div>
    );
  }
}

export default Util.createContainer(
  PathfinderColumn,
  ['schema', 'colors'],
  {
    colorsActions: ColorsActions,
  },
);
