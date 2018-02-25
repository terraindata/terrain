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

// Yet another deep JSON getter/setter module

import {KeyPath, WayPoint} from './KeyPath';
// import isPrimitive = require('is-primitive');

export function find(obj: object, path: KeyPath, next: (found) => any, options: object = {}): void
{
    if (path.size === 0 || obj === undefined)
    {
        //console.log('obj:');
        //console.log(obj);
        obj = next(obj);
        //console.log(obj);
        return;
    }

    const waypoint: WayPoint = path.get(0);
    //console.log('waypoint');
    //console.log(waypoint);

    if (options['create'] === true)
    {
        if (typeof waypoint === 'string' && !obj.hasOwnProperty(waypoint as string))
        {
            obj[waypoint] = {};
        }
        else if (waypoint.constructor === Array && !obj.hasOwnProperty((waypoint as any[])[0]))
        {
            obj[(waypoint as any[])[0]] = [];
        }
    }

    if (obj.constructor === Array)
    {
        console.log('UNEXPECTED');
        obj = next(undefined);
        return;
    }

    const keys: string[] = Object.keys(obj);
    for (let i: number = 0; i < keys.length; ++i)
    {
        if (typeof waypoint === 'string' && keys[i] === waypoint)
        {
            if (path.size === 1)
            {
                //console.log('aaaaobj:');
                //console.log(obj);
                obj[keys[i]] = next(obj[keys[i]]);
                //console.log(obj);
                return;
            }else
                return find(obj[keys[i]], path.shift(), next);
        }
        else if (waypoint.constructor === Array && keys[i] === waypoint[0])
        {
            let lastNestedArray = obj[keys[i]];
            const recall: any[] = [...waypoint];
            let spliced: number = 0;

            while(waypoint.length > 1)
            {
                let firstWildcard = (waypoint as any[]).indexOf('*');
                if(firstWildcard === 1)
                {
                    //(waypoint as any[]).splice(1, 1);
                    //console.log('waypoint:');
                    //console.log(waypoint);
                    const results: any[] = [];
                    for (let j: number = 0; j < lastNestedArray.length; j++)
                    {
                        //console.log('waypoint: ');
                        //console.log(waypoint);
                        //const recall = [...waypoint];
                        //console.log('HAHA');
                        //console.log(lastNestedArray[j]);
                        //console.log(path.set(0, waypoint));
                        recall[spliced + firstWildcard] = j.toString();
                        // waypoint cloned here
                        let newPath = waypoint.length === 1 ? path.shift() : path.set(0, [...recall]);
                        //console.log('newpath ');
                        //console.log(newPath);
                        find(obj, newPath, (found) => {
                            //console.log('rj = ');
                            //console.log(found);
                            results[j] = found;
                            next(found);
                        });
                        //console.log('recall: ');
                        //console.log(recall);
                        //waypoint = recall;
                    }
                    //console.log('r here:');
                    //console.log(results);
                    obj = next(results);
                    return;
                }
                else
                {
                    if((waypoint as any[]).length === 2){
                        lastNestedArray[waypoint[1]] = next(lastNestedArray[waypoint[1]]);
                        return;
                    }else {
                        lastNestedArray = lastNestedArray[waypoint[1]];
                        (waypoint as any[]).splice(1, 1);
                        spliced++;
                    }
                }
            }

            //console.log('lastNestedArray:');
            //console.log(lastNestedArray);

            return find(lastNestedArray, path.shift(), next);
        }
    }

    return next(undefined);
}

export function get(obj: object, path: KeyPath): any
{
  // console.log('obj, path:');
  // console.log(obj);
  // console.log(path);
    let result: any;
    find(obj, path, (found) => {
        result = found;
        return found;
    });
    //console.log('result:');
    //console.log(result);
    return result;
}

export function set(obj: object, path: KeyPath, value: any, options: object = {}): any
{
    //let result = obj;
    find(obj, path, (found) => {
        return value;
    }, options);
    //return result;
}
