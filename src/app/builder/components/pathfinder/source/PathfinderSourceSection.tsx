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
import * as React from 'react';
import { altStyle, backgroundColor, borderColor, Colors, fontColor } from '../../../../colors/Colors';
import TerrainComponent from './../../../../common/components/TerrainComponent';
const { List, Map } = Immutable;
import BuilderActions from 'app/builder/data/BuilderActions';
import Autocomplete from 'app/common/components/Autocomplete';
import Dropdown from 'app/common/components/Dropdown';
import PathfinderText from 'app/builder/components/pathfinder/PathfinderText';
import { Path, Source, sourceCountOptions, _ElasticDataSource } from '../PathfinderTypes';

export interface Props
{
  source: Source;
  step: string;
  canEdit: boolean;
}

class PathfinderSourceSection extends TerrainComponent<Props>
{
  public state: {

  } = {

  };

  public render()
  {
    const { source, step, canEdit } = this.props;

    return (
      <div
        className='pf-section'
      >
        <div
          className='pf-line'
        >
          <div className='pf-piece'>
            {
              PathfinderText.firstWord
            }
          </div>
          <div className='pf-piece'>
            <Dropdown
              selectedIndex={this.getCountSelectedIndex()}
              options={sourceCountOptions}
              onChange={this.handleCountDropdownChange}
              canEdit={canEdit}
            />
          </div>
          {
            this.shouldShowCustomCount() ?
              <div className='pf-piece'>
                <Autocomplete
                  value={source.count as string}
                  onChange={this.handleCountTextChange}
                  placeholder='a number'
                  options={null}
                  disabled={!canEdit}
                />
              </div>
              : null
          }
          <div className='pf-piece'>
            <Dropdown
              options={this.getDataSourceOptions()}
              selectedIndex={this.getSelectedDataSourceIndex()}
              canEdit={canEdit}
              onChange={this.handleSourceDropdownChange}
              placeholder={PathfinderText.chooseDataSourceDropdownPrompt}
            />
          </div>
        </div>
      </div>
    );
  }

  private changeSource(source: Source)
  {
    BuilderActions.change(List(['query', 'path', 'source']), source);
  }

  private getCountSelectedIndex(): number
  {
    if (this.shouldShowCustomCount())
    {
      return sourceCountOptions.size - 1;
    }

    return this.props.source.countIndex;
  }

  // show a custom count if the user has chosen 'other' or if we cannot find
  //  the stored value in the dropdown (which would happen if we change the
  //  dropdown options)
  private shouldShowCustomCount(): boolean
  {
    const { count, countIndex } = this.props.source;
    return sourceCountOptions.get(countIndex) === 'other' || sourceCountOptions.indexOf(count) === -1;
  }

  private handleCountDropdownChange(index: number)
  {
    const value = index === sourceCountOptions.size - 1 ? '' : sourceCountOptions.get(index);
    this.changeSource(
      this.props.source
        .set('countIndex', index)
        .set('count', value),
    );
  }

  private handleCountTextChange(value)
  {
    this.changeSource(
      this.props.source
        .set('countIndex', sourceCountOptions.size - 1)
        .set('count', +value),
    );
  }

  private getDataSourceOptions(): List<string>
  {
    // TODO
    return List(['Products', 'Customers', 'Purchases', 'Reviews']);
  }

  private getSelectedDataSourceIndex(): number
  {
    console.log(this.getDataSourceOptions().indexOf(this.props.source.dataSource.name));
    return this.getDataSourceOptions().indexOf(this.props.source.dataSource.name);
  }

  private handleSourceDropdownChange(sourceIndex: number)
  {
    this.changeSource(this.props.source.set(
      'dataSource',
      _ElasticDataSource({
        name: this.getDataSourceOptions().get(sourceIndex),
      })
    ));
  }
}

export default PathfinderSourceSection;
