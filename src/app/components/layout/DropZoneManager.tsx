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

import * as $ from 'jquery';
import * as _ from 'underscore';

export interface DropZone
{
  id: string;
  element: Element;
  onDragOver: (dragData: any, x: number, y: number, draggingElement?: Element) => void;
  onDragOut: () => void;
  onDrop: (dragData: any, x: number, y: number, draggingElement?: Element) => void;
  clientRect?: ClientRect;
}

export class DropZoneManager
{
  private static zones: {[id: string]: DropZone} = {}; // in the future, consider an optimized data structure
  
  private static lastZoneID: string = null;
  
  
  private static findZone(x: number, y: number): DropZone
  {
    return _.reduce(this.zones, (targetZone: DropZone, zone: DropZone, id: string): DropZone =>
      {
        var cr = zone.element.getBoundingClientRect();
        
        if(cr.bottom >= y && cr.top <= y && cr.left <= x && cr.right >= x)
        {
          if(targetZone)
          {
            var tcr = targetZone.element.getBoundingClientRect();
            if(tcr.width * tcr.height < cr.width * cr.height)
            {
              // targetZone is smaller and thus more constrainging, return it still
              return targetZone;
            }
          }
          
          return zone;
        }
        
        return targetZone;
      }, null);
  }
  
  private static dragDrop(x: number, y: number, dragData: any, drop: boolean, draggingElement: Element)
  {
    $('.drag-over').removeClass('drag-over');
    
    var targetZone = this.findZone(x, y);
    
    if(this.lastZoneID && (!targetZone || targetZone.id !== this.lastZoneID))
    {
      this.zones[this.lastZoneID].onDragOut();
    }
    
    if(targetZone)
    {
      if(!drop)
      {
        this.lastZoneID = targetZone.id;
        $(targetZone.element).addClass('drag-over');
      }
      
      targetZone[drop ? 'onDrop' : 'onDragOver'](dragData, x, y, draggingElement);
    } 
    
    if(!targetZone || drop)
    {
      this.lastZoneID = null;
    }
  }
  
  // Public
  
  static isDragging: boolean = false;
  
  static register(id: string, zone: DropZone)
  {
    var zones = this.zones;
    
    if(zones[id])
    {
      console.error('Already registered a zone for id ' + id);
    }
    
    if(!zone.id || zone.id !== id)
    {
      zone.id = id;
    }
    
    zones[id] = zone;
  }
  
  static deregister(id: string)
  {
    var zones = this.zones;
    if(!zones[id])
    {
      console.error('No zone registered for id ' + id);
    }
    delete zones[id];
  }
  
  // TODO consider a startDrag method that precomputes clientRects
  
  static drag(x: number, y: number, dragData: any, draggingElement: Element)
  {
    this.isDragging = true;
    this.dragDrop(x, y, dragData, false, draggingElement);
  }
  
  static drop(x: number, y: number, dragData: any, draggingElement: Element)
  {
    this.isDragging = false;
    this.dragDrop(x, y, dragData, true, draggingElement);
  }
  
}

export default DropZoneManager;