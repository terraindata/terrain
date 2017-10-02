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
import MultiSwitch from 'common/components/MultiSwitch';
import { List } from 'immutable';
import * as React from 'react';
import TerrainComponent from './../../common/components/TerrainComponent';

export interface Props
{
  options: List<string>;

  // can pass the value in as an index, a string value, or an array of either
  //  (in the case of multiple selections)
  value: number | string | List<number> | List<string>;
  onChange: (value: number | string | List<number> | List<string>) => void;

  allowsMultiple: boolean;
  usesValues: boolean; // indicates if it uses values instead of indices

  small?: boolean;
  large?: boolean;
}

class MultiSwitchWrapper extends TerrainComponent<Props>
{
  public state = {
    first: 0,
    second: 'Don',
    third: List([0, 2]),
    fourth: List(['Chandler', 'Monica']),
  };

  public render()
  {
    return (
      <div
        style={{
          paddingLeft: 12,
          maxWidth: 300,
        }}
      >
        <MultiSwitch
          options={List([
            'John',
            'Danny',
            'Meg',
            'Kevin',
          ])}
          value={this.state.first}
          onChange={this.setFirst}
        />
        <br />
        <MultiSwitch
          options={List([
            'Don',
            'Peggy',
            'Roger',
            'Pete',
            'Kenny',
          ])}
          value={this.state.second}
          onChange={this.setSecond}
          usesValues={true}
          large={true}
        />
        <br />
        <MultiSwitch
          options={List([
            'El',
            'Dustin',
            'Mike',
            'Lucas',
          ])}
          value={this.state.third}
          onChange={this.setThird}
          allowsMultiple={true}
        />
        <br />
        <MultiSwitch
          options={List([
            'Chandler',
            'Joey',
            'Ross',
            'Monica',
            'Rachel',
            'Phoebe',
          ])}
          value={this.state.fourth}
          large={true}
          onChange={this.setFourth}
          allowsMultiple={true}
          usesValues={true}
        />
      </div>
    );
  }

  private setFirst(v)
  {
    this.setState({
      first: v,
    });
  }

  private setSecond(v)
  {
    this.setState({
      second: v,
    });
  }

  private setThird(v)
  {
    this.setState({
      third: v,
    });
  }

  private setFourth(v)
  {
    this.setState({
      fourth: v,
    });
  }

}

export default MultiSwitchWrapper;
