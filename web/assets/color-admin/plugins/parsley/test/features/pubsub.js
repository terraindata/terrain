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

define(function () {
  return function () {
    describe('PubSub', function () {
      it('listen() without context', function (done) {
        $.listen('foo', function (arg) {
          expect(arg).to.be('bar');
          done();
        });
        $.emit('foo', 'bar');
      });
      it('listen() with context', function (done) {
        var obj = { foo: function (bar) { return 'foo' + bar; } };
        $.listen('foo', obj, function (arg) {
          expect(this.foo(arg)).to.be('foobar');
          done();
        });
        $.emit('foo', 'bar');
      });
      it('listenTo() ParsleyField', function (done) {
        $('body').append('<input type="text" id="element" />');
        $('body').append('<input type="text" id="element2" />');

        var instance = $('#element').psly();

        $.listenTo(instance, 'foo', function (parsleyInstance) {
          expect(parsleyInstance.__id__).to.be(instance.__id__);
          done();
        });

        $.emit('foo', 'bar');
        $.emit('foo', $('#element2').psly());
        $.emit('foo', instance);
      });
      it('listenTo() ParsleyForm will listen to Form', function (done) {
        $('body').append(
          '<form id="element" data-parsley-trigger="change">'                 +
            '<input id="field1" type="text" data-parsley-required="true" />'  +
            '<div id="field2"></div>'                                         +
            '<textarea id="field3" data-parsley-notblank="true"></textarea>'  +
          '</form>');

        $.listenTo($('#element').psly(), 'foo', function (parsleyInstance) {
          expect($('#element').psly().__id__ === parsleyInstance.__id__);
          done();
        });

        $.emit('foo', $('#element').psly());
      });
      it('listenTo() Form will listen to its fields too', function (done) {
        $('body').append(
          '<form id="element" data-parsley-trigger="change">'                 +
            '<input id="field1" type="text" data-parsley-required="true" />'  +
            '<div id="field2"></div>'                                         +
            '<textarea id="field3" data-parsley-notblank="true"></textarea>'  +
          '</form>');

        $.listenTo($('#element').psly(), 'foo', function (instance) {
          done();
        });

        $.emit('foo', $('#field1').psly());
      });
      it('unsubscribeTo()', function () {
        $('body').append('<input type="text" id="element" />');
        $.listen('foo', $.noop);
        $.listenTo($('#element').psly(), 'foo', $.noop);
        expect($.subscribed()).to.have.key('foo');
        expect($.subscribed().foo.length).to.be(2);
        $.unsubscribeTo($('#element').psly(), 'foo');
        expect($.subscribed().foo.length).to.be(1);
      });
      it('unsubscribe()', function () {
        $.listen('foo', $.noop);
        expect($.subscribed()).to.have.key('foo');
        expect($.subscribed().foo.length).to.be(1);
        $.unsubscribe('foo', $.noop);
        expect($.subscribed().foo.length).to.be(0);
      });
      afterEach(function () {
        if ($('#element').length)
          $('#element').remove();

        if ($('#element2').length)
          $('#element2').remove();

        $.unsubscribeAll('foo');
      });
    });
  };
});
