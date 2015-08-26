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

/*globals describe, beforeEach, it, expect, module, inject, jQuery, moment */

/**
 * @license angular-bootstrap-datetimepicker
 * Copyright 2013 Knight Rider Consulting, Inc. http://www.knightrider.com
 * License: MIT
 */

/**
 *
 *    @author        Dale "Ducky" Lotts
 *    @since        7/21/13
 */

describe('current view displayed on the markup', function () {
  'use strict';

  var element;

  beforeEach(module('ui.bootstrap.datetimepicker'));
  beforeEach(inject(function ($compile, $rootScope) {
    moment.locale('zh-cn');
    $rootScope.date = moment('2013-01-22T00:00:00.000').toDate();
    element = $compile('<datetimepicker data-datetimepicker-config="{ startView: \'day\'}" data-ng-model="date"></datetimepicker>')($rootScope);
    $rootScope.$digest();
  }));

  it('should have `.day-view` class', function () {
    expect(jQuery('table', element).hasClass('day-view')).toBeTruthy();
  });
});

describe('Chinese day view with initial date of 2013-01-22', function () {
  'use strict';
  var element;
  beforeEach(module('ui.bootstrap.datetimepicker'));
  beforeEach(inject(function ($compile, $rootScope) {
    moment.locale('zh-cn');
    $rootScope.date = moment('2013-01-22T00:00:00.000').toDate();
    element = $compile('<datetimepicker data-datetimepicker-config="{ startView: \'day\'}" data-ng-model="date"></datetimepicker>')($rootScope);
    $rootScope.$digest();
  }));
  it('has `.switch` element with a value of 2013-1', function () {
    expect(jQuery('.switch', element).text()).toBe('2013-1月');
  });
  it('has 42 `.day` elements', function () {
    expect(jQuery('.day', element).length).toBe(42);
  });
  it('has 2 `.past` elements', function () {
    expect(jQuery('.past', element).length).toBe(1);
  });
  it('has 9 `.future` elements', function () {
    expect(jQuery('.future', element).length).toBe(10);
  });
  it('has 1 `.active` element with a value of 22', function () {
    expect(jQuery('.active', element).text()).toBe('22');
  });
});


describe('day with initial date of "2020-01-01T00:00:00.000" and minView="day"', function () {
  'use strict';
  var rootScope;
  var element;
  beforeEach(module('ui.bootstrap.datetimepicker'));
  beforeEach(inject(function ($compile, $rootScope) {
    rootScope = $rootScope;
    $rootScope.date = moment('2020-01-01T00:00:00.000').toDate();
    element = $compile('<datetimepicker data-datetimepicker-config="{ startView: \'day\', minView: \'day\' }" data-ng-model="date"></datetimepicker>')($rootScope);
    $rootScope.$digest();
  }));
  it('clicking the 14th `.day` element will set the date value to 2020-01-11T00:00:00.000"', function () {
    expect(jQuery('.switch', element).text()).toBe('2020-1月');

    expect(jQuery('.active', element).length).toBe(1);
    expect(jQuery('.day', element).length).toBe(42);

    var selectedElement = jQuery(jQuery('.day', element)[13]);
    selectedElement.trigger('click');

    expect(jQuery('.active', element).text()).toBe('12');
    expect(rootScope.date).toEqual(moment('2020-01-12T00:00:00.000').toDate());
  });
});


describe('day with initial date of "2008-02-01T00:00:00.000" (leap year) and minView="day"', function () {
  'use strict';
  var rootScope;
  var element;
  beforeEach(module('ui.bootstrap.datetimepicker'));
  beforeEach(inject(function ($compile, $rootScope) {
    rootScope = $rootScope;
    $rootScope.date = moment('2008-02-01T00:00:00.000').toDate();
    element = $compile('<datetimepicker data-datetimepicker-config="{ startView: \'day\', minView: \'day\' }" data-ng-model="date"></datetimepicker>')($rootScope);
    $rootScope.$digest();
  }));
  it('clicking the 33rd `.day` element will set the date value to 2008-29-11T00:00:00.000"', function () {
    expect(jQuery('.switch', element).text()).toBe('2008-2月');

    expect(jQuery('.active', element).length).toBe(1);
    expect(jQuery('.active', element).text()).toBe('1');
    expect(jQuery('.day', element).length).toBe(42);
    expect(jQuery('.past', element).length).toBe(4);

    expect(jQuery('.future', element).length).toBe(9);
    var selectedElement = jQuery(jQuery('.day', element)[32]);

    selectedElement.trigger('click');
    expect(jQuery('.active', element).text()).toBe('29');
    expect(rootScope.date).toEqual(moment('2008-02-29T00:00:00.000').toDate());
  });
});
