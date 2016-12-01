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

class ColorManager
{
  private static COLORS =
  [
    '#00A7F7',
    '#00BCD6',
    '#009788',
    '#48B14B',
    '#8AC541',
    '#CCDD1F',
    '#FFEC18',
    '#FFC200',
    '#FF9900',
    '#5F7D8C',
  ];
  
  private static DARKER_COLORS =
  [
    '#00809a',
    '#009086',
    '#007455',
    '#32882f',
    '#609728',
    '#8eaa13',
    '#b2b50f',
    '#b29500',
    '#b27500',
    '#426057',
  ];
  
  private static keyToIndex: { [s: string]: number; } = {};
  
  private static secondaryKeyToKey: { [s: string]: string; } = {};
  
  private static keyToSecondaryKey: { [s: string]: string; } = {};
  
  private static currentIndex: number = 0;
  
  private static readIndexForKey(key: string): number
  {
    if(this.keyToIndex[key] !== undefined)
    {
      return this.keyToIndex[key];
    }
    
    if(this.secondaryKeyToKey[key])
    {
      return this.keyToIndex[this.secondaryKeyToKey[key]];
    }
    
    return null;
  }
  
  // Returns the color for the given key
  //  if no color has been assigned to that key yet,
  //  it will assign a color to that key, and also map
  //  the secondaryKey passed to that key
  // Limit of one secondaryKey per Key
  private static indexForKey(key: string, secondaryKey?: string): number
  {
    if(this.keyToIndex[key] !== undefined)
    {
      if(secondaryKey && this.keyToSecondaryKey[key] !== secondaryKey)
      {
        if(this.keyToSecondaryKey[key])
        {
          // have to remove the old copy
          delete this.secondaryKeyToKey[this.keyToSecondaryKey[key]];
        }
        
        this.keyToSecondaryKey[key] = secondaryKey;
        this.secondaryKeyToKey[secondaryKey] = key;
      }
      
      return this.keyToIndex[key];
    }
    
    // Insert
    this.keyToIndex[key] = (this.currentIndex ++) % this.COLORS.length;
    if(secondaryKey)
    {
      this.keyToSecondaryKey[key] = secondaryKey;
      this.secondaryKeyToKey[secondaryKey] = key;
    }
    
    return this.keyToIndex[key];
  }
  
  
  // Public
  
  static colorForKey(key: string, secondaryKey?: string): string
  {
    return this.COLORS[this.indexForKey(key, secondaryKey)];
  }
  
  static darkerColorForKey(key: string, secondaryKey?: string): string
  {
    return this.DARKER_COLORS[this.indexForKey(key)];
  }
  
  static readColorForKey(key: string)
  {
    var index = this.readIndexForKey(key);
    if(index === null)
    {
      return null;
    }
    
    return this.COLORS[index];
  }
  
  static readDarkerColorForKey(key: string)
  {
    var index = this.readIndexForKey(key);
    if(index === null)
    {
      return null;
    }
    
    return this.COLORS[index];
  }
  
}

export default ColorManager;