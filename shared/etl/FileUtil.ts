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
// tslint:disable:no-var-requires strict-boolean-expressions

import * as _ from 'lodash';

import * as Papa from 'papaparse';
import { FileTypes } from './types/ETLTypes';

import { FileConfig } from 'shared/etl/types/EndpointTypes';
import Util from 'shared/Util';
import * as xlsx from 'xlsx';

export const mimeToFileType: { [k: string]: FileTypes } = {
  'text/csv': FileTypes.Csv,
  'application/json': FileTypes.Json,
  'application/xml': FileTypes.Xml,
  'text/xml': FileTypes.Xml,
  'text/tab-separated-values': FileTypes.Tsv,
  'text/tsv': FileTypes.Tsv,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': FileTypes.Xlsx,
};

export const fileTypeToMime = {
  [FileTypes.Csv]: 'text/csv',
  [FileTypes.Json]: 'application/json',
  [FileTypes.Xml]: 'text/xml',
  [FileTypes.Tsv]: 'text/tab-separated-values',
  [FileTypes.Xlsx]: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

export function getFileType(file: File): FileTypes
{
  const type = mimeToFileType[file.type];
  if (type !== undefined)
  {
    return type;
  }
  else
  {
    return FileTypes.Json;
  }
}

export function getMimeType(type: FileTypes): string
{
  const mime = fileTypeToMime[type];
  if (mime !== undefined)
  {
    return mime;
  }
  else
  {
    return 'application/json';
  }
}

export function getSampleRows(
  file: File,
  onLoad: (result) => void,
  onError?: (msg: string) => void,
  numRows?: number,
  opts?: {
    hasCsvHeader?: boolean;
    jsonNewlines?: boolean;
    xmlPath?: string;
  },
)
{
  const options = _.extend(
    {
      hasCsvHeader: true,
      jsonNewlines: false,
    },
    opts,
  );
  const fileType = getFileType(file);
  if (fileType === FileTypes.Csv || fileType === FileTypes.Tsv)
  {
    const handleError = (err) =>
    {
      if (onError)
      {
        onError(JSON.stringify(err));
      }
    };

    const handleResults = (results) =>
    {
      onLoad(results.data);
    };

    Papa.parse(file as any, {
      header: options.hasCsvHeader,
      preview: numRows != null ? numRows : 0,
      complete: handleResults,
      error: handleError,
      dynamicTyping: true,
      delimiter: fileType === FileTypes.Csv ? ',' : '\t',
    });
  }
  else if (fileType === FileTypes.Json)
  {
    const fileChunk = file.slice(0, ChunkSize);
    const fr = new FileReader();
    fr.onloadend = () =>
    {
      let items;
      try
      {
        items = options.jsonNewlines ?
          Util.json.parseNewlineJSON(fr.result, numRows)
          :
          Util.json.parseObjectListJSON(fr.result, numRows);
      }
      catch (e)
      {
        if (onError)
        {
          onError(`JSON Parse Caught an Exception: ${e}`);
        }
        return;
      }

      if (items == null || typeof items === 'string')
      {
        if (onError)
        {
          onError(`JSON Parse Failed: ${items}`);
        }
      }
      else
      {
        onLoad(items);
      }
    };
    fr.readAsText(fileChunk);
  }
  else if (fileType === FileTypes.Xml)
  {
    const fileChunk = file.slice(0, ChunkSize);
    const fr = new FileReader();
    fr.onloadend = () =>
    {
      Util.xml.parseXMLFile(
        fr.result,
        options.xmlPath,
        onLoad,
        onError,
      );
    };
    fr.readAsText(file.slice(0, ChunkSize));
  }
  else if (fileType === FileTypes.Xlsx)
  {
    const fr = new FileReader();
    fr.onloadend = () =>
    {
      const workbook = xlsx.read(fr.result, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = xlsx.utils.sheet_to_json(sheet);
      onLoad(json);
    };
    fr.readAsArrayBuffer(file);
  }
}
// TODO for json, use a streaming implementation

export function guessFileOptions(file: File): Promise<FileConfig>
{
  return new Promise<FileConfig>((resolve, reject) =>
  {
    const fileType = getFileType(file);
    const cfg: FileConfig = {
      fileType,
      hasCsvHeader: true,
      jsonNewlines: false,
      xmlPath: '',
    };
    guessJsonFileOptions(
      file,
      (result) =>
      {
        resolve(_.extend(cfg, result));
      },
    );
  });
}

export function guessJsonFileOptions(
  file: File,
  onComplete: (result: { jsonNewlines?: boolean }) => void,
)
{
  const fileChunk = file.slice(0, GuessChunkSize);
  const fr = new FileReader();
  fr.onloadend = () =>
  {
    onComplete({
      jsonNewlines: detectJsonNewlines(fr.result),
    });
  };
  fr.readAsText(fileChunk);
}

// reasonably accurate guess as to whether or not the file is a json array or a newline seperated list of objects
// returns true if the file represents newline seperated objects
function detectJsonNewlines(str): boolean
{
  const firstBrace = str.indexOf('{');
  const firstBracket = str.indexOf('[');
  if (firstBracket === -1)
  {
    return true;
  }
  else if (firstBrace === -1) // probably a plain array
  {
    return false;
  }
  else
  {
    return firstBrace < firstBracket;
  }
}
const GuessChunkSize = 1000; // 1kb
const ChunkSize = 1000000; // 1mb
