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
  return function (ParsleyForm, Parsley) {
    describe('ParsleyForm', function () {
      it('should be a function', function () {
        expect(ParsleyForm).to.be.a('function');
      });
      it('should throw an error if no element given', function () {
        expect(ParsleyForm).to.throwException();
      });
      it('should bind parsleyFields children', function () {
        $('body').append(
          '<form id="element">'                 +
            '<input id="field1" type="text"/>'  +
            '<div id="field2"></div>'           +
            '<textarea id="field2"></textarea>' +
          '</form>');
        var parsleyForm = new Parsley($('#element'));
        expect(parsleyForm.fields.length).to.be(2);
      });
      it('should bind parsleyFields children, and not excluded ones', function () {
        $('body').append(
          '<form id="element">'                 +
            '<input id="field1" type="text"/>'  +
            '<div id="field2"></div>'           +
            '<textarea id="field2"></textarea>' +
            '<div data-parsley-validate></div>' + // ParsleyForm, not a valid child
            '<input id="field3" disabled />'    + // Disabled, excluded buy custom options below
            '<input type="submit"/>'            + // Excluded field, not valid
          '</form>');
        var parsleyForm = new Parsley($('#element'), { excluded: '[disabled], input[type=button], input[type=submit], input[type=reset]' });
        expect(parsleyForm.fields.length).to.be(2);
      });
      it('should properly bind options for form and children fields', function () {
        $('body').append(
          '<form id="element" data-parsley-trigger="change">'                 +
            '<input id="field1" type="text" data-parsley-required="true" />'  +
            '<div id="field2"></div>'                                         +
            '<textarea id="field3" data-parsley-notblank="true"></textarea>'  +
          '</form>');
        var parsleyForm = new Parsley($('#element'));
        expect(parsleyForm.fields.length).to.be(2);
        expect(new Parsley('#field1').options.trigger).to.be('change');
        expect(new Parsley('#field1').options).to.have.key('required');
        expect(new Parsley('#field1').options).to.not.have.key('notblank');
        expect(new Parsley('#field3').options).to.have.key('notblank');
        expect(new Parsley('#field3').options).to.not.have.key('required');
      });
      it('should properly store validation state after `validate()`', function () {
        $('body').append(
          '<form id="element" data-parsley-trigger="change">'                 +
            '<input id="field1" type="text" data-parsley-required="true" />'  +
            '<div id="field2"></div>'                                         +
            '<textarea id="field3" data-parsley-notblank="true"></textarea>'  +
          '</form>');
          var parsleyForm = new Parsley($('#element'));
          parsleyForm.validate();
          expect(parsleyForm.validationResult).to.be(false);
          $('#field1').val('foo');
          $('#field3').val('foo');
          expect(parsleyForm.validate()).to.be(true);
      });
      it('should handle group validation', function () {
        $('body').append(
          '<form id="element">'                                                                        +
            '<input id="field1" type="text" data-parsley-group="foo" data-parsley-required="true" />'  +
            '<div id="field2"></div>'                                                                  +
            '<textarea id="field3" data-parsley-group="bar" data-parsley-required="true"></textarea>'  +
          '</form>');
          var parsleyForm = new Parsley($('#element'));
          expect(parsleyForm.isValid()).to.be(false);
          $('#field1').val('value');
          expect(parsleyForm.isValid()).to.be(false);
          expect(parsleyForm.isValid('foo')).to.be(true);
          expect(parsleyForm.isValid('bar')).to.be(false);
      });
      it('should handle `onFormSubmit` validation', function () {
        $('body').append(
          '<form id="element" data-parsley-trigger="change">'                 +
            '<input id="field1" type="text" data-parsley-required="true" />'  +
            '<div id="field2"></div>'                                         +
            '<textarea id="field3" data-parsley-notblank="true"></textarea>'  +
          '</form>');
          var parsleyForm = new Parsley($('#element'));

          // parsley.remote hack because if valid, parsley remote re-send form
          parsleyForm.subscribe('parsley:form:validate', function (formInstance) {
            if (formInstance.asyncSupport)
              formInstance.submitEvent._originalPreventDefault();
          });

          var event = $.Event();
          // parsley.remote hack
          event._originalPreventDefault = event.preventDefault;
          event.preventDefault = sinon.spy();
          parsleyForm.onSubmitValidate(event);
          expect(event.preventDefault.called).to.be(true);

          $('#field1').val('foo');
          $('#field3').val('foo');

          event = $.Event();
          // parsley.remote hack
          event._originalPreventDefault = event.preventDefault;
          event.preventDefault = sinon.spy();
          parsleyForm.onSubmitValidate(event);

          if (!parsleyForm.asyncSupport)
            expect(event.preventDefault.called).to.be(false);
          else
            expect(event.preventDefault.called).to.be(true);
      });
      it('should have a force option for validate and isValid methods', function () {
        $('body').append(
          '<form id="element">'                                   +
            '<input id="field1" type="email" />'                  +
            '<input id="field3" data-parsley-notblank="true" />'  +
          '</form>');
        expect($('#element').parsley().isValid()).to.be(true);
        expect($('#element').parsley().isValid(undefined, true)).to.be(false);
        expect($('#element').parsley().validate()).to.be(true);
        expect($('#element').parsley().validate(undefined, true)).to.be(false);
      });
      it('should properly bind dynamically added fields', function () {
        $('body').append('<form id="element" data-parsley-trigger="change"></form>');
        $('#element').append('<input type="email" id="email" required />');
        var fieldInstance = $('#email').psly();
        expect(fieldInstance.__class__).to.be('ParsleyField');
        var formInstance = $('#element').psly();
        // form corectly have its field, and field have finaly its parent form
        expect(formInstance.fields[0].$element.attr('id')).to.be('email');
        expect(fieldInstance.parent.__class__).to.be('ParsleyForm');
      });
      it('should stop event propagation on form submit', function (done) {
        $('body').append('<form id="element"><input type="text" required/></form>');
        var parsleyInstance = $('#element').parsley();

        $('#element').on('submit', function () {
          // It sould never pass here!
          expect(true).to.be(false);
        });

        parsleyInstance.subscribe('parsley:form:validated', function () {
          done();
        });

        $('#element').submit();
      });
      afterEach(function () {
        if ($('#element').length)
          $('#element').remove();
      });
    });
  };
});
