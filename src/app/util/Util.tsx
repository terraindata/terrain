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

// tslint:disable:restrict-plus-operands radix strict-boolean-expressions no-var-requires no-unused-expression forin no-shadowed-variable max-line-length
import * as $ from 'jquery';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
// import * as moment from 'moment';
const moment = require('moment');
import * as Immutable from 'immutable';
import * as _ from 'lodash';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
const suffixes = ['', ' k', ' M', ' B'];

const keyPathForId = (node: any, id: string): (Array<string | number> | boolean) =>
{
  if (node.get('id') === id)
  {
    return true;
  }

  return node.reduce((keyPath, value, key) =>
  {
    if (keyPath)
    {
      return keyPath;
    }

    if (Immutable.Iterable.isIterable(value))
    {
      const kp = keyPathForId(value, id);
      if (kp)
      {
        return ([key]).concat(kp === true ? [] : kp);
      }
    }
  }, false);
};

const Util = {
  // Return a random integer [min, max)
  // assumes min of 0 if not passed.
  randInt(...args: number[]): number
  {
    let min: number = arguments[0];
    let max: number = arguments[1];
    if (arguments.length === 1)
    {
      min = 0;
      max = arguments[0];
    }

    return Math.floor(Math.random() * (max - min)) + min;
  },

  moment(str: string)
  {
    return moment(new Date(str));
  },

  asJS(obj: any)
  {
    if (obj && typeof obj.toJS === 'function')
    {
      return obj.toJS();
    }
    return obj;
  },

  addBeforeLeaveHandler(handler: () => void)
  {
    if (!window['beforeLeaveHandlers'])
    {
      window['beforeLeaveHandlers'] = [];
    }
    window['beforeLeaveHandlers'].push(handler);
  },

  executeBeforeLeaveHandlers()
  {
    window['beforeLeaveHandlers'] &&
      window['beforeLeaveHandlers'].map(
        (fn) => fn && fn(),
      );
  },

  haveRole(groupId: ID, role: string, UserStore, RolesStore)
  {
    return true;
    // const me = UserStore.getState().get('currentUser');
    // if (!me)
    // {
    //   return false;
    // }

    // return !! RolesStore.getState().getIn([groupId, me.id, role]);
  },

  duplicateNameFor(name: string): string
  {
    if (Util.stringIsNumber(name.charAt(name.length - 1)))
    {
      let strNum = '';
      while (Util.stringIsNumber(name.charAt(name.length - 1)))
      {
        strNum = name.charAt(name.length - 1) + strNum;
        name = name.substr(0, name.length - 1);
      }

      return name + ((+strNum) + 1);
    }
    else
    {
      return name + ' 2';
    }
  },

  stringIsNumber(str: string): boolean
  {
    return str && str !== ' ' && !Number.isNaN(+str);
  },

  canEdit(item: { type: string, id: ID }, UserStore, RolesStore)
  {
    const me = UserStore.getState().get('currentUser');
    if (!me)
    {
      return false;
    }
    if (item.type === 'group' && me.isAdmin)
    {
      return true;
    }

    const groupId = item.type === 'group' ? item.id : item['groupId'];
    if (Util.haveRole(groupId, 'admin', UserStore, RolesStore))
    {
      return true;
    }

    if (item.type !== 'group')
    {
      return Util.haveRole(groupId, 'builder', UserStore, RolesStore);
    }

    return false;
  },

  mapEnum(_enum: any, fn: (e: string) => any)
  {
    const ans = [];
    for (const item in _enum)
    {
      if (_enum.hasOwnProperty(item) && /^\d+$/.test(item))
      {
        ans.push(fn(item));
      }
    }
    return ans;
  },

  // for displaying in the app
  formatDate(date: string): string
  {
    const then = moment(date);
    const now = moment();

    if (then.format('MMMM Do YYYY') === now.format('MMMM Do YYYY'))
    {
      // it was today
      const hour = then.format('h:mma');
      return 'Today, ' + hour;
    }

    if (then.format('YYYY') === now.format('YYYY'))
    {
      // same year
      return then.format('MM/DD/YY');
    }

    return then.format('MM/DD/YY');
  },

  roundNumber(num, decimalPoints)
  {
    if (decimalPoints <= 0)
    {
      return parseInt(num, 10);
    }

    return Math.round(num * Math.pow(10, decimalPoints)) / Math.pow(10, decimalPoints);
  },

  exportToCSV(data: Array<Array<string | number>>, fileName: string)
  {
    // from http://stackoverflow.com/questions/14964035/how-to-export-javascript-array-info-to-csv-on-client-side
    let csvContent = 'data:text/csv;charset=utf-8,';
    data.forEach((infoArray, index) =>
    {
      const dataString = infoArray.join(',');
      csvContent += index < data.length ? dataString + '\n' : dataString;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', fileName + '.csv');
    document.body.appendChild(link); // Required for FF
    link.click();
    link.remove();
  },

  assertKeysArePresent(first, second, errorMsg: string, oneWay?: boolean)
  {
    _.map(first,
      (v, key: string) =>
      {
        if (!second[key])
        {
          alert(errorMsg + key);
          throw new Error(errorMsg + key);
        }
      },
    );

    if (!oneWay)
    {
      Util.assertKeysArePresent(second, first, errorMsg, true);
    }
  },

  // for SQL
  formatInputDate(date: Date, language: string = 'elastic'): string
  {
    if (language === 'elastic')
    {
      const day = moment(date).format('YYYY-MM-DD');
      const time = moment(date).format('HH:mm:ssZ');
      return day + 'T' + time;
    }
    return moment(date).format('YYYY-MM-DD HH:mm:ss');
  },

  formatNumber(n: number): string
  {
    const precision: number = 3;

    if (!n)
    {
      return n + '';
    }

    const sign = n < 0 ? '-' : '';
    n = Math.abs(n);

    if (n >= 0.001 && n < 1000000000000) // 10^12
    {
      const pwr = Math.floor(Math['log10'](n));
      let str = n.toPrecision(precision);
      let suffix = '';

      if (pwr > 0)
      {
        suffix = suffixes[Math.floor(pwr / 3)];
        const decimalIndex = pwr % 3 + 1;
        str = n + '';
        str = str.substr(0, precision);
        if (decimalIndex < str.length)
        {
          str = str.slice(0, decimalIndex) + '.' + str.slice(decimalIndex);
        }
        else if (decimalIndex > str.length)
        {
          // need to add extra 0's
          _.range(0, decimalIndex - str.length).map(
            (i) => str = str + '0',
          );
        }
      }

      while (str.length > 1 &&
        str.indexOf('.') > 0 &&
        (str.charAt(str.length - 1) === '0' || str.charAt(str.length - 1) === '.')
      )
      {
        // if there are extra 0's after the decimal point, trim them (and the point if necessary)
        str = str.substr(0, str.length - 1);
      }

      return sign + str + suffix;
    }

    return sign + n.toExponential(precision);
  },

  getId(isString: boolean = false): ID
  {
    if (isString)
    {
      return _.range(0, 5).map((i) => chars[Util.randInt(chars.length)]).join('');
    }
    return Math.random();
  },

  extendId(obj: object, isString?: boolean): object
  {
    if (obj['id'])
    {
      return obj;
    }
    return _.extend({}, { id: Util.getId(isString) }, _.omit(obj, (value) => value === undefined));
  },

  moveIndexOffset(index: number, newIndex: number): number
  {
    return index < newIndex ? -1 : 0;
  },

  setValuesToKeys(obj: any, prefix: string)
  {
    prefix = prefix + (prefix.length > 0 ? '.' : '');
    for (const key in obj)
    {
      const value = prefix + key;
      if (typeof obj[key] === 'string')
      {
        obj[key] = value;
      }
      else if (typeof obj[key] === 'object')
      {
        Util.setValuesToKeys(obj[key], value);
      }
      else
      {
        throw new Error('Value found in ActionTypes that is neither string or object of strings: key: ' + key + ', value: ' + obj[key]);
      }
    }
  },

  rel(target): string
  {
    const rel = Util.attr(target, 'rel');

    if (rel === undefined || rel === null)
    {
      return Util.attr(target, 'data-rel');
    }

    return rel;
  },

  attr(target, key: string): string
  {
    return ReactDOM.findDOMNode(target).getAttribute(key);
  },

  // corrects a given index so that it is appropriate
  //  to pass into a `splice` call
  spliceIndex(index: number, array: any[]): number
  {
    if (index === undefined || index === null || index === -1)
    {
      if (Immutable.Iterable.isIterable(array))
      {
        return array['size'];
      }
      return array.length;
    }

    return index;
  },

  // still needed?
  immutableMove: (arr: any, id: any, index: number) =>
  {
    const curIndex = arr.findIndex((obj) =>
      (typeof obj.get === 'function' && (obj.get('id') === id))
      || (obj.id === id));
    const obj = arr.get(curIndex);
    arr = arr.delete(curIndex);
    return arr.splice(index, 0, obj);
  },

  keyPathForId,

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

  findParentNode(reactNode, checkParent: (parentNode) => boolean, maxDepth: number = 4): Node | null
  {
    while (maxDepth > 0)
    {
      if (checkParent(reactNode))
      {
        return reactNode;
      }
      reactNode = Util.parentNode(reactNode);
      maxDepth--;
    }
    return null;
  },

  siblings(reactNode): NodeList
  {
    return Util.parentNode(reactNode).childNodes;
  },

  children(reactNode): NodeList
  {
    return ReactDOM.findDOMNode(reactNode).childNodes;
  },

  selectText(field, start, end)
  {
    if (field.createTextRange)
    {
      const selRange = field.createTextRange();
      selRange.collapse(true);
      selRange.moveStart('character', start);
      selRange.moveEnd('character', end);
      selRange.select();
      field.focus();
    } else if (field.setSelectionRange)
    {
      field.focus();
      field.setSelectionRange(start, end);
    } else if (typeof field.selectionStart !== 'undefined')
    {
      field.selectionStart = start;
      field.selectionEnd = end;
      field.focus();
    }
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
    const ans = {};
    _.map(obj, (val, key) => ans[key] = _.clone(val));
    return ans;
  },

  animateToHeight(node, height: number, onComplete?): void
  {
    const el = $(node);
    const curHeight = el.height();

    el.css('overflow', 'hidden');
    el.height(curHeight).animate({ height }, 250, () =>
    {
      onComplete && onComplete();
    });
  },

  animateToAutoHeight(node, onComplete?, duration?): void
  {
    const el = $(node);
    const curHeight = el.height();
    const autoHeight = el.css('height', 'auto').height();

    el.height(curHeight).animate({ height: autoHeight }, duration || 250, () =>
    {
      el.css('height', 'auto');
      el.css('overflow-y', 'visible');
      onComplete && onComplete();
    });
  },

  // bindAll(instance, Clss?: { prototype: any })
  // {
  //   console.log('========')
  //   console.log(instance);
  //   console.log(instance['handleEnd']);
  //   console.log(instance.prototype);
  //   for(var m in instance)
  //   {
  //     console.log(m);
  //     // auto-bind child methods to this
  //     if((!Clss || !Clss.prototype[m]) && typeof instance[m] === 'function')
  //     {
  //       console.log('bind');
  //       instance[m] = instance[m].bind(instance);
  //     }
  //   }

  // },

  bind(component: React.Component<any, any>, ...args: any[])
  {
    let fields: any[] = args;
    if (typeof fields[0] === 'object')
    {
      fields = fields[0];
    }

    fields.map((field) => component[field] = component[field].bind(component));
  },

  throttle(component: React.Component<any, any>, fields: string[], rate)
  {
    // For throttling methods on a react component
    // see: http://stackoverflow.com/questions/23123138/perform-debounce-in-react-js
    fields.map((field) =>
    {
      component['_throttled_' + field] = _.throttle(component[field], 1000);
      component[field] = (event) =>
      {
        if (event && typeof event.persist === 'function')
        {
          // must call persist to keep the event around
          // see: http://stackoverflow.com/questions/23123138/perform-debounce-in-react-js/24679479#24679479
          event.persist();
        }
        component['_throttled_' + field](event);
      };
    });
  },

  // REMOVE
  // accepts object of key/vals like this: { 'className': include? }
  objToClassname(obj: { [className: string]: boolean }): string
  {
    return _.reduce(obj, (classNameArray: string[], include: boolean, className: string) =>
    {
      if (include)
      {
        classNameArray.unshift(className);
      }
      return classNameArray;
    }, []).join(' ');
  },

  cardIndex: (cards, action) =>
  {
    return cards.findIndex((card) => card.get('id') === action.payload.card.id);
  },

  populateTransformDummyData(transformCard)
  {
    transformCard.range = transformCard.range || [0, 100];
    transformCard.bars = transformCard.bars || [];
    transformCard.scorePoints = transformCard.scorePoints || [];

    if (transformCard.scorePoints.length === 0)
    {
      for (let i: any = 0; i < 5; i++)
      {
        transformCard.scorePoints.push(
          {
            value: transformCard.range[0] + (transformCard.range[1] - transformCard.range[0]) / 4 * i,
            score: 0.5,
            id: 'p' + i,
          });
      }
    }
  },

  getIEVersion()
  {
    // from https://jsfiddle.net/jquerybyexample/gk7xA/
    const sAgent = window.navigator.userAgent;
    const Idx = sAgent.indexOf('MSIE');

    // If IE, return version number.
    if (Idx > 0)
    {
      return parseInt(sAgent.substring(Idx + 5, sAgent.indexOf('.', Idx)));
    }

    // If IE 11 then look for Updated user agent string.
    else if (!!navigator.userAgent.match(/Trident\/7\./))
    {
      return 11;
    }
    else
    {
      return 0; // It is not IE
    }
  },

  sortDatabases(dbs)
  {
    return dbs.sort((a, b) =>
    {
      if (a.type === b.type)
      {
        return a.name.localeCompare(b.name);
      }
      return a.type.localeCompare(b.type);
    });
  },

  createContainer(component, stateToPropsKeys, dispatchToPropsMap)
  {
    const mapStateToProps = (state) =>
    {
      const stateToProps = {};
      stateToPropsKeys.forEach((key) =>
      {
        stateToProps[key] = state.get(key);
      });
      return stateToProps;
    };

    const mapDispatchToProps = (dispatch) =>
    {
      const dispatchToProps = {};
      Object.keys(dispatchToPropsMap).forEach((key) =>
      {
        const actions = dispatchToPropsMap[key];
        dispatchToProps[key] = bindActionCreators(actions, dispatch);
      });

      return dispatchToProps;
    };

    return connect(
      mapStateToProps,
      mapDispatchToProps,
    )(component);
  },

  createTypedContainer<ComponentType>(component: ComponentType, stateToPropsKeys, dispatchToPropsMap): ComponentType
  {
    return Util.createContainer(component, stateToPropsKeys, dispatchToPropsMap);
  },
};

export default Util;
