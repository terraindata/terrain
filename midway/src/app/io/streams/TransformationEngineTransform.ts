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

import { List } from 'immutable';
import { TransformationEngine } from '../../../../../shared/transformations/TransformationEngine';
import TransformationNodeType from '../../../../../shared/transformations/TransformationNodeType';
import { KeyPath } from '../../../../../shared/util/KeyPath';

import ADocumentTransform from './ADocumentTransform';

/**
 * Applies export transformations to a result stream
 */
export default class TransformationEngineTransform extends ADocumentTransform
{
  private engine: TransformationEngine | undefined;
  private transforms: object[];

  constructor(transforms: object[] = [], engine?: TransformationEngine)
  {
    super();
    this.transforms = transforms;
    this.engine = engine;
  }

  protected transform(input: object, chunkNumber: number): object | object[]
  {
    if (chunkNumber === 0 && this.engine === undefined)
    {
      this.engine = this.createTransformationEngine(input);
    }

    if (this.engine === undefined)
    {
      return input;
    }

    return this.engine.transform(input);
  }

  private createTransformationEngine(obj: object): TransformationEngine
  {
    const engine: TransformationEngine = new TransformationEngine(obj);
    for (const transform of this.transforms)
    {
      let colName: string | undefined;
      let newName: string | undefined;
      switch (transform['name'])
      {
        case 'rename':
          colName = transform['colName'];
          newName = transform['args']['newName'];
          if (colName === undefined || newName === undefined)
          {
            throw new Error('Rename transformation must supply colName and newName arguments.');
          }
          engine.setOutputKeyPath(engine.addField(KeyPath([colName])), KeyPath([newName]));
          break;
        case 'extract':
          newName = transform['args']['newName'];
          const path: string | undefined = transform['args']['path'];
          if (newName === undefined || path === undefined)
          {
            throw new Error('Extract transformation must supply newName and path arguments.');
          }
          engine.setOutputKeyPath(engine.addField(KeyPath(path.split('.'))), KeyPath([newName]));
          break;
        case 'split':
          colName = transform['colName'];
          newName = transform['args']['newName'];
          const splitText: string | undefined = transform['args']['text'];
          if (colName === undefined || newName === undefined || splitText === undefined)
          {
            throw new Error('Split transformation must supply colName, newName, and text arguments.');
          }
          if (newName.length !== 2)
          {
            throw new Error('Split transformation currently only supports splitting into two columns.');
          }
          if (typeof obj[colName] !== 'string')
          {
            throw new Error('Can only split columns containing text.');
          }

          // TODO:
          // const oldText: string = obj[colName];
          // delete obj[colName];
          // const ind: number = oldText.indexOf(splitText);
          // if (ind === -1)
          // {
          //   obj[newName[0]] = oldText;
          //   obj[newName[1]] = '';
          // }
          // else
          // {
          //   obj[newName[0]] = oldText.substring(0, ind);
          //   obj[newName[1]] = oldText.substring(ind + splitText.length);
          // }
          break;
        case 'merge':
          colName = transform['colName'];
          newName = transform['args']['newName'];
          const mergeCol: string | undefined = transform['args']['mergeName'];
          const mergeText: string | undefined = transform['args']['text'];
          if (colName === undefined || mergeCol === undefined || newName === undefined || mergeText === undefined)
          {
            throw new Error('Merge transformation must supply colName, mergeName, newName, and text arguments.');
          }
          if (typeof obj[colName] !== 'string' || typeof obj[mergeCol] !== 'string')
          {
            throw new Error('Can only merge columns containing text.');
          }

          // TODO:
          // obj[newName] = String(obj[colName]) + mergeText + String(obj[mergeCol]);
          // if (colName !== newName)
          // {
          //   delete obj[colName];
          // }
          // if (mergeCol !== newName)
          // {
          //   delete obj[mergeCol];
          // }
          break;
        case 'duplicate':
          colName = transform['colName'];
          const copyName: string | undefined = transform['args']['newName'];
          if (colName === undefined || copyName === undefined)
          {
            throw new Error('Duplicate transformation must supply colName and newName arguments.');
          }

          // TODO:
          // e.appendTransformation(TransformationNodeType.DuplicateNode, List<KeyPath>([KeyPath([colName])]),
          //   {
          //     name: copyName,
          //   });
          break;
        case 'prepend':
          colName = transform['colName'];
          const prependText: string | undefined = transform['args']['text'];
          if (colName === undefined || prependText === undefined)
          {
            throw new Error('Prepend transformation must supply colName and text arguments.');
          }
          engine.appendTransformation(TransformationNodeType.InsertNode,
            List<KeyPath>([KeyPath([colName])]), { at: 0, value: prependText });
          break;
        case 'append':
          colName = transform['colName'];
          const appendText: string | undefined = transform['args']['text'];
          if (colName === undefined || appendText === undefined)
          {
            throw new Error('Append transformation must supply colName and text arguments.');
          }
          engine.appendTransformation(TransformationNodeType.InsertNode, List<KeyPath>([KeyPath([colName])]), { value: appendText });
          break;
        default:
          throw new Error('Invalid transform name encountered: ' + String(transform['name']));
      }
    }
    return engine;
  }
}
