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
    any: {
      desc: 'Any valid JSON value.',
      url: 'http://www.json.org/',
      def: 'any',
    },
    'null': {
      desc: 'A null value.',
      url: 'http://www.json.org/',
      def: 'null',
    },
    boolean: {
      desc: 'A boolean, either true or false.',
      url: 'http://www.json.org/',
      def: 'boolean',
    },
    number: {
      desc: 'A number. Numbers must begin with either \'-\', or a digit. For decimals type the leading zero (0.1234). For scientific notation use e or E to indicate the order of magnitude (1.23e10).',
      url: 'http://www.json.org/',
      def: 'number',
    },
    string: {
      desc: 'A string. Strings are enclosed in double quotes ("example string"). Quotes and other special symbols can be encoded by escaping them. See json.org for more information.',
      url: 'http://www.json.org/',
      def: 'string',
    },
    base: {
      name: 'value',
      desc: 'A null, boolean, number, or string value.',
      url: 'http://www.json.org/',
      def: 'base',
    },
    field: {
      name: 'field',
      desc: 'The name of a document field.',
      def: 'string',
    },
    field_type: {
      def: 'enum',
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
    distance_unit: {
      def: 'enum',
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
    root: {
      name: 'root clause',
      desc: 'The outermost clause object that contains an entire search query.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-body.html',
      template: {
        index: '',
        type: '',
        from: 0,
        size: 1000,
        body: {
          query: {},
        },
      },
      def: {
        index: 'index',
        type: 'type',
        from: 'from',
        size: 'size',
        body: 'body',
      },
      autocomplete: [
        'index',
        'type',
      ],
    },
    index: {
      desc: 'Selects which index to search.',
      def: 'string',
    },
    type: {
      desc: 'Selects which type to search.',
      def: 'string',
    },
    from: {
      desc: 'How many results to skip over. This is usually used to implement pagination.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-from-size.html',
      def: 'number',
    },
    size: {
      desc: 'How many results to return.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-from-size.html',
      def: 'number',
    },
    body: {
      name: 'body clause',
      desc: 'The object containing the filtering, sorting, matching, and aggregation logic for a query.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-body.html',
      def: {
        from: 'from',
        size: 'size',
        sort: 'sort_clause',
        track_scores: 'track_scores',
        _name: 'string',
        query: 'query',
        _source: '_source',
        stored_fields: 'string[]',
        script_fields: 'object',
        docvalue_fields: 'string[]',
        post_filter: 'query',
        highlight: 'object',
        rescore: 'object',
        explain: 'boolean',
        version: 'boolean',
        indices_boost: 'object',
        min_score: 'number',
        inner_hits: 'object',
        collapse: 'object',
        search_after: 'any[]',
        suggest: 'object',
        aggregations: 'any[]',
        aggs: 'any[]',
        cutoff_frequency: 'cutoff_frequency',
        minimum_should_match: 'minimum_should_match',
      },
      template: {
        query: null,
      },
    },
    sort_clause: {
      desc: 'Controls the order in which results are returned. Results will be sorted by the first condition, and ties are broken by the second, and so on.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-sort.html',
      def: 'variant',
      subtypes: {
        object: 'sort',
        array: 'sort[]',
        string: 'field',
      },
    },
    sort: {
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-sort.html',
      def: 'variant',
      subtypes: {
        object: '{field:sort_control}',
        string: 'field',
      },
    },
    sort_control: {
      desc: 'Either "asc" or "desc", or a sort settings clause, {"order" : "asc"}',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-sort.html',
      def: 'variant',
      subtypes: {
        object: 'sort_settings',
        string: 'field',
      },
    },
    sort_settings: {
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-sort.html',
      def: {
        'order': 'sort_order',
        'mode': 'sort_mode',
        'missing': 'sort_missing',
        'nested_path': 'sort_nested_path',
        'nested_filter': 'sort_nested_filter',
        'unmapped_type': 'sort_unmapped_type',
        'unit': 'distance_unit',
        'distance_type': 'distance_type',
        'pin.location': 'geo_points',
        'type': 'sort_field_type',
        'script': 'script',
      },
    },
    sort_mode: {
      desc: 'When sorting by an array or multi-valued field, controls how that field is used to sort results.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-sort.html#_sort_mode_option',
      def: 'enum',
      values: [
        'min', 'max', 'sum', 'avg', 'median',
      ],
    },
    sort_order: {
      desc: 'The order to sort this field by: ascending or descending.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-sort.html#_sort_order',
      def: 'enum',
      values: ['asc', 'desc'],
    },
    sort_nested_path: {
      name: 'nested path',
      desc: 'The name of the nested object to sort by.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-sort.html#nested-sorting',
      def: 'field',
    },
    sort_nested_filter: {
      name: 'nested sort filter',
      desc: 'A query that filters the nested objects before using them to sort by.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-sort.html#nested-sorting',
      def: 'query',
    },
    sort_missing: {
      name: 'missing value clause',
      desc: 'Sets how documents missing this sort field will be treated. The special values of _last and _first can be used to sort these documents after or before other results, or substitute value can be specified.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-sort.html#_missing_values',
      template: '_last',
      def: 'base',
    },
    sort_unmapped_type: {
      name: 'unmapped type',
      desc: 'If no mapping is defined for this field, unmapped_type can be used to set what type the field is interpreted as.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-sort.html#_ignoring_unmapped_fields',
      def: 'field_type',
    },
    sort_field_type: {
      desc: 'The type to interpret the result of the sort script as.',
      def: 'field_type',
    },
    track_scores: {
      desc: 'When set to true, the Elastic _score field will be computed even when it isn\'t used to sort the results.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-sort.html#_multiple_reference_points',
      def: 'boolean',
      template: true,
    },
    geo_points: {
      desc: 'Either a single geo point, or a list of several.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-sort.html#_multiple_reference_points',
      def: 'variant',
      subtypes: {
        object: 'geo_point',
        array: 'geo_point[]',
      },
    },
    geo_point: {
      desc: 'Indicates a point location. Should be one of these: a lat-lon object, {"lat":40, "lon":-70}; a lat lon string, "40,-70"; a geohash, "drm3btev3e86"; or a lat lon array, [40, -70].',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-sort.html#_lat_lon_as_properties',
      def: 'variant',
      subtypes: {
        object: 'latlon_object',
        array: 'number[]',
        string: 'string',
      },
    },
    latlon_object: {
      def: { lat: 'number', lon: 'number' },
    },
    distance_type: {
      desc: 'Chooses the distance formula to use. arc is the default, plane is faster but less accurate.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-sort.html#geo-sorting',
      def: 'enum',
      values: ['arc', 'plane'],
      template: 'arc',
    },
    script: {
      def: {
        lang: 'script_language',
        params: 'script_params',
        inline: 'script_inline',
        stored: 'script_name',
      },
    },
    script_inline: {
      desc: 'The code for this inline script',
      def: 'string',
    },
    script_params: {
      desc: 'Parameters to pass to the script.',
      def: '{string:any}',
    },
    script_language: {
      desc: 'The scripting language to use.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/modules-scripting.html#_general_purpose_languages',
      def: 'enum',
      template: 'painless',
      values: ['painless', 'groovy', 'expression', 'mustache', 'javascript', 'python'],
    },
    script_name: {
      desc: 'The name of the stored script to call.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/modules-scripting-using.html#modules-scripting-stored-scripts',
      def: 'string',
    },
    _source: {
      name: 'source clause',
      desc: 'Controls which source fields are returned by this query',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-source-filtering.html',
      def: 'variant',
      subtypes: {
        object: 'includeExclude',
        boolean: 'boolean',
        string: 'string',
        array: 'string[]',
      },
    },
    includeExclude: {
      name: 'include and exclude lists',
      desc: 'Filters in include values and out exclude values.',
      def: {
        includes: 'string[]',
        excludes: 'string[]',
      },
    },
    query: {
      name: 'query clause',
      desc: 'Controls match, term, and range filtering and matching.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-query.html',
      def: {
        type: 'type',
        ids: 'string[]',
        term: 'term_query',
        terms: 'terms_query',
        range: 'range_query',
        exists: 'exists_query',
        prefix: 'prefix_query',
        wildcard: 'wildcard_query',
        regexp: 'regexp_query',
        fuzzy: 'fuzzy_query',
        match_all: 'match_all',
        match_none: 'match_none',
        match: 'match',
        match_phrase: 'match_phrase',
        match_phrase_prefix: 'match_phrase_prefix',
        multi_match: 'multi_match',
        common: 'common_terms_query',
        query_string: 'query_string_clause',
        simple_query_string: 'simple_query_string',
        constant_score: 'constant_score',
        bool: 'bool_query',
        dis_max: 'dis_max',
        function_score: 'any', // TODO: add this
        script_score: 'script_score',
        boosting: 'boosting_query',
      },
      template: {},
    },
    ids: {
      name: 'ids clause',
      desc: 'Selects a set of document ids to search within.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-ids-query.html',
      def: 'string[]',
    },
    constant_score: {
      name: 'constant score query',
      desc: 'A query clause that is not used to compute result scores.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-constant-score-query.html',
      def: 'query',
    },
    bool_query: {
      desc: 'Filters in and out documents meeting the given logical conditions.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-filter-context.html',
      def: {
        must: 'must',
        must_not: 'must_not',
        filter: 'filter',
        should: 'should',
        minimum_should_match: 'minimum_should_match',
      },
    },
    must: {
      name: 'must clause',
      desc: 'All results must match this subquery. The better a result matches, the higher its __score will be. The must clause may be a single query object, or an array of query objects.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-bool-query.html',
      def: 'variant',
      subtypes: {
        object: 'query',
        array: 'query[]',
      },
    },
    must_not: {
      name: 'must not clause',
      desc: 'All results must not match this query. Filters out documents that match this subquery. The must not clause may be a single query object, or an array of query objects.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-bool-query.html',
      def: 'variant',
      subtypes: {
        object: 'query',
        array: 'query[]',
      },
    },
    filter: {
      name: 'filter context clause',
      desc: 'Query conditions in a filter clause aren\'t used when computing a document\'s elastic __score.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-bool-query.html#_scoring_with_literal_bool_filter_literal',
      def: 'query',
    },
    should: {
      name: 'should clause',
      desc: 'Results should match this query. The better a result matches, the higher its __score will be. Also see minimum_should_match. The should clause may be a single query object, or an array of query objects.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-bool-query.html',
      def: 'variant',
      subtypes: {
        object: 'query',
        array: 'query[]',
      },
    },
    minimum_should_match: {
      name: 'minimum should match',
      desc: 'Controls how many or what percentage of should clauses are required to match.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-minimum-should-match.html',
      def: 'variant',
      subtypes: {
        number: 'number',
        string: 'string',
      },
    },
    term_query: {
      desc: 'Matches documents that contain an exact match for the given term.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-term-query.html',
      def: '{field:term_value}',
    },
    term_value: {
      required: ['value'],
      def: 'variant',
      subtypes: {
        object: 'term_object',
        null: 'base',
        boolean: 'base',
        number: 'base',
        string: 'base',
      },
    },
    term_settings: {
      required: ['value'],
      def: {
        value: 'base',
        boost: null,
      },
    },
    terms_query: {
      desc: 'Matches documents that contain an exact match for any of the given terms. Can also be populated by a terms lookup clause.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-terms-query.html',
      def: '{field:terms_value}',
    },
    terms_value: {
      def: 'variant',
      subtypes: {
        object: 'terms_lookup',
        array: 'any[]',
      },
    },
    terms_lookup: {
      required: ['value'],
      def: {
        index: 'index',
        type: 'type',
        id: 'terms_lookup_id',
        path: 'terms_lookup_path',
        routing: 'string',
      },
    },
    terms_lookup_id: {
      name: 'id',
      desc: 'The id of the document to query inside a terms lookup clause.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-terms-query.html',
      def: 'string',
    },
    terms_lookup_path: {
      name: 'path',
      desc: 'The field to get the term values from in the lookup document.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-terms-query.html',
      def: 'string',
    },
    range_query: {
      desc: 'Matches documents that have a value within the specified range.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-range-query.html',
      def: '{field:range_value}',
    },
    range_value: {
      def: {
        gt: 'base',
        gte: 'base',
        lt: 'base',
        lte: 'base',
        boost: 'boost',
      },
    },
    exists_query: {
      desc: 'Matches documents that have one or more non-null values in the specified field.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-exists-query.html',
      def: {
        field: 'field',
        null_value: 'base',
      },
      required: ['field'],
    },
    prefix_query: {
      desc: 'Matches documents that contain terms with the given prefix.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-prefix-query.html',
      def: '{field:prefix_query_value}',
    },
    prefix_query_value: {
      def: 'variant',
      subtypes: {
        object: 'prefix_query_settings',
        'null': 'base',
        boolean: 'base',
        number: 'base',
        string: 'base',
      },
    },
    prefix_query_settings: {
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-prefix-query.html',
      def: {
        value: 'base',
        boost: 'boost',
      },
      required: ['value'],
    },
    wildcard_query: {
      desc: 'Matches documents using a wildcard expression.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-wildcard-query.html',
      def: {},
    },
    wildcard_query_value: {
      def: 'variant',
      subtypes: {
        object: 'wildcard_query_settings',
        'null': 'base',
        boolean: 'base',
        number: 'base',
        string: 'base',
      },
    },
    wildcard_query_settings: {
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-wildcard-query.html',
      def: {
        value: 'base',
        boost: 'boost',
      },
      required: ['value'],
    },
    regexp_query: {
      desc: 'Matches documents using a regular expression.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-regexp-query.html',
      def: {},
    },
    regexp_query_value: {
      def: 'variant',
      subtypes: {
        object: 'regexp_query_settings',
        'null': 'base',
        boolean: 'base',
        number: 'base',
        string: 'base',
      },
    },
    regexp_query_settings: {
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-regexp-query.html',
      def: {
        value: 'base',
        boost: 'boost',
        flags: 'string',
      },
      required: ['value'],
    },
    fuzzy_query: {
      desc: 'Can help to make inexact matches in the case of misspellings or multiple spellings of words. The maximum Levenshtein edit distance to expand words (terms) to. The higher this is, the slower and broader queries will be. When applied to a numeric value, the fuzziness is the additional +/- margin that a match can have from the queried value.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-fuzzy-query.html',
      def: {},
    },
    fuzzy_query_value: {
      def: 'variant',
      subtypes: {
        object: 'fuzzy_query_settings',
        'null': 'base',
        boolean: 'base',
        number: 'base',
        string: 'base',
      },
    },
    fuzzy_query_settings: {
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-fuzzy-query.html',
      def: {
        value: 'base',
        boost: 'boost',
        fuzziness: 'fuzziness',
        prefix_length: 'fuzzy_prefix_length',
        max_expansions: 'fuzzy_max_expansions',
      },
      required: ['value'],
    },
    boost: {
      desc: 'Boosts the score of matches by the given amount. Boosts are not exactly multiplicative.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/guide/current/_boosting_query_clauses.html',
      def: 'number',
    },
    match_all: {
      name: 'match all clause',
      desc: 'Matches all documents.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-match-all-query.html',
      def: {
        boost: 'boost',
      },
    },
    match_none: {
      name: 'match none clause',
      desc: 'Matches no documents.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-match-all-query.html#query-dsl-match-none-query',
      def: {},
    },
    match: {
      name: 'match clause',
      desc: 'Does an analyzed (full-text) match on the given term.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-match-query.html',
      def: '{field:match_value}',
    },
    match_value: {
      def: 'variant',
      subtypes: {
        object: 'match_settings',
        'null': 'base',
        boolean: 'base',
        number: 'base',
        string: 'base',
      },
    },
    match_settings: {
      required: ['query'],
      def: {
        query: 'string',
        operator: 'match_operator',
        zero_terms_query: 'zero_terms_query',
        cutoff_frequency: 'cutoff_frequency',
        fuzziness: 'fuzziness',
        fuzzy_transpositions: 'fuzzy_transpositions',
        fuzzy_rewrite: 'rewrite',
        analyzer: 'analyzer',
        prefix_length: 'fuzzy_prefix_length',
        max_expansions: 'fuzzy_max_expansions',
        slop: 'slop',
        lenient: 'bool',
      },
      template: {
        query: '',
        operator: null,
      },
    },
    match_operator: {
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-match-query.html#query-dsl-match-query-zero',
      def: 'enum',
      values: ['and', 'or'],
      template: 'or',
    },
    zero_terms_query: {
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-match-query.html#query-dsl-match-query-zero',
      def: 'enum',
      values: ['none', 'all'],
    },
    cutoff_frequency: {
      desc: 'How common a word (term) needs to be before it is moved into a subquery that is only used if the uncommon words match.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-match-query.html#query-dsl-match-query-cutoff',
      def: 'number',
      template: '0.1',
    },
    fuzziness: {
      desc: 'Can help to make inexact matches in the case of misspellings or multiple spellings of words. The maximum Levenshtein edit distance to expand words (terms) to. The higher this is, the slower and broader queries will be. When applied to a numeric value, the fuzziness is the additional +/- margin that a match can have from the queried value.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/common-options.html#fuzziness',
      def: 'base',
      values: ['AUTO', 0, 1, 2],
      template: 'AUTO',
    },
    fuzzy_transpositions: {
      desc: 'Sets if transpositions are allowed when computing fuzzy matches.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-match-query.html#query-dsl-match-query-fuzziness',
      def: 'boolean',
      template: 'true',
    },
    slop: {
      desc: 'How many word (term) transpositions are tolerated when matching a phrase.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-match-query-phrase.html',
      def: 'enum',
      values: [0, 1, 2],
      template: 0,
    },
    analyzer: {
      desc: 'Chooses which analyzer to use to convert strings into lists of words (tokens) when searching.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/analysis-analyzers.html',
      def: 'string',
      values: [
        'standard',
        'english',
        'simple',
        'whitespace',
        'stop',
        'keyword',
        'pattern',
        'fingerprint',
        'arabic',
        'armenian',
        'basque',
        'brazilian',
        'bulgarian',
        'catalan',
        'cjk',
        'czech',
        'danish',
        'dutch',
        'english',
        'finnish',
        'french',
        'galician',
        'german',
        'greek',
        'hindi',
        'hungarian',
        'indonesian',
        'irish',
        'italian',
        'latvian',
        'lithuanian',
        'norwegian',
        'persian',
        'portuguese',
        'romanian',
        'russian',
        'sorani',
        'spanish',
        'swedish',
        'turkish',
        'thai',
      ],
      template: 'standard',
    },
    fuzzy_prefix_length: {
      desc: 'When using fuzzy matching, this and max_expansions configures fuzzy matching.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-match-query.html#query-dsl-match-query-fuzziness',
      def: 'number',
      template: '1',
    },
    fuzzy_max_expansions: {
      name: 'maximum prefix expansions',
      desc: 'Number of suffixes that fuzzy terms are expanded into when matching words. The more expansions, the broader and slower the query will be.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-match-query.html#query-dsl-match-query-fuzziness',
      template: 50,
      def: 'number',
    },
    rewrite: {
      desc: 'Chooses what method is used to rewrite multi term queries.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-multi-term-rewrite.html#query-dsl-multi-term-rewrite',
      def: 'enum',
      values: [
        'constant_score',
        'scoring_boolean',
        'constant_score',
        'top_terms_1',
        'top_terms_2',
        'top_terms_3',
        'top_terms_4',
        'top_terms_boost_1',
        'top_terms_boost_2',
        'top_terms_boost_3',
        'top_terms_boost_4',
        'top_terms_blended_freqs_1',
        'top_terms_blended_freqs_2',
        'top_terms_blended_freqs_3',
        'top_terms_blended_freqs_4',
      ],
      template: 'constant_score',
    },
    dis_max: {
      name: 'dis max query',
      desc: 'Combines results from each of the given queries, ordering results by their maximum score in each query.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-dis-max-query.html',
      required: ['queries'],
      def: {
        tie_breaker: 'dis_max_tie_breaker',
        boost: null,
        queries: 'query[]',
      },
    },
    dis_max_tie_breaker: {
      name: 'tie breaker',
      desc: 'Boosts documents that contain the same term in multiple fields.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-dis-max-query.html',
      def: 'number',
      template: 0,
    },
    script_score: {
      desc: 'Customizes the scoring of a subquery using a script.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-function-score-query.html#function-script-score',
      def: {
        script: null,
      },
      required: ['script'],
    },
    boosting_query: {
      desc: 'Reduces the score of results that match the given query.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-boosting-query.html',
      def: {
        positive: 'query', // TODO: add more information about these clauses
        negative: 'query', // TODO: add more information about these clauses
        negative_boost: 'boost',
      },
    },
    match_phrase: {
      name: 'match phrase query',
      desc: 'Makes a phrase query using analyzed text. Matches documents containing the words (tokens) in the phrase text.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-match-query-phrase.html',
      def: '{field:match_phrase_value}',
    },
    match_phrase_value: {
      def: 'variant',
      subtypes: {
        object: 'match_settings',
        string: 'query_string',
      },
    },
    match_phrase_prefix: {
      name: 'match phrase prefix query',
      desc: 'Makes a query using analyzed text which matches on all terms and any term starting with the prefix of the last term in the phrase text.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-match-query-phrase-prefix.html',
      def: '{field:match_phrase_prefix_value}',
    },
    match_phrase_prefix_value: {
      def: 'variant',
      subtypes: {
        object: 'match_settings',
        string: 'query_string',
      },
    },
    multi_match: {
      name: 'multi match query',
      desc: 'A match query that allows multi-field queries',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-multi-match-query.html',
      required: ['query', 'fields'],
      def: {
        query: 'query_string',
        fields: 'multi_match_field',
        type: 'multi_match_type',
        tie_breaker: 'multi_match_tie_breaker',
      },
    },
    multi_match_field: {
      desc: 'A list of fields to match against.',
      def: 'field[]',
    },
    multi_match_type: {
      desc: 'Sets how the multi match query finds and scores documents.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-multi-match-query.html#multi-match-types',
      def: 'enum',
      values: ['best_fields', 'most_fields', 'cross_fields', 'phrase', 'phrase_prefix'],
      template: 'best_fields',
    },
    multi_match_tie_breaker: {
      name: 'tie breaker',
      desc: 'A setting of 0 causes the query to use the best score out of each field\'s match; a setting of 1 causes the query to add all of the scores. Settings in between are a blend of these methods.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-multi-match-query.html#_literal_tie_breaker_literal',
      def: 'number',
      template: 0,
    },
    common_terms_query: {
      desc: 'A query which breaks the query words (terms) into common and uncommon sets. Matches on uncommon words are given more weight than matches on common words.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-common-terms-query.html',
      def: 'root',
    },
    query_string_clause: {
      desc: 'Uses a query parser to parse its content so that operators like AND and OR can be used inside a query string.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-query-string-query.html',
      def: {
        query: 'query_string',
        default_field: 'query_string_default_field',
        default_operator: 'query_string_default_operator',
        analyzer: 'analyzer',
        allow_leading_wildcard: 'bool',
        enable_position_increments: 'bool',
        fuzzy_max_expansions: 'fuzzy_max_expansions',
        fuzziness: 'fuzziness',
        fuzzy_prefix_length: 'fuzzy_prefix_length',
        phrase_slop: 'slop',
        boost: 'boost',
        auto_generate_phrase_queries: 'bool',
        analyze_wildcard: 'bool',
        max_determinized_states: 'number',
        minimum_should_match: 'minimum_should_match',
        lenient: 'lenient',
        time_zone: 'string',
        quote_field_suffix: 'string',
        split_on_whitespace: 'bool',
        all_fields: 'bool',
        use_dis_max: 'bool',
        tie_breaker: 'dis_max_tie_breaker',
      },
      required: ['query'],
    },
    simple_query_string: {
      name: 'simple query string clause',
      desc: 'A simplified version of a query string clause that works even when the query string is malformed.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-simple-query-string-query.html',
      def: {
        query: 'query_string',
        fields: 'field[]',
        default_operator: 'query_string_default_operator',
        analyzer: 'analyzer',
        flags: 'string',
        analyze_wildcard: 'bool',
        minimum_should_match: 'minimum_should_match',
        lenient: 'lenient',
        quote_field_suffix: 'string',
        all_fields: 'bool',
      },
      required: ['query'],
    },
    query_string: {
      name: 'query string',
      desc: 'The text to match. This text will be analyzed (broken into words) and elastic will find documents containing those words. Some additional syntax is allowed in query strings; see the documentation for more information.',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-query-string-query.html#query-string-syntax',
      def: 'string',
    },

  };

export default EQLSpec;
