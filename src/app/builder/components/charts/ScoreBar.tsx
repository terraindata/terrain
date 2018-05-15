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

// tslint:disable:restrict-plus-operands strict-boolean-expressions

import * as classNames from 'classnames';
import * as Radium from 'radium';
import * as React from 'react';
import { backgroundColor, borderColor, Colors, fontColor, getStyle } from '../../../colors/Colors';
import TerrainComponent from './../../../common/components/TerrainComponent';
import './ScoreBar.less';
import ScoreWeightSlider from './ScoreWeightSlider';

const EditableField = (props) =>
  props.editing && props.canEdit ? props.editComponent : props.readOnlyComponent;

const BORDER_RADIUS = '5px';
const SCORE_COLORS =
  {
    // POSITIVE: ['#DFDE52', '#AFD364', '#9DCF66', '#4ef9ab'],
    POSITIVE: ['#4ef9ab'],
    NEGATIVE: ['#d14f42'],
  };

interface Props
{
  weight: number;
  onBeforeChange?: (value: number) => void;
  onChange?: (value: number) => void;
  onAfterChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  height?: number;
  canEdit?: boolean;
  altStyle?: boolean;
  round?: boolean;
}

@Radium
class ScoreBar extends TerrainComponent<Props>
{
  public state = {
    editingWeight: false,
    weight: this.props.weight,
  };

  public componentWillReceiveProps(nextProps: Props)
   {
    if (nextProps.weight !== this.props.weight)
    {
      // console.log('RECIEVING PROPS ', nextProps.weight);
      this.setState({
        weight: nextProps.weight,
      });
     }
   }

  public render()
  {
    const { min, max, height, canEdit, altStyle, step, round } = this.props;
    const { weight } = this.state;
    const color = Colors().active;
    console.log('WEIGHT IS ', weight);
    console.log('Max is ', max);
    return (
      <div
        className={classNames({
          'score-bar': true,
          'score-bar-alt': altStyle,
        })}
      >
        <ScoreWeightSlider
          value={weight}
          onBeforeChange={this.handleWeightBeforeChange}
          onChange={this.handleWeightChange}
          onAfterChange={this.handleWeightAfterChange}
          min={min || 0}
          max={max || 100}
          color={color}
          height={height || (altStyle && 22) || 34}
          lengthOffset={altStyle ? 12 : 34}
          noLeftLine={altStyle}
          rounded={altStyle}
          noPadding={altStyle}
          background={altStyle ? Colors().blockBg : undefined}
          step={step}
        />
        <EditableField
          editing={this.state.editingWeight}
          canEdit={canEdit}
          editComponent={
            <input
              type='text'
              className='score-bar-text'
              value={round ? Math.round(weight) : weight}
              onBlur={this.handleTextBlur}
              onChange={this.handleTextChange}
              onKeyDown={this.handleTextKeyDown}
              style={[
                fontColor(Colors().active),
                borderColor(Colors().active),
              ]}
              onFocus={this.handleInputFocus}
              autoFocus
              disabled={!canEdit}
            />
          }
          readOnlyComponent={
            <div
              className='score-bar-field-weight'
              onClick={this.editingWeight}
            >
              <div
                className='score-bar-field-weight-value'
                style={fontColor(Colors().active)}
              >
                {
                  round ? Math.round(weight) : weight
                }
              </div>
            </div>
          }
        />
      </div>
    );
  }

  private handleInputFocus(e)
  {
    // debugger;
    if (e && e.target)
    {
      e.target.select();
    }
  }

  private handleWeightBeforeChange(value: number)
  {
    if (this.state.editingWeight)
    {
      this.setState({
        editingWeight: false,
      });
    }
    if (this.props.onBeforeChange)
    {
      this.props.onBeforeChange(value);
    }
  }

  private handleWeightChange(value: number)
  {
    if (this.props.canEdit && this.props.onChange)
    {
      this.props.onChange(value);
    }
  }

  private handleWeightAfterChange(value: number)
  {
    if (this.props.onAfterChange)
    {
      console.log('ON AFTER CHANGE ', value);
      if (this.props.round)
      {
        value = Math.round(value);
      }

      this.props.onAfterChange(value);
    }
  }

  private handleTextChange(e)
  {
    // console.log('CHANGE ', e.target.value);
    this.setState({
      weight: e.target.value,
    });
  }

  private handleTextBlur()
  {
   // console.log('Handle text blur');
    this.setState({
      editingWeight: false,
    });
    this.handleWeightAfterChange(this.state.weight);
  }

  private handleTextKeyDown(e)
  {
    if (e.keyCode === 13)
    {
      // console.log('Handle enter key down');
      this.setState({
        editingWeight: false,
      });
      this.handleWeightAfterChange(this.state.weight);
    }
  }

  private editingWeight()
  {
    this.setState({
      editingWeight: true,
    });
  }

}

export default ScoreBar;
