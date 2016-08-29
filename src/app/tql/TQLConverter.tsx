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
    
    var inputsTql = "";
    if(inputs && inputs.size)
    {
      inputs.map((input: IInput) => 
        {
          var {value} = input;
          if(input.inputType === BuilderTypes.InputType.TEXT)
          {
            value = `"${value}"`;
          }
          if(input.inputType == BuilderTypes.InputType.DATE)
          {
            value = `"${value}"`;
          }
          
          inputsTql += `var ${input.key} = ${value};\n`;
        }
      );
      inputsTql += "\n\n";
    }
    
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
      if(!fromCard['cards'].some(card => card.type === 'take'))
      {
        let limit = options.limit || 5000; // queries without a limit will crash Tiny
        return fromCard.set('cards', fromCard['cards'].push(BuilderTypes.make(BuilderTypes.Blocks.take, {
          value: 5000,
        })));
      }
      
      return fromCard;
    });
    
    return cards;
  }

  // TODO centralize
  // parse strings where "$key" indicates to replace "$key" with the value of card[key]
  //  or functions that are passed in a reference to the card/obj and then return a parse string
  private static TQLF =
  {
    // from: "from '$table' as $iterator $cards",
    // select: "SELECT $properties",
    sfw: "SELECT $fields \nFROM $tables \nWHERE $filters $cards",
      fields: (f, index) => f.field.length ? join(", ", index) + f.field : "",
      tables: (t, index) => join(", ", index) + "'$table' as $iterator",
    sort: "ORDER BY $sorts",
      sorts: (sort, index) => join(", ", index) + "$property " + (sort.direction ? 'desc' : 'asc'),
    filter: "($filters)",
      filters: (filter, index, isLast) =>
        "$first "
        + OperatorsTQL[filter.operator] + " " +
        "$second"
        + (isLast ? "" : " " + CombinatorsTQL[filter.combinator] + " "),
    
    let: "let $field = $expression",
    var: "var $field = $expression",
    score: (score) => "linearScore([$weights])",
      weights: (weight, index) => join(", ", index) + "\n[$weight, $key]",
    
    transform: "linearTransform([$scorePoints], $input)",
      scorePoints: (sp, index) => join(", ", index) + "\n[$score, $value]",
    
    if: (card) => "if $filters {$cards}"
      + (card.elses.size ? " else " + (
        card.elses[0].filters.size
          ? TQLConverter._parse(TQLConverter.TQLF.if, card.elses[0])
          : TQLConverter._parse("{$cards}", card.elses[0]) 
      ) : ""),
    
    parentheses: "($cards)",
    min: "min ($cards)",
    max: "max ($cards)",
    avg: "avg ($cards)",
    count: "count ($cards)",
    sum: "sum ($cards)",
    exists: "EXISTS ($cards)",
    take: "take $value",
    skip: "skip $value",
  }
  
  private static _cards(cards: List<ICard>, append?: string, options?: Options): string
  {
    var glue = "\n" + (append || "");
    return addTabs("\n" + cards.map(this._card, this).join(glue)) + glue;
  }
  
  private static _card(card: ICard): string
  {
    // var {TQLF, _parse} = TQLConverter;
    // var options = this;
    if(this.TQLF[card.type])
    {
      return this._parse(this.TQLF[card.type], card);
    }
    
    console.log("No grammar for: ", card);
    return "";
  }
  
  private static _parse(pattern: string | PatternFn, 
    card: ICard, index?: number, isLast?: boolean): string
  {
    if(typeof pattern === 'function')
    {
      var str = (pattern as PatternFn)(card, index, isLast);
    }
    else
    {
      var str = pattern as string;
    }
    var index = str.indexOf("$");
    while(index !== -1)
    {
      var f = str.match("\\$[a-zA-Z]+")[0].substr(1); //str.substring(index + 1, str.indexOf(" ", index));
      str = str.replace("\$" + f, this._value(f, card));
      index = str.indexOf("$");
    }
    
    return str;
  }
  
  private static _value(field: string, card: ICard)
  {
    if(field === 'cards')
    {
      return this._cards(card['cards']);
    }
    else if(Array.isArray(card[field]) || Immutable.List.isList(card[field]))
    {
      return card[field].map(
        (v, index) => this._parse(this.TQLF[field], v, index, index === card[field].size - 1)
      ).join("");
    }
    else if(typeof card[field] === 'object')
    {
      return this._card(card[field]);
    }
    
    return card[field];
  }
  
}

// TQLConverter.toTQL = _.debounce(TQLConverter.toTQL, 1000);

export default TQLConverter;