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
  return function (ParsleyUtils) {
    describe('ParsleyUtils', function () {
      it('should have a proper deserializeValue() function', function () {
        expect(ParsleyUtils.deserializeValue('true')).to.be(true);
        expect(ParsleyUtils.deserializeValue('1')).to.be(1);
        expect(ParsleyUtils.deserializeValue('["foo", "bar"]')).to.be.an('array');
        expect(ParsleyUtils.deserializeValue('{"foo": "bar"}')).to.be.an('object');
      });
      it('should have a proper camelize() function', function () {
        expect(ParsleyUtils.camelize('foo-bar')).to.be('fooBar');
        expect(ParsleyUtils.camelize('foo-bar-baz')).to.be('fooBarBaz');
        expect(ParsleyUtils.camelize('foo-bAr-baz')).to.be('fooBArBaz');
      });
      it('should have a proper dasherize() function', function () {
        expect(ParsleyUtils.dasherize('fooBar')).to.be('foo-bar');
        expect(ParsleyUtils.dasherize('fooBarBaz')).to.be('foo-bar-baz');
        expect(ParsleyUtils.dasherize('fooBArBaz')).to.be('foo-b-ar-baz');
      });
      it('should have a proper attr() function', function () {
        var element = [{
          attributes: [
            {
              specified: true,
              name: "data-parsley-foo",
              value: "bar"
            },
            {
              specified: true,
              name: "parsley-foo",
              value: "baz"
            },
            {
              specified: true,
              name: "data-parsley-bar",
              value: "[0, 42]"
            },
            {
              specified: false,
              name: "data-parsley-foo",
              value: "bar"
            },
            {
              foo: "bar"
            }
          ]
        }],
        attr = ParsleyUtils.attr(element, 'data-parsley-');

        expect(attr).to.eql({'foo': 'bar', 'bar': [0, 42]});

        // test if attr exist
        expect(ParsleyUtils.attr(element, 'data-parsley-', 'foo')).to.be(true);
        expect(ParsleyUtils.attr(element, 'data-parsley-', 'FoO')).to.be(true);
        expect(ParsleyUtils.attr(element, 'data-parsley-', 'baz')).to.be(false);
      });
      it('should have a checkAttr feature for attr() method', function () {
        var element = [{
          attributes: [
            {
              specified: true,
              name: "data-parsley-required-message",
              value: "foo"
            },
            {
              specified: true,
              name: "data-parsley-validate",
              value: true
            }
          ]
        }];
        expect(ParsleyUtils.attr(element, 'data-parsley-', 'required')).to.be(false);
        expect(ParsleyUtils.attr(element, 'data-parsley-', 'required-message')).to.be(true);
        expect(ParsleyUtils.attr(element, 'data-parsley-', 'validate')).to.be(true);
      });
      it('should have a proper get() function', function () {
        var object = {
          foo: {bar: 'baz'},
          bar: 'qux'
        };
        expect(ParsleyUtils.get(object, 'bar')).to.be('qux');
        expect(ParsleyUtils.get(object, 'foo.bar')).to.be('baz');
        expect(ParsleyUtils.get(object, 'foo.baz')).to.be(undefined);
      });
    });
  }
});
