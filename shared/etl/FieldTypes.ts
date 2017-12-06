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

import * as csvString from 'csv-string';
import * as _ from 'lodash';
import * as stream from 'stream';

import { CSVTypeParser, isTypeConsistent } from '../Util';

export class FieldTypes
{
  private csvTypeParser: CSVTypeParser;

  constructor()
  {
    this.csvTypeParser = new CSVTypeParser();
  }

  public async getESMappingFromDocument(value: object): Promise<object>
  {
    return new Promise<object>(async (resolve, reject) =>
    {
      const documentMapping =
        {
          properties: {},
        };
      const valueKeyArr: string[] = Object.keys(value);
      for (const key of valueKeyArr)
      {
        documentMapping['properties'][key] = await this.getESTypeFromFullType(value[key]);
      }
      return resolve(documentMapping);
    });
  }

  public async getESTypeFromFullType(value: object): Promise<object> // maps ES type to full type object (as stored by templates)
  {
    return new Promise<object>(async (resolve, reject) =>
    {

      let type: object = { type: 'text', fields: { keyword: { type: 'text', index: true, analyzer: 'standard' } } };
      const analyzed: boolean = value['index'] === 'not_analyzed' ? false : true; // by default analyze all fields
      const analyzer: string = value['analyzer'] !== null ? value['analyzer'] : 'standard';
      switch (value['type'])
      {
        case 'nested':
          const innerTypeNested = this.getESMappingFromDocument(value['innerType']);
          innerTypeNested['type'] = 'nested';
          type = innerTypeNested;
          break;
        case 'array':
          let innerTypeArray = value;
          while (innerTypeArray['type'] === 'array')
          {
            innerTypeArray = value['innerType'];
          }
          type = this.getESTypeFromFullType(innerTypeArray);
          break;
        case 'null': // treat as text
          type = {
            type: analyzed ? 'text' : 'keyword', index: true, fields:
            {
              keyword: analyzed ? { type: 'keyword', index: analyzed }
                : { type: 'keyword', index: true, ignore_above: 256 },
            },
          };
          break;
        case 'text':
          type = {
            type: analyzed ? 'text' : 'keyword', index: true, fields:
            {
              keyword: analyzed ? { type: 'keyword', index: analyzed }
                : { type: 'keyword', index: true, ignore_above: 256 },
            },
          };
          if (analyzed)
          {
            type['analyzer'] = analyzer;
          }
          break;
        default:
          type = { type: value['type'] };
          break;
      }
      return resolve(type);
    });
  }

  public async getFullTypeFromAny(value: any): Promise<object>
  {
    return new Promise<object>(async (resolve, reject) =>
    {
      let type: object = {};
      switch (typeof value)
      {
        case 'number':
          type = (value % 1 === 0) ?
            { type: 'long', index: 'not_analyzed', analyzer: null } :
            { type: 'double', index: 'not_analyzed', analyzer: null };
          break;
        case 'string':
          if (this.csvTypeParser.isDateHelper(value))
          {
            type = { type: 'date', index: 'not_analyzed', analyzer: null };
            break;
          }
          type = { type: 'text', index: 'analyzed', analyzer: 'standard' };
          break;
        case 'object':
          if (value !== null)
          {
            if (Array.isArray(value))
            {
              if (value.length === 0)
              {
                type = { type: 'array', innerType: { type: 'text', index: 'not_analyzed', analyzer: null } };
              }
              else
              {
                type = { type: 'array', innerType: {} };
                type['innerType'] = isTypeConsistent(value) ? await this.getFullTypeFromAny(value[0])
                  : { type: 'text', index: 'analyzed', analyzer: 'standard' };
              }
            }
            else if (this.csvTypeParser.isNestedHelper(value))
            {
              if (Object.keys(value).length === 0)
              {
                type = { type: 'nested', innerType: { type: 'text', index: 'analyzed', analyzer: null } };
              }
              else
              {
                const innerTypeObj = {};
                Object.keys(value).map(async (key) =>
                {
                  innerTypeObj[key] = await this.getFullTypeFromAny(value[key]);
                });
                type =
                  {
                    type: 'nested',
                    innerType: innerTypeObj,
                  };
              }
            }
          }
          else
          {
            type = { type: 'null', index: 'analyzed', analyzer: 'standard' };
          }
          break;
        default:
          type = { type: 'text', index: 'analyzed', analyzer: 'standard' };
          break;
      }
      return resolve(type);
    });
  }

  public async getFullTypeFromDocument(value: any): Promise<object>
  {
    return new Promise<object>(async (resolve, reject) =>
    {
      let valueAsObj: object = {};
      if (typeof value === 'string')
      {
        valueAsObj = JSON.parse(value);
      }
      else
      {
        valueAsObj = value;
      }
      const returnObj: object = {};
      for (const key of Object.keys(valueAsObj))
      {
        returnObj[key] = await this.getFullTypeFromAny(valueAsObj[key]);
      }
      resolve(returnObj);
    });

  }

  public async getFieldTypesFromMySQLFormatStream(files: stream.Readable[] | stream.Readable, params: object): Promise<stream.Readable>
  {
    return new Promise<stream.Readable>(async (resolve, reject) =>
    {
      let file: stream.Readable | null = null;
      if (Array.isArray(files))
      {
        for (const f of files)
        {
          if (f['fieldname'] === 'file')
          {
            file = f;
          }
        }
      }
      else
      {
        file = files;
      }
      if (file === null)
      {
        return reject('No file specified.');
      }

      let completeFieldTypeObj: object = {};
      let contents: string = '';
      const writeFile = new stream.PassThrough();
      const newlineSplitOptions: string[] = ['\r\n', '\n'];
      file.on('data', async (chunk) =>
      {
        const chunkStr: string = chunk.toString();
        let hasNextLine: boolean = false;
        let chunkSplitArr: string[] = [];
        for (const newlineSplit of newlineSplitOptions)
        {
          chunkSplitArr = chunkStr.split(newlineSplit);
          if (chunkSplitArr.length > 1) // chunk also includes next line
          {
            contents += chunkSplitArr[0];
            hasNextLine = true;
            break;
          }
        }
        if (!hasNextLine)
        {
          contents += chunkStr;
        }
        else
        {
          let fieldTypeObjStr: object | string = await this._getFieldTypeFromChunk(contents);
          if (typeof fieldTypeObjStr === 'object')
          {
            completeFieldTypeObj = await this._compareFieldTypeObjs(completeFieldTypeObj, fieldTypeObjStr as object);
          }
          for (let i = 1; i < chunkSplitArr.length - 1; ++i)
          {
            fieldTypeObjStr = await this._getFieldTypeFromChunk(contents);
            if (typeof fieldTypeObjStr === 'object')
            {
              completeFieldTypeObj = await this._compareFieldTypeObjs(completeFieldTypeObj, fieldTypeObjStr as object);
            }
          }
          if (chunkSplitArr.length >= 2)
          {
            contents = chunkSplitArr[chunkSplitArr.length - 1];
          }
          else
          {
            contents = '';
          }

        }
      });
      file.on('error', async (e) =>
      {
        writeFile.end();
        return reject(e);
      });
      file.on('end', async () =>
      {
        if (contents.length !== 0)
        {
          const fieldTypeObjStr: object | string = await this._getFieldTypeFromChunk(contents);
          if (typeof fieldTypeObjStr === 'object')
          {
            completeFieldTypeObj = await this._compareFieldTypeObjs(completeFieldTypeObj, fieldTypeObjStr as object);
          }
        }
        completeFieldTypeObj = this._replaceNullWithText(completeFieldTypeObj);
        writeFile.write(JSON.stringify(Object.keys(completeFieldTypeObj)));
        writeFile.write('\n');
        writeFile.write(JSON.stringify(completeFieldTypeObj));
        writeFile.end();
        resolve(writeFile);
      });
    });
  }

  public getInnermostType(arrayType: object, stopNested?: boolean): string
  {
    while (arrayType['type'] === 'array' && arrayType['innerType'] !== undefined && typeof arrayType['innerType'] === 'object'
      && !(stopNested !== undefined && arrayType['type'] === 'nested'))
    {
      arrayType = arrayType['innerType'];
    }
    return arrayType['type'];
  }

  public async getJSONFromMySQLFormatStream(files: stream.Readable[] | stream.Readable, params: object): Promise<stream.Readable>
  {
    return new Promise<stream.Readable>(async (resolve, reject) =>
    {
      let file: stream.Readable | null = null;
      if (Array.isArray(files))
      {
        for (const f of files)
        {
          if (f['fieldname'] === 'file')
          {
            file = f;
          }
        }
      }
      else
      {
        file = files;
      }
      if (file === null)
      {
        return reject('No file specified.');
      }
      let contents: string = '';
      const writeFile = new stream.PassThrough();
      const newlineSplitOptions: string[] = ['\r\n', '\n'];
      let didWriteFirstLine: boolean = false;
      file.on('data', async (chunk) =>
      {
        const chunkStr: string = chunk.toString();
        let hasNextLine: boolean = false;
        let chunkSplitArr: string[] = [];
        for (const newlineSplit of newlineSplitOptions)
        {
          chunkSplitArr = chunkStr.split(newlineSplit);
          if (chunkSplitArr.length > 1) // chunk also includes next line
          {
            contents += chunkSplitArr[0];
            hasNextLine = true;
            break;
          }
        }
        if (!hasNextLine)
        {
          contents += chunkStr;
        }
        else
        {
          const contentAsJSONArr: object[] = await this._getJSONFromMySQLJSON(contents);
          if (Array.isArray(contentAsJSONArr) && contentAsJSONArr.length > 0)
          {
            const contentAsJSON: object = contentAsJSONArr[0];
            if (didWriteFirstLine)
            {
              writeFile.write(',\n');
            }
            else
            {
              didWriteFirstLine = true;
              writeFile.write('[');
            }
            writeFile.write(contentAsJSON);
          }
          for (let i = 1; i < chunkSplitArr.length - 1; ++i)
          {
            const jsonObjArr: object[] = await this._getJSONFromMySQLJSON(chunkSplitArr[i]);
            if (Array.isArray(jsonObjArr) && jsonObjArr.length > 0)
            {
              const jsonObj: object = jsonObjArr[0];
              if (didWriteFirstLine)
              {
                writeFile.write(',\n');
              }
              else
              {
                didWriteFirstLine = true;
                writeFile.write('[');
              }
              writeFile.write(jsonObj);
            }
          }
          if (chunkSplitArr.length >= 2)
          {
            contents = chunkSplitArr[chunkSplitArr.length - 1];
          }
          else
          {
            contents = '';
          }
        }
      });
      file.on('error', async (e) =>
      {
        writeFile.end();
        return reject(e);
      });
      file.on('end', async () =>
      {
        if (contents.length !== 0)
        {
          const contentAsJSONArr: object[] = await this._getJSONFromMySQLJSON(contents);
          if (Array.isArray(contentAsJSONArr) && contentAsJSONArr.length > 0)
          {
            const contentAsJSON: object = contentAsJSONArr[0];
            if (didWriteFirstLine)
            {
              writeFile.write(',\n');
            }
            else
            {
              didWriteFirstLine = true;
              writeFile.write('[');
            }
            writeFile.write(contentAsJSON);
          }
        }
        writeFile.write(']');
        writeFile.end();
        resolve(writeFile);
      });
    });
  }

  private async _chooseBestType(types: object[]): Promise<object>
  {
    return new Promise<object>(async (resolve, reject) =>
    {
      const typeSet = new Set(types.map((typeObj) => typeObj['type']));
      if (typeSet.size === 1 && !typeSet.has('array') && !typeSet.has('nested')) // base case: only 1 type and it's not array or nested
      {
        const regularTypes: object[] = types.filter((typeObj) => (typeObj['type'] !== 'array' && typeObj['type'] !== 'nested'));
        return resolve(regularTypes[0]);
      }
      else if (typeSet.size === 1 && typeSet.has('nested')) // nested only
      {
        const nestedTypeObjs: object[] = types.filter((typeObj) => typeObj['type'] === 'nested').map((typeObj) => typeObj['innerType']);
        let origNestedTypeObj: object = nestedTypeObjs[0];
        for (let i = 1; i < nestedTypeObjs.length; ++i) // do an iterative compare and find the best mapping within the nested object
        {
          origNestedTypeObj = await this._compareFieldTypeObjs(origNestedTypeObj, nestedTypeObjs[i]);
        }
        return resolve({ type: 'nested', innerType: origNestedTypeObj });
      }
      else if (typeSet.size === 1 && typeSet.has('array'))
      {
        const arrayTypeObjs: object[] = types.filter((typeObj) => typeObj['type'] === 'array').map((typeObj) => typeObj['innerType']);
        const innerArrayTypeObj: object = await this._chooseBestType(arrayTypeObjs);
        return resolve({ type: 'array', innerType: innerArrayTypeObj });
      }
      else if (typeSet.size === 2 && typeSet.has('double') && typeSet.has('long'))
      {
        return resolve({ type: 'double', index: 'not_analyzed', analyzer: null });
      }
      return resolve({ type: 'text', index: 'analyzed', analyzer: 'standard' });
    });
  }

  private async _compareFieldTypeObjs(origFieldType, newFieldType): Promise<object>
  {
    return new Promise<object>(async (resolve, reject) =>
    {
      const returnFieldType = _.cloneDeep(origFieldType);
      const origFieldTypeKeys = Object.keys(origFieldType);
      const newFieldTypeKeys = Object.keys(newFieldType);
      newFieldTypeKeys.forEach(async (key) =>
      {
        if (origFieldType[key] === undefined || this.getInnermostType(origFieldType[key]) === 'null')
        {
          returnFieldType[key] = newFieldType[key];
        }
        else if (this.getInnermostType(newFieldType[key]) !== 'null') // both exist and they may not be the same
        {
          returnFieldType[key] = await this._chooseBestType([origFieldType[key], newFieldType[key]]);
        }
      });
      const keysInOrigNotInNewFieldType: any[] = _.xor(_.intersection(origFieldTypeKeys, newFieldTypeKeys), origFieldTypeKeys);
      keysInOrigNotInNewFieldType.forEach((key) =>
      {
        returnFieldType[key] = origFieldType[key];
      });
      return resolve(returnFieldType);
    });
  }

  private _getJSONFromCSV(chunk: string): string // NOT BEING USED ATM
  {
    const csvRows: any = csvString.parse(chunk);
    if (Array.isArray(csvRows))
    {
      for (let rowIndex = 0; rowIndex < csvRows.length; ++rowIndex)
      {
        for (let colIndex = 0; colIndex < csvRows[rowIndex].length; ++colIndex)
        {
          try
          {
            csvRows[rowIndex][colIndex] = JSON.parse(csvRows[rowIndex][colIndex]);
          }
          catch (e)
          {
            // do nothing
          }
        }
      }
    }
    return csvString.stringify(csvRows);
  }

  private async _getFieldTypeFromChunk(chunk: string): Promise<object | string>
  {
    return new Promise<object | string>(async (resolve, reject) =>
    {
      if (chunk === undefined || chunk.length === 0)
      {
        return resolve('');
      }
      const parsedLines: object[] = await this._getJSONFromMySQLJSON(chunk);
      if (parsedLines.length === 1) // TODO: allow type detection from multiple lines
      {
        const anything = await this.getFullTypeFromDocument(parsedLines[0]);
        return resolve(anything);
      }
    });
  }

  private async _getJSONFromMySQLJSON(chunk: string): Promise<object[]>
  {
    return new Promise<object[]>(async (resolve, reject) =>
    {
      try
      {
        const returnArr: object[] = [];
        const csvRows: any = csvString.parse(chunk);
        if (Array.isArray(csvRows))
        {
          for (let rowIndex = 0; rowIndex < csvRows.length; ++rowIndex)
          {
            if (Array.isArray(csvRows[rowIndex]) && csvRows[rowIndex].length > 0)
            {
              try
              {
                JSON.parse(csvRows[rowIndex][0]);
                returnArr.push(csvRows[rowIndex][0]);
              }
              catch (e)
              {
                // do not push this line
              }
            }
          }
        }
        return resolve(returnArr);

      }
      catch (e)
      {
        // winston.info('Error occurred while parsing: ' + (e.message as any).toString());
        return resolve([]);
      }
    });
  }

  private _convertToJSONFormat(chunk: string): string
  {
    if (!(chunk.indexOf('"') === 0 && chunk.lastIndexOf('"') === chunk.length - 1))
    {
      return chunk;
    }
    else
    {
      return chunk.substring(1, chunk.length - 1).replace(/''/g, '\'').replace(/""/g, '"');
    }
  }

  private _replaceNullWithText(fieldObj: object): object
  {
    if (typeof fieldObj === 'object' && fieldObj !== null && fieldObj['type'] === 'null')
    {
      fieldObj['type'] = 'text';
      return fieldObj;
    }
    else
    {
      Object.keys(fieldObj).forEach((key) =>
      {
        if (typeof fieldObj[key] === 'object' && fieldObj[key] !== null)
        {
          fieldObj[key] = this._replaceNullWithText(fieldObj[key]);
        }
      });
    }
    return fieldObj;
  }
}

export default FieldTypes;
