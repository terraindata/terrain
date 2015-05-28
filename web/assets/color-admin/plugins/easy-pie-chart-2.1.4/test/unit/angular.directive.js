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

describe('angular easypiechart directive', function() {
    var $compile, $rootScope, scope;

    beforeEach(module('easypiechart'));

    beforeEach(inject(function(_$compile_, $rootScope){
        scope = $rootScope;
        $compile = _$compile_;
    }));

    it('should have percentage default value 0', function (done) {
        scope.percent = null;
        var element = angular.element('<div easypiechart percent="percent" options="options"></div>');
        $compile(element)(scope);
        scope.$digest();
        expect(element.isolateScope().percent).toBe(0);
    });

    it('inserts the element with a canvas element', function() {
        scope.percent = -45;
        scope.options = {};
        var element = angular.element('<div easypiechart percent="percent" options="options"></div>');
        $compile(element)(scope);
        scope.$digest();
        expect(element.html()).toContain('canvas');
    });

    it('gets the options right', function (done) {
        scope.percent = 0;
        scope.options = {
            animate:{
                duration:0,
                enabled:false
            },
            barColor:'#2C3E50',
            scaleColor:false,
            lineWidth:20,
            lineCap:'circle'
        };
        var element = angular.element('<div easypiechart percent="percent" options="options"></div>');
        $compile(element)(scope);
        scope.$digest();
        expect(element.isolateScope().options.animate.duration).toBe(0);
        expect(element.isolateScope().options.lineCap).toBe('circle');
    });

    it('has its own default options', function (done) {
        scope.percent = 0;
        scope.options = {};
        var element = angular.element('<div easypiechart percent="percent" options="options"></div>');
        $compile(element)(scope);
        scope.$digest();
        expect(element.isolateScope().options.size).toBe(110);
        expect(element.isolateScope().options.animate.enabled).toBe(true);
    });

    it('takes size option the right way', function() {
        scope.percent = 0;
        scope.options = {
            size: 200
        };
        var element = angular.element('<div easypiechart percent="percent" options="options"></div>');
        $compile(element)(scope);
        scope.$digest();
        expect(element.html()).toContain('height="200"');
        expect(element.html()).toContain('width="200"');
    });
});
