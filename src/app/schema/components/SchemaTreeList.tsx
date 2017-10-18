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

// tslint:disable:no-var-requires max-classes-per-file strict-boolean-expressions

import * as React from 'react';
import TerrainComponent from './../../common/components/TerrainComponent';
import SchemaTreeItem from './SchemaTreeItem';
const Radium = require('radium');
import Colors from '../../colors/Colors';
import FadeInOut from '../../common/components/FadeInOut';
import Styles from '../../Styles';
import SchemaTreeStyles from './SchemaTreeStyles';

export interface Props
{
  itemIds: List<ID>;
  itemType: string;
  label?: string;
  topLevel?: boolean;
  search: string;
}

class State
{
  public renderCount: number = 30;
  public intervalId: number = -1;
}

const NORMAL_STYLE = {
  borderLeft: ('1px solid ' + Colors().active),
  paddingLeft: Styles.margin,
};

const TOP_LEVEL_STYLE = {
  borderLeft: '',
};

const SEARCH_STYLE = {
  borderLeft: '',
  paddingLeft: '',
};

@Radium
class SchemaTreeList extends TerrainComponent<Props>
{
  public state = new State();

  public componentDidMount()
  {
    if (this.props.itemIds && this.props.itemIds.size > this.state.renderCount)
    {
      this.setState({
        intervalId: setInterval(this.increaseRenderCount, 50),
      });
    }
  }

  public componentWillReceiveProps(nextProps: Props)
  {
    if (this.props.itemIds && this.props.itemIds.size > this.state.renderCount && this.state.intervalId === -1)
    {
      this.setState({
        intervalId: setInterval(this.increaseRenderCount),
      });
    }
  }

  public increaseRenderCount()
  {
    const renderCount = this.state.renderCount + 10;
    this.setState({
      renderCount,
    });

    if (this.props.itemIds.size < renderCount)
    {
      clearInterval(this.state.intervalId);
      this.setState({
        intervalId: -1,
      });
    }
  }

  public render()
  {
    if (!this.props.itemIds)
    {
      return (
        <div
          className='loading-text'
        />
      );
    }

    const { itemIds, itemType, search, label, topLevel } = this.props;

    return (
      <div
        style={[
          NORMAL_STYLE,
          this.props.search && SEARCH_STYLE,
          this.props.topLevel && TOP_LEVEL_STYLE,
        ]}
      >
        {
          label &&
          <FadeInOut
            open={!this.props.search}
          >
            <div
              style={
                SchemaTreeStyles.label as any
              }
            >
              {
                label
              }
            </div>

            {
              !itemIds.size &&
              <div
                style={SchemaTreeStyles.none}
              >
                None
                  </div>
            }
          </FadeInOut>
        }

        {
          itemIds.map(
            (id, index) =>
              index < this.state.renderCount &&
              <SchemaTreeItem
                id={id}
                type={itemType}
                key={id}
                search={search}
              />,
          )
        }
      </div>
    );
  }
}

export default SchemaTreeList;
