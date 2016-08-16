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
import * as _ from 'underscore';

import BrowserTypes from './../browser/BrowserTypes.tsx';

import { BuilderTypes } from './../builder/BuilderTypes.tsx';
const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
var immutableCardsUpdateHelper = (node: any, keyToUpdate: string | string[], id: string, updater: (node: any, key: string | string[]) => any) =>
{
  if(node.get('id') === id)
  {
    if(typeof keyToUpdate === 'string')
    {
      return node.update(keyToUpdate, (node: any) => updater(node, keyToUpdate));
    }
    else
    {
      if(node.getIn(keyToUpdate) === undefined)
      {
        console.log('Potential warning: you are setting a value at a keyPath that had an undefined value.', keyToUpdate, node.toJS());
      }
      return node.updateIn(keyToUpdate, (node: any) => updater(node, keyToUpdate));
    }
  }
  let keys = node.keys();
  var iterator = keys.next();
  while(!iterator.done) //node.each((value, key) => // used `map` this way because `map` returns `undefined` for Immutable records
  {
    let key = iterator.value;
    let value = node.get(key);
    if(Immutable.Iterable.isIterable(value))
    {
      node = node.set(key, immutableCardsUpdateHelper(value, keyToUpdate, id, updater));
    }
    iterator = keys.next();
  };
  
  return node;
}

var immutableCardsUpdate = 
  (state: any, keysToUpdate: string | string[], id: string, updater: (node: any, key: string) => any) => {
    if(typeof keysToUpdate === "string")
    {
      keysToUpdate = [keysToUpdate as string];
    }
    return state.update('queries', algorithms => algorithms.map((algorithm) => {
      var a = (keysToUpdate as string[]).reduce(
        (algorithm, keyToUpdate) => immutableCardsUpdateHelper(algorithm, keyToUpdate, id, updater)
      , algorithm);
      return a;
    }));
  };

var immutableCardsSetIn = 
  (state: any, id: string, keyPath: string[], value) => {
    return state.update('queries', algorithms => 
      immutableCardsUpdateHelper(algorithms, keyPath, id,
        (n) => Immutable.fromJS(value))
  )};

var keyPathForId = (node: any, id: string) =>
  {
    if(node.get('id') === id)
    {
      return true;
    }
    
    return node.reduce((keyPath, value, key) =>
    {
      if(keyPath)
      {
        return keyPath;
      }
      
      if(Immutable.Iterable.isIterable(value))
      {
        var kp = keyPathForId(value, id);
        if(kp)
        {
          return ([key]).concat(kp === true ? [] : kp);
        }
      }
    }, false);
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
  
  asJS(obj:any)
  {
    if(obj && typeof obj.toJS === 'function')
    {
      return obj.toJS();
    }
    return obj;
  },
  
  // TODO remove
  // constructs appropriate object for instantiating a record-class
  //  with a keypath formed from the action
  // kp(action)
  // {
    
  // },
  
  haveRole(groupId: ID, role: string, UserStore, RolesStore)
  {
    let me = UserStore.getState().get('currentUser');
    if(!me)
    {
      return false;
    }
    
    return !! RolesStore.getState().getIn([groupId, me.username, role]);
  },
  
  canEdit(item: BrowserTypes.Variant | BrowserTypes.Algorithm | BrowserTypes.Group, UserStore, RolesStore)
  {
    let me = UserStore.getState().get('currentUser');
    if(!me)
    {
      return false;
    }
    if(item.type === 'group' && me.isAdmin)
    {
      return true;
    }
    
    let groupId = item.type === 'group' ? item.id : item['groupId'];
    let role = item.type === 'group' ? 'admin' : 'builder';
    return !! Util.haveRole(groupId, role, UserStore, RolesStore);
  },
  
  getId(): ID
  {
    // TODO have this fetch a list of IDs from server,
    // give IDs from that list
    return _.range(0, 5).map(i => chars[Util.randInt(chars.length)]).join("");
  },
  
  extendId(obj: Object): Object
  {
    return _.extend({}, { id: Util.getId() }, _.omit(obj, value => value === undefined));
  },
  
  moveIndexOffset(index: number, newIndex: number): number
  {
    return index < newIndex ? -1 : 0;
  },
  
  setValuesToKeys(obj: any, prefix: string)
  {
    prefix = prefix + (prefix.length > 0 ? '.' : '');
    for(var key in obj)
    {
      var value = prefix + key;
      if(typeof obj[key] === 'string')
      {
        obj[key] = value;
      }
      else if(typeof obj[key] === 'object')
      {
        Util.setValuesToKeys(obj[key], value);
      }
      else
      {
        throw "Value found in ActionTypes that is neither string or object of strings: key: " + key + ", value: " + obj[key];
      }
    }
  },
  
  rel(target): string
  {
    return Util.attr(target, 'rel');
  },
  
  attr(target, key: string): string
  {
    return ReactDOM.findDOMNode(target).getAttribute(key);
  },
  
  titleForCard(card: BuilderTypes.ICard): string
  {
    return Util.titleForCardType(card.type);
  },
  
  titleForCardType(type: string): string
  {
    var title = type.charAt(0).toUpperCase() + type.substr(1);
    if(type === 'parentheses')
    {
      title = '( )';
    }
    if(type === 'sfw')
    {
      title = 'Select From Where';
    }
    if(type === 'sort')
    {
      title = 'Order By';
    }
    if(type === 'filter')
    {
      title = 'Compare';
    }
    
    return title;
  },
  
  previewForCard(card: BuilderTypes.ICard): string
  {
    if(!card)
    {
      return 'No cards';
    }
    
    switch(card.type)
    {
      case 'from':
        return card['group'] + ' as ' + card['iterator'];
      case 'select':
        return card['properties'].length + ' propert' + (card['properties'].length !== 1 ? 'ies' : 'y');
      case 'sort':
        return card['sorts'].length ? card['sorts'][0]['property'] : '';
      case 'filter':
        return card['filters'].length + ' condition' + (card['filters'].length === 1 ? '' : 's');
      case 'let':
      case 'var':
        return card['field'];
      case 'score':
        return card['weights'].length + ' factor' + (card['weights'].length === 1 ? '' : 's');
      case 'transform':
        return card['input'];
      case 'if':
        return card['filters'].length + ' condition' + (card['filters'].length === 1 ? '' : 's');
      case 'parentheses':
      case 'min':
      case 'max':
      case 'avg':
      case 'count':
      case 'exists':
      case 'sum':
        return Util.previewForCard(card['cards'][0]);
      case 'skip':
      case 'take':
        return card['value'];
    }
    return '';
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
  immutableCardsSetIn: immutableCardsSetIn,
  keyPathForId: keyPathForId,

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
    transformCard.range = transformCard.range || [0,100];
    transformCard.bars = transformCard.bars || [];
    transformCard.scorePoints = transformCard.scorePoints || [];
    
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