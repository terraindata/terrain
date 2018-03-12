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

// Copyright 2018 Terrain Data, Inc.

import * as _ from 'lodash';
import { TransformationEngine } from '../../../../shared/transformations/TransformationEngine';

export function mergeDocument(doc: object): object
{
  if (doc['_source'] !== undefined)
  {
    const sourceKeys = Object.keys(doc['_source']);
    const rootKeys = _.without(Object.keys(doc), '_index', '_type', '_id', '_score', '_source');
    if (rootKeys.length > 0) // there were other top-level objects in the document
    {
      const duplicateRootKeys: string[] = [];
      rootKeys.forEach((rootKey) =>
      {
        if (sourceKeys.indexOf(rootKey) > -1)
        {
          duplicateRootKeys.push(rootKey);
        }
      });
      if (duplicateRootKeys.length !== 0)
      {
        throw new Error('Duplicate keys ' + JSON.stringify(duplicateRootKeys) + ' in root level and source mapping');
      }
      rootKeys.forEach((rootKey) =>
      {
        doc['_source'][rootKey] = doc[rootKey];
        delete doc[rootKey];
      });
    }
  }
  return doc;
}

export function applyTransforms(obj: object, transforms: object[]): object
{
  const e: TransformationEngine = new TransformationEngine();
  let colName: string | undefined;
  for (const transform of transforms)
  {
    switch (transform['name'])
    {
      case 'rename':
        const oldName: string | undefined = transform['colName'];
        const newName: string | undefined = transform['args']['newName'];
        if (oldName === undefined || newName === undefined)
        {
          throw new Error('Rename transformation must supply colName and newName arguments.');
        }
        if (oldName !== newName)
        {
          obj[newName] = obj[oldName];
          delete obj[oldName];
        }
        break;
      case 'extract':
        const oldColName: string | undefined = transform['colName'];
        const newColName: string | undefined = transform['args']['newName'];
        const path: string | undefined = transform['args']['path'];
        if (oldColName !== undefined && newColName !== undefined && path !== undefined)
        {
          obj[newColName] = _.get(obj, path);
        }
        break;
      case 'split':
        const oldCol: string | undefined = transform['colName'];
        const newCols: string[] | undefined = transform['args']['newName'];
        const splitText: string | undefined = transform['args']['text'];
        if (oldCol === undefined || newCols === undefined || splitText === undefined)
        {
          throw new Error('Split transformation must supply colName, newName, and text arguments.');
        }
        if (newCols.length !== 2)
        {
          throw new Error('Split transformation currently only supports splitting into two columns.');
        }
        if (typeof obj[oldCol] !== 'string')
        {
          throw new Error('Can only split columns containing text.');
        }
        const oldText: string = obj[oldCol];
        delete obj[oldCol];
        const ind: number = oldText.indexOf(splitText);
        if (ind === -1)
        {
          obj[newCols[0]] = oldText;
          obj[newCols[1]] = '';
        }
        else
        {
          obj[newCols[0]] = oldText.substring(0, ind);
          obj[newCols[1]] = oldText.substring(ind + splitText.length);
        }
        break;
      case 'merge':
        const startCol: string | undefined = transform['colName'];
        const mergeCol: string | undefined = transform['args']['mergeName'];
        const newCol: string | undefined = transform['args']['newName'];
        const mergeText: string | undefined = transform['args']['text'];
        if (startCol === undefined || mergeCol === undefined || newCol === undefined || mergeText === undefined)
        {
          throw new Error('Merge transformation must supply colName, mergeName, newName, and text arguments.');
        }
        if (typeof obj[startCol] !== 'string' || typeof obj[mergeCol] !== 'string')
        {
          throw new Error('Can only merge columns containing text.');
        }
        obj[newCol] = String(obj[startCol]) + mergeText + String(obj[mergeCol]);
        if (startCol !== newCol)
        {
          delete obj[startCol];
        }
        if (mergeCol !== newCol)
        {
          delete obj[mergeCol];
        }
        break;
      case 'duplicate':
        colName = transform['colName'];
        const copyName: string | undefined = transform['args']['newName'];
        if (colName === undefined || copyName === undefined)
        {
          throw new Error('Duplicate transformation must supply colName and newName arguments.');
        }
        obj[copyName] = obj[colName];
        break;
      case 'prepend':
        colName = transform['colName'];
        const prependText: string | undefined = transform['args']['text'];
        if (colName === undefined || prependText === undefined)
        {
          throw new Error('Prepend transformation must supply colName and text arguments.');
        }
        if (typeof obj[colName] !== 'string')
        {
          throw new Error('Can only prepend to columns of type string.');
        }
        obj[colName] = prependText + String(obj[colName]);
        break;
      case 'append':
        colName = transform['colName'];
        const appendText: string | undefined = transform['args']['text'];
        if (colName === undefined || appendText === undefined)
        {
          throw new Error('Aappend transformation must supply colName and text arguments.');
        }
        if (typeof obj[colName] !== 'string')
        {
          throw new Error('Can only append to columns of type string.');
        }
        obj[colName] = String(obj[colName]) + appendText;
        break;
      default:
        throw new Error('Invalid transform name encountered: ' + String(transform['name']));
    }
  }
  return obj;
}
