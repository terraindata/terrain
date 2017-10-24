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

export default class ESQueryTransform
{
  public static upgradeRoot(theRootValue: any,
    theIndex: string | null, theType: string | null,
    theFrom: number | null, theSize: number | null): any
  {
    const rootvalue = Object.assign({}, theRootValue);
    const filterArray = [];
    if (theIndex !== null)
    {
      filterArray.push(
        {
          term: {
            _index: theIndex,
          },
        },
      );
    }
    if (theType !== null)
    {
      filterArray.push(
        {
          term: {
            _type: theType,
          },
        },
      );
    }

    if (rootvalue.body)
    {
      // insert the from and size if there is no from and size
      if (theFrom !== null && rootvalue.body['from'] === undefined)
      {
        rootvalue.body['from'] = theFrom;
      }
      if (theSize !== null && rootvalue.body['size'] === undefined)
      {
        rootvalue.body['size'] = theSize;
      }

      if (rootvalue.body.query)
      {
        if (rootvalue.body.query.bool)
        {
          if (rootvalue.body.query.bool.filter)
          {
            if (rootvalue.body.query.bool.filter instanceof Array)
            {
              // filter is an array
              // TODO: Check whether the current filters already have same _index and _type filters.
              rootvalue.body.query.bool.filter = rootvalue.body.query.bool.filter.concat(filterArray);
            } else
            {
              // filter is an object
              const currentFilter = rootvalue.body.query.bool.filter;
              filterArray.push(currentFilter);
              rootvalue.body.query.bool.filter = filterArray;
            }
          } else
          {
            // no filter, but has bool
            const boolQuery = rootvalue.body.query.bool;
            boolQuery['filter'] = filterArray;
          }
        } else
        {
          // no bool, but has query
          const currentQuery = rootvalue.body.query;
          rootvalue.body.query = {
            bool: {
              filter: filterArray,
              must: [currentQuery],
            },
          };
        }
      } else
      {
        // no query
        rootvalue.body['query'] = {
          bool: {
            filter: filterArray,
          },
        };
      }
    } else
    {
      // no body at all
      const bodyValue =
        {
          query: {
            bool: {
              filter: filterArray,
            },
          },
        };
      if (theFrom !== null)
      {
        bodyValue['from'] = theFrom;
      }
      if (theSize !== null)
      {
        bodyValue['size'] = theSize;
      }

      rootvalue['body'] = bodyValue;
    }
    return { body: rootvalue['body'] };
  }
}
