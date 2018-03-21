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

import { BuilderState } from 'app/builder/data/BuilderState';
import { notificationManager } from 'app/common/components/InAppNotification';
import { SchemaState } from 'app/schema/SchemaTypes';
import Ajax from 'app/util/Ajax';
import Util from 'app/util/Util';
import ElasticBlockHelpers, { getIndex } from 'database/elastic/blocks/ElasticBlockHelpers';
import Radium = require('radium');
import ESJSONParser from '../../../../../shared/database/elastic/parser/ESJSONParser';
import { _ResultsConfig, ResultsConfig } from '../../../../../shared/results/types/ResultsConfig';
import { AllBackendsMap } from '../../../../database/AllBackends';
import { ESParseTreeToCode } from '../../../../database/elastic/conversion/ParseElasticQuery';
import BackendInstance from '../../../../database/types/BackendInstance';
import Query from '../../../../items/types/Query';
import { backgroundColor, Colors, fontColor, getStyle, link } from '../../../colors/Colors';
import DragHandle from '../../../common/components/DragHandle';
import InfiniteScroll from '../../../common/components/InfiniteScroll';
import InfoArea from '../../../common/components/InfoArea';
import MapComponent from '../../../common/components/MapComponent';
import Modal from '../../../common/components/Modal';
import Switch from '../../../common/components/Switch';
import TerrainComponent from '../../../common/components/TerrainComponent';
import FileImportPreview from '../../../fileImport/components/FileImportPreview';
import { FileImportState } from '../../../fileImport/FileImportTypes';
import Hit from '../results/Hit';
import ResultsConfigComponent from '../results/ResultsConfigComponent';
import HitsTable from './HitsTable';
import { Hit as HitClass, MAX_HITS, ResultsState } from './ResultTypes';

const HITS_PAGE_SIZE = 15;

export interface Props
{
  resultsState: ResultsState;
  exportState?: FileImportState;
  builder?: BuilderState;
  schema?: SchemaState;
  db: BackendInstance;
  query: Query;
  canEdit: boolean;
  algorithmName: string;
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
  hitSize: 'large' | 'small';

  expanded?: boolean;
  expandedHitIndex?: number;

  hitsPages: number[];
  pageBreaks: List<number>;
  onHitsLoaded?: (unchanged?: boolean) => void;

  showingExport?: boolean;
  mapHeight?: number;
  mouseStartY?: number;
  mapMaxHeight?: number;
  spotlightHits?: Immutable.Map<string, any>;

  indexName: string;
  resultsConfig?: any;
  nestedFields: List<string>;
}

const MAP_MAX_HEIGHT = 300;
const MAP_MIN_HEIGHT = 30; // height of top bar on map

@Radium
class HitsArea extends TerrainComponent<Props>
{
  public state: State = {
    expanded: false,
    expandedHitIndex: null,
    showingConfig: false,
    showingExport: false,
    hitsPages: [0],
    hitFormat: 'icon',
    mapHeight: MAP_MIN_HEIGHT,
    mouseStartY: 0,
    mapMaxHeight: undefined,
    spotlightHits: Immutable.Map<string, any>(),
    hitSize: 'large',
    indexName: '',
    resultsConfig: undefined,
    nestedFields: List([]),
    pageBreaks: List([0]),
  };
  public scrollTop = 0;
  public hitsFodderRange = _.range(0, 25);
  public locations = {};

  public componentWillMount()
  {
    this.setIndexAndResultsConfig(this.props);
    this.getNestedFields(this.props);
  }

  public handleConfigChange(config: ResultsConfig, builderActions)
  {
    builderActions.changeResultsConfig(config);
    this.getNestedFields(this.props, config);
  }

  public shouldComponentUpdate(nextProps: Props, nextState: State)
  {
    for (const key in nextProps)
    {
      if (!_.isEqual(this.props[key], nextProps[key]))
      {
        if (key === 'builder' && !_.isEqual(
          this.props.builder.query.path.source.dataSource,
          nextProps.builder.query.path.source.dataSource) ||
          this.props.builder.db.name !==
          nextProps.builder.db.name)
        {
          return true;
        }
        else
        {
          return true;
        }
      }
    }

    for (const key in nextState)
    {
      if (!_.isEqual(this.state[key], nextState[key]))
      {
        return true;
      }
    }
    return false;
  }

  public componentWillReceiveProps(nextProps: Props)
  {
    if (this.props.db.name !== nextProps.db.name ||
      this.props.query.path.source !== nextProps.query.path.source ||
      this.props.query.resultsConfig !== nextProps.query.resultsConfig)
    {
      const indexChange = (this.props.query.path.source.dataSource as any).index !==
        (nextProps.query.path.source.dataSource as any).index;
      this.setIndexAndResultsConfig(nextProps, indexChange);
    }
    if (!_.isEqual(this.props.resultsState.fields, nextProps.resultsState.fields))
    {
      this.getNestedFields(nextProps);
    }
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

  public getNestedFields(props: Props, overrideConfig?)
  {
    // Get the fields that are nested
    const { builder, schema, resultsState } = props;
    let nestedFields = resultsState.fields.filter((field) =>
    {
      const type = ElasticBlockHelpers.getTypeOfField(
        schema,
        builder,
        field,
        true,
      );
      return type === 'nested' || type === '';
    }).toList();
    // Filter out anything that it is a single object, not a list of objects
    if (resultsState.hits && resultsState.hits.size)
    {
      nestedFields = nestedFields.filter((field) =>
        List.isList(resultsState.hits.get(0).fields.get(field)),
      ).toList();
    }
    // If there is a results config in use, only use nested fields in that config
    const resultsConfig = overrideConfig || this.state.resultsConfig || props.query.resultsConfig;
    if (resultsConfig && resultsConfig.enabled)
    {
      nestedFields = nestedFields.filter((field) =>
        resultsConfig.fields.indexOf(field) !== -1,
      ).toList();
    }
    this.setState({
      nestedFields,
    });
  }

  public setIndexAndResultsConfig(props: Props, indexChange = false)
  {
    let indexName = '';
    if (props.query.path &&
      props.query.path.source &&
      props.query.path.source.dataSource)
    {
      indexName = (props.query.path.source.dataSource as any).index;
    }
    this.setState({
      indexName,
    });
    if (props.query.resultsConfig !== undefined &&
      props.query.resultsConfig.enabled &&
      !indexChange
    )
    {
      this.setState({
        resultsConfig: props.query.resultsConfig,
      });
    }
    // Try to get results config from midway (stored by index)
    else
    {
      Ajax.getResultsConfig(indexName, (resp) =>
      {
        if (resp.length > 0)
        {
          resp[0]['fields'] = JSON.parse(resp[0]['fields']);
          resp[0]['formats'] = JSON.parse(resp[0]['formats']);
          resp[0]['primaryKeys'] = JSON.parse(resp[0]['primaryKeys']);
          resp[0]['enabled'] = true;
          this.setState({
            resultsConfig: _ResultsConfig(resp[0]),
          });
        }
      },
        (error) =>
        {
          // console.log('error', error);
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
    const { expandedHitIndex, hitSize } = this.state;
    const { hits } = this.props.resultsState;

    let hit: HitClass;

    if (hits)
    {
      hit = hits.get(expandedHitIndex);
    }

    if (!hit)
    {
      return null;
    }
    // noinspection CheckTagEmptyBody
    return (
      <div className={classNames({
        'result-expanded-wrapper': true,
        'result-collapsed-wrapper': !this.state.expanded,
        'result-expanded-config-open': this.state.showingConfig,
      })}>
        <div className='result-expanded-bg' onClick={this.handleCollapse}></div>
        <Hit
          hit={hit}
          resultsConfig={this.state.resultsConfig}
          onExpand={this.handleCollapse}
          expanded={true}
          allowSpotlights={this.props.allowSpotlights}
          index={this.state.expandedHitIndex}
          primaryKey={hit.primaryKey}
          onSpotlightAdded={this.handleSpotlightAdded}
          onSpotlightRemoved={this.handleSpotlightRemoved}
          hitSize={'large'}
          nestedFields={this.state.nestedFields}
          builder={this.props.builder}
          isVisible={true}
        />
      </div>
    );
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
    const cardsAndPathEmpty = !query.cards.size && !query.path;
    return !query || (!ignoreEmptyCards && cardsAndPathEmpty);
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
      let canAdd = true;
      let multiLocations = [];
      const target = locations[field];
      hits.forEach((hit, i) =>
      {
        const { resultsConfig } = this.state;
        const name = resultsConfig && resultsConfig.enabled && resultsConfig.name !== undefined ?
          hit.fields.get(resultsConfig.name) : hit.fields.get('_id');
        const spotlight = this.state.spotlightHits.get(hit.primaryKey);
        const color = spotlight !== undefined && spotlight.color !== undefined ? spotlight.color : 'black';
        if (!hit.fields.get(field))
        {
          canAdd = false;
        }
        multiLocations.push({
          coordinates: hit.fields.get(field),
          name,
          index: i + 1,
          color,
        });
      });
      if (canAdd)
      {
        allMapsData.push({ target, multiLocations: List(multiLocations) });
      }
    });
    return allMapsData;
  }

  public handleMapMouseDown(event)
  {
    $('body')
      .on('mouseup', this.handleMapMouseUp)
      .on('mouseleave', this.handleMapMouseUp)
      .on('mousemove', this.handleMapMouseMove);
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
    $('body')
      .off('mouseup', this.handleMapMouseUp)
      .off('mouseleave', this.handleMapMouseUp)
      .off('mousemove', this.handleMapMouseMove);
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
    if (cr.height <= MAP_MIN_HEIGHT + 5)
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
            borderColor: Colors().blockOutline,
          }}
          ref='map'
        >
          <div
            className='results-area-map-topbar'
            onMouseUp={this.toggleMapOpen}
            style={backgroundColor(Colors().blockBg)}
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
                coordinates={data.target}
                markers={data.multiLocations}
                hideSearchBar={true}
                key={index}
                className='results-area-map-container'
                onMapClick={this.handleMapClick}
                geocoder='photon'
                canEdit={false}
              />,
            )
          }
        </div>
      );
    }
    return null;
  }

  public renderHits()
  {
    const { resultsState } = this.props;
    const { hits } = resultsState;
    const { resultsConfig } = this.state;

    let infoAreaContent: any = null;
    let hitsContent: any = null;
    let hitsAreOutdated: boolean = false;

    if (this.isDatabaseEmpty())
    {
      hitsAreOutdated = true;
      infoAreaContent = <InfoArea
        large='The database is empty, please select a database.'
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
      try
      {
        // const tqlString = AllBackendsMap[this.props.query.language].parseTreeToQueryString(
        //   this.props.query,
        //   {
        //     replaceInputs: true,
        //   },
        // );
        const { query } = this.props;
        const parser = new ESJSONParser(query.tql, true);
        const tqlString = ESParseTreeToCode(parser, { replaceInputs: true }, query.inputs);
        const geoDistances = tqlString.match(/"geo_distance": \{[^\}]*\}/g);
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
      }
      catch (e)
      { }
      const lastPage = this.state.hitsPages[this.state.hitsPages.length - 1];
      hitsContent = (
        <div
          className={classNames({
            'results-area-results': true,
            'results-area-results-outdated': hitsAreOutdated,
          })}
          onScroll={this.checkScroll}
          id='hits-area'
        >
          {
            hits.map((hit, index) =>
            {
              if (!(index < lastPage * HITS_PAGE_SIZE + HITS_PAGE_SIZE))
              {
                return null;
              }

              return (
                <Hit
                  hit={hit}
                  resultsConfig={resultsConfig}
                  onExpand={this.handleExpand}
                  index={index}
                  key={hit.primaryKey}
                  primaryKey={hit.primaryKey}
                  allowSpotlights={this.props.allowSpotlights}
                  locations={this.locations}
                  onSpotlightAdded={this.handleSpotlightAdded}
                  onSpotlightRemoved={this.handleSpotlightRemoved}
                  hitSize={this.state.hitSize}
                  nestedFields={this.state.nestedFields}
                  builder={this.props.builder}
                  isVisible={this.isVisible(index)}
                />
              );
            })
          }

        </div>
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

  public isVisible(index)
  {
    const { hitsPages } = this.state;
    const firstPage = hitsPages[0];
    const lastPage = hitsPages[hitsPages.length - 1];
    return index >= firstPage * HITS_PAGE_SIZE &&
      index < lastPage * HITS_PAGE_SIZE + HITS_PAGE_SIZE;
  }
  public checkScroll(e)
  {
    const elem = $(e.currentTarget);
    const lastPage = this.state.hitsPages[this.state.hitsPages.length - 1];
    // scrolled to the bottom, increment visible pages and set the new "top"
    const scrollUp = this.scrollTop > elem.scrollTop();
    this.scrollTop = elem.scrollTop();
    if (elem[0].scrollHeight - elem.scrollTop() === elem.outerHeight())
    {
      if (lastPage * HITS_PAGE_SIZE < MAX_HITS)
      {
        this.setState({
          hitsPages: [lastPage, lastPage + 1],
          pageBreaks: this.state.pageBreaks.set(lastPage + 1, elem.scrollTop()),
        });
      }
    }
    // If it has scrolled up to "top", decrement visible pages
    else if (
      scrollUp &&
      this.state.pageBreaks.get(lastPage) >= elem.scrollTop() &&
      this.state.hitsPages.indexOf(0) === -1
    )
    {
      const firstPage = this.state.hitsPages[0];
      this.setState({
        hitsPages: [firstPage - 1, firstPage],
      });
    }
  }

  /* public handleESresultExport()
  {
    this.props.onNavigationException();

    const { xhr, queryId } = Ajax.query(
      this.props.query.tql,
      this.props.db,
      _.noop,
      _.noop,
      false,
      {
        streaming: true,
        streamingTo: this.props.algorithmName + ' on ' + moment().format('MM/DD/YY') + '.json',
      },
    );

    // TODO kill this on unmount
    this.setState({
      csvXhr: xhr,
      csvQueryId: queryId,
    });

    alert('Your data is being prepared for export, and will be automatically downloaded when ready.\n\
Note: this exports the results of your query, which may be different from the results in the Results \
column if you have customized the results view.');
  }*/

  /*  handleExport()
    {
      this.props.onNavigationException();

      const {xhr, queryId} = Ajax.query(
        .toTQL(
          this.props.query,
          {
            replaceInputs: true,
          },
        ),
        this.props.db,
        _.noop,
        _.noop,
        false,
        {
          csv: true,
          csvName: this.props.algorithmName + ' on ' + moment().format('MM/DD/YY') + '.csv',
        },
      );

      // TODO kill this on unmount
      this.setState({
        csvXhr: xhr,
        csvQueryId: queryId,
      });

      alert('Your data are being prepared for export, and will automatically download when ready.\n\
  Note: this exports the results of your query, which may be different from the results in the Results \
  column if you have set a custom results view.');
    }*/

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
        style={backgroundColor(Colors().bg)}
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

        {/*<Switch
          first='Icons'
          second='Table'
          onChange={this.toggleView}
          selected={this.state.hitFormat === 'icon' ? 1 : 2}
          small={true}
        />*/}
        {<Switch
          first='Large'
          second='Small'
          onChange={this.toggleHitSize}
          selected={this.state.hitSize === 'large' ? 1 : 2}
          small={true}
        />}
      </div>
    );
  }

  public toggleHitSize()
  {
    // Need to scroll this to the top to avoid weird bugs with infinite scroller
    document.getElementById('hits-area').scrollTop = 0;
    this.setState({
      hitSize: this.state.hitSize === 'large' ? 'small' : 'large',
      hitsPages: [0],
      pageBreaks: List([0]),
    });
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

  public saveConfigAsDefault(config: ResultsConfig)
  {
    if (config.enabled)
    {
      Ajax.updateResultsConfig(this.state.indexName, config, (resp) =>
      {
        notificationManager.addNotification(
          'Saved',
          'Saved as default config for ' + this.state.indexName,
          'info',
          3,
        );
      });
    }
  }

  public hideConfig(config: ResultsConfig)
  {
    // Update the default config for this index
    this.setState({
      showingConfig: false,
    });
  }

  public renderExport()
  {
    const { previewColumns, columnNames, columnsToInclude, columnTypes, templates, transforms,
      filetype, requireJSONHaveAllFields, exportRank, elasticUpdate, objectKey } = this.props.exportState;
    // const { previewRows, primaryKeys, primaryKeyDelimiter, columnNames, columnsToInclude, columnTypes, templates, transforms,
    //   filetype, requireJSONHaveAllFields, exportRank, objectKey, elasticUpdate } = this.props.exportState;

    const content =
      <div
        style={backgroundColor(Colors().bg1)}
      >
        <FileImportPreview
          exporting={true}
          filetype={filetype}
          previewColumns={previewColumns}
          columnNames={columnNames}
          columnsToInclude={columnsToInclude}
          columnTypes={columnTypes}
          templates={templates}
          transforms={transforms}
          columnOptions={List()}
          uploadInProgress={false}
          requireJSONHaveAllFields={requireJSONHaveAllFields}
          objectKey={objectKey}
          exportRank={exportRank}
          elasticUpdate={elasticUpdate}
          query={this.props.query}
          inputs={this.props.query.inputs}
          serverId={Number(this.props.db.id)}
          algorithmName={this.props.algorithmName}
        />
      </div>;

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
      const { props, state } = this;
      const fields = Util.orderFields(props.resultsState.fields, props.schema,
        props.query.algorithmId, state.indexName);
      const { resultsConfig } = this.state;
      return <ResultsConfigComponent
        config={resultsConfig !== undefined ? resultsConfig : this.props.query.resultsConfig}
        fields={fields}
        onClose={this.hideConfig}
        onSaveAsDefault={this.saveConfigAsDefault}
        onConfigChange={this.handleConfigChange}
        builder={this.props.builder}
        schema={this.props.schema}
        dataSource={this.props.query.path.source.dataSource}
        sampleHit={props.resultsState.hits && props.resultsState.hits.get(0)}
      />;
    }
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
    return !this.props.db || !(this.props.db.id > -1);
  }
}

export default Util.createContainer(
  HitsArea,
  ['builder', 'schema'],
  {
  },
);
