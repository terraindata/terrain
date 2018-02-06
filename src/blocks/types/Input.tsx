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

// tslint:disable:strict-boolean-expressions

export enum InputType
{
  NUMBER,
  TEXT,
  DATE,
  LOCATION,
}

export const InputPrefix: string = '@';

export interface Input extends IRecord<Input>
{
  type: string;
  key: string;
  value: string;
  inputType: InputType;
  meta?: any; // Meta data (this is used for the map component, related to value but does not go in elastic query)
}

export function isRuntimeInput(name: string)
{
  return name.charAt(0) === InputPrefix &&
    name.substring(1).split('.')[0] === 'parent';
}

export function isInput(name: string, inputs: Immutable.List<Input>)
{
  return inputs && name && name.charAt(0) === InputPrefix &&
    (inputs.findIndex((input: Input) => (name.substring(1) === input.key)) > -1);
}

export function toInputMap(inputs: Immutable.List<Input>): object
{
  const inputMap: object = {};
  inputs.map((input: Input) =>
  {
    let value: any;
    try
    {
      value = JSON.parse(input.value);
    }
    catch (e)
    {
      value = input.value;
    }
    inputMap[input.key] = value;
  });
  return inputMap;
}

export default Input;
