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

// Copyright 2017 Terrain Data, Inc.

// tslint:disable:forin restrict-plus-operands

// Defining our object like this gives us compile-time TypeScript support for ActionTypes
//  and prevents us from defining duplicate action types.
// The keys are the action types.
// The values are initially the empty string (for coding expediency) but a function at the end
//  of this file sets all of the values equal to the keys.
// So you end up with ActionTypes.cards.move === 'cards.move'

export let BuilderActionTypes =
  {
    fetchQuery: '', // triggers server xhr
    queryLoaded: '', // when the call to the server returns
    changeQuery: '',

    // these apply to the state's query
    create: '',
    change: '',
    move: '', // within the same parent
    nestedMove: '', // can occur between different parts of the tree
    remove: '',
    dragCard: '',
    dragCardOver: '',
    dropCard: '',

    hoverCard: '',

    selectCard: '',

    // Change the hand-writen TQL
    changeTQL: '',

    toggleDeck: '',

    changeResultsConfig: '',
    results: '',

    updateKeyPath: '',

    save: '', // just tells the store that something was saved

    undo: '',
    redo: '',
    checkpoint: '', // inserts an undo checkpoint
  };

// I tried using this type to correclty classify this function,
//  but because of how object literals work in TypeScript,
//  it wasn't useful.
// Reference: http://stackoverflow.com/questions/22077023/why-cant-i-indirectly-return-an-object-literal-to-satisfy-an-index-signature-re
// type ObjectOfStrings = { [s: string]: ObjectOfStrings | string };

const setValuesToKeys = (obj: any, prefix: string) =>
{
  prefix = prefix + (prefix.length > 0 ? '.' : '');
  for (const key in obj)
  {
    const value = prefix + key;
    if (typeof obj[key] === 'string')
    {
      obj[key] = value;
    }
    else if (typeof obj[key] === 'object')
    {
      setValuesToKeys(obj[key], value);
    }
    else
    {
      throw new Error('Value found in ActionTypes that is neither string or object of strings: key: ' + key + ', value: ' + obj[key]);
    }
  }
};

setValuesToKeys(BuilderActionTypes, '');

// which actions dirty the state?
export let BuilderDirtyActionTypes = {};
[
  BuilderActionTypes.create,
  BuilderActionTypes.change,
  BuilderActionTypes.move,
  BuilderActionTypes.remove,
  BuilderActionTypes.nestedMove,
  BuilderActionTypes.dropCard,
  BuilderActionTypes.changeTQL,
  BuilderActionTypes.toggleDeck,
  BuilderActionTypes.checkpoint,
  BuilderActionTypes.changeResultsConfig,
].map((type) => BuilderDirtyActionTypes[type] = true);

// which actions modify cards?
export let BuilderCardActionTypes = {};
[
  BuilderActionTypes.create,
  BuilderActionTypes.change,
  BuilderActionTypes.move,
  BuilderActionTypes.nestedMove,
  BuilderActionTypes.remove,
  BuilderActionTypes.dropCard,
].map((type) => BuilderCardActionTypes[type] = true);

export let BuilderPathActionTypes = {};
[
  BuilderActionTypes.change,
].map((type) => BuilderPathActionTypes[type] = true);

export default BuilderActionTypes;
