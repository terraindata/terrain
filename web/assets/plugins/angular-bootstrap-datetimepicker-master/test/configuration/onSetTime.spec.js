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
 *    @since        11/8/2013
 */
describe('onSetTime', function () {
  'use strict';
  var $rootScope;
  var $compile;
  beforeEach(module('ui.bootstrap.datetimepicker'));
  beforeEach(inject(function (_$compile_, _$rootScope_) {
    $compile = _$compile_;
    $rootScope = _$rootScope_;
    $rootScope.date = null;
  }));

  describe('does not throw exception', function () {
    it('when onSetTime is missing', function () {
      $compile('<datetimepicker data-ng-model="date"></datetimepicker>')($rootScope);
    });
    it('when onSetTime is not a function', function () {
      $compile('<datetimepicker data-ng-model="date" data-onSetTime="foo"></datetimepicker>')($rootScope);
    });
  });

  describe('calls onSetTime when date is selected', function () {
    it('onSetTime accepts date parameter', function () {

      $rootScope.setTimeFunction = function (selectedDate) {
        expect(selectedDate).toEqual(moment('2009-01-01T00:00:00.000').toDate());
      };

      spyOn($rootScope, 'setTimeFunction').and.callThrough();

      var element = $compile('<datetimepicker data-ng-model=\'date\' data-on-set-time=\'setTimeFunction(newDate)\' data-datetimepicker-config="{ startView: \'year\', minView: \'year\' }" ></datetimepicker>')($rootScope);
      $rootScope.$digest();

      var selectedElement = jQuery('.past', element);
      selectedElement.trigger('click');
      expect($rootScope.setTimeFunction).toHaveBeenCalled();
      expect($rootScope.date).toEqual(moment('2009-01-01T00:00:00.000').toDate());
    });
  });

  describe('ignores onSetTime', function () {
    it('if onSetTime is not a function', function () {

      $rootScope.setTimeFunction = 'notAFunction';

      var element = $compile('<datetimepicker data-ng-model=\'date\' data-on-set-time=\'setTimeFunction\' data-datetimepicker-config="{ startView: \'year\', minView: \'year\' }" ></datetimepicker>')($rootScope);
      $rootScope.$digest();

      var selectedElement = jQuery('.future', element);
      selectedElement.trigger('click');
    });
  });


  describe('accepts additional parameter for onSetTime', function () {
    it('if onSetTime is not a function', function () {

      $rootScope.setTimeFunction = function (index, oldDate, newDate) {
        expect(oldDate).toBe(null);
        expect(oldDate).not.toEqual(newDate);
        expect(newDate).toEqual(moment('2020-01-01T00:00:00.000').toDate());
        expect(index).toEqual(3);
      };

      spyOn($rootScope, 'setTimeFunction').and.callThrough();

      var element = $compile('<datetimepicker data-ng-model=\'date\' data-on-set-time=\'setTimeFunction(3, oldDate, newDate, "foo")\' data-datetimepicker-config="{ startView: \'year\', minView: \'year\' }" ></datetimepicker>')($rootScope);
      $rootScope.$digest();

      var selectedElement = jQuery('.future', element);
      selectedElement.trigger('click');
      expect($rootScope.setTimeFunction).toHaveBeenCalled();
    });
  });
});

