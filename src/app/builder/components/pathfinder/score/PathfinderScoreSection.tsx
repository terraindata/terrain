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

import * as classNames from 'classnames';
import * as Immutable from 'immutable';
import * as $ from 'jquery';
import * as _ from 'lodash';
import * as React from 'react';
import { altStyle, backgroundColor, borderColor, Colors, fontColor } from '../../../../colors/Colors';
import TerrainComponent from './../../../../common/components/TerrainComponent';
const { List, Map } = Immutable;
import Util from '../../../../util/Util';
import BuilderActions from '../../../data/BuilderActions';
import { _ScoreLine, Path, Score, Source } from '../PathfinderTypes';
import PathfinderScoreLine from './PathfinderScoreLine';

export interface Props
{
  score: Score;
  source: Source;
  step: string;
  canEdit: boolean;
}

class PathfinderSourceSection extends TerrainComponent<Props>
{
  public state: {
  } = {
  };

  public handleDeleteLine(index)
  {
    // Remove line
    BuilderActions.change(List(['query', 'path', 'score']), this.props.score.lines.splice(index, 1));
  }

  public handleAddLine()
  {
    BuilderActions.change(List(['query', 'path', 'score', 'lines']), this.props.score.lines.push(_ScoreLine()));
  }

  public handleFieldChange(index, field)
  {
    const newLine = this.props.score.lines.get(index).set('field', field);
    BuilderActions.change(List(['query', 'path', 'score', 'lines']), this.props.score.lines.set(index, newLine));
  }

  public handleWeightChange(index, weight)
  {
    const newLine = this.props.score.lines.get(index).set('weight', weight);
    BuilderActions.change(List(['query', 'path', 'score', 'lines']), this.props.score.lines.set(index, newLine));
  }

  public renderScoreLines()
  {
    return (
      <div>
        {
          _.map(Util.asJS(this.props.score.lines), (line, index) =>
          {
            return (
              <PathfinderScoreLine
                key={index}
                line={line}
                step={this.props.step}
                source={this.props.source}
                onDelete={this.handleDeleteLine}
                index={index}
                onFieldChange={this.handleFieldChange}
                onWeightChange={this.handleWeightChange}
                canEdit={this.props.canEdit}
              />
            );
          })
        }
      </div>
    );
  }

  public renderTitle()
  {
    return (
      <div>
        I want to sort my data using the following factors:
      </div>
    );
  }

  public render()
  {
    const { source, step } = this.props;

    return (
      <div
        className='pathfinder-section'
      >
        {
          this.renderTitle()
        }
        {
          this.renderScoreLines()
        }
        <div
          onClick={this.handleAddLine}
        >
          Add another factor to score on
        </div>

      </div>
    );
  }
}

export default PathfinderSourceSection;
