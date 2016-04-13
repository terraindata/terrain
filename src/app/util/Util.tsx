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
import * as React from 'react';
import * as ReactDOM from "react-dom";
import * as Immutable from "immutable";
var _ = require('underscore');

import { CardModels } from './../models/CardModels.tsx';

var immutableCardsUpdateHelper = (node: any, keyToUpdate: string, id: string, updater: (node: any, key: string) => any) =>
{
  if(node.get('id') === id)
  {
    return node.update(keyToUpdate, (node: any) => updater(node, keyToUpdate));
  }
  
  node = node.map((value, key) => !Immutable.Iterable.isIterable(value) ? value :
    immutableCardsUpdateHelper(value, keyToUpdate, id, updater)
  );
  
  return node;
}

var immutableCardsUpdate = 
  (state: any, keysToUpdate: string | string[], id: string, updater: (node: any, key: string) => any) => {
    if(typeof keysToUpdate === "string")
    {
      keysToUpdate = [keysToUpdate as string];
    }
    return state.update('algorithms', algorithms => algorithms.map((algorithm) => 
      (keysToUpdate as string[]).reduce(
        (algorithm, keyToUpdate) => immutableCardsUpdateHelper(algorithm, keyToUpdate, id, updater)
      , algorithm)));
  }

var Util = {
	// Return a random integer [min, max)
	// assumes min of 0 if not passed.
	randInt(...args: number[]): number 
	{
		var min:number = arguments[0], max:number = arguments[1];
		if(arguments.length === 1) {
			min = 0;
			max = arguments[0];
		}

		return Math.floor(Math.random() * (max - min)) + min;
	},
  
  rel(target): string
  {
    return ReactDOM.findDOMNode(target).getAttribute('rel');
  },
  
  titleForCard(card: CardModels.ICard): string
  {
    var title = card.type.charAt(0).toUpperCase() + card.type.substr(1);
    if(card.type === 'parentheses')
    {
      title = '( )';
    }
    
    return title;
  },
  
  // corrects a given index so that it is appropriate
  //  to pass into a `splice` call
  spliceIndex(index: number, array: any[]): number
  {
    if(index === undefined || index === null || index === -1)
    {
      if(Immutable.Iterable.isIterable(array))
      {
        return array['size'];
      }
      return array.length;
    }
    
    return index;
  },
  
  immutableMove: (arr: any, id: any, index: number) => {
    var curIndex = arr.findIndex((obj) => 
      (typeof obj.get === 'function' && (obj.get('id') === id))
      || (obj.id === id));
    var obj = arr.get(curIndex);
    arr = arr.delete(curIndex);
    return arr.splice(index, 0, obj);
  },
  
  immutableCardsUpdate: immutableCardsUpdate,

	isInt(num): boolean
	{
		return num === parseInt(num, 10);
	},

	isArray(arr: any): boolean
	{
		return arr.length !== undefined;
	},

	parentNode(reactNode): Node
	{
		return ReactDOM.findDOMNode(reactNode).parentNode;
	},

	valueMinMax(value: number, min: number, max: number)
	{
		return Math.min(Math.max(value, min), max);
	},
  
  deeperCloneArr(obj): any
  {
    return _.map(obj, _.clone);
  },
  
  deeperCloneObj(obj): any
  {
    var ans = {}
    _.map(obj, (val, key) => ans[key] = _.clone(val));
    return ans;
  },
  
  animateToHeight(node, height: number, onComplete?): void
  {
    var el = $(node);
    var curHeight = el.height();

    el.css('overflow', 'hidden');
    el.height(curHeight).animate({ height: height }, 250, () => {
      onComplete && onComplete(); 
    }); 
  },
  
  animateToAutoHeight(node, onComplete?): void
  {
    var el = $(node);
    var curHeight = el.height();
    var autoHeight = el.css('height', 'auto').height();

    el.height(curHeight).animate({ height: autoHeight }, 250, function() {
      el.css('height', 'auto'); 
      el.css('overflow', 'visible');
      onComplete && onComplete();
    });
  },
  
  
  bind(component: React.Component<any, any>, ...args: any[])
  {
    var fields: any[] = args;
    if(typeof fields[0] === 'object')
    {
      fields = fields[0];
    }
    
    fields.map((field) => component[field] = component[field].bind(component));
  },
  
  throttle(component: React.Component<any, any>, fields: string[], rate)
  {
    // For throttling methods on a react component
    // see: http://stackoverflow.com/questions/23123138/perform-debounce-in-react-js
    fields.map((field) => {
      component['_throttled_' + field] = _.throttle(component[field], 1000);
      component[field] = (event) => {
        if(event && typeof event.persist === 'function')
        {
          // must call persist to keep the event around
          // see: http://stackoverflow.com/questions/23123138/perform-debounce-in-react-js/24679479#24679479
          event.persist();
        }
        component['_throttled_' + field](event);
      }
    });
  },


 // TODO remove
	operatorToString(operator: string): string
	{
		switch(operator) {
			case 'eq':
				return '=';
			case 'ge':
				return '≥';
			case 'gt':
				return '>';
			case 'le':
				return '≤';
			case 'lt':
				return '<';
   case 'in':
    return 'in';
			case 'ne':
				return '≠';
		}

		console.log('Not a valid operator: ' + operator);

		return "";
	},

	// accepts object of key/vals like this: { 'className': include? }
	objToClassname(obj: { [className: string]: boolean }): string
	{
		return _.reduce(obj, (classNameArray: string[], include: boolean, className: string) => {
				if(include)
				{
					classNameArray.unshift(className);
				}
				return classNameArray;
			}, []).join(" ");
	},
  
   
  cardIndex: (cards, action) =>
  {
    return cards.findIndex(card => card.get('id') === action.payload.card.id);
  },

  // returns a reducing function that updates the given field with the fieldUpdater
  //  fieldUpdater gets passed (fieldObject, action)
  updateCardField: (field: string, fieldUpdater: (node: any, action: any) => any) =>
    (state, action) =>
      Util.immutableCardsUpdate(state, field, action.payload.card.id,
        (fieldObj) => fieldUpdater(fieldObj, action)),
  
  // Given a function that takes an action and generates a map
  //  of field => value pairings,
  //  returns a reducer that
  //  finds the card specified in an action and sets
  //  the values of the fields specified in the map
  // note: outdated and unused
  // updateCardFields: (fieldMapFactory: (action: any) => {[field: string]: any}) =>
  //   (state, action) =>
  //     state.updateIn([action.payload.card.parentId, 'cards'], (cards) =>
  //       cards.updateIn([cards.findIndex(card => card.get('id') === action.payload.card.id)], 
  //         card => 
  //           _.reduce(fieldMapFactory(action), (card, value, field) =>
  //             card.set(field, value)
  //           , card)
  //         )
  //       ),
  
  // Given an array of strings representing fields on a card, 
  //  returns a reducer that
  //  finds the card specified in an action and sets
  //  the value of the fields specified to the values
  //  of the matching fields in the action's payload.
  setCardFields: (fields: string[]) =>
    (state, action) =>
      Util.immutableCardsUpdate(state, fields, action.payload.card.id, 
        (fieldVal, field) => Immutable.fromJS(action.payload[field])),
  
  populateTransformDummyData(transformCard)
  {
    transformCard.range = transformCard.range || [];
    transformCard.bars = transformCard.bars || [];
    transformCard.scorePoints = transformCard.scorePoints || [];
    
    if(transformCard.range.length === 0)
    {
      switch(transformCard.input) 
      {
        case 'sitter.minPrice':
          transformCard.range = [12, 26];
          break;
        // more defaults can go here
        case 'sitter.numJobs':
          transformCard.range = [0,100];
          break;
        default:
          transformCard.range = [0,100];
      }
    }
    
    var outliers = transformCard.range[1] >= 1000;
    
    if(transformCard.bars.length === 0)
    {
      // Create dummy data for now
      
      var counts = [];
      var count: any;
      var sum = 0;
      var upperEnd = transformCard.range[1];
      if(outliers) upperEnd /= 10;
      for(var i = transformCard.range[0]; i <= upperEnd; i ++)
      {
        count = Util.randInt(3000);
        counts.push(count);
        sum += count;
      }
      
      if(outliers) {
        for(var i:any = upperEnd + 1; i < transformCard.range[1]; i ++)
        {
           count = 1; //Util.randInt(2);
           counts.push(count);
           sum += count;   
        }
        
        for(var i:any = upperEnd * 9; i < transformCard.range[1]; i ++)
        {
           count = Util.randInt(200);
           counts.push(count);
           sum += count;   
        }
      }
      
      for(var i:any = transformCard.range[0]; i <= transformCard.range[1]; i ++)
      {
        var count: any = counts[i - transformCard.range[0]];
        if(isNaN(count))
          count = 0;
        transformCard.bars.push({
          count: count,
          percentage: count / sum,
          range: {
            min: i,
            max: i + 1,
          },
          id: "a4-" + i,
        });
      }
    }
    
    if(transformCard.scorePoints.length === 0)
    {
      for(var i:any = 0; i < 5; i ++)
      {
        transformCard.scorePoints.push(
        {
          value: transformCard.range[0] + (transformCard.range[1] - transformCard.range[0]) / 4 * i,
          score: 0.5,
          id: "p" + i,
        });
      }
    }
  },
};

export default Util;