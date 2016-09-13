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

import * as _ from 'underscore';
import * as Immutable from 'immutable';
import { BuilderTypes } from "../builder/BuilderTypes.tsx";
type ICard = BuilderTypes.ICard;
type IBlock = BuilderTypes.IBlock;
type IInput = BuilderTypes.IInput;


var OperatorsTQL = ['==', '!=', '>=', '>', '<=', '<', 'in', 'notIn'];
var CombinatorsTQL = ['&&', '||'];
var join = (j, index) => (index === 0 ? "" : j);
var addTabs = (str) => str.replace(/\n/g, "\n ");
var removeBlanks = (str) => str.replace(/\n[ \t]*\n/g, "\n");
type PatternFn = (obj: any, index?: number, isLast?: boolean) => string;

export interface Options {
  allFields?: boolean; // amend the final Select card to include all possible fields.
  limit?: number;
}

class TQLConverter
{
  static toTQL(query: BuilderTypes.IQuery, options: Options = {}): string
  {
    var {cards, inputs} = query;
    
    var cardsTql = "";
    if(cards && cards.size)
    {
      cards = this.applyOptions(cards, options);
      cardsTql = removeBlanks(this._cards(cards, ";", options));
    }
    
    // TODO figure out inputs
    var inputsTql = "";
    // if(inputs && inputs.size)
    // {
    //   inputs.map((input: IInput) => 
    //     {
    //       var {value} = input;
    //       if(input.inputType === BuilderTypes.InputType.TEXT)
    //       {
    //         value = `"${value}"`;
    //       }
    //       if(input.inputType == BuilderTypes.InputType.DATE)
    //       {
    //         value = `"${value}"`;
    //       }
          
    //       inputsTql += `var ${input.key} = ${value};\n`;
    //     }
    //   );
    //   inputsTql += "\n\n";
    // }
    
    return inputsTql + cardsTql;
  }
  
  private static _topFromCard(cards: List<ICard>, fn: (fromCard: ICard) => ICard): List<ICard>
  {
    // find top-level 'from' cards
    return cards.map(topCard =>
    {
      if(topCard.type === 'from' || topCard.type === 'sfw')
      {
        return fn(topCard);
      }
      return topCard;
    }) as List<ICard>;
  }
  
  private static applyOptions(cards, options): List<ICard>
  {
    if(options.allFields)
    {
      cards = this._topFromCard(cards, (fromCard: ICard) =>
        fromCard.set('cards', fromCard['cards'].map(card =>
        {
          if(card.type === 'select')
          {
            console.log(card);
            return card.set('properties', Immutable.List(['*']));
          }
          return card;
        })
      ));
    }
    
    cards = this._topFromCard(cards, (fromCard: ICard) =>
    {
      // add a take card if none are present
      if(options.limit && !fromCard['cards'].some(card => card.type === 'take'))
      {
        return fromCard.set('cards', fromCard['cards'].push(BuilderTypes.make(BuilderTypes.Blocks.take, {
          value: options.limit,
        })));
      }
      
      return fromCard;
    });
    
    return cards;
  }

  private static _cards(cards: List<ICard>, append?: string, options?: Options): string
  {
    var glue = "\n" + (append || "");
    return addTabs("\n" + cards.map(
        (card, i) => this._parse(card, i, i === cards.size)
      ).join(glue)) + glue;
  }
  
  private static _parse(block: IBlock, index?: number, isLast?: boolean): string
  {
    let str = block.static.tql;
    var index = str.indexOf("$");
    while(index !== -1)
    {
      var f = str.match("\\$[a-zA-Z]+")[0].substr(1);
      str = str.replace("\$" + f, this._value(f, block));
      index = str.indexOf("$");
    }
    
    return str;
  }
  
  private static _value(field: string, block: IBlock)
  {
    if(field === 'cards')
    {
      return this._cards(block['cards']);
    }
    
    if(Array.isArray(block[field]) || Immutable.List.isList(block[field]))
    {
      let pieces = 
        block[field].map(
          (v, index) => this._parse(v, index, index === block[field].size - 1)
        );

      var glue = ", ";        
      if(block.static.tqlJoiner)
      {
        glue = block.static.tqlJoiner;
      }
      
      return pieces.join(glue);
      
      // return pieces.reduce((str, piece, i) => (
      //     str + piece + 
      //       (i === pieces.length - 1 ? "" : glue)
      //   ), "");
    }
    
    if(typeof block[field] === 'object')
    {
      return '(' + this._parse(block[field]) + ')';
    }
    
    if(field.toUpperCase() === field)
    {
      // all caps, look up value from corresponding map
      return BuilderTypes[field.charAt(0) + field.substr(1).toLowerCase() + 'TQL'][block[field.toLowerCase()]]; 
    }
    
    return block[field];
  }
  
}

export default TQLConverter;