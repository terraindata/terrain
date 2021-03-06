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

import PrefixedElasticClient from './client/PrefixedElasticClient';
import ElasticConfig from './ElasticConfig';
import ElasticController from './ElasticController';

class PrefixedElasticController extends ElasticController
{
  private indexPrefix: string;

  constructor(config: ElasticConfig, id: number, name: string, analyticsIndex?: string, analyticsType?: string, indexPrefix?: string)
  {
    super(config, id, name, analyticsIndex, analyticsType, PrefixedElasticClient);

    this.indexPrefix = (indexPrefix == null ? '' : indexPrefix);
  }

  public getIndexPrefix(): string
  {
    return this.indexPrefix;
  }

  public prependIndexParam(obj, allowNoIndex = true): void
  {
    if (!('index' in obj))
    {
      if (allowNoIndex)
      {
        obj.index = this.getIndexPrefix() + '*';
        // by default ES only expands the wildcard to the open indices.
        // see the [expandWildcards = open] (https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html)
        if (obj.hasOwnProperty('expandWildcards'))
        {
          obj.expandWildcards = 'all';
        }
      }
      else
      {
        throw new Error('No index');
      }
    }
    else if (typeof obj.index === 'string')
    {
      obj.index = this.getIndexPrefix() + (obj.index as string);
    }
    else if (obj.index.constructor === Array)
    {
      obj.index = obj.index.map((s) =>
      {
        if (typeof s !== 'string')
        {
          throw new Error('Invalid index param');
        }
        return this.getIndexPrefix() + s;
      });
    }
    else
    {
      throw new Error('Invalid index param');
    }
  }

  public prependIndexTerm(obj): void
  {
    if (!('_index' in obj))
    {
      throw new Error('No _index term');
    }
    else if (typeof obj._index === 'string')
    {
      obj._index = this.getIndexPrefix() + (obj._index as string);
    }
    else
    {
      throw new Error('Invalid _index term');
    }
  }

  public removeIndexPrefix(index: string): string
  {
    if (index.startsWith(this.getIndexPrefix()))
    {
      return index.substring(this.getIndexPrefix().length);
    }
    else
    {
      throw new Error(`Index name "${index}" is missing prefix "${this.getIndexPrefix()}"`);
    }
  }

  public removeDocIndexPrefix(obj): void
  {
    obj._index = this.removeIndexPrefix(obj._index);
  }
}

export default PrefixedElasticController;
