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

// This plugin replace Parsley default form behavior that auto bind its fields children
// With this plugin you must register in constructor your form's fields and their constraints
// You have this way a total javascript control over your form validation, and nothing needed in DOM
window.ParsleyConfig = $.extend(true, window.ParsleyConfig, { autoBind: false });
window.ParsleyExtend = window.ParsleyExtend || {};

window.ParsleyExtend = $.extend(window.ParsleyExtend, {
  // { '#selector' : { constraintName1: value, constraintName2: value2 }, #selector2: { constraintName: value } }
  // { '#selector' : { constraintName1: { requirements: value, priority: value }, constraintName2: value2 } }
  _bindFields: function () {
    if ('ParsleyForm' !== this.__class__)
      throw new Error('`_bindFields` must be called on a form instance');

    if ('undefined' === typeof this.options.fields)
      throw new Error('bind.js plugin needs to have Parsley instanciated with fields');

    var field;
    this.fields = [];

    for (var selector in this.options.fields) {
      if (0 === $(selector).length)
        continue;

      field = $(selector).parsley();

      for (var name in this.options.fields[selector]) {
        if ('object' === typeof this.options.fields[selector][name] && !(this.options.fields[selector][name] instanceof Array))
          field.addConstraint(name.toLowerCase(), this.options.fields[selector][name].requirements, this.options.fields[selector][name].priority || 32);
        else
          field.addConstraint(name.toLowerCase(), this.options.fields[selector][name]);
      }
    }

    this.fields.push(field);

    return this;
  },

  // Do nothing
  _bindConstraints: function () {
    return this;
  }
});
