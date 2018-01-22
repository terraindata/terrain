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

// tslint:disable:no-var-requires strict-boolean-expressions
const Dimensions = require('react-dimensions');
import * as classNames from 'classnames';
import * as Immutable from 'immutable';
const { List, Map } = Immutable;
import FadeInOut from 'common/components/FadeInOut';
import { notificationManager } from 'common/components/InAppNotification';
import * as _ from 'lodash';
import * as Radium from 'radium';
import * as React from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { ResultsConfig } from '../../../../../shared/results/types/ResultsConfig';
import Query from '../../../../items/types/Query';
import { backgroundColor, borderColor, Colors, fontColor, getStyle } from '../../../colors/Colors';
import ColorManager from '../../../util/ColorManager';
import Util from '../../../util/Util';
import BuilderActions from '../../data/BuilderActions';
import Histogram from './../../../charts/components/Histogram';
import Dropdown from './../../../common/components/Dropdown';
import TerrainComponent from './../../../common/components/TerrainComponent';
import { tooltip } from './../../../common/components/tooltip/Tooltips';
import './Aggregation.less';
import AggregationGaussian from './AggregationGaussian';
import AggregationHistogram from './AggregationHistogram';
import AggregationMap from './AggregationMap';
import AggregationScatterPlot from './AggregationScatterPlot';
import AggregationsTable from './AggregationsTable';
import { Aggregation as AggregationClass } from './ResultTypes';

const ClipboardIcon = require('images/icon_clipboard.svg');
const ExportIcon = require('images/icon_import.svg');
const ArrowIcon = require('images/icon_arrow.svg?name=ArrowIcon');

export interface Props
{
  aggregation: any;
  name: string;
  query: Query;
  containerWidth?: number;
  index: number;
  builderActions?: typeof BuilderActions;
}

export enum DISPLAY_TYPES
{
  Histogram,
  ScatterPlot,
  Table,
  Raw,
  Gaussian,
  Map,
}

const DISPLAY_TYPE_NAMES = {
  [DISPLAY_TYPES.Histogram]: 'Histogram',
  [DISPLAY_TYPES.ScatterPlot]: 'Scatter Plot',
  [DISPLAY_TYPES.Table]: 'Table',
  [DISPLAY_TYPES.Raw]: 'Raw',
  [DISPLAY_TYPES.Gaussian]: 'Graph',
  [DISPLAY_TYPES.Map]: 'Map',
};

@Radium
class AggregationComponent extends TerrainComponent<Props> {
  public state: {
    expanded: boolean,
    displayType: DISPLAY_TYPES,
    isSingleValue: boolean,
    singleValue: string,
  } = {
      expanded: false,
      displayType: DISPLAY_TYPES.Raw,
      isSingleValue: false,
      singleValue: '',
    };

  public componentDidMount()
  {
    const currentAgg = this.props.query.aggregationList.get(this.props.name);
    this.updateInitialDisplay(this.props.aggregation, currentAgg, this.props.name);
    const { isSingle, value } = this.isSingleValue(this.props.aggregation);
    this.setState({
      isSingleValue: isSingle,
      singleValue: value,
    });
  }

  public componentWillReceiveProps(nextProps: Props)
  {
    if (!_.isEqual(this.props.query.aggregationList.get(this.props.name),
      nextProps.query.aggregationList.get(nextProps.name)))
    {
      const currentAgg = nextProps.query.aggregationList.get(nextProps.name);
      this.updateInitialDisplay(nextProps.aggregation, currentAgg, nextProps.name);
    }
    if (this.props.aggregation !== nextProps.aggregation)
    {
      const { isSingle, value } = this.isSingleValue(nextProps.aggregation);
      this.setState({
        isSingleValue: isSingle,
        singleValue: value,
      });
      // If the type of the aggregation changed, update the display type accordingly (because supported
      // agg types might be different)
      const currentAgg = nextProps.query.aggregationList.get(nextProps.name);
      if (currentAgg === undefined)
      {
        return;
      }
      if (!this.validDisplayType(currentAgg.displayType, nextProps.aggregation))
      {
        const displayType = this.getBestDisplayType(nextProps.aggregation);
        this.setState({
          displayType,
        });
        currentAgg.displayType = displayType;
        this.props.builderActions.change(List(this._keyPath('query', 'aggregationList', nextProps.name)), currentAgg, true);
      }
    }
  }

  // Returns whether the stored display type is valid for the aggregation
  public validDisplayType(displayType, aggregation)
  {
    switch (displayType)
    {
      case DISPLAY_TYPES.Table:
        return this.canBeTable(aggregation);
      case DISPLAY_TYPES.Histogram:
        return this.canBeHistogram(aggregation) !== undefined;
      case DISPLAY_TYPES.ScatterPlot:
        return this.canBeScatterPlot(aggregation);
      case DISPLAY_TYPES.Gaussian:
        return this.canBeGaussian(aggregation);
      case DISPLAY_TYPES.Map:
        return this.canBeMap(aggregation);
      default:
        return true;
    }
  }

  // Select display type based on stored display (in current agg) or choosing best if none is stored
  public updateInitialDisplay(aggregation, currentAgg, name)
  {
    if (currentAgg === undefined)
    {
      return;
    }
    const displayType = currentAgg.displayType !== 'None'
      ? currentAgg.displayType : this.getBestDisplayType(aggregation);
    this.setState({
      displayType,
      expanded: currentAgg.expanded,
    });
    if (displayType !== currentAgg.displayType)
    {
      currentAgg.displayType = displayType;
      this.props.builderActions.change(List(this._keyPath('query', 'aggregationList', name)), currentAgg, true);
    }
  }

  // Returns a visual display type if possible, otherwise table, then raw
  public getBestDisplayType(aggregation)
  {
    let displayType = DISPLAY_TYPES.Raw;
    if (this.canBeHistogram(aggregation) !== undefined)
    {
      displayType = DISPLAY_TYPES.Histogram;
    }
    else if (this.canBeScatterPlot(aggregation))
    {
      displayType = DISPLAY_TYPES.ScatterPlot;
    }
    else if (this.canBeGaussian(aggregation))
    {
      displayType = DISPLAY_TYPES.Gaussian;
    }
    else if (this.canBeMap(aggregation))
    {
      displayType = DISPLAY_TYPES.Map;
    }
    else if (this.canBeTable(aggregation))
    {
      displayType = DISPLAY_TYPES.Table;
    }
    return displayType;
  }

  // extracts single value from metrics aggregation (sum, avg, ...)
  public isSingleValue(aggregation)
  {
    const values = _.values(aggregation);
    const length = _.keys(values[0]).length;
    const isSingle = length === 1 &&
      (values[0].value !== undefined || values[0].doc_count !== undefined);
    const value = values[0].value !== undefined ? values[0].value : values[0].doc_count;
    return { isSingle, value };
  }

  public toggleExpanded()
  {
    const currAgg = this.props.query.aggregationList.get(this.props.name);
    currAgg.expanded = !this.state.expanded;

    this.props.builderActions.change(List(this._keyPath('query', 'aggregationList', this.props.name)), currAgg);
    this.setState({
      expanded: !this.state.expanded,
    });
  }

  public changeDisplayType(type)
  {
    const currAgg = this.props.query.aggregationList.get(this.props.name);
    currAgg.displayType = type;
    this.props.builderActions.change(List(this._keyPath('query', 'aggregationList', this.props.name)), currAgg);
    this.setState({
      displayType: type,
    });
  }

  public handleDisplayTypeChange(index: number)
  {
    const options = this.getDropdownOptions();
    this.changeDisplayType(parseFloat(options[index]));
  }

  public getDropdownOptions()
  {
    const options = [String(DISPLAY_TYPES.Raw)];
    if (this.canBeHistogram() !== undefined)
    {
      options.push(String(DISPLAY_TYPES.Histogram));
    }
    if (this.canBeScatterPlot())
    {
      options.push(String(DISPLAY_TYPES.ScatterPlot));
    }
    if (this.canBeGaussian())
    {
      options.push(String(DISPLAY_TYPES.Gaussian));
    }
    if (this.canBeMap())
    {
      options.push(String(DISPLAY_TYPES.Map));
    }
    if (this.canBeTable())
    {
      options.push(String(DISPLAY_TYPES.Table));
    }
    return options;
  }

  public handleTextCopied()
  {
    notificationManager.addNotification('Text Copied to Clipboard', '', 'info', 4);
  }

  public renderAgg()
  {
    const values = _.values(this.props.aggregation)[0];
    const options = this.getDropdownOptions();
    return (
      <div
        className={classNames({
          'aggregation-title-bar': true,
          'aggregation-title-bar-closed': !this.state.expanded,
        })}
      >
        <ArrowIcon
          className={classNames({
            'arrow-icon': true,
            'arrow-icon-closed': !this.state.expanded,
          })}
          style={this.state.expanded ? getStyle('fill', Colors().active) :
            getStyle('fill', Colors().text1)}
          onClick={this.toggleExpanded}
        />
        <div
          className='aggregation-title-bar-title'
          onClick={this.toggleExpanded}
          style={this.state.expanded ? fontColor(Colors().active) : fontColor(Colors().text1)}
        >
          {
            this.props.name
          }
        </div>
        {
          this.state.expanded ?
            (
              <div className='aggregation-title-bar-options' key={this.props.name}>
                {
                  this.canBeTable() ?
                    <div className='aggregation-title-bar-export'>
                      {
                        tooltip(<ExportIcon
                          className='aggregation-title-bar-export-icon'
                          onClick={this.exportData}
                          key='results-area-export'
                          style={getStyle('fill', Colors().iconColor)}
                        />, {
                            title: 'Export to CSV',
                            distance: 5,
                          })
                      }
                    </div>
                    :
                    ''
                }
                <CopyToClipboard text={JSON.stringify(values, undefined, 2)} onCopy={this.handleTextCopied}>
                  <div className='clipboard-icon-wrapper'>
                    {
                      tooltip(<ClipboardIcon
                        className='clipboard-icon'
                        style={getStyle('fill', Colors().iconColor)}
                      />, {
                          title: 'Copy JSON to Clipboard',
                          distance: 20,
                        })
                    }
                  </div>
                </CopyToClipboard>
                <Dropdown
                  options={List(options)}
                  optionsDisplayName={Map(DISPLAY_TYPE_NAMES)}
                  selectedIndex={options.indexOf(String(this.state.displayType))}
                  canEdit={true}
                  onChange={this.handleDisplayTypeChange}
                  className='aggregation-display-type-dropdown'
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
    const { name, aggregation } = this.props;
    return (
      <div
        className={classNames({
          'aggregation-title-bar': true,
          'aggregation-title-bar-closed': true,
        })}
      >
        <div
          className='aggregation-title-bar-title'
          style={fontColor(Colors().text1)}
        >
          <span>
            {
              name + ':  '
            }
          </span>
          <span className='aggregation-title-bar-value'>
            {this.state.singleValue}
          </span>
        </div>
      </div>
    );
  }

  public renderExpandedAgg()
  {
    const values = _.values(this.props.aggregation)[0];

    switch (this.state.displayType)
    {
      case DISPLAY_TYPES.Table:
        return this.renderTableView(values);
      case DISPLAY_TYPES.Histogram:
        return this.renderHistogram(values);
      case DISPLAY_TYPES.ScatterPlot:
        return this.renderScatterPlot(values);
      case DISPLAY_TYPES.Gaussian:
        return this.renderGaussian(values);
      case DISPLAY_TYPES.Map:
        return this.renderMap(values);
      case DISPLAY_TYPES.Raw:
        return <pre className='aggregation-raw'> {JSON.stringify(values, undefined, 2)} </pre>;
      default:
        return <pre className='aggregation-raw'> {JSON.stringify(values, undefined, 2)} </pre>;
    }
  }

  public shouldComponentUpdate(nextProps, nextState)
  {
    return (!(_.isEqual(this.props, nextProps) && _.isEqual(this.state, nextState)));
  }

  public canBeTable(overrideAggregation?)
  {
    const aggregation = overrideAggregation !== undefined ? overrideAggregation : this.props.aggregation;
    const values = _.values(aggregation)[0];
    if (values.buckets !== undefined)
    {
      return _.keys(values.buckets).length > 0;
    }
    return true;
  }

  public renderTableView(values)
  {
    let buckets = this.findKey(values, 'buckets');
    if (buckets !== undefined && !Array.isArray(buckets))
    {
      buckets = _.keys(buckets).map((key) => _.extend({}, buckets[key], { key }));
    }
    if (this.canBeTable())
    {
      return (
        <div className='aggregation-table'>
          <AggregationsTable
            tableData={buckets !== undefined ? buckets : values}
            useBuckets={buckets !== undefined}
          />
        </div>
      );
    }
  }

  public findKey(obj, k)
  {
    const keys = _.keys(obj);
    for (let i = 0; i < keys.length; i++)
    {
      const key = keys[i];
      const value = obj[key];
      if (key === k)
      {
        return value;
      }
      else if (_.isObject(value))
      {
        return this.findKey(value, k);
      }
    }
  }

  public canBeMap(overrideAggregation?)
  {
    const aggregation = overrideAggregation !== undefined ? overrideAggregation : this.props.aggregation;
    const values = _.values(aggregation)[0];
    return this.findKey(values, 'bounds') !== undefined || this.findKey(values, 'location') !== undefined;
  }

  public renderMap(values)
  {
    return (
      <AggregationMap
        data={values}
        colors={[Colors().active, Colors().activeHover]}
        containerWidth={this.props.containerWidth - 100}
      />);
  }

  // Has to be an extended stats aggregation
  public canBeGaussian(overrideAggregation?)
  {
    const aggregation = overrideAggregation !== undefined ? overrideAggregation : this.props.aggregation;
    const values = _.values(aggregation)[0];
    return values.std_deviation !== undefined && values.std_deviation !== null;
  }

  public renderGaussian(values)
  {
    return (
      <AggregationGaussian
        data={values}
        colors={[Colors().active, Colors().activeHover]}
        index={this.props.index}
        containerWidth={this.props.containerWidth - 100}
      />
    );
  }

  public renderScatterPlot(values)
  {
    return (
      <AggregationScatterPlot
        data={values.values}
        colors={[Colors().active, Colors().activeHover]}
        index={this.props.index}
        containerWidth={this.props.containerWidth - 100}
      />
    );
  }

  // For percentile/percentile_rank aggregations
  public canBeScatterPlot(overrideAggregation?)
  {
    const aggregation = overrideAggregation !== undefined ? overrideAggregation : this.props.aggregation;
    const values = _.values(aggregation)[0];
    return values.values !== undefined && values.values !== null;
  }

  // Most buckets aggregations
  public canBeHistogram(overrideAggregation?)
  {
    const aggregation = overrideAggregation !== undefined ? overrideAggregation : this.props.aggregation;
    const values = _.values(aggregation)[0];
    const value = this.findKey(values, 'buckets');
    return value;
  }

  public renderHistogram(values)
  {
    const value = this.canBeHistogram();
    if (value !== undefined)
    {
      return (
        <AggregationHistogram
          data={value}
          colors={[Colors().active, Colors().activeHover]}
          index={this.props.index}
          containerWidth={this.props.containerWidth - 100}
        />
      );
    }
    return null;
  }

  public exportData()
  {
    const values = _.values(this.props.aggregation)[0];
    let exportArray;
    if (values.buckets !== undefined)
    {
      exportArray = [values.buckets.size];
      exportArray[0] = ['key', 'doc_count'];
      values.buckets.map((object, i: number) =>
      {
        return exportArray[i + 1] = [object.key, object.doc_count];
      });
    }
    else
    {
      exportArray = [values.size];
      exportArray[0] = ['key', 'value'];
      _.keys(values).map((key, i: number) =>
      {
        return exportArray[i + 1] = [key, values[key]];
      });
    }
    Util.exportToCSV(exportArray, this.props.name);
  }

  public render()
  {
    return (
      <div
        className='aggregation'
        style={[borderColor(Colors().resultLine), fontColor(Colors().text1)]}
      >
        {this.state.isSingleValue ? this.renderSingleAgg() : this.renderAgg()}
        <FadeInOut
          open={this.state.expanded && !this.state.isSingleValue}
        >
          <div
            className='aggregation-expanded'
            style={borderColor(Colors().active)}
          >
            {this.renderExpandedAgg()}
          </div>
        </FadeInOut>
      </div>
    );
  }
}

const AggregationContainer = Util.createTypedContainer(
  AggregationComponent,
  [],
  { builderActions: BuilderActions },
)

export default Dimensions({
  elementResize: true,
  containerStyle: {
    height: 'auto',
  },
})(AggregationContainer);
