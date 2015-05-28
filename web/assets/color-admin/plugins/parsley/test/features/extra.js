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

define('features/extra', [
  'extra/validator/dateiso'
], function () {

  return function (ParsleyValidator) {
    describe('ParsleyExtras validators', function () {
      it('should have dateiso validator', function () {
        expect(window.ParsleyConfig.validators).to.have.key('dateiso');
        var parsleyValidator = new ParsleyValidator(window.ParsleyConfig.validators);

        expect(parsleyValidator.validate('', parsleyValidator.validators.dateiso())).not.to.be(true);
        expect(parsleyValidator.validate('foo', parsleyValidator.validators.dateiso())).not.to.be(true);
        expect(parsleyValidator.validate('1986-30-01', parsleyValidator.validators.dateiso())).not.to.be(true);
        expect(parsleyValidator.validate('1986-12-45', parsleyValidator.validators.dateiso())).not.to.be(true);
        expect(parsleyValidator.validate('1986-12-01', parsleyValidator.validators.dateiso())).to.be(true);
      });
      it('should have a bind.js plugin allowing to give pure json validation config to parsley constructor', function (done) {
        require(['extra/plugin/bind'], function () {
          $('body').append(
          '<form id="element" >' +
            '<input type="text" name="name" />' +
            '<input type="text" name="email" id="email" />' +
            '<input type="checkbox" name="sexe" id="sexe" value="male" />' +
            '<input type="checkbox" name="sexe" value="female" />' +
          '</form>');

        var parsleyInstance = $('#element').parsley({
          fields: {
            '[name="name"]': {
              required: true,
              length: [4, 20]
            },
            '#email': {
              type: 'email'
            },
            '#sexe': {
              required: true
            }
          }
        });
        expect($('[name="name"]').parsley().constraints.length).to.be(2);
        expect($('#email').parsley().constraints.length).to.be(1);
        expect($('#sexe').parsley().constraints.length).to.be(1);
        expect($('#sexe').parsley().constraints[0].name).to.be('required');
        done();
        });
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
