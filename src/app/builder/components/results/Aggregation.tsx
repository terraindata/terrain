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

// tslint:disable:no-var-requires switch-default strict-boolean-expressions restrict-plus-operands

import * as classNames from 'classnames';
import * as Immutable from 'immutable';
import { List } from 'immutable';
import * as _ from 'lodash';
import * as Radium from 'radium';
import * as React from 'react';
import { ResultsConfig } from '../../../../../shared/results/types/ResultsConfig';
import { backgroundColor, borderColor, Colors, fontColor } from '../../../common/Colors';
import ColorManager from '../../../util/ColorManager';
import Menu, { MenuOption } from './../../../common/components/Menu';
import TerrainComponent from './../../../common/components/TerrainComponent';
import './Aggregation.less';
import AggregationHistogram from './AggregationHistogram';
import AggsTable from './AggsTable';
const ArrowIcon = require('images/icon_arrow_8x5.svg?name=ArrowIcon');

export interface Props
{
  aggregation: any;
  index: number;
  key: number;

}

@Radium
class AggregationComponent extends TerrainComponent<Props> {
  public state: {
    expanded: boolean,
    viewMode: string,
  } = {
    expanded: false,
    viewMode: 'Table',
  };

  public toggleExpanded()
  {
    this.setState({
      expanded: !this.state.expanded,
    });
  }

  public changeModeToTable()
  {
    this.setState({
      viewMode: 'Table',
    });
  }

  public changeModeToGraph()
  {
    this.setState({
      viewMode: 'Graph',
    });
  }

  public changeModeToRaw()
  {
    this.setState({
      viewMode: 'Raw',
    });
  }

  public getMenuOptions(): List<MenuOption>
  {
    const options: List<MenuOption> =
      List([
        {
          text: 'Table',
          onClick: this.changeModeToTable,
        },
        {
          text: 'Graph',
          onClick: this.changeModeToGraph,
        },
        {
          text: 'Raw',
          onClick: this.changeModeToRaw,
        },
      ]);
    return options;
  }

  public renderAgg()
  {
    const aggTitle = Object.keys(this.props.aggregation)[0];
    return (
      <div
        className={classNames({
          'aggregation-title-bar': true,
          'aggregation-title-bar-open': !this.state.expanded,
        })}
      >
        <ArrowIcon className='arrow-icon' onClick={this.toggleExpanded} />
        <div className='aggregation-title-bar-title' onClick={this.toggleExpanded}>
          {
            aggTitle
          }
        </div>
        {
          this.state.expanded ?
            <Menu
              options={this.getMenuOptions()}
            />
            :
            ''
        }
      </div>

    );
  }

  public renderExpandedAgg()
  {
    const values = _.values(this.props.aggregation)[0];
    return (
      <div className='aggregation-expanded-view'>
        {
          this.state.expanded ?
            <div>
              {(this.state.viewMode === 'Table') ? this.renderTableView(values) : ''}
              {(this.state.viewMode === 'Graph') ? this.renderAggregationHistogram() : ''}
              {(this.state.viewMode === 'Raw') ? <pre> {JSON.stringify(values, undefined, 2)} </pre> : ''}
            </div>
            :
            ''
        }
      </div>
    );
  }

  public renderAggregationHistogram()
  {
    if (this.canBeHistogram(this.props.aggregation))
    {
      return this.renderHistogram();
    }
  }

  public renderTableView(tableData)
  {
    return (
      <AggsTable
        tableData={tableData}
      />
    );
  }

  // TODO Make this more comprehensive
  public canBeHistogram(agg)
  {
    const values = _.values(this.props.aggregation)[0];
    return values.buckets !== undefined;
  }

  public parseDataForHistogram(buckets)
  {
    let data;
    let domainMin: number = Infinity;
    let domainMax: number = -Infinity;
    let rangeMax: number = -Infinity;
    let categories = [];
    // RANGE QUERIES
    if (buckets[0] && (buckets[0].to || buckets[0].from))
    {
      domainMin = 0;
      domainMax = buckets.length;
      data = buckets.map((bucket, i) =>
      {
        if (bucket.doc_count > rangeMax)
        {
          rangeMax = bucket.doc_count;
        }
        return { x: i, y: bucket.doc_count };
      });
      categories = buckets.map((bucket) =>
      {
        const to = bucket.to !== undefined ? String(bucket.to) : '';
        const from = bucket.from !== undefined ? String(bucket.from) : '';
        return from + '-' + to;
      });
    }
    // TERMS QUERIES
    else if (buckets[0] && buckets[0].key && typeof buckets[0].key === 'string')
    {
      domainMin = 0;
      domainMax = buckets.length;
      data = buckets.map((bucket, i) =>
      {
        if (bucket.doc_count > rangeMax)
        {
          rangeMax = bucket.doc_count;
        }
        return { x: i, y: bucket.doc_count };
      });
      categories = buckets.map((bucket) =>
      {
        return bucket.key;
      });
    }
    // HISTOGRAM QUERIES
    else
    {
      data = buckets.map((bucket) =>
      {
        if (bucket.doc_count > rangeMax)
        {
          rangeMax = bucket.doc_count;
        }
        if (bucket.key > domainMax)
        {
          domainMax = bucket.key;
        }
        if (bucket.key < domainMin)
        {
          domainMin = bucket.key;
        }
        return { x: bucket.key, y: bucket.doc_count };
      });
    }
    return { data, categories, domain: List([domainMin, domainMax]), range: List([0, rangeMax]) };
  }

  // TODO CLEAN THIS
  public renderHistogram()
  {
    const buckets = _.values(this.props.aggregation)[0].buckets;
    const { data, categories, domain, range } = this.parseDataForHistogram(buckets);
    return (
      <AggregationHistogram
        barsData={data}
        xLabels={List<string>(categories)}
        colors={[Colors().active, Colors().activeHover]}
        domain={domain}
        range={range}
      />
    );
  }

  public render()
  {
    return (
      <div className='aggregation'>
        {this.renderAgg()}
        {this.state.expanded && this.renderExpandedAgg()}
      </div>
    );
  }
}

export default AggregationComponent;
