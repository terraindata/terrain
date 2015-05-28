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

define('parsley/pubsub', [
  'parsley/field',
  'parsley/form'
], function (ParsleyField, ParsleyForm) {
  var
    o = $({}),
    subscribed = {};

  // $.listen(name, callback);
  // $.listen(name, context, callback);
  $.listen = function (name) {
    if ('undefined' === typeof subscribed[name])
      subscribed[name] = [];

    if ('function' === typeof arguments[1])
      return subscribed[name].push({ fn: arguments[1] });

    if ('object' === typeof arguments[1] && 'function' === typeof arguments[2])
      return subscribed[name].push({ fn: arguments[2], ctxt: arguments[1] });

    throw new Error('Wrong parameters');
  };

  $.listenTo = function (instance, name, fn) {
    if ('undefined' === typeof subscribed[name])
      subscribed[name] = [];

    if (!(instance instanceof ParsleyField) && !(instance instanceof ParsleyForm))
      throw new Error('Must give Parsley instance');

    if ('string' !== typeof name || 'function' !== typeof fn)
      throw new Error('Wrong parameters');

    subscribed[name].push({ instance: instance, fn: fn });
  };

  $.unsubscribe = function (name, fn) {
    if ('undefined' === typeof subscribed[name])
      return;

    if ('string' !== typeof name || 'function' !== typeof fn)
      throw new Error('Wrong arguments');

    for (var i = 0; i < subscribed[name].length; i++)
      if (subscribed[name][i].fn === fn)
        return subscribed[name].splice(i, 1);
  };

  $.unsubscribeTo = function (instance, name) {
    if ('undefined' === typeof subscribed[name])
      return;

    if (!(instance instanceof ParsleyField) && !(instance instanceof ParsleyForm))
      throw new Error('Must give Parsley instance');

    for (var i = 0; i < subscribed[name].length; i++)
      if ('undefined' !== typeof subscribed[name][i].instance && subscribed[name][i].instance.__id__ === instance.__id__)
        return subscribed[name].splice(i, 1);
  };

  $.unsubscribeAll = function (name) {
    if ('undefined' === typeof subscribed[name])
      return;

    delete subscribed[name];
  };

  // $.emit(name [, arguments...]);
  // $.emit(name, instance [, arguments..]);
  $.emit = function (name, instance) {
    if ('undefined' === typeof subscribed[name])
      return;

    // loop through registered callbacks for this event
    for (var i = 0; i < subscribed[name].length; i++) {
      // if instance is not registered, simple emit
      if ('undefined' === typeof subscribed[name][i].instance) {
        subscribed[name][i].fn.apply('undefined' !== typeof subscribed[name][i].ctxt ? subscribed[name][i].ctxt : o, Array.prototype.slice.call(arguments, 1));
        continue;
      }

      // if instance registered but no instance given for the emit, continue
      if (!(instance instanceof ParsleyField) && !(instance instanceof ParsleyForm))
        continue;

      // if instance is registered and same id, emit
      if (subscribed[name][i].instance.__id__ === instance.__id__) {
        subscribed[name][i].fn.apply(o, Array.prototype.slice.call(arguments, 1));
        continue;
      }

      // if registered instance is a Form and fired one is a Field, loop over all its fields and emit if field found
      if (subscribed[name][i].instance instanceof ParsleyForm && instance instanceof ParsleyField)
        for (var j = 0; j < subscribed[name][i].instance.fields.length; j++)
          if (subscribed[name][i].instance.fields[j].__id__ === instance.__id__) {
            subscribed[name][i].fn.apply(o, Array.prototype.slice.call(arguments, 1));
            continue;
          }
    }
  };

  $.subscribed = function () { return subscribed; };
});
