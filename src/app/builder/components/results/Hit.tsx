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
import * as _ from 'lodash';
import * as Radium from 'radium';
import * as React from 'react';
import './Hit.less';
const { List, Map } = Immutable;
import { ResultsConfig, _ResultsConfig } from '../../../../../shared/results/types/ResultsConfig';
import { backgroundColor, borderColor, Colors, fontColor } from '../../../colors/Colors';
import Menu from '../../../common/components/Menu';
import ColorManager from '../../../util/ColorManager';
import MapUtil from '../../../util/MapUtil';
import { SpotlightActions } from '../../data/SpotlightRedux';
import * as SpotlightTypes from '../../data/SpotlightTypes';
import MapComponent from './../../../common/components/MapComponent';
import TerrainComponent from './../../../common/components/TerrainComponent';
import { tooltip } from './../../../common/components/tooltip/Tooltips';
import Util from './../../../util/Util';
import { Hit } from './ResultTypes';
import Draggable from 'react-draggable';

const PinIcon = require('./../../../../images/icon_pin_21X21.svg?name=PinIcon');
const ScoreIcon = require('./../../../../images/icon_terrain_27x16.svg?name=ScoreIcon');
const CloseIcon = require('./../../../../images/icon_close_8x8.svg?name=CloseIcon');

// TODO REMOVE
import Actions from '../../data/BuilderActions';


const MAX_DEFAULT_FIELDS = 4;

export interface Props
{
  hit: Hit;

  resultsConfig: ResultsConfig;
  index: number;
  primaryKey: string;
  onExpand: (index: number) => void;
  expanded?: boolean;
  allowSpotlights: boolean;
  onSpotlightAdded: (id, spotlightData) => void;
  onSpotlightRemoved: (id) => void;
  hitSize?: 'large' | 'small';

  isOver?: boolean;
  isDragging?: boolean;
  connectDragSource?: (a: any) => any;
  connectDropTarget?: (a: any) => any;
  connectDragPreview?: (a: any) => void;

  locations?: { [field: string]: any };

  // injected props
  spotlights?: SpotlightTypes.SpotlightState;
  spotlightActions?: typeof SpotlightActions;
}

@Radium
class HitComponent extends TerrainComponent<Props> {

  public state: {
    hovered: boolean;
    // spotlights: IMMap<string, any>;
  } =
    {
      hovered: false,
      // spotlights: SpotlightStore.getState().spotlights,
    };

  public constructor(props: Props)
  {
    super(props);
    // this._subscribe(SpotlightStore, {
    //   isMounted: false,
    //   storeKeyPath: ['spotlights'],
    //   stateKey: 'spotlights',
    // });
  }

  public shouldComponentUpdate(nextProps: Props, nextState)
  {
    for (const key in nextProps)
    {
      if (key !== 'hit' && this.props[key] !== nextProps[key])
      {
        return true;
      }
    }

    for (const key in nextState)
    {
      if (this.state[key] !== nextState[key])
      {
        return true;
      }
    }

    return !_.isEqual(this.props.hit.toJS(), nextProps.hit.toJS());
  }

  public renderExpandedField(value, field)
  {
    return this.renderField(field, 0, null, {
      showField: true,
      showRaw: true,
    });
  }

  public renderField(field, index?, fields?, overrideFormat?)
  {
    if (!resultsConfigHasFields(this.props.resultsConfig) && index >= MAX_DEFAULT_FIELDS && this.props.hitSize !== 'small')
    {
      return null;
    }
    const spotlights = this.props.spotlights.spotlights;
    const isSpotlit = spotlights.get(this.props.primaryKey);
    const color = isSpotlit ? spotlights.get(this.props.primaryKey).color : 'black';
    const value = getResultValue(this.props.hit, field, this.props.resultsConfig,
      false, this.props.expanded, overrideFormat, this.props.locations, color);
    const format = this.props.resultsConfig && this.props.resultsConfig.formats.get(field);
    const showField = overrideFormat ? overrideFormat.showField : (!format || format.type === 'text' || format.showField);
    return (
      <div
        className={classNames({
          'result-field': true,
          'results-are-small': this.props.hitSize === 'small',
        })}
        key={field}
      >
        {
          showField &&
          <div
            className='result-field-name'
          >
            {
              field
            }
          </div>
        }
        <div
          className={classNames({
            'result-field-value': true,
            'result-field-value-short': (field + value).length < 0,
            'result-field-value-number': typeof value === 'number',
            'result-field-value-show-overflow': format && format.type === 'map',
          })}
        >
          {
            value
          }
        </div>
      </div>
    );
  }

  public spotlight(e, overrideId?, overrideColor?)
  {
    const id = overrideId || this.props.primaryKey;
    const spotlightColor = overrideColor || ColorManager.altColorForKey(id);
    const spotlightData = this.props.hit.toJS();
    spotlightData['name'] = getResultName(this.props.hit, this.props.resultsConfig,
      this.props.expanded, this.props.locations, spotlightColor);
    spotlightData['color'] = spotlightColor;
    spotlightData['id'] = id;
    spotlightData['rank'] = this.props.index;
    this.props.spotlightActions({
      actionType: 'spotlightAction',
      id,
      hit: spotlightData,
    });
    this.props.onSpotlightAdded(id, spotlightData);
  }

  public unspotlight()
  {
    this.props.onSpotlightRemoved(this.props.primaryKey);
    this.props.spotlightActions({
      actionType: 'clearSpotlightAction',
      id: this.props.primaryKey,
    });
  }

  public renderSpotlight()
  {
    const spotlights = this.props.spotlights.spotlights;
    const spotlight = spotlights.get(this.props.primaryKey);
    return (
      <div
        onClick={spotlight !== undefined ? this.unspotlight : this.spotlight}
        className={classNames({
          'result-spotlight': true,
          'result-spotlight-lit': spotlight !== undefined,
        })}
        style={{
          background: spotlight !== undefined ?
            spotlight.color : 'transparent',
        }}
      >
        <div
          className={classNames({
            'result-spotlight-text': true,
            'result-spotlight-text-small': this.props.index + 1 >= 100,
            'result-spotlight-text-large': this.props.index + 1 < 10,
          })}
        >
          {_.padStart((this.props.index + 1).toString(), 2, '0')}
        </div>
      </div>
    );
  }

  public expand()
  {
    this.props.onExpand(this.props.index);
  }

  public render()
  {
    const { isDragging, connectDragSource, isOver, connectDropTarget, hit, hitSize, expanded } = this.props;
    let { resultsConfig } = this.props;

    const classes = classNames({
      'result': true,
      'result-expanded': this.props.expanded,
      'result-dragging': isDragging,
      'result-drag-over': isOver,
    });

    let score: any = null;

    if (resultsConfig && resultsConfig.score && resultsConfig.enabled)
    {
      score = this.renderField(resultsConfig.score);
    }

    const spotlights = this.props.spotlights.spotlights;
    const spotlight = spotlights.get(this.props.primaryKey);
    const color = spotlight ? spotlight.color : 'black';

    const thumbnail = resultsConfig && resultsConfig.thumbnail ?
      getResultThumbnail(hit, resultsConfig, this.props.expanded) :
      null;
    const name = getResultName(hit, resultsConfig, this.props.expanded, this.props.locations, color);
    const fields = getResultFields(hit, resultsConfig);
    const configHasFields = resultsConfigHasFields(resultsConfig);

    let bottomContent: any;

    if (!configHasFields && fields.length > 4 && !expanded && hitSize !== 'small')
    {
      bottomContent = (
        <div className='result-bottom' onClick={this.expand}>
          {fields.length - MAX_DEFAULT_FIELDS} more field{fields.length - 4 === 1 ? '' : 's'}
        </div>
      );
    }

    let expandedContent: any;
    if (this.props.expanded)
    {
      expandedContent = (
        <div className='result-expanded-fields'>
          <div className='result-expanded-fields-title'>
            All Fields
          </div>
          {
            hit.fields.map(
              (value, key) =>
                this.renderExpandedField(value, key),
            )
          }
        </div>
      );
    }
    
    if (!resultsConfig)
    {
      resultsConfig = _ResultsConfig();
    }
    const thumbnailWidth = hitSize === 'small' ? resultsConfig.smallThumbnailWidth :
      resultsConfig.thumbnailWidth;

    return ((
      <div
        className={classes}
        onDoubleClick={this.expand}
        onMouseEnter={this._fn(this.handleHover, true)}
        onMouseLeave={this._fn(this.handleHover, false)}
      >
        <div
          className={classNames({
            'result-inner': true,
            'results-are-small': hitSize === 'small',
          })}
          style={[
            borderColor(Colors().resultLine),
            backgroundColor((localStorage.getItem('theme') === 'DARK') ? Colors().emptyBg : Colors().bg3),
          ]}
        >
          {
            thumbnail &&
              [
                <div 
                  className={classNames({
                    'result-thumbnail-wrapper': true,
                    'results-are-small': hitSize === 'small',
                  })}
                  style={{
                    backgroundImage: `url(${thumbnail})`,
                    width: thumbnailWidth,
                    minWidth: thumbnailWidth,
                  }}
                  key={1}
                >
                </div>
              ,
              this.state.hovered &&
                <Draggable
                  axis='x'
                  bounds='parent'
                  position={{
                    x: thumbnailWidth - 15,
                    y: 0,
                  }}
                  onDrag={this.handleThumbnailResize}
                  key={2}
                >
                  <div
                    className='result-thumbnail-resizer'
                  />
                </Draggable>
            ]
          }
          <div 
            className={classNames({
              'result-details-wrapper': true,
              'results-are-small': hitSize === 'small',
            })}
          >
            <div 
              className={classNames({
                'result-name': true,
                'results-are-small': hitSize === 'small',
              })}
            >
              <div
                className='result-name-inner'
                style={fontColor(Colors().text.baseLight)}
              >
                {
                  this.renderSpotlight()
                }
                <div className='result-pin-icon'>
                  <PinIcon />
                </div>
                <span className='result-name-label'>{name}</span>
                {
                  this.props.expanded &&
                  <div
                    onClick={this.expand}
                    className='result-expanded-close-button'
                  >
                    <CloseIcon className='close close-icon' />
                  </div>
                }
              </div>
            </div>
            <div
              className={classNames({
                'result-fields-wrapper': true,
                'results-are-small': hitSize === 'small',
              })}
            >
              {score}
              {
                _.map(fields, this.renderField)
              }
              {
                expandedContent
              }
            </div>
            {
              bottomContent
            }
          </div>
        </div>
      </div>
    ));
  }
  
  private handleHover(hovered: boolean)
  {
    this.setState({
      hovered,
    });
  }
  
  private handleThumbnailResize(e, data: { 
    x: number, y: number,
    deltaX: number, deltaY: number,
  })
  {
    const {x, y} = data;
    
    let config = this.props.resultsConfig;
    const key = this.props.hitSize === 'small' ? 'smallThumbnailWidth' : 'thumbnailWidth';
    config = config.set(key, Math.max(config[key] + data.deltaX, 15));
    
    Actions.changeResultsConfig(config);
  }
}

export function getResultValue(hit: Hit, field: string, config: ResultsConfig, isTitle: boolean, expanded: boolean,
  overrideFormat?: any, locations?: { [field: string]: any }, color?: string, bgUrlOnly = false)
{
  let value: any;
  if (hit)
  {
    value = hit.fields.get(field);
  }
  return ResultFormatValue(field, value, config, isTitle, expanded, overrideFormat, locations, color, bgUrlOnly);
}

export function resultsConfigHasFields(config: ResultsConfig): boolean
{
  return config && config.enabled && config.fields && config.fields.size > 0;
}

export function getResultFields(hit: Hit, config: ResultsConfig): string[]
{
  let fields: string[];

  if (resultsConfigHasFields(config))
  {
    fields = config.fields.toArray();
  }
  else
  {
    fields = hit.fields.keySeq().toArray();
  }

  return fields;
}

export function getResultThumbnail(hit: Hit, config: ResultsConfig, expanded: boolean, locations?: { [field: string]: any }, color?: string)
{
  let thumbnailField: string;

  if (config && config.thumbnail && config.enabled)
  {
    thumbnailField = config.thumbnail;
  }
  else
  {
    thumbnailField = _.first(getResultFields(hit, config));
  }

  return getResultValue(hit, thumbnailField, config, false, expanded, null, locations, color, true);
}

export function getResultName(hit: Hit, config: ResultsConfig, expanded: boolean, locations?: { [field: string]: any }, color?: string)
{
  let nameField: string;

  if (config && config.name && config.enabled)
  {
    nameField = config.name;
  }
  else
  {
    nameField = _.first(getResultFields(hit, config));
  }

  return getResultValue(hit, nameField, config, true, expanded, null, locations, color);
}

export function ResultFormatValue(field: string, value: any, config: ResultsConfig, isTitle: boolean, expanded: boolean,
  overrideFormat?: any, locations?: { [field: string]: any }, color?: string, bgUrlOnly = false): any
{
  const format = config && config.enabled && config.formats && config.formats.get(field);
  const { showRaw } = overrideFormat || format || { showRaw: false };
  let italics = false;
  let tooltipText = '';
  if (value === undefined)
  {
    value = 'undefined';
    italics = true;
  }
  if (typeof value === 'boolean')
  {
    value = value ? 'true' : 'false';
    italics = true;
  }
  if (typeof value === 'string' && !value.length)
  {
    value = '"" (blank)';
    italics = true;
  }
  if (value === null)
  {
    value = 'null';
    italics = true;
  }
  if ((format && format.config !== undefined))
  {
    const thumbnail = format.config.thumbnail;
    const template = format.config.formats.get(thumbnail).template;
    return (
      <div className='hit-nested-value'>
        {
          value.slice(0, 5).map((nested, i) =>
          {
            const image = nested.get(thumbnail);
            const url = template.replace(/\[value\]/g, image as string);
            return (
              <div
                className='result-field-value-image-wrapper-nested'
                key={i}
              >
                <div
                  className='result-field-value-nested-image'
                  style={{
                    backgroundImage: `url(${url})`,
                    // give the div the background image, to make use of the "cover" CSS positioning,
                    // but also include the <img> tag below (with opacity 0) so that right-click options still work
                  }}
                >
                  {/*<img src={url} />*/}
                </div>
              </div>
            )
          })
        }
      </div>
    )
  }
  if ((format && format.type !== 'map') || !format)
  {
    if (List.isList(value))
    {
      value = JSON.stringify(value);
      tooltipText = JSON.stringify(value, null, 2);
      tooltipText = tooltipText.replace(/\"/g, '').replace(/\\/g, '').replace(/:/g, ': ').replace(/,/g, ', ');
    }
  }
  if (typeof value === 'object')
  {
    tooltipText = JSON.stringify(value, null, 2);
    tooltipText = tooltipText.replace(/\"/g, '').replace(/\\/g, '').replace(/:/g, ': ').replace(/,/g, ', ');
    value = JSON.stringify(value);
  }

  if (format && !isTitle)
  {
    switch (format.type)
    {
      case 'image':
        const url = format.template.replace(/\[value\]/g, value as string);
        if(bgUrlOnly)
        {
          return url;
        }
        
        return (
          <div
            className='result-field-value-image-wrapper'
          >
            <div
              className='result-field-value-image'
              style={{
                backgroundImage: `url(${url})`,
                // give the div the background image, to make use of the "cover" CSS positioning,
                // but also include the <img> tag below (with opacity 0) so that right-click options still work
              }}
            >
              {/*<img src={url} />*/}
            </div>
            <div className='result-field-value'>
              {
                showRaw ? value : null
              }
            </div>
          </div>
        );

      // case 'map':
      //   const resultLocation = MapUtil.getCoordinatesFromGeopoint(value);
      //   let targetLocation: [number, number];
      //   if (locations !== undefined && locations[field] !== undefined)
      //   {
      //     targetLocation = MapUtil.getCoordinatesFromGeopoint(locations[field]) as [number, number];
      //   }
      //   const marker = {
      //     coordinates: resultLocation,
      //     name: '',
      //     color,
      //     index: -1
      //   };
      //   return (
      //     <div className='result-field-value-map-wrapper'>
      //       <MapComponent
      //         coordinates={targetLocation}
      //         showDirectDistance={targetLocation !== undefined}
      //         hideSearchBar={true}
      //         hideZoomControl={true}
      //         markers={List([marker])}
      //         geocoder='photon'
      //         canEdit={false}
      //       />
      //     </div>
      //   );

      case 'text':

        break;
    }
  }

  if (typeof value === 'number')
  {
    value = Math.floor((value as number) * 10000) / 10000;
    value = value.toLocaleString();
  }
  // Add in tooltip stuff here

  if (tooltipText && !expanded)
  {
    return tooltip(<div>{value}</div>, {
      html: <div style={{
        width: 140,
        height: 200,
        overflowY: 'auto',
        fontSize: '12px',
        display: 'inline-block',
        textAlign: 'left',

      }}
      >
        {tooltipText}
      </div>,
      interactive: true,
      position: 'right',
    });
  }

  if (italics)
  {
    return <em>{value}</em>;
  }

  return value;
}

export default Util.createTypedContainer(
  HitComponent,
  ['spotlights'],
  { spotlightActions: SpotlightActions },
);

// DnD stuff

// Defines a draggable result functionality
// const resultSource =
// {
//   canDrag(props)
//   {
//     return false; // TODO remove once we get result dragging and pinning working
//     // return props.canDrag;
//   },

//   beginDrag(props)
//   {
//     const item = props.result;
//     return item;
//   },

//   endDrag(props, monitor, component)
//   {
//     if(!monitor.didDrop())
//     {
//       return;
//     }

//     const item = monitor.getItem();
//     const dropResult = monitor.getDropResult();
//   }
// }

// // Defines props to inject into the component
// const dragCollect = (connect, monitor) =>
// ({
//   connectDragSource: connect.dragSource(),
//   isDragging: monitor.isDragging(),
//   connectDragPreview: connect.dragPreview()
// });

// const resultTarget =
// {
//   canDrop(props, monitor)
//   {
//     return true;
//   },

//   hover(props, monitor, component)
//   {
//     const canDrop = monitor.canDrop();
//   },

//   drop(props, monitor, component)
//   {
//     const item = monitor.getItem();
//     // TODO
//     // Actions.results.move(item, props.index);
//   }
// }

// const dropCollect = (connect, monitor) =>
// ({
//   connectDropTarget: connect.dropTarget(),
//   isOver: monitor.isOver(),
//   isOverCurrent: monitor.isOver({ shallow: true }),
//   canDrop: monitor.canDrop(),
//   itemType: monitor.getItemType()
// });

// export default DropTarget('RESULT', resultTarget, dropCollect)(DragSource('RESULT', resultSource, dragCollect)(Result));
