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

/* tslint:disable: max-line-length no-reserved-keys object-literal-key-quotes*/

const EQLSpec: any =
  {
    any:                                {
      desc: 'Any valid JSON value.',
      url:  'http://www.json.org/',
      type: 'any',
    },
    'null':                             {
      desc: 'A null value.',
      url:  'http://www.json.org/',
      type: 'null',
    },
    boolean:                            {
      desc: 'A boolean, either true or false.',
      url:  'http://www.json.org/',
      type: 'boolean',
    },
    number:                             {
      desc: 'A number. Numbers must begin with either \'-\', or a digit. For decimals type the leading zero (0.1234). For scientific notation use e or E to indicate the order of magnitude (1.23e10).',
      url:  'http://www.json.org/',
      type: 'number',
    },
    string:                             {
      desc: 'A string. Strings are enclosed in double quotes ("example string"). Quotes and other special symbols can be encoded by escaping them. See json.org for more information.',
      url:  'http://www.json.org/',
      type: 'string',
    },
    base:                               {
      name: 'value',
      desc: 'A null, boolean, number, or string value.',
      url:  'http://www.json.org/',
      type: 'base',
    },
    field:                              {
      name: 'field',
      desc: 'The name of a document field.',
      type: 'string',
    },
    field_type:                         {
      type:   'enum',
      values: [
        'string',
        'number',
        'integer',
        'date',
        'boolean',
        'text',
        'keyword',
        'long',
        'short',
        'byte',
        'double',
        'float',
        'half_float',
        'scaled_float',
        'binary',
        'integer_range',
        'float_range',
        'long_range',
        'double_range',
        'date_range',
        'object',
        'nested',
        'geo_point',
        'geo_shape',
        'ip',
        'completion',
        'token_count',
        'murmur3',
        'attachment',
        'percolator',
      ],
    },
    distance_unit:                      {
      type:   'enum',
      values: [
        'mi',
        'yd',
        'ft',
        'in',
        'km',
        'm',
        'cm',
        'mm',
        'nmi',
        'miles',
        'yards',
        'feet',
        'inch',
        'kilometers',
        'meters',
        'centimeters',
        'millimeters',
        'nauticalmiles',
        'NM',
      ],
    },
    root:                               {
      name:         'root clause',
      desc:         'The outermost clause object that contains an entire search query.',
      url:          'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-body.html',
      template:     {
        index: '',
        type:  '',
        from:  0,
        size:  1000,
        body:  {
          query: {},
        },
      },
      type:         {
        index: null,
        type:  null,
        from:  null,
        size:  null,
        body:  null,
      },
      autocomplete: [
        'index',
        'type',
      ],
    },
    index:                              {
      desc: 'Selects which index to search.',
      type: 'string',
    },
    type:                               {
      desc: 'Selects which type to search.',
      type: 'string',
    },
    from:                               {
      desc: 'How many results to skip over. This is usually used to implement pagination.',
      url:  'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-from-size.html',
      type: 'number',
    },
    size:                               {
      desc: 'How many results to return.',
      url:  'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-from-size.html',
      type: 'number',
    },
    body:                               {
      name:     'body clause',
      desc:     'The object containing the filtering, sorting, matching, and aggregation logic for a query.',
      url:      'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-body.html',
      type:     {
        from:            null,
        size:            null,
        sort:            'sort_clause',
        track_scores:    null,
        _name:           'string',
        query:           null,
        _source:         '_source',
        stored_fields:   'string[]',
        script_fields:   'object',
        docvalue_fields: 'string[]',
        post_filter:     'query',
        highlight:       'object',
        rescore:         'object',
        explain:         'boolean',
        version:         'boolean',
        indices_boost:   'object',
        min_score:       'number',
        inner_hits:      'object',
        collapse:        'object',
        search_after:    'any[]',
        suggest:         'object',
        aggregations:    'any[]',
        aggs:            'any[]',
      },
      template: {
        query: null,
      },
    },
    sort_clause:                        {
      desc:     'Controls the order in which results are returned. Results will be sorted by the first condition, and ties are broken by the second, and so on.',
      url:      'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-sort.html',
      type:     'variant',
      subtypes: {
        object: 'sort',
        array:  'sort[]',
        string: 'field',
      },
    },
    sort:                               {
      url:      'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-sort.html',
      type:     'variant',
      subtypes: {
        object: '{field:sort_control}',
        string: 'field',
      },
    },
    sort_control:                       {
      desc:     'Either "asc" or "desc", or a sort settings clause, {"order" : "asc"}',
      url:      'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-sort.html',
      type:     'variant',
      subtypes: {
        object: 'sort_settings',
        string: 'field',
      },
    },
    sort_settings:                      {
      url:  'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-sort.html',
      type: {
        'order':         'sort_order',
        'mode':          'sort_mode',
        'missing':       'sort_missing',
        'nested_path':   'sort_nested_path',
        'nested_filter': 'sort_nested_filter',
        'unmapped_type': 'sort_unmapped_type',
        'unit':          'distance_unit',
        'distance_type': null,
        'pin.location':  'geo_points',
        'type':          'sort_field_type',
        'script':        null,
      },
    },
    sort_mode:                          {
      desc:   'When sorting by an array or multi-valued field, controls how that field is used to sort results.',
      url:    'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-sort.html#_sort_mode_option',
      type:   'enum',
      values: [
        'min', 'max', 'sum', 'avg', 'median',
      ],
    },
    sort_order:                         {
      desc:   'The order to sort this field by: ascending or descending.',
      url:    'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-sort.html#_sort_order',
      type:   'enum',
      values: ['asc', 'desc'],
    },
    sort_nested_path:                   {
      name: 'nested path',
      desc: 'The name of the nested object to sort by.',
      url:  'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-sort.html#nested-sorting',
      type: 'field',
    },
    sort_nested_filter:                 {
      name: 'nested sort filter',
      desc: 'A query that filters the nested objects before using them to sort by.',
      url:  'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-sort.html#nested-sorting',
      type: 'query',
    },
    sort_missing:                       {
      name:     'missing value clause',
      desc:     'Sets how documents missing this sort field will be treated. The special values of _last and _first can be used to sort these documents after or before other results, or substitute value can be specified.',
      url:      'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-sort.html#_missing_values',
      template: '_last',
      type:     'base',
    },
    sort_unmapped_type:                 {
      name: 'unmapped type',
      desc: 'If no mapping is defined for this field, unmapped_type can be used to set what type the field is interpreted as.',
      url:  'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-sort.html#_ignoring_unmapped_fields',
      type: 'field_type',
    },
    sort_field_type:                    {
      desc: 'The type to interpret the result of the sort script as.',
      type: 'field_type',
    },
    track_scores:                       {
      desc:     'When set to true, the Elastic _score field will be computed even when it isn\'t used to sort the results.',
      url:      'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-sort.html#_multiple_reference_points',
      type:     'boolean',
      template: true,
    },
    geo_points:                         {
      desc:     'Either a single geo point, or a list of several.',
      url:      'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-sort.html#_multiple_reference_points',
      type:     'variant',
      subtypes: {
        object: 'geo_point',
        array:  'geo_point[]',
      },
    },
    geo_point:                          {
      desc:     'Indicates a point location. Should be one of these: a lat-lon object, {"lat":40, "lon":-70}; a lat lon string, "40,-70"; a geohash, "drm3btev3e86"; or a lat lon array, [40, -70].',
      url:      'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-sort.html#_lat_lon_as_properties',
      type:     'variant',
      subtypes: {
        object: 'latlon_object',
        array:  'number[]',
        string: 'string',
      },
    },
    latlon_object:                      {
      type: {lat: 'number', lon: 'number'},
    },
    distance_type:                      {
      desc:     'Chooses the distance formula to use. arc is the default, plane is faster but less accurate.',
      url:      'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-sort.html#geo-sorting',
      type:     'enum',
      values:   ['arc', 'plane'],
      template: 'arc',
    },
    script:                             {
      type: {
        lang:   'script_language',
        params: 'script_params',
        inline: 'script_inline',
        stored: 'script_name',
      },
    },
    script_inline:                      {
      desc: 'The code for this inline script',
      type: 'string',
    },
    script_params:                      {
      desc: 'Parameters to pass to the script.',
      type: '{string:any}',
    },
    script_language:                    {
      desc:     'The scripting language to use.',
      url:      'https://www.elastic.co/guide/en/elasticsearch/reference/current/modules-scripting.html#_general_purpose_languages',
      type:     'enum',
      template: 'painless',
      values:   ['painless', 'groovy', 'expression', 'mustache', 'javascript', 'python'],
    },
    script_name:                        {
      desc: 'The name of the stored script to call.',
      url:  'https://www.elastic.co/guide/en/elasticsearch/reference/current/modules-scripting-using.html#modules-scripting-stored-scripts',
      type: 'string',
    },
    _source:                            {
      name:     'source clause',
      desc:     'Controls which source fields are returned by this query',
      url:      'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-source-filtering.html',
      type:     'variant',
      subtypes: {
        object:  'includeExclude',
        boolean: 'boolean',
        string:  'string',
        array:   'string[]',
      },
    },
    includeExclude:                     {
      name: 'include and exclude lists',
      desc: 'Filters in include values and out exclude values.',
      type: {
        includes: 'string[]',
        excludes: 'string[]',
      },
    },
    query:                              {
      name:     'query clause',
      desc:     'Controls match, term, and range filtering and matching.',
      url:      'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-query.html',
      type:     {
        type:                null,
        ids:                 'string[]',
        constant_score:      'constant_score',
        bool:                null,
        term:                null,
        terms:               null,
        range:               null,
        match_all:           null,
        match_none:          null,
        match:               null,
        match_phrase:        null,
        match_phrase_prefix: null,
        dis_max:             null,
      },
      template: {},
    },
    ids:                                {
      name: 'ids clause',
      desc: 'Selects a set of document ids to search within.',
      url:  'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-ids-query.html',
      type: 'string[]',
    },
    constant_score:                     {
      name: 'constant score query',
      desc: 'A query clause that is not used to compute result scores.',
      url:  'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-constant-score-query.html',
      type: 'query',
    },
    bool:                               {
      name: 'boolean clause',
      desc: 'Filters in and out documents meeting the given logical conditions.',
      url:  'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-filter-context.html',
      type: {
        must:                 null,
        must_not:             null,
        filter:               null,
        should:               null,
        minimum_should_match: null,
      },
    },
    must:                               {
      name:     'must clause',
      desc:     'All results must match this subquery. The better a result matches, the higher its __score will be. The must clause may be a single query object, or an array of query objects.',
      url:      'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-bool-query.html',
      type:     'variant',
      subtypes: {
        object: 'query',
        array:  'query[]',
      },
    },
    must_not:                           {
      name:     'must not clause',
      desc:     'All results must not match this query. Filters out documents that match this subquery. The must not clause may be a single query object, or an array of query objects.',
      url:      'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-bool-query.html',
      type:     'variant',
      subtypes: {
        object: 'query',
        array:  'query[]',
      },
    },
    filter:                             {
      name: 'filter context clause',
      desc: 'Query conditions in a filter clause aren\'t used when computing a document\'s elastic __score.',
      url:  'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-bool-query.html#_scoring_with_literal_bool_filter_literal',
      type: 'query',
    },
    should:                             {
      name:     'should clause',
      desc:     'Results should match this query. The better a result matches, the higher its __score will be. Also see minimum_should_match. The should clause may be a single query object, or an array of query objects.',
      url:      'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-bool-query.html',
      type:     'variant',
      subtypes: {
        object: 'query',
        array:  'query[]',
      },
    },
    minimum_should_match:               {
      name:     'minimum should match',
      desc:     'Controls how many or what percentage of should clauses are required to match.',
      url:      'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-minimum-should-match.html',
      type:     'variant',
      subtypes: {
        number: 'number',
        string: 'string',
      },
    },
    term:                               {
      name: 'term clause',
      desc: 'Matches documents that contain an exact match for the given term.',
      url:  'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-term-query.html',
      type: '{field:term_value}',
    },
    term_value:                         {
      required: ['value'],
      type:     'variant',
      subtypes: {
        object:  'term_object',
        null:    'base',
        boolean: 'base',
        number:  'base',
        string:  'base',
      },
    },
    term_settings:                      {
      required: ['value'],
      type:     {
        value: 'base',
        boost: null,
      },
    },
    terms:                              {
      name: 'terms clause',
      desc: 'Matches documents that contain an exact match for any of the given terms. Can also be populated by a terms lookup clause.',
      url:  'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-terms-query.html',
      type: '{field:terms_value}',
    },
    terms_value:                        {
      type:     'variant',
      subtypes: {
        object: 'terms_lookup',
        array:  'any[]',
      },
    },
    terms_lookup:                       {
      required: ['value'],
      type:     {
        index:   null,
        type:    null,
        id:      'terms_lookup_id',
        path:    'terms_lookup_path',
        routing: 'string',
      },
    },
    terms_lookup_id:                    {
      name: 'id',
      desc: 'The id of the document to query inside a terms lookup clause.',
      url:  'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-terms-query.html',
      type: 'string',
    },
    terms_lookup_path:                  {
      name: 'path',
      desc: 'The field to get the term values from in the lookup document.',
      url:  'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-terms-query.html',
      type: 'string',
    },
    range:                              {
      name: 'range clause',
      desc: 'Matches documents that have a value within the specified range.',
      url:  'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-range-query.html',
      type: '{field:range_value}',
    },
    range_value:                        {
      type: {
        gt:    'base',
        gte:   'base',
        lt:    'base',
        lte:   'base',
        boost: null,
      },
    },
    boost:                              {
      desc: 'Boosts the score of matches by the given amount. Boosts are not exactly multiplicative.',
      url:  'https://www.elastic.co/guide/en/elasticsearch/guide/current/_boosting_query_clauses.html',
      type: 'number',
    },
    match_all:                          {
      name: 'match all clause',
      desc: 'Matches all documents.',
      url:  'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-match-all-query.html',
      type: {
        boost: null,
      },
    },
    match_none:                         {
      name: 'match none clause',
      desc: 'Matches no documents.',
      url:  'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-match-all-query.html#query-dsl-match-none-query',
      type: {},
    },
    match:                              {
      name: 'match clause',
      desc: 'Does an analyzed (full-text) match on the given term.',
      url:  'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-match-query.html',
      type: '{field:match_value}',
    },
    match_value:                        {
      type:     'variant',
      subtypes: {
        object:  'match_settings',
        'null':  'base',
        boolean: 'base',
        number:  'base',
        string:  'base',
      },
    },
    match_settings:                     {
      required: ['query'],
      type:     {
        query:            'string',
        operator:         'match_operator',
        zero_terms_query: null,
        cutoff_frequency: 'number',
      },
    },
    match_operator:                     {
      url:    'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-match-query.html#query-dsl-match-query-zero',
      type:   'enum',
      values: ['and', 'or'],
    },
    zero_terms_query:                   {
      url:    'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-match-query.html#query-dsl-match-query-zero',
      type:   'enum',
      values: ['none', 'all'],
    },
    dis_max:                            {
      name: 'dis max query',
      desc: 'Combines results from each of the given queries, ordering results by their maximum score in each query.',
      url:  'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-dis-max-query.html',
      type: {
        tie_breaker: 'dis_max_tie_breaker',
        boost:       null,
        queries:     'query[]',
      },
    },
    dis_max_tie_breaker:                {
      name:     'tie breaker',
      desc:     'Boosts documents that contain the same term in multiple fields.',
      url:      'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-dis-max-query.html',
      type:     'number',
      template: 0,
    },
    match_phrase:                       {
      name: 'match phrase query',
      desc: 'Makes a phrase query using analyzed text. Matches documents containing the words (tokens) in the phrase text.',
      url:  'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-match-query-phrase.html',
      type: '{field:match_phrase_value}',
    },
    match_phrase_value:                 {
      type:     'variant',
      subtypes: {
        object: 'match_settings',
        string: 'match_query_string',
      },
    },
    match_phrase_prefix:                {
      name: 'match phrase prefix query',
      desc: 'Makes a query using analyzed text which matches on all terms and any term starting with the prefix of the last term in the phrase text.',
      url:  'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-match-query-phrase-prefix.html',
      type: '{field:match_phrase_prefix_value}',
    },
    match_phrase_prefix_value:          {
      type:     'variant',
      subtypes: {
        object: 'match_phrase_prefix_settings',
        string: 'match_query_string',
      },
    },
    match_phrase_prefix_settings:       {
      desc:     'The settings for this phrase prefix match.',
      url:      'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-match-query-phrase-prefix.html',
      required: ['query'],
      type:     {
        query:          'match_query_string',
        max_expansions: 'match_phrase_prefix_max_expansions',
      },
    },
    match_phrase_prefix_max_expansions: {
      name:     'maximum prefix expansions',
      desc:     'Number of suffixes that the last term is expanded into when matching words. The more expansions, the broader and slower the query will be.',
      url:      'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-match-query-phrase-prefix.html',
      template: 50,
      type:     'number',
    },
    match_query_string:                 {
      name: 'match query string',
      desc: 'The text to match. This text will be analyzed (broken into words) and elastic will find documents containing those words.',
      type: 'string',
    },
  };

export default EQLSpec;
