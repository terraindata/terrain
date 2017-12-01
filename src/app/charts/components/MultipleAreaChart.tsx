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

import TerrainVictoryLabel from 'charts/components/victory-custom-components/TerrainVictoryLabel';
import TerrainVictoryPin from 'charts/components/victory-custom-components/TerrainVictoryPin';
import TerrainVictoryTheme from 'charts/TerrainVictoryTheme';
import TerrainComponent from 'common/components/TerrainComponent';
import * as Immutable from 'immutable';
import * as LibraryTypes from 'library/LibraryTypes';
import * as React from 'react';
import ContainerDimensions from 'react-container-dimensions';
import ColorManager from 'util/ColorManager';
import Util from 'util/Util';
import
{
  createContainer,
  VictoryArea,
  VictoryAxis,
  VictoryBar,
  VictoryBrushContainer,
  VictoryChart,
  VictoryGroup,
  VictoryLabel,
  VictoryLegend,
  VictoryPortal,
  VictoryScatter,
  VictoryTooltip,
} from 'victory';

const styles = {
  wrapper: {
    width: '100%',
    display: 'flex',
    flexFlow: 'column nowrap',
  },
  topChartWrapper: {
    height: '90%',
  },
  bottomChartWrapper: {
    width: '100%',
    height: '10%',
  },
  topChart: {
    axis: {
      tickLabels: {
        fill: 'rgba(255,255,255,0.75)',
        fontWeight: 'bold',
        padding: 2,
      },
      ticks: {
        size: 0,
      },
    },
    padding: { top: 25, bottom: 0, left: 0, right: 0 },
    areas: { data: { strokeWidth: 2, fillOpacity: 0.4 } },
    scatters: (fill) => ({
      data: {
        strokeWidth: 6,
        stroke: fill,
        fillOpacity: .8,
        strokeOpacity: .6,
        fill,
      },
    }),
    tooltip: { fill: 'white' },
    tooltipFlyout: { fill: 'black', rx: 5, ry: 5 },
  },
  bottomChart: {
    padding: { top: 0, bottom: 0, left: 0, right: 0 },
    bars: (fill) => ({ data: { fill, fillOpacity: 0.4, width: 10 } }),
    brush: { stroke: 'transparent', fill: 'white', fillOpacity: 0.1 },
    brushHandle: (height) => ({
      stroke: 1,
      fill: 'grey',
      fillOpacity: 1,
      height: height - 10,
      rx: 2,
      ry: 2,
      y: 5,
    }),
    axis: { grid: { strokeWidth: 0 }, ticks: { size: 0 } },
  },
  legend: {
    title: {
      fontSize: 15,
      fill: 'rgba(255,255,255,0.75)',
      fontWeight: 'bold',
    },
    pinStyle: { fill: 'rgba(255, 255, 255, 0.75)' },
    borderPadding: {
      left: 10,
      right: 10,
    },
  },
};

const config = {
  topChart: {
    scale: { x: 'time', y: 'linear' },
    interpolation: 'monotoneX',
    animate: { duration: 500 },
    domainPadding: { y: [0, 30] },
  },
  bottomChart: {
    scale: { x: 'time' },
    interpolation: 'monotoneX',
  },
  legend: {
    orientation: 'horizontal',
  },
};

interface Dataset
{
  id: ID;
  label: string[];
  data: any[];
  isPinned: boolean;
}

interface Props
{
  datasets: Immutable.Map<ID, Dataset>;
  xDataKey: string; // The key to get the value of x from the data
  yDataKey: string; // The key to get the value of y from the data
  domain?: { start: number, end: number };
  onLegendClick?: (datasetId: ID) => void;
  legendTitle?: string;
}

interface State
{
  brushDomain: any;
  zoomDomain: any;
  visibleDatasets: List<ID>;
  highlightDataset: ID;
  datasetColors: any;
}

export default class MultipleAreaChart extends TerrainComponent<Props> {
  public static defaultProps = {
    datasets: [],
    xDataKey: 'x',
    yDataKey: 'y',
    onLegendClick: (datasetId) => { return; },
    legendTitle: '',
    domain: { start: 0, end: 0 },
  };

  public state: State = {
    brushDomain: {},
    zoomDomain: {},
    visibleDatasets: null,
    highlightDataset: null,
    datasetColors: {},
  };

  constructor(props)
  {
    super(props);

    const { datasets } = props;

    this.state.visibleDatasets = datasets.keySeq().toList();
    this.state.datasetColors = this.mapDatasetColors(datasets);
  }

  public mapDatasetColors(datasets)
  {
    const datasetColors = {};

    datasets.keySeq().forEach((datasetId, index) =>
    {
      datasetColors[datasetId] = ColorManager.colorForKey(datasetId);
    });

    return datasetColors;
  }

  public componentWillReceiveProps(nextProps)
  {
    if (this.props.datasets !== nextProps.datasets)
    {
      const visibleDatasets = nextProps.datasets.keySeq();
      this.setState({
        visibleDatasets: visibleDatasets.toList(),
        datasetColors: this.mapDatasetColors(nextProps.datasets),
        brushDomain: {},
        zoomDomain: {},
      });
    }
  }

  public handleZoom(domain)
  {
    this.setState({ brushDomain: domain });
  }

  public handleBrush(domain)
  {
    this.setState({ zoomDomain: domain });
  }

  public renderData()
  {
    const { datasets, xDataKey, yDataKey } = this.props;
    const { visibleDatasets, highlightDataset } = this.state;
    const areas = [];
    const scatters = [];
    const lines = [];

    let areaToHightlight = null;
    let scatterToHightlight = null;

    datasets.forEach((ds, key) =>
    {
      if (visibleDatasets.includes(key) && ds.data.length > 0)
      {
        if (key !== highlightDataset || highlightDataset === null)
        {
          const datasetColor = this.getDatasetColor(key);
          areas.push(
            <VictoryArea
              key={key}
              name={`area-${key}`}
              style={{ data: { fill: datasetColor } }}
              data={ds.data.map((d) => ({ ...d, l: true }))}
              interpolation={config.topChart.interpolation}
              x={xDataKey}
              y={yDataKey}
            />,
          );
          scatters.push(
            <VictoryScatter
              key={key}
              style={styles.topChart.scatters(datasetColor)}
              data={ds.data}
              size={(datum, active) => active ? 3 : 0}
              x={xDataKey}
              y={yDataKey}
            />,
          );
        }
        else
        {
          areaToHightlight = (
            <VictoryArea
              name={`area-${key}`}
              key={key}
              style={{
                data: {
                  fill: this.getDatasetColor(key),
                  strokeWidth: 3,
                  fillOpacity: 0.7,
                },
              }}
              data={ds.data}
              interpolation={config.topChart.interpolation}
              x={xDataKey}
              y={yDataKey}
            />
          );

          scatterToHightlight = (
            <VictoryScatter
              key={key}
              size={(datum, active) => active ? 5 : 0}
              data={ds.data}
              x={xDataKey}
              y={yDataKey}
            />
          );
        }
      }
    });

    if (areaToHightlight !== null)
    {
      areas.push(areaToHightlight);
    }

    if (scatterToHightlight !== null)
    {
      scatters.push(scatterToHightlight);
    }

    return { areas, scatters };
  }

  public renderLegend()
  {
    const { datasets, legendTitle } = this.props;
    const { visibleDatasets } = this.state;

    const data = datasets
      .map((ds, key) =>
      {
        const labelsStyle = { fill: 'rgba(255,255,255,0.75)' };
        const dataStyle = { fill: this.getDatasetColor(ds.id) };

        return {
          id: ds.id,
          name: ds.label,
          labels: labelsStyle,
          symbol: dataStyle,
          isPinned: ds.isPinned,
        };
      });

    return (
      <VictoryLegend
        padding={0}
        titleOrientation={'left'}
        name='legend'
        gutter={23}
        data={data.toArray()}
        dataComponent={<TerrainVictoryPin
          onPinClick={this.handleLegendClick}
          pinStyle={styles.legend.pinStyle}
        />}
        orientation={config.legend.orientation}
        style={{
          title: styles.legend.title,
        }}
        title={legendTitle}
        labelComponent={<TerrainVictoryLabel />}
      />
    );
  }

  public getDatasetColor(datasetId)
  {
    return this.state.datasetColors[datasetId];
  }

  public handleLegendClick(e, props)
  {
    this.props.onLegendClick(props.datum.id);
  }

  public handleLegendMouseOver(e, props)
  {
    /* Return an array of affected victory components.
     * @childName: is optional, can be used to reference any victory component
     *   within the same VictoryChart by its name property. Then, the props
     *   received by the mutation function will be the ones of the referenced
     *   component, and the props returned by the mutation will be applied to
     *   it.
     * @target: {'data' | 'labels'} indicates what's the component to which
     *   the new props returned by the mutation will be applied. For instance,
     *   if this event comes from a VictoryLegend, 'data' refers to the legend
     *   item marker (the dot in this case) and 'labels' means the legend item
     *   text.
     * @mutation: is a function, recieves the props of the matched element, and
     *   returns a new props objects to be applied to it.
     */
    return [
      {
        // Matches the VictoryLegend texts.
        target: 'labels',
        mutation: (labelProps) =>
        {
          // Changes the VictoryLegend hover item text font size.
          const newStyle = Object.assign({}, labelProps.style, { fill: 'rgba(255,255,255,1)' });
          return { style: newStyle };
        },
      },
      {
        // Matches the VictoryArea that corresponds with the hovered legend item.
        childName: `area-${props.datum.id}`,
        target: 'data', // in this case 'data' means the area (the 'labels' are
        // the tooltips)
        eventKey: 'all', // this holds the index of single data points,
        // we want to paint the whole area
        mutation: (areaProps) =>
        {
          return {
            // Change the corresponding area style.
            style: Object.assign(
              {},
              areaProps.style,
              { fill: this.getDatasetColor(props.datum.id), strokeWidth: 3, fillOpacity: 0.7 },
            ),
          };
        },
      },
    ];
  }

  public handleLegendMouseOut(e, props)
  {
    return [
      {
        target: 'labels',
        mutation: () => null,
      },
      {
        childName: [`area-${props.datum.id}`],
        target: 'data',
        eventKey: 'all',
        mutation: () =>
        {
          // Returning null resets all mutations, reverts the component back to
          // its original state.
          return null;
        },
      },
    ];
  }

  public formatDate(timestamp)
  {
    const date = new Date(timestamp);
    const dateString = date.toISOString();

    return Util.formatDate(dateString);
  }

  public render()
  {
    const { datasets, xDataKey, yDataKey, domain } = this.props;

    const data = this.renderData();
    const legend = this.renderLegend();

    const { visibleDatasets } = this.state;

    const VictoryZoomVoronoiContainer = createContainer('zoom', 'voronoi');

    const chartDomain = { x: [domain.start, domain.end] };

    return (
      <div style={styles.wrapper}>
        <div style={styles.topChartWrapper}>
          <ContainerDimensions>
            {({ width, height }) => (
              <VictoryChart
                domain={chartDomain}
                domainPadding={config.topChart.domainPadding}
                scale={config.topChart.scale}
                theme={TerrainVictoryTheme}
                padding={styles.topChart.padding}
                width={width}
                height={height}
                containerComponent={
                  <VictoryZoomVoronoiContainer
                    responsive={false}
                    zoomDimension='x'
                    voronoiDimension='x'
                    zoomDomain={this.state.zoomDomain}
                    onZoomDomainChange={this.handleZoom}
                    labels={(d) => d.l ? `${this.formatDate(d.x)} => ${d.y}` : null}
                    labelComponent={
                      <VictoryTooltip
                        cornerRadius={4}
                        flyoutStyle={styles.topChart.tooltipFlyout}
                        style={styles.topChart.tooltip}
                        dx={25}
                      />
                    }
                  />
                }
                events={[
                  {
                    // indicate, by name, the component that listens to the event
                    childName: ['legend'],
                    // { 'data', 'labels' }, indicates if the texts or the dots
                    // of the legend items are the one that listens to the event.
                    target: 'labels',
                    eventHandlers: {
                      onMouseOver: this.handleLegendMouseOver,
                      onMouseOut: this.handleLegendMouseOut,
                    },
                  },
                ]}
              >
                <VictoryGroup
                  style={styles.topChart.areas}
                >
                  {data.areas}
                  {data.scatters}
                </VictoryGroup>
                <VictoryAxis
                  offsetY={height - styles.topChart.padding.top}
                  style={styles.topChart.axis}
                  tickLabelComponent={<VictoryLabel dx={24} />}
                />
                <VictoryAxis
                  dependentAxis
                  offsetX={width}
                  style={styles.topChart.axis}
                  tickLabelComponent={<VictoryLabel dy={7} />}
                />
                {legend}
              </VictoryChart>
            )}
          </ContainerDimensions>
        </div>
        <div style={styles.bottomChartWrapper}>
          <ContainerDimensions>
            {({ width, height }) => (
              <VictoryChart
                domain={chartDomain}
                scale={config.bottomChart.scale}
                padding={styles.bottomChart.padding}
                theme={TerrainVictoryTheme}
                height={height}
                width={width}
                containerComponent={
                  <VictoryBrushContainer
                    className='TerrainVictoryBrushContainer'
                    responsive={false}
                    brushDimension='x'
                    brushDomain={this.state.brushDomain}
                    onBrushDomainChange={this.handleBrush}
                    brushStyle={styles.bottomChart.brush}
                    handleStyle={styles.bottomChart.brushHandle(height)}
                  />
                }
              >
                <VictoryAxis
                  offsetY={height}
                  style={styles.bottomChart.axis}
                />
                <VictoryGroup offset={15}>
                  {datasets.map((d) => (<VictoryBar
                    style={styles.bottomChart
                      .bars(this.getDatasetColor(d.id))
                    }
                    data={datasets.first() !== null ? d.data : []}
                    interpolation={config.bottomChart.interpolation}
                    x={xDataKey}
                    y={yDataKey}
                  />))}
                </VictoryGroup>
              </VictoryChart>
            )}
          </ContainerDimensions>
        </div>
      </div>
    );
  }
}
