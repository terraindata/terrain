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
  return function (Parsley) {
    describe('ParsleyAbstract', function () {
      it('should provide a actualizeOptions() method', function () {
        $('body').append('<input type="email" data-parsley-pattern="[A-F][0-9]{5}" data-parsley-required id="element" />');
        var parsleyField = new Parsley('#element', { foo: 'bar' });
        expect(parsleyField.options).have.key('pattern');
        expect(parsleyField.options).have.key('required');

        $('#element').removeAttr('data-parsley-pattern');
        parsleyField.actualizeOptions();

        expect(parsleyField.options).not.to.have.key('pattern');
        expect(parsleyField.options).have.key('required');
      });
      it('should use subscribe()', function (done) {
        $('body').append('<input type="email" data-parsley-pattern="[A-F][0-9]{5}" data-parsley-required id="element" />');
        var parsleyField = new Parsley('#element');

        parsleyField.subscribe('parsley:field:foo', function (instance, val) {
          expect(instance.__id__).to.be(parsleyField.__id__);
          expect(val).to.be('baz');
          done();
        });

        $.emit('parsley:field:foo', 'bar');
        $.emit('parsley:field:foo', parsleyField, 'baz');
      });
      it('should use unsubscribe()', function () {
        $('body').append('<input type="email" id="element" />');
        var parsleyInstance = $('#element').parsley();
        parsleyInstance.subscribe('foo', function () { return 'bar'; });
        expect($.subscribed().foo.length).to.be(1);
        parsleyInstance.unsubscribe('foo');
        expect($.subscribed().foo.length).to.be(0);
      });
      it('should use reset() on field', function () {
        $('body').append('<input type="email" data-parsley-pattern="[A-F][0-9]{5}" data-parsley-required id="element" />');
        var parsleyField = new Parsley('#element');
        parsleyField.validate();
        expect($('#parsley-id-' + parsleyField.__id__ + ' li').length).to.be(1);

        parsleyField.reset();
        expect($('#parsley-id-' + parsleyField.__id__ + ' li').length).to.be(0);
      });
      it('should use reset() on form', function (done) {
        $('body').append(
          '<form id="element">'                           +
            '<input id="field1" type="text" required />'  +
            '<div id="field2"></div>'                     +
            '<textarea id="field2"></textarea>'           +
          '</form>');
        var parsleyForm = new Parsley($('#element'));
        parsleyForm.validate();
        expect($('#parsley-id-' + $('#field1').psly().__id__ + ' li').length).to.be(1);

        parsleyForm.subscribe('parsley:form:reset', function () {
          done();
        });

        parsleyForm.reset();
        expect($('#parsley-id-' + $('#field1').psly().__id__ + ' li').length).to.be(0);
      });
      it('should use destroy() on field', function (done) {
        $('body').append('<input type="email" data-parsley-pattern="[A-F][0-9]{5}" data-parsley-required id="element" />');
        var parsleyField = new Parsley('#element');

        parsleyField.subscribe('parsley:field:destroy', function () {
          done();
        });

        expect($('#element').data('Parsley')).to.have.key('__class__');
        expect($('#element').data('Parsley').__class__).to.be('ParsleyField');
        parsleyField.destroy();
        expect($('#element').data('Parsley')).to.be(undefined);
      });
      it('should use destroy() on form', function (done) {
        var triggered = 0;

        $('body').append(
          '<form id="element">'                 +
            '<input id="field1" type="text"/>'  +
            '<div id="field2"></div>'           +
            '<textarea id="field2"></textarea>' +
          '</form>');
        var parsleyForm = new Parsley($('#element'));
        var fieldEventsCount = 0;

        // Test that a subscribed field event on parent form would be triggered by fields too
        // Here we only have field1 and field2 as valid parsley fields
        parsleyForm.subscribe('parsley:field:destroy', function () {
          fieldEventsCount++;
        });

        parsleyForm.subscribe('parsley:form:destroy', function () {
          // we properly triggered before the 2 field:destroy events for this form
          expect(fieldEventsCount).to.be(2);

          // we should never enter here since parsley form instance is destroyed
          $.listen('parsley:form:validate', function () {
            expect(true).to.be(false);
          });

          // test that a submit event does not trigger parsley validation anymore
          $('#element').on('submit', function (e) {
            e.preventDefault();

            expect($('#element').data('Parsley')).to.be(undefined);
            expect($('#field1').data('Parsley')).to.be(undefined);


            $.unsubscribeAll('parsley:form:validate');
            done();
          });

          $('#element').submit();
        });

        expect($('#element').data('Parsley')).to.have.key('__class__');
        expect($('#element').data('Parsley').__class__).to.be('ParsleyForm');
        expect($('#field1').data('Parsley')).to.have.key('__class__');
        expect($('#field1').data('Parsley').__class__).to.be('ParsleyField');

        parsleyForm.destroy();
      });
      afterEach(function () {
        if ($('#element').length)
          $('#element').remove();

        if ($('.parsley-errors-list').length)
          $('.parsley-errors-list').remove();
      });
    });
  };
});
