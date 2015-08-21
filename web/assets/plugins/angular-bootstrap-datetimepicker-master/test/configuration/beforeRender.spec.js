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

/*globals describe, beforeEach, it, expect, module, inject, jQuery, moment, spyOn */

/**
 * @license angular-bootstrap-datetimepicker
 * Copyright 2013 Knight Rider Consulting, Inc. http://www.knightrider.com
 * License: MIT
 */

/**
 *
 *    @author        Dale "Ducky" Lotts
 *    @since        11/8/2014
 */
describe('beforeRender', function () {
  'use strict';
  var $rootScope;
  var $compile;
  beforeEach(module('ui.bootstrap.datetimepicker'));
  beforeEach(inject(function (_$compile_, _$rootScope_) {
    moment.locale('en');
    $compile = _$compile_;
    $rootScope = _$rootScope_;
  }));

  describe('does not throw exception', function () {
    it('when beforeRender is missing', function () {
      $compile('<datetimepicker data-ng-model="date"></datetimepicker>')($rootScope);
    });
    it('when beforeRender is not a function', function () {
      $compile('<datetimepicker data-ng-model="date" data-beforeRender="foo"></datetimepicker>')($rootScope);
    });
  });

  describe('called before a new view is rendered', function () {
    it('in year view $dates parameter contains 12 members', function () {

      $rootScope.date = moment('2008-01-01T00:00:00.000').toDate();
      $rootScope.beforeRender = function (dates) {
        expect(dates.length).toBe(12);
      };

      spyOn($rootScope, 'beforeRender').and.callThrough();

      var element = $compile('<datetimepicker data-ng-model=\'date\' data-before-render=\'beforeRender($dates)\' data-datetimepicker-config="{ startView: \'year\', minView: \'year\' }" ></datetimepicker>')($rootScope);
      $rootScope.$digest();

      var selectedElement = jQuery(jQuery('.year', element)[2]);

      expect(selectedElement.hasClass('disabled')).toBeFalsy();
      selectedElement.trigger('click');
      expect($rootScope.date).toEqual(moment('2001-01-01T00:00:00.000').toDate());

      expect($rootScope.beforeRender).toHaveBeenCalled();

    });

    it('in month view $dates parameter contains 12 members', function () {

      $rootScope.date = moment('2008-01-01T00:00:00.000').toDate();
      $rootScope.beforeRender = function (dates) {
        expect(dates.length).toBe(12);
      };

      spyOn($rootScope, 'beforeRender').and.callThrough();

      var element = $compile('<datetimepicker data-ng-model=\'date\' data-before-render=\'beforeRender($dates)\' data-datetimepicker-config="{ startView: \'month\', minView: \'month\' }" ></datetimepicker>')($rootScope);
      $rootScope.$digest();

      var selectedElement = jQuery(jQuery('.month', element)[4]);

      expect(selectedElement.hasClass('disabled')).toBeFalsy();
      selectedElement.trigger('click');
      expect($rootScope.date).toEqual(moment('2008-05-01T00:00:00.000').toDate());

      expect($rootScope.beforeRender).toHaveBeenCalled();

    });

    it('in day view $dates parameter contains 42 members', function () {

      $rootScope.date = moment('2014-01-01T00:00:00.000').toDate();

      var offset = new Date().getTimezoneOffset() * 60000;

      $rootScope.beforeRender = function (dates) {
        expect(dates.length).toBe(42);
        expect(dates[0].utcDateValue).toBe(1388275200000);
        expect(dates[0].localDateValue()).toBe(1388275200000 + offset);
        expect(dates[11].utcDateValue).toBe(1389225600000);
        expect(dates[11].localDateValue()).toBe(1389225600000 + offset);
      };

      spyOn($rootScope, 'beforeRender').and.callThrough();

      var element = $compile('<datetimepicker data-ng-model=\'date\' data-before-render=\'beforeRender($dates)\' data-datetimepicker-config="{ startView: \'day\', minView: \'day\' }" ></datetimepicker>')($rootScope);
      $rootScope.$digest();

      expect($rootScope.date).toEqual(moment('2014-01-01T00:00:00.000').toDate());

      var selectedElement = jQuery(jQuery('.day', element)[11]);
      expect(jQuery(jQuery('.day', element)[0]).text()).toBe('29');
      expect(selectedElement.text()).toBe('9');
      expect(selectedElement.hasClass('disabled')).toBeFalsy();

      selectedElement.trigger('click');
      expect($rootScope.date).toEqual(moment('2014-01-09T00:00:00.000').toDate());

      expect($rootScope.beforeRender).toHaveBeenCalled();

    });

    it('dates parameter has 12 members', function () {

      $rootScope.date = moment('2008-01-01T00:00:00.000').toDate();
      $rootScope.beforeRender = function (dates) {
        expect(dates).not.toBeUndefined();
        expect(dates.length).toEqual(12);
      };

      spyOn($rootScope, 'beforeRender').and.callThrough();

      var element = $compile('<datetimepicker data-ng-model=\'date\' data-before-render=\'beforeRender($dates)\' data-datetimepicker-config="{ startView: \'year\', minView: \'year\' }" ></datetimepicker>')($rootScope);
      $rootScope.$digest();

      var selectedElement = jQuery(jQuery('.year', element)[2]);
      expect(selectedElement.hasClass('disabled')).toBeFalsy();
      selectedElement.trigger('click');

      expect($rootScope.beforeRender).toHaveBeenCalled();
    });

    it('view parameter is "year"', function () {

      $rootScope.date = moment('2008-01-01T00:00:00.000').toDate();
      $rootScope.beforeRender = function (view) {
        expect(view).toEqual('year');
      };

      spyOn($rootScope, 'beforeRender').and.callThrough();

      var element = $compile('<datetimepicker data-ng-model=\'date\' data-before-render=\'beforeRender($view)\' data-datetimepicker-config="{ startView: \'year\', minView: \'year\' }" ></datetimepicker>')($rootScope);
      $rootScope.$digest();

      var selectedElement = jQuery(jQuery('.year', element)[2]);
      selectedElement.trigger('click');

      expect($rootScope.beforeRender).toHaveBeenCalled();
    });

    it('$leftDate parameter is the beginning of the previous view', function () {

      $rootScope.date = moment('2008-01-01T00:00:00.000').toDate();
      $rootScope.beforeRender = function ($leftDate) {
        expect($leftDate).not.toBeUndefined();
      };

      spyOn($rootScope, 'beforeRender').and.callThrough();

      var element = $compile('<datetimepicker data-ng-model=\'date\' data-before-render=\'beforeRender($leftDate)\' data-datetimepicker-config="{ startView: \'year\', minView: \'year\' }" ></datetimepicker>')($rootScope);
      $rootScope.$digest();

      var selectedElement = jQuery(jQuery('.year', element)[2]);
      selectedElement.trigger('click');

      expect($rootScope.beforeRender).toHaveBeenCalled();
      expect($rootScope.beforeRender.calls.argsFor(0)[0].utcDateValue).toEqual(631152000000); // 1990-01-01
    });


    it('$rightDate parameter is the beginning of the next view', function () {

      $rootScope.date = moment('2014-04-01T00:00:00.000').toDate();
      $rootScope.beforeRender = function ($rightDate) {
        expect($rightDate).not.toBeUndefined();
      };

      spyOn($rootScope, 'beforeRender').and.callThrough();

      var element = $compile('<datetimepicker data-ng-model=\'date\' data-before-render=\'beforeRender($rightDate)\' data-datetimepicker-config="{ startView: \'month\', minView: \'month\' }" ></datetimepicker>')($rootScope);
      $rootScope.$digest();

      var selectedElement = jQuery(jQuery('.month', element)[2]);
      selectedElement.trigger('click');

      expect($rootScope.beforeRender).toHaveBeenCalled();
      expect($rootScope.beforeRender.calls.argsFor(0)[0].utcDateValue).toEqual(1420070400000); // 2015-01-01
    });


    it('startview = "day" and $upDate parameter is the beginning of the next view up ', function () {

      // i.e. minute -> hour -> day -> month -> year

      $rootScope.date = moment('2014-10-18T13:00:00.000').toDate();

      $rootScope.beforeRender = function ($upDate) {
        expect($upDate).not.toBeUndefined();
      };

      spyOn($rootScope, 'beforeRender').and.callThrough();

      var element = $compile('<datetimepicker data-ng-model=\'date\' data-before-render=\'beforeRender($upDate)\' data-datetimepicker-config="{ startView: \'day\', minView: \'day\' }" ></datetimepicker>')($rootScope);
      $rootScope.$digest();

      expect($rootScope.beforeRender).toHaveBeenCalled();

      expect($rootScope.beforeRender.calls.argsFor(0)[0].utcDateValue).toEqual(1388534400000); // 2014-01-01 - the start of the 'month' view.


      var selectedElement = jQuery(jQuery('.day', element)[2]);
      selectedElement.trigger('click');

    });


    it('startview = "hour" and $upDate parameter is the beginning of the next view up ', function () {

      // i.e. minute -> hour -> day -> month -> year

      var $scope = $rootScope.$new();


      $scope.date = moment('2014-10-18T13:00:00.000').toDate();

      $scope.beforeRender = function ($upDate) {
        expect($upDate).not.toBeUndefined();
      };

      spyOn($scope, 'beforeRender').and.callThrough();

      var element = $compile('<datetimepicker data-ng-model=\'date\' data-before-render=\'beforeRender($upDate)\' data-datetimepicker-config="{ startView: \'hour\', minView: \'hour\' }" ></datetimepicker>')($scope);
      $rootScope.$digest();

      expect($scope.beforeRender).toHaveBeenCalled();
      expect($scope.beforeRender.calls.argsFor(0)[0].utcDateValue).toEqual(1412121600000); // 2014-10-01 12:00 the start of the 'day' view

      var selectedElement = jQuery(jQuery('.hour', element)[2]);
      selectedElement.trigger('click');

    });

    it('startview = "minute" and $upDate parameter is the beginning of the next view up ', function () {

      // i.e. minute -> hour -> day -> month -> year

      $rootScope.date = moment('2014-10-18T13:00:00.000').toDate();
      $rootScope.beforeRender = function ($upDate) {
        expect($upDate).not.toBeUndefined();
      };

      spyOn($rootScope, 'beforeRender').and.callThrough();

      var element = $compile('<datetimepicker data-ng-model=\'date\' data-before-render=\'beforeRender($upDate)\' data-datetimepicker-config="{ startView: \'minute\', minView: \'minute\' }" ></datetimepicker>')($rootScope);
      $rootScope.$digest();

      expect($rootScope.beforeRender).toHaveBeenCalled();
      expect($rootScope.beforeRender.calls.argsFor(0)[0].utcDateValue).toEqual(1413590400000);   // 2014-10-18 00:00 Z


      var selectedElement = jQuery(jQuery('.minute', element)[2]);
      selectedElement.trigger('click');

    });

    it('year view and 2001 date is disabled', function () {

      $rootScope.date = moment('2008-01-01T00:00:00.000').toDate();
      $rootScope.beforeRender = function (dates) {
        dates[2].selectable = false;
      };

      spyOn($rootScope, 'beforeRender').and.callThrough();

      var element = $compile('<datetimepicker data-ng-model=\'date\' data-before-render=\'beforeRender($dates)\' data-datetimepicker-config="{ startView: \'year\', minView: \'year\' }" ></datetimepicker>')($rootScope);
      $rootScope.$digest();

      var selectedElement = jQuery(jQuery('.year', element)[2]);
      expect(selectedElement.hasClass('disabled')).toBeTruthy();
      selectedElement.trigger('click'); // No change if clicked!

      expect($rootScope.beforeRender).toHaveBeenCalled();
      expect($rootScope.date).toEqual(moment('2008-01-01T00:00:00.000').toDate());

    });
  });
});

