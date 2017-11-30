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

// tslint:disable:no-var-requires restrict-plus-operands strict-boolean-expressions prefer-const no-empty

import * as Immutable from 'immutable';
import './HitsArea.less';
const { Map, List } = Immutable;
import * as classNames from 'classnames';
import * as $ from 'jquery';
import * as _ from 'lodash';
import * as React from 'react';
// import * as moment from 'moment';
const moment = require('moment');
const ReactModal = require('react-modal');

import BackendInstance from 'database/types/BackendInstance';
import ETLExportDisplay from 'etl/components/ETLExportDisplay';
import { ResultsConfig } from 'shared/results/types/ResultsConfig';

import Query from 'src/items/types/Query';

import Modal from 'common/components/Modal';
import Ajax from 'util/Ajax';
import Util from 'util/Util';
import Actions from '../../data/BuilderActions';
import Hit from '../results/Hit';
import ResultsConfigComponent from '../results/ResultsConfigComponent';
import HitsTable from './HitsTable';

import Radium = require('radium');

import { backgroundColor, borderColor, Colors, fontColor, getStyle, link } from 'app/colors/Colors';

import DragHandle from 'common/components/DragHandle';
import InfiniteScroll from 'common/components/InfiniteScroll';
import InfoArea from 'common/components/InfoArea';
import MapComponent from 'common/components/MapComponent';
import Switch from 'common/components/Switch';
import TerrainComponent from 'common/components/TerrainComponent';
import MapUtil from 'util/MapUtil';
import { Hit as HitClass, MAX_HITS, ResultsState } from './ResultTypes';

const HITS_PAGE_SIZE = 20;

export interface Props
{
  resultsState: ResultsState;
  db: BackendInstance;
  query: Query;
  canEdit: boolean;
  variantName: string;
  showExport: boolean;
  showCustomizeView: boolean;
  allowSpotlights: boolean;
  onNavigationException: () => void;
  ignoreEmptyCards?: boolean;
}

interface State
{
  hitFormat: string;
  showingConfig?: boolean;

  expanded?: boolean;
  expandedHitIndex?: number;

  hitsPages: number;
  onHitsLoaded?: (unchanged?: boolean) => void;

  showingExport?: boolean;
  mapHeight?: number;
  mouseStartY?: number;
  mapMaxHeight?: number;
  spotlightHits?: Immutable.Map<string, any>;
}

const MAP_MAX_HEIGHT = 300;
const MAP_MIN_HEIGHT = 25; // height of top bar on map

@Radium
class HitsArea extends TerrainComponent<Props>
{
  public state: State = {
    expanded: false,
    expandedHitIndex: null,
    showingConfig: false,
    showingExport: false,
    hitsPages: 1,
    hitFormat: 'icon',
    mapHeight: MAP_MIN_HEIGHT,
    mouseStartY: 0,
    mapMaxHeight: undefined,
    spotlightHits: Immutable.Map<string, any>({}),
  };

  public hitsFodderRange = _.range(0, 25);
  public locations = {};

  public componentWillReceiveProps(nextProps: Props)
  {
    if (nextProps.query.cards !== this.props.query.cards
      || nextProps.query.inputs !== this.props.query.inputs)
    {
      if (this.state.onHitsLoaded)
      {
        // reset infinite scroll
        this.state.onHitsLoaded(false);
      }
    }
    if (this.props.resultsState.hits !== nextProps.resultsState.hits)
    {
      let spotlightHits = Map();
      if (nextProps.resultsState.hits === undefined)
      {
        return;
      }
      nextProps.resultsState.hits.forEach((hit) =>
      {
        if (this.state.spotlightHits.get(hit.primaryKey))
        {
          spotlightHits = spotlightHits.set(hit.primaryKey, this.state.spotlightHits.get(hit.primaryKey));
        }
      });
      this.setState({
        spotlightHits,
      });
    }
  }

  public handleCollapse()
  {
    this.setState({
      expanded: false,
    });
  }

  public handleExpand(hitIndex: number)
  {
    this.setState({
      expanded: true,
      expandedHitIndex: hitIndex,
    });
  }

  public renderExpandedHit()
  {
    const { expandedHitIndex } = this.state;
    const { hits } = this.props.resultsState;
    const { resultsConfig } = this.props.query;

    let hit: HitClass;

    if (hits)
    {
      hit = hits.get(expandedHitIndex);
    }

    if (!hit)
    {
      return null;
    }

    return (
      <div className={classNames({
        'result-expanded-wrapper': true,
        'result-collapsed-wrapper': !this.state.expanded,
        'result-expanded-config-open': this.state.showingConfig,
      })}>
        <div className='result-expanded-bg' onClick={this.handleCollapse}></div>
        <Hit
          hit={hit}
          resultsConfig={resultsConfig}
          onExpand={this.handleCollapse}
          expanded={true}
          allowSpotlights={this.props.allowSpotlights}
          index={-1}
          primaryKey={hit.primaryKey}
          onSpotlightAdded={this.handleSpotlightAdded}
          onSpotlightRemoved={this.handleSpotlightRemoved}
        />
      </div>
    );
  }

  public handleRequestMoreHits(onHitsLoaded: (unchanged?: boolean) => void)
  {
    const { hitsPages } = this.state;

    if (hitsPages * HITS_PAGE_SIZE < MAX_HITS)
    {
      this.setState({
        hitsPages: hitsPages + 1,
        onHitsLoaded,
      });
    }
    else
    {
      onHitsLoaded(true);
    }
  }

  public componentDidUpdate()
  {
    if (this.state.onHitsLoaded)
    {
      this.setState({
        onHitsLoaded: null,
      });
      this.state.onHitsLoaded(false);
    }
  }

  public isQueryEmpty(): boolean
  {
    const { query, ignoreEmptyCards } = this.props;
    return !query || (!ignoreEmptyCards && !query.cards.size);
  }

  public handleSpotlightAdded(id, spotlightData)
  {
    this.setState({
      spotlightHits: this.state.spotlightHits.set(id, spotlightData),
    });
  }

  public handleSpotlightRemoved(id)
  {
    this.setState({
      spotlightHits: this.state.spotlightHits.delete(id),
    });
  }

  public buildAggregationMap(locations, hits)
  {
    if (hits === undefined)
    {
      return [];
    }
    const allMapsData = [];
    _.keys(locations).forEach((field) =>
    {
      let multiLocations = [];
      const target = MapUtil.getCoordinatesFromGeopoint(locations[field]);
      hits.forEach((hit, i) =>
      {
        const { resultsConfig } = this.props.query;
        const name = resultsConfig.enabled && resultsConfig.name !== undefined ?
          hit.fields.get(resultsConfig.name) : hit.fields.get('_id');
        const spotlight = this.state.spotlightHits.get(hit.primaryKey);
        const color = spotlight !== undefined && spotlight.color !== undefined ? spotlight.color : 'black';
        multiLocations.push({
          location: hit.fields.get(field),
          name,
          index: i + 1,
          color,
        });
      });
      allMapsData.push({ target, multiLocations });
    });
    return allMapsData;
  }

  public handleMapMouseDown(event)
  {
    $('body').on('mouseup', this.handleMapMouseUp);
    $('body').on('mouseleave', this.handleMapMouseUp);
    $('body').on('mousemove', this.handleMapMouseMove);
    const el = this.refs['map'];
    const cr = el['getBoundingClientRect']();
    const parentEl = this.refs['resultsarea'];
    const parentCr = parentEl['getBoundingClientRect']();
    this.setState({
      mapHeight: cr.height,
      mouseStartY: event.pageY,
      mapMaxHeight: parentCr.height,
    });
    event.preventDefault();
    event.stopPropagation();
  }

  public handleMapMouseUp(event)
  {
    $('body').off('mouseup', this.handleMapMouseUp);
    $('body').off('mouseleave', this.handleMapMouseUp);
    $('body').off('mousemove', this.handleMapMouseMove);
    event.preventDefault();
    event.stopPropagation();
  }

  public handleMapMouseMove(event)
  {
    const dY = this.state.mouseStartY - event.pageY;
    const newHeight = dY + this.state.mapHeight;
    event.preventDefault();
    event.stopPropagation();
    this.setState({
      mapHeight: newHeight,
      mouseStartY: event.pageY,
    });
  }

  public handleMapClick(event)
  {
    event.originalEvent.preventDefault();
    event.originalEvent.stopPropagation();
    // set to full height
    this.setState({
      mapHeight: MAP_MAX_HEIGHT,
    });
  }

  public toggleMapOpen(event)
  {
    const el = this.refs['map'];
    const cr = el['getBoundingClientRect']();
    if (cr.height <= MAP_MIN_HEIGHT)
    {
      this.setState({
        mapHeight: MAP_MAX_HEIGHT,
      });
    }
    else
    {
      this.setState({
        mapHeight: MAP_MIN_HEIGHT,
      });
    }
  }

  public renderHitsMap()
  {
    if (_.keys(this.locations).length === 0)
    {
      return null;
    }
    const mapData = this.buildAggregationMap(this.locations, this.props.resultsState.hits);
    const maxHeight = this.state.mapMaxHeight === undefined ? MAP_MAX_HEIGHT :
      Math.min(MAP_MAX_HEIGHT, this.state.mapMaxHeight - 80);
    if (mapData !== undefined && mapData.length > 0)
    {
      return (
        <div
          className='results-area-map'
          style={{
            height: this.state.mapHeight,
            maxHeight,
          }}
          ref='map'
        >
          <div
            className='results-area-map-topbar'
            onMouseUp={this.toggleMapOpen}
            style={backgroundColor(localStorage.getItem('theme') === 'DARK' ? Colors().bg3 : Colors().bg2)}
          >
            <div
              onMouseDown={this.handleMapMouseDown}
              className='results-area-map-handle-wrapper'
            >
              <DragHandle
                key={'results-area-map-handle'}
              />
            </div>
            <span style={fontColor(Colors().text1)}>
              View Hits on Map
            </span>
          </div>
          {
            mapData.map((data, index) =>
              <MapComponent
                location={data.target}
                multiLocations={data.multiLocations}
                markLocation={true}
                showSearchBar={false}
                showDistanceCircle={false}
                hideSearchSettings={true}
                zoomControl={true}
                colorMarker={true}
                key={index}
                className='results-area-map-container'
                onMapClick={this.handleMapClick}
              />,
            )}
        </div>
      );
    }
    return null;
  }

  public renderHits()
  {
    const { resultsState } = this.props;
    const { hits } = resultsState;
    const { resultsConfig } = this.props.query;

    let infoAreaContent: any = null;
    let hitsContent: any = null;
    let hitsAreOutdated: boolean = false;

    if (this.isDatabaseEmpty())
    {
      hitsAreOutdated = true;
      infoAreaContent = <InfoArea
        large='The database is empty, please select the database.'
      />;
    }
    else if (this.isQueryEmpty())
    {
      hitsAreOutdated = true;
      infoAreaContent = <InfoArea
        large='Results will display here as you build your query.'
      />;
    }
    else if (resultsState.hasError)
    {
      hitsAreOutdated = true;
      infoAreaContent = <InfoArea
        large='There was an error with your query.'
        small={resultsState.errorMessage}
      />;
    }

    if (!hits)
    {
      if (resultsState.loading)
      {
        hitsAreOutdated = true;
        infoAreaContent = <InfoArea
          large='Querying results...'
        />;
      }
      else
      {
        infoAreaContent = <InfoArea
          large='Compose a query to view results here.'
        />;
      }
    }
    else if (!hits.size)
    {
      hitsContent = <InfoArea
        large='There are no results for your query.'
        small='The query was successful, but there were no matches.'
      />;
    }
    else if (this.state.hitFormat === 'table')
    {
      hitsContent = (
        <div
          className={classNames({
            'results-table-wrapper': true,
            'results-table-wrapper-outdated': hitsAreOutdated,
          })}
        >
          <HitsTable
            hits={hits}
            resultsConfig={resultsConfig}
            onExpand={this.handleExpand}
            hitsLoading={resultsState.loading}
            allowSpotlights={this.props.allowSpotlights}
            onSpotlightAdded={this.handleSpotlightAdded}
            onSpotlightRemoved={this.handleSpotlightRemoved}
          />
        </div>
      );
    }
    else
    {
      // Extract the geo_distance fields and values from the query
      const geoDistances = this.props.query.tql.match(/"geo_distance": \{[^\}]*\}/g);
      this.locations = {};
      if (geoDistances !== undefined && geoDistances !== null)
      {
        geoDistances.forEach((geoDist) =>
        {
          geoDist = '{' + geoDist + '}}';
          try
          {
            const obj = JSON.parse(geoDist);
            // find field that isn't distance or distance_type
            _.keys(obj.geo_distance).forEach((key) =>
            {
              if (key !== 'distance' && key !== 'distance_type')
              {
                this.locations[key] = obj.geo_distance[key];
              }
            });
          }
          catch (e)
          { }
        });
      }
      hitsContent = (
        <InfiniteScroll
          className={classNames({
            'results-area-results': true,
            'results-area-results-outdated': hitsAreOutdated,
          })}
          onRequestMoreItems={this.handleRequestMoreHits}
        >
          {
            hits.map((hit, index) =>
            {
              if (index > this.state.hitsPages * HITS_PAGE_SIZE)
              {
                return null;
              }

              return (
                <Hit
                  hit={hit}
                  resultsConfig={resultsConfig}
                  onExpand={this.handleExpand}
                  index={index}
                  key={index}
                  primaryKey={hit.primaryKey}
                  allowSpotlights={this.props.allowSpotlights}
                  locations={this.locations}
                  onSpotlightAdded={this.handleSpotlightAdded}
                  onSpotlightRemoved={this.handleSpotlightRemoved}
                />
              );
            })
          }
          {
            this.hitsFodderRange.map(
              (i) =>
                <div className='results-area-fodder' key={i} />,
            )
          }
        </InfiniteScroll>
      );
    }

    let mapHeight = Math.min(this.state.mapHeight, MAP_MAX_HEIGHT);
    if (_.keys(this.locations).length === 0)
    {
      mapHeight = 0;
    }

    return (
      <div
        className='results-area-results-wrapper'
        style={{ height: `calc(100% - ${mapHeight}px - 60px)` }}
      >
        {
          hitsContent
        }
        {
          infoAreaContent
        }
      </div>
    );
  }

  public toggleView()
  {
    this.setState({
      hitFormat: this.state.hitFormat === 'icon' ? 'table' : 'icon',
      expanded: false,
    });
  }

  public renderTopbar()
  {
    const { resultsState } = this.props;
    let text: any = '';
    if (resultsState.loading)
    {
      text = <span className='loading-text' />;
    }
    else if (this.isDatabaseEmpty())
    {
      text = 'Database is not selected';
    }
    else if (this.isQueryEmpty())
    {
      text = 'Empty query';
    }
    else if (resultsState.hasError)
    {
      text = 'Error with query';
    }
    else if (resultsState.hits)
    {
      const { count } = resultsState;
      text = `${count || 'No'}${count === MAX_HITS ? '+' : ''} hit${count === 1 ? '' : 's'}`;
    }
    else
    {
      text = 'Text result';
    }

    return (
      <div
        className='results-top'
        style={getStyle('boxShadow', '0px 3px 12px ' + Colors().boxShadow)}
      >
        <div className='results-top-summary'>
          {
            text
          }
        </div>

        {this.props.showExport &&
          <div
            className='results-top-config'
            onClick={this.showExport}
            key='results-area-export'
            style={link()}
          >
            Export
          </div>
        }

        {this.props.showCustomizeView &&
          <div
            className='results-top-config'
            onClick={this.showConfig}
            key='results-area-customize'
            style={link()}
          >
            Customize view
        </div>
        }

        <Switch
          first='Icons'
          second='Table'
          onChange={this.toggleView}
          selected={this.state.hitFormat === 'icon' ? 1 : 2}
          small={true}
        />
      </div>
    );
  }

  public showExport()
  {
    this.setState({
      showingExport: true,
    });
  }

  public hideExport()
  {
    this.setState({
      showingExport: false,
    });
  }

  public showConfig()
  {
    this.setState({
      showingConfig: true,
    });
  }

  public hideConfig()
  {
    this.setState({
      showingConfig: false,
    });
  }

  public renderExport()
  {
    // const { previewColumns, columnNames, columnsToInclude, columnTypes, templates, transforms,
    //   filetype, requireJSONHaveAllFields, exportRank, elasticUpdate, objectKey } = this.props.exportState;
    // // const { previewRows, primaryKeys, primaryKeyDelimiter, columnNames, columnsToInclude, columnTypes, templates, transforms,
    // //   filetype, requireJSONHaveAllFields, exportRank, objectKey, elasticUpdate } = this.props.exportState;

    // const content =
    //   <div
    //     style={backgroundColor(Colors().bg1)}
    //   >
    //     <FileImportPreview
    //       exporting={true}
    //       filetype={filetype}
    //       previewColumns={previewColumns}
    //       columnNames={columnNames}
    //       columnsToInclude={columnsToInclude}
    //       columnTypes={columnTypes}
    //       templates={templates}
    //       transforms={transforms}
    //       columnOptions={List([])}
    //       uploadInProgress={false}
    //       requireJSONHaveAllFields={requireJSONHaveAllFields}
    //       objectKey={objectKey}
    //       exportRank={exportRank}
    //       elasticUpdate={elasticUpdate}
    //       query={this.props.query}
    //       inputs={this.props.query.inputs}
    //       serverId={Number(this.props.db.id)}
    //       variantName={this.props.variantName}
    //     />
    //   </div>;
    const content = (
      <ETLExportDisplay
        query={this.props.query}
        serverId={this.props.db.id}
        variantName={this.props.variantName}
      />
    );

    return (
      <Modal
        open={this.state.showingExport}
        onClose={this.hideExport}
        title={'Export'}
        children={content}
        fill={true}
        noFooterPadding={true}
      />
    );
  }

  public renderConfig()
  {
    if (this.state.showingConfig)
    {
      return <ResultsConfigComponent
        config={this.props.query.resultsConfig}
        fields={this.props.resultsState.fields}
        onClose={this.hideConfig}
        onConfigChange={this.handleConfigChange}
      />;
    }
  }

  public handleConfigChange(config: ResultsConfig)
  {
    Actions.changeResultsConfig(config);
  }

  public render()
  {
    return (
      <div
        className={classNames({
          'results-area': true,
          'results-area-config-open': this.state.showingConfig,
          'results-area-table altBg': this.state.hitFormat === 'table',
        })}
        ref='resultsarea'
      >
        {this.renderTopbar()}
        {this.renderHits()}
        {this.renderHitsMap()}
        {this.renderExpandedHit()}
        {this.props.showCustomizeView && this.renderConfig()}
        {this.props.showExport && this.renderExport()}
      </div>
    );
  }

  private isDatabaseEmpty(): boolean
  {
    return !this.props.db || !this.props.db.id;
  }
}

export default HitsArea;
