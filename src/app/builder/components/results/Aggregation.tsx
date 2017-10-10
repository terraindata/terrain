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
const { List } = Immutable;
import Util from '../../../util/Util';
import * as _ from 'lodash';
import * as Radium from 'radium';
import * as React from 'react';
import { ResultsConfig } from '../../../../../shared/results/types/ResultsConfig';
import { backgroundColor, borderColor, Colors, fontColor, link } from '../../../common/Colors';
 import { CopyToClipboard } from 'react-copy-to-clipboard';
import Actions from '../../data/BuilderActions';
import Modal from '../../../common/components/Modal';
import ColorManager from '../../../util/ColorManager';
import Histogram from './../../../charts/components/Histogram';
import FileImportPreview from '../../../fileImport/components/FileImportPreview';
import { FileImportState } from '../../../fileImport/FileImportTypes';
import Menu, { MenuOption } from './../../../common/components/Menu';
import { notificationManager } from 'common/components/InAppNotification';
import Query from '../../../../items/types/Query';
import TerrainComponent from './../../../common/components/TerrainComponent';
import { tooltip } from './../../../common/components/tooltip/Tooltips';
import './Aggregation.less';
import AggregationHistogram from './AggregationHistogram';
import AggsTable from './AggsTable';

const ClipboardIcon = require('images/icon_clipboard.svg');
const ArrowIcon = require('images/icon_arrow_8x5.svg?name=ArrowIcon');
type ColumnTypesTree = FileImportTypes.ColumnTypesTree;


export interface Props
{
  exportState?: FileImportState;
  aggregation: any;
  index: number;
  key: number;
  name: string;
  query: Query;
}

@Radium
class AggregationComponent extends TerrainComponent<Props> {
  public state: {
    expanded: boolean,
    viewMode: string,
    singleValue: boolean,
  } = {
    expanded: false,
    viewMode: 'Table',
    singleValue: false,
  };

  public componentWillMount()
  {
    this.setState({
      viewMode: this.props.query.aggregationList.get(this.props.name),
      singleValue: this.isSingleValue(this.props.aggregation),
    });
  }

  public componentWillReceiveProps(nextProps: Props)
  {
    if (this.props.query.aggregationList[this.props.name] !== nextProps.query.aggregationList.get(nextProps.name))
    {
      this.setState({
        viewMode: nextProps.query.aggregationList.get(nextProps.name),
      });
    }
    if (this.props.aggregation !== nextProps.aggregation)
    {
      this.setState({
        singleValue: this.isSingleValue(nextProps.aggregation),
      });
    }
  }

  public isSingleValue(aggregation)
  {
    return _.values(aggregation).length === 1 && _.values(aggregation).value !== undefined;
  }

  public toggleExpanded()
  {
    this.setState({
      expanded: !this.state.expanded,
    });
  }

  public changeModeToTable()
  {
    Actions.change(List(this._keyPath('query', 'aggregationList', this.props.name)), 'Table');
    this.setState({
      viewMode: 'Table',
    });
  }

  public changeModeToHistogram()
  {
    Actions.change(List(this._keyPath('query', 'aggregationList', this.props.name)), 'Histogram');
    this.setState({
      viewMode: 'Histogram',
    });
  }

  public changeModeToRaw()
  {
    Actions.change(List(this._keyPath('query', 'aggregationList', this.props.name)), 'Raw');
    this.setState({
      viewMode: 'Raw',
    });
  }

  public getMenuOptions(): Immutable.List<MenuOption>
  {
    const options = [{
      text: 'Raw',
      onClick: this.changeModeToRaw,
      selected: this.state.viewMode === 'Raw',
    }];

    if (this.canBeHistogram())
    {
      options.push({
        text: 'Histogram',
        onClick: this.changeModeToHistogram,
        selected: this.state.viewMode === 'Histogram',
      });
    }

    if (this.canBeTable())
    {
      options.push({
        text: 'Table',
        onClick: this.changeModeToTable,
        selected: this.state.viewMode === 'Table',
      });
    }
    return List(options);
  }

   public handleTextCopied()
  {
    notificationManager.addNotification('Text Copied to Clipboard', '', 'info', 4);
  }


  public renderAgg()
  {
    const values = _.values(this.props.aggregation)[0];
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
            this.props.name
          }
        </div>
        {
          this.state.expanded ?
            (
              <div className='aggregation-title-bar-options'>  
                {
                  this.canBeTable() ? 
                    <div
                      className='aggregation-title-bar-export'
                      onClick={this.renderExport}
                      key='results-area-export'
                      style={link()}
                    >
                      Export
                  </div>
                  :
                  ''
                }
                <CopyToClipboard text={JSON.stringify(values, undefined, 2)} onCopy={this.handleTextCopied}>
                  <div className='clipboard-icon-wrapper'>
                    {
                      tooltip(<ClipboardIcon className='clipboard-icon' />, 'Copy to Clipboard')
                    }
                  </div>
                </CopyToClipboard>
                <Menu
                  options={this.getMenuOptions()}
                />
              </div>
            )
            :
            ''
        }
      </div>

    );
  }

  public renderSingleAgg()
  {
    const content = this.props.name + ' ' + String(this.props.aggregation.value);
    return (
      <div
        className='aggregation-title-bar'
      >
        <div className='aggregation-title-bar-title' onClick={this.toggleExpanded}>
          {
            content
          }
        </div>
        {
          (
            <div className='aggregation-title-bar-options'>
              <div
                className='aggregation-title-bar-export'
                onClick={this.showExport}
                key='results-area-export'
                style={link()}
              >
                Export
              </div>
              <div className='clipboard-icon-wrapper'>
                {tooltip(<ClipboardIcon className='clipboard-icon' />, 'Copy to Clipboard')}
              </div>
            </div>
          )
        }
      </div>
    );
  }

  public renderExpandedAgg()
  {
    const values = _.values(this.props.aggregation)[0];
    switch (this.state.viewMode) {
      case 'Table':
        return this.renderTableView(values);
      case 'Histogram':
        return this.renderHistogram(values);
      case 'Raw':
        return <pre> {JSON.stringify(values, undefined, 2)} </pre>;
      default:
        return <pre> {JSON.stringify(values, undefined, 2)} </pre>;
    }
  }

  public canBeTable()
  {
    const values = _.values(this.props.aggregation)[0];
    return values.buckets !== undefined;
  }

  public renderTableView(tableData)
  {
    if (this.canBeTable())
    {
      return (
        <div className='aggregation-table'>
          <AggsTable
            tableData={tableData}
          />
        </div>
      );
    }
  }

  public canBeHistogram()
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

  public renderHistogram(values)
  {
    if (this.canBeHistogram())
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
    return null;
  }

  public renderExport()
  {
    const values = _.values(this.props.aggregation)[0];
    const exportArray = [values.buckets.size];
    exportArray[0] = ['key', 'doc_count'];
    values.buckets.map((object, i) =>
        exportArray[i + 1] = [object.key, object.doc_count];
      );
    Util.exportToCSV(exportArray, this.props.name);
  }

  public render()
  {
    return (
      <div className='aggregation'>
        {this.state.singleValue ? this.renderSingleAgg() : this.renderAgg()}
        {this.state.expanded && !this.state.singleValue && this.renderExpandedAgg()}
      </div>
    );
  }
}

export default AggregationComponent;
