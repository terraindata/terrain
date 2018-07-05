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

import * as moment from 'moment';
import { InputConfig, InputFileTypes, InputOptionsType, InputTypes } from 'shared/etl/types/InputTypes';

export class Inputs
{
  public parseFilename(filenames, options)
  {
    let filenameWithoutInputs: string = '';
    return filenames.filter((filename) =>
    {
      let isValidFilename: boolean = true;
      if (Array.isArray(options['inputs']))
      {
        filenameWithoutInputs = options['filename'];
        options['inputs'].forEach((input: InputOptionsType<InputTypes>) =>
        {
          const wrappedName: string = '{{' + input.name + '}}';
          switch (input.type)
          {
            case InputFileTypes.Date:
              let nextIndexOf: number = filenameWithoutInputs.search(new RegExp(wrappedName, 'g'));
              while (nextIndexOf !== -1)
              {
                const matchedString: string = filename.substring(nextIndexOf, nextIndexOf + input.format.length);
                filenameWithoutInputs = filenameWithoutInputs.replace(new RegExp(wrappedName), '');
                if (typeof input['dayInterval'] === 'number'
                  && (moment(matchedString, input.format, true).isValid()))
                {
                  try
                  {
                    const matchedTime = moment(matchedString).valueOf();
                    if (isNaN(matchedTime))
                    {
                      isValidFilename = false;
                      break;
                    }
                    if (new Date().getTime() - input['dayInterval'] * 24 * 3600 * 1000
                      > matchedTime.valueOf())
                    {
                      isValidFilename = false;
                      break;
                    }
                  }
                  catch (e)
                  {
                    isValidFilename = false;
                    break;
                  }
                }
                else
                {
                  isValidFilename = false;
                  break;
                }
                nextIndexOf = filenameWithoutInputs.search(new RegExp(wrappedName, 'g'));
              }
              break;
            case InputFileTypes.Number:
              break;
            case InputFileTypes.Text:
              break;
            default:
              break;
          }
        });
      }
      return isValidFilename;
    });
  }

  public replaceInputs(origFilename: string, inputs: InputConfig[], inputIndex = 0): string[]
  {
    if (inputs == null || inputIndex === inputs.length)
    {
      return [origFilename];
    }
    const input: InputOptionsType<InputTypes> = inputs[inputIndex].options;
    const filenames = this.replaceInputs(origFilename, inputs, inputIndex + 1).reduce((acc, filename) =>
    {
      const wrappedName: string = '{{' + input.name + '}}';
      switch (input.type)
      {
        case InputFileTypes.Date:
          let date = moment();
          for (let i = 0; i <= input.dayInterval; i++)
          {
            let filename2 = filename;
            let nextIndexOf: number = filename2.search(new RegExp(wrappedName, 'g'));
            while (nextIndexOf !== -1)
            {
              filename2 = filename2.replace(new RegExp(wrappedName), date.format(input.format));
              nextIndexOf = filename2.search(new RegExp(wrappedName, 'g'));
            }
            acc.push(filename2);
            date = date.subtract(1, 'days');
          }
          return acc;
        default:
          return acc.concat([filename]);
      }
    }, []);
    return filenames;
  }
}

export default Inputs;
