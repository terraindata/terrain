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

import * as _ from 'lodash';

import { Import, ImportConfig } from '../Import';
import ADocumentTransform from './ADocumentTransform';

/**
 * Applies import transformations to a result stream
 */
export default class ImportTransform extends ADocumentTransform
{
  private importt: Import;
  private config: ImportConfig;
  private mapping: object;

  constructor(importt: Import, config: ImportConfig)
  {
    super();
    this.importt = importt;
    this.config = config;
  }

  protected transform(input: object | object[], chunkNumber: number): object | object[]
  {
    if (Array.isArray(input))
    {
      return input.map((i) => this._apply(i, chunkNumber));
    }
    return this._apply(input, chunkNumber);
  }

  private _apply(input: object, chunkNumber: number): object
  {
    if (this.config.requireJSONHaveAllFields === true)
    {
      const expectedCols = JSON.stringify(this.config.originalNames.sort());
      const inputCols = JSON.stringify(Object.keys(input).sort());
      if (inputCols !== expectedCols)
      {
        this.emit('error', new Error('Stream contains an object that does not contain the expected fields. Got fields: ' +
          inputCols + '\nExpected: ' + expectedCols));
      }
    }
    else
    {
      const fieldsInDocumentNotExpected = _.difference(Object.keys(input), this.config.originalNames);
      for (const field of fieldsInDocumentNotExpected)
      {
        if (input.hasOwnProperty(field))
        {
          this.emit('error', new Error('JSON file contains an object with an unexpected field ("' + String(field) + '"): ' +
            JSON.stringify(input)));
        }
        delete input[field];
      }
      const expectedFieldsNotInDocument = _.difference(this.config.originalNames, Object.keys(input));
      for (const field of expectedFieldsNotInDocument)
      {
        input[field] = null;
      }
    }

    console.log(input);
    return this.importt._transformAndCheck(input, this.config);
  }
}
