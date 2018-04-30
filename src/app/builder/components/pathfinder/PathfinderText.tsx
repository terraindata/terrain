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

// Centralized place for text used in Pathfinder

export const PathfinderText = {

  // Source section
  firstWord: 'Data Source',
  chooseDataSourceDropdownPrompt: 'Choose a data source',
  findSectionTitle: 'Data Source',
  findSectionSubtitle: '',
  // `Choose where your data are located and filter out everything that isn't a match.`,

  // Filter sections
  hardFilterSectionTitle: 'Must Match',
  hardFilterSectionSubtitle: 'When conditions are met, results are visible. When conditions are not met, results are hidden.',
  hardFilterAdd: 'Factor',
  softFilterAdd: 'Factor',
  softFilterSectionTitle: 'Should Match',
  softFilterSectionSubtitle: 'When conditions are met, results are rewarded. When conditions are not met, there is no impact.',
  includeDistanceExplanation: 'Include distance from each result to this location as a field',
  nestedFilterIntro: '',
  // filterGroupPost: 'of the following:',
  // createFilterLine: 'criteria',
  // createFilterGroup: 'group of filter conditions',

  createScoreLine: 'field',
  createAggregationLine: 'metadata',
  createNestedLine: 'personalization algorithm',

  // Score section
  scoreSectionTitle: 'Rank',
  scoreSectionSubtitle: 'Rank fields must be numbers and determine the order in which results are returned.',
  // `Score your results, so that the best picks show up in the top spots.`,
  scoreTypeLabel: 'Ranking Method',
  scoreTypeExplanation: 'Select how you would like to rank results. Terrain Ranking is recommended',
  terrainTypeExplanation: 'Use custom charts and weightings to create a custom ranking algorithm for results',
  terrainTypeName: 'Terrain Rank',
  fieldTypeExplanation: 'Rank items linearly given a list of fields. The result can be ordered ascending or descending by field',
  fieldTypeName: 'Linear',
  randomTypeExplanation: 'Randomly rank items',
  randomTypeName: 'Random',
  elasticTypeExplanation: 'Use only the text match quality to determine the ranking',
  elasticTypeName: 'Match Quality',

  scoreSectionTypes: {
    terrain: {
      title: 'Terrain',
      tooltip: 'The score will be determined by the weighted sum of factors',
    },
    linear: {
      title: 'Field',
      tooltip: 'The results will be sorted linearly by the following factors',
    },
    elastic: {
      title: 'Match Quality',
      tooltip: 'The results will be sorted based on how well the match any text filters from above',
    },
    random: {
      title: 'Random',
      tooltip: 'A diverse set of results will be returned',
    },
    // none: {
    //   title: 'None',
    //   tooltip: 'The results will not be sorted in any way',
    // },
  },

  // More section
  moreSectionTitle: 'More',
  moreSectionSubtitle:
    'Add advanced functionality to your algorithm, like grouping by a field, adding scripts, and adding personalization algorithms',
  sizeTitle: 'Number of Results',

  // Collapse
  collapseTitle: 'Group by',
  collapseTootlip: 'Force algorithm to only show the top result with matching values for this field',
  // Track scores
  trackScoreTitle: 'Track Match Quality',
  trackScoreTooltip: 'Track match quality of results',
  // Source
  sourceTitle: 'Returned Fields',
  // `Add nested algorithms to create a set of results for each result of your parent algorithm.`,
  referenceName: 'Parent Alias',
  referenceExplanation: 'What the results of this algorithm will be referred to in nested algorithms',
  nestedExplanation: 'Add another algorithm that uses the results of this one as input',
  scriptExplanation: 'Scripts can be used to create custom values to return with each result',
  addScript: 'Script',
  innerQueryName: 'Child Alias',
  aggregation:
    {
      missing: {
        title: 'Missing',
        text: 'If a document is missing',
        tooltipText: '',
      },
      percentileRanks: {
        title: 'Percentile Ranks',
        text: 'Return the percentiles of the following values',
        tooltipText: 'The percentile of each of these values of the selected field will be returned',
      },
      percentile: {
        title: 'Percentiles',
        text: 'Return the values at the following percentiles',
        tooltipText: 'The value at each of the following percentiles will be returned',
      },
      accuracy: {
        title: 'Accuracy',
        text1: 'Compression',
        tooltipText1: 'A higher compression value will lead to more accurate results but take longer. The default is 100',
        text2: 'Significant Digits',
        tooltipText2: 'A higher number of significant digits will be more precise, but will take longer. An HDR histogram will be used.',
      },
      sigma: {
        title: 'Standard Deviation Bounds',
        text: 'Sigma',
        tooltipText: 'Where to set the standard deviation bounds, in terms of the number of deviations away from the average',
      },
      ranges: {
        title: 'Ranges',
        text1: 'Uniform range size:',
        tooltipText1: 'The width of each equally-sized range of values',
        text2: 'Custom ranges',
        tooltipText2: 'Add individually sized and named ranges',
      },
      format: {
        title: 'Format',
        text1: 'Date Format',
        tooltipText1: 'The format of the date, e.g. MM/dd/yyyy',
        text2: 'Timezone',
        tooltipText2: 'What timezone the dates are in, either a time zone id or UTC offset',
      },
      extendedRange: {
        title: 'Facet Bounds',
        text1: 'Offset',
        tooltipText1: 'How much to offset the bars of the data from the lower bound',
        text2: 'Lower Bound',
        tooltipText2: 'The lower bound for values of the selected field',
        text3: 'Upper Bound',
        tooltipText3: 'The upper bound for values of the selected field',
      },
      minDocCount: {
        title: 'Minimum Facet Size',
        text: 'Minimum facet size',
        tooltipText: 'The fewest number of documents in a facet for it to be included in the facets',
      },
      order: {
        title: 'Sort order',
        text1: 'Sort facets by',
        text2: 'in ',
        text3: 'order',
        tooltipText: 'How to order the facets',
      },
      size: {
        title: 'Size',
        text: 'Number of facets',
        tooltipText: 'How many facets will be returned, a higher value will take longer to compute',
      },
      error: {
        title: 'error',
        text: 'Show the margin of error for each facet',
        tooltipText: 'Set to true, the upper bound of the error for each facet will be included with each facet',
      },
      origin: {
        title: 'Origin',
        text: '',
        tooltipText: 'Geographic location to from the distance from',
      },
      distance: {
        title: 'Distance Settings',
        text1: 'Units',
        tooltipText1: 'Units that the distances returned will be in',
        text2: 'Distance Type',
        tooltipText2: 'Arc distance is default and more accurate. Plane distance is less accurate but faster',
      },
      precision: {
        title: 'Precision',
        text: 'Grid size',
        tooltipText: `This value determines how large the squares of the geo grid will be.
      A number between 1-12 is expected with 1 being the least precise. Alternatively,
      an estimate of grid width (12mi) can be given.`,
      },
      includeExclude: {
        title: 'Include / Exclude',
        text1: 'Terms to Include',
        tooltipText1: 'A list of exact terms or regular expressions to be included in the facets',
        text2: 'Terms to Exclude',
        tooltipText2: 'A list of exact terms or regular expressions to be excluded in the facets',
      },
      type: {
        title: 'Type of Facets',
        text1: 'Geographic Distance',
        tooltipText1: 'Find facets for the geographic distance of each document to the origin point',
        text2: 'Geographic Grid',
        tooltipText2: 'Find the facets of a geographic grid (the number of documents that fall into each square in the grid)',
      },
      termsType: {
        title: 'Type of Facets',
        text1: 'Terms',
        tooltipText1: 'A standard facet for a text field, returning the top values of the chosen field',
        text2: 'Significant Terms',
        tooltipText2: 'Significant terms will return interesting or unusal occurences of terms in a set',
      },
    },
};

export default PathfinderText;
