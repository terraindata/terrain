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

// tslint:disable:no-var-requires no-shadowed-variable strict-boolean-expressions

import * as Immutable from 'immutable';
import * as _ from 'lodash';
const Radium = require('radium');
import * as React from 'react';
import { SchemaState } from 'schema/SchemaTypes';
import Util from 'util/Util';
import FadeInOut from '../../common/components/FadeInOut';
import Styles from '../../Styles';
import * as SchemaTypes from '../SchemaTypes';
import TerrainComponent from './../../common/components/TerrainComponent';
import SchemaTreeItem from './SchemaTreeItem';
import SchemaTreeStyles from './SchemaTreeStyles';
type SchemaBaseClass = SchemaTypes.SchemaBaseClass;

export interface Props
{
  search: string;
  // injected props
  schema?: SchemaState;
}

let INIT_SHOWING_COUNT: IMMap<string, number> = Immutable.Map<string, number>({});
let INIT_ITEMS: IMMap<string, List<SchemaBaseClass>> =
  Immutable.Map<string, List<SchemaBaseClass>>({});
let INIT_PREV_ITEMS: IMMap<string, IMMap<string, SchemaBaseClass>> =
  Immutable.Map<string, IMMap<string, SchemaBaseClass>>({});

_.map(SchemaTypes.typeToStoreKey as any,
  (storeKey: string, type) =>
  {
    INIT_SHOWING_COUNT = INIT_SHOWING_COUNT.set(storeKey, 15);
    INIT_ITEMS = INIT_ITEMS.set(storeKey, Immutable.List([]));
    INIT_PREV_ITEMS = INIT_PREV_ITEMS.set(storeKey, Immutable.Map<any, any>({}));
  },
);
const SHOW_MORE_INCREMENT = 50;

@Radium
class SchemaSearchResults extends TerrainComponent<Props>
{
  public state: {
    // since search results are rendered as a list, we want
    //  to store them in a list, instead of the Map stored in the SchemaState
    items: IMMap<string, List<SchemaBaseClass>>,
    // but we need to memoize the Map reference so that we can avoid unnecessarily
    //  generating the lists
    prevItems: IMMap<string, IMMap<string, SchemaBaseClass>>,
    showingCount: IMMap<string, number>;
  } = {
    showingCount: INIT_SHOWING_COUNT,
    items: INIT_ITEMS,
    prevItems: INIT_PREV_ITEMS,
  };

  public componentWillReceiveProps(nextProps: Props)
  {
    const { schema: storeState } = nextProps;

    let { items, prevItems } = this.state;
    items.map((v, storeKey) =>
    {
      const storeValue = storeState.get(storeKey);
      if (prevItems.get(storeKey) !== storeValue)
      {
        // reference changed
        items = items.set(storeKey, storeValue.valueSeq().toList());
        prevItems = prevItems.set(storeKey, storeValue);
      }
    });

    this.setState({
      items,
      prevItems,
    });

    if (nextProps.search !== this.props.search)
    {
      this.setState({
        showingCount: INIT_SHOWING_COUNT,
      });
    }
  }

  public renderSection(stateKey: string, type: string, label: string)
  {
    let index = 0;
    const max = this.state.showingCount.get(stateKey);
    const items = this.state.items.get(stateKey);
    const renderItems: SchemaBaseClass[] = [];
    let couldShowMore = false; // are there additional entries to show?
    let couldShowLess = false; // do we have more than the minimum number of entries to show?

    while (renderItems.length <= max && index < items.size && !couldShowMore)
    {
      const item = items.get(index);

      if (SchemaTypes.searchIncludes(item, this.props.search))
      {
        if (renderItems.length < max)
        {
          renderItems.push(item);
        }
        else
        {
          couldShowMore = true;
        }
      }
      index++;
    }

    if (max > INIT_SHOWING_COUNT.get(stateKey))
    {
      couldShowLess = true;
    }

    const showSection = !!renderItems.length;

    return (
      <FadeInOut
        open={showSection}
      >
        <div
          style={{
            marginTop: Styles.margin,
            marginLeft: Styles.margin,
          }}
        >
          <div
            style={Styles.font.semiBoldNormal as any}
          >
            {
              label
            }
          </div>

          {
            renderItems.map(
              (item, index) =>
                <SchemaTreeItem
                  id={item.id}
                  type={type}
                  search={this.props.search || '!@#$%^&*&%$!%!$#%!@'}
                  key={item.id}
                  inSearchResults={true}
                />,
            )
          }

          {
            couldShowMore &&
            <div
              style={SchemaTreeStyles.link}
              onClick={this._fn(this.handleShowMore, stateKey)}
              key={'show-more-' + stateKey}
            >
              Show More
            </div>
          }
          {
            couldShowLess &&
            <div
              style={SchemaTreeStyles.link}
              onClick={this._fn(this.handleShowLess, stateKey)}
              key={'show-less-' + stateKey}
            >
              Show Less
            </div>
          }
        </div>
      </FadeInOut>
    );
  }

  public handleShowMore(stateKey: string)
  {
    let { showingCount } = this.state;
    showingCount = showingCount.set(stateKey, showingCount.get(stateKey) + SHOW_MORE_INCREMENT);
    this.setState({
      showingCount,
    });
  }

  public handleShowLess(stateKey: string)
  {
    let { showingCount } = this.state;
    if (showingCount.get(stateKey) - SHOW_MORE_INCREMENT >= INIT_SHOWING_COUNT.get(stateKey))
    {
      showingCount = showingCount.set(stateKey, showingCount.get(stateKey) - SHOW_MORE_INCREMENT);
      this.setState({
        showingCount,
      });
    }
  }

  public render()
  {
    const { search } = this.props;

    return (
      <div
        style={[
          Styles.transition,
          {
            opacity: search ? 1 : 0,
          },
        ]}
      >
        <div
          style={{
            marginTop: 2 * Styles.margin,
          }}
        >
          <div
            style={SchemaTreeStyles.schemaHeading}
          >
            All Results
          </div>

          {
            this.renderSection('servers', 'server', 'Servers')
          }

          {
            this.renderSection('databases', 'database', 'Indices')
          }

          {
            this.renderSection('tables', 'table', 'Types')
          }

          {
            this.renderSection('columns', 'column', 'Fields')
          }

          {/*
            this.renderSection('indexes', 'index', 'Indexes')
          */}
        </div>
      </div>
    );
  }
}

export default Util.createContainer(
  SchemaSearchResults,
  ['schema'],
  {},
) as typeof SchemaSearchResults;
