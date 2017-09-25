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

// tslint:disable:no-var-requires restrict-plus-operands no-switch-case-fall-through strict-boolean-expressions

const Radium = require('radium');
import * as $ from 'jquery';
import * as React from 'react';
import FadeInOut from '../../common/components/FadeInOut';
import Util from '../../util/Util';
import { SchemaStore } from '../data/SchemaStore';
import SchemaActions from 'schema/data/SchemaActions';
import * as SchemaTypes from '../SchemaTypes';
import TerrainComponent from './../../common/components/TerrainComponent';
import SchemaResults from './SchemaResults';
import SchemaSearchResults from './SchemaSearchResults';
import SchemaTreeList from './SchemaTreeList';
import Styles from './SchemaTreeStyles';

export interface Props
{
  fullPage: boolean;
  showSearch: boolean;
  showResults: boolean;
  search?: string;
}

const horizontalDivide = 50;
const verticalDivide = 75;
const searchHeight = 42;

@Radium
class SchemaView extends TerrainComponent<Props>
{
  public state: {
    highlightedIndex: number;
    search: string;

    // from Store
    servers?: SchemaTypes.ServerMap;
    highlightedId?: ID;
  } = {
    highlightedIndex: -1,
    search: '',
  };

  constructor(props: Props)
  {
    super(props);

    this._subscribe(SchemaStore, {
      stateKey: 'servers',
      storeKeyPath: ['servers'],
    });

    this._subscribe(SchemaStore, {
      stateKey: 'highlightedId',
      storeKeyPath: ['highlightedId'],
    });
  }

  public handleSearchChange(event)
  {
    const search = event.target.value as string;
    this.setState({
      search,
      highlightedIndex: -1,
    });
    SchemaActions.highlightId(null, false);
  }

  public handleSearchKeyDown(event)
  {
    const { highlightedIndex } = this.state;
    let offset: number = 0;

    switch (event.keyCode)
    {
      case 38:
        // up
        offset = -1;
      case 40:
        // down
        offset = offset || 1;
        const items = $("[data-rel='schema-item']");
        const index = Util.valueMinMax(highlightedIndex + offset, 0, items.length);
        const el = $(items[index]);
        const id = el.attr('data-id');
        const inSearchResults = !!el.attr('data-search');

        this.setState({
          highlightedIndex: index,
        });

        SchemaActions.highlightId(id, inSearchResults);

        break;

      case 13:
      case 9:
        // enter or tab

        if (this.state.highlightedId)
        {
          SchemaActions.selectId(this.state.highlightedId);
        }

        // var value = visibleOptions.get(this.state.selectedIndex);
        // if(!value || this.state.selectedIndex === -1)
        // {
        //   value = event.target.value;
        // }
        // this.setState({
        //   open: false,
        //   selectedIndex: -1,
        //   value,
        // });
        // this.blurValue = value;
        // this.props.onChange(value);
        // this.refs['input']['blur']();
        break;
      case 27:
        // esc
        // this.refs['input']['blur']();
        break;
      default:
        break;
    }
  }

  public render()
  {
    const search = this.props.search || this.state.search;
    const { showSearch, showResults } = this.props;

    return (
      <div
        style={Styles.schemaView as any}
      >
        <div
          style={[
            SECTION_STYLE,
            this.props.fullPage ? SCHEMA_STYLE_FULL_PAGE : SCHEMA_STYLE_COLUMN,
            {
              padding: Styles.margin,
              overflow: 'auto',
              width: !showResults ? '100%' : this.props.fullPage ? SCHEMA_STYLE_FULL_PAGE.width : SCHEMA_STYLE_COLUMN.width,
              height: !showResults ? '100%' : this.props.fullPage ? SCHEMA_STYLE_FULL_PAGE.height : SCHEMA_STYLE_COLUMN.height,
            } as any,
          ]}
        >
          {
            showSearch &&
            <div
              style={{
                height: searchHeight,
              }}
            >
              <input
                type='text'
                placeholder='Search schema'
                value={search}
                onChange={this.handleSearchChange}
                onKeyDown={this.handleSearchKeyDown}
                style={{
                  borderColor: '#ccc',
                }}
              />
            </div>
          }
          <div
            style={showSearch && {
              height: 'calc(100% - ' + searchHeight + ')px',
            }}
          >
            <FadeInOut
              open={!!this.state.search}
            >
              <div
                style={Styles.schemaHeading}
              >
                Visible Results
              </div>
            </FadeInOut>

            <SchemaTreeList
              itemType='server'
              itemIds={this.state.servers && this.state.servers.keySeq().toList()}
              label={'Servers'}
              topLevel={true}
              search={search}
            />

            <SchemaSearchResults
              search={this.state.search}
            />
          </div>
        </div>

        {showResults &&
          <div
            style={[
              SECTION_STYLE,
              this.props.fullPage ? RESULTS_STYLE_FULL_PAGE : RESULTS_STYLE_COLUMN,
            ]}
          >
            <SchemaResults
              servers={this.state.servers}
            />
          </div>
        }
      </div>
    );
  }
}

const SECTION_STYLE = {
  position: 'absolute',
  boxSizing: 'border-box',
};

const SCHEMA_STYLE_FULL_PAGE = {
  left: 0,
  top: 0,
  width: horizontalDivide + '%',
  height: '100%',
};

const SCHEMA_STYLE_COLUMN = {
  left: 0,
  top: 0,
  width: 'calc(100% - 6px)',
  height: verticalDivide + '%',
};

const RESULTS_STYLE_FULL_PAGE = {
  left: horizontalDivide + '%',
  top: 0,
  width: (100 - horizontalDivide) + '%',
  height: '100%',
};

const RESULTS_STYLE_COLUMN = {
  left: 0,
  top: verticalDivide + '%',
  width: '100%',
  height: (100 - verticalDivide) + '%',
};

export default SchemaView;
