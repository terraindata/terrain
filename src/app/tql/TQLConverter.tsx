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
import { CardModels } from "../models/CardModels";

var OperatorsTQL = ['==', '!=', '>=', '>', '<=', '<', 'in', 'notIn'];
var CombinatorsTQL = ['&&', '||'];
var join = (j, index) => (index === 0 ? "" : j);
var addTabs = (str) => str.replace(/\n/g, "\n ");
var removeBlanks = (str) => str.replace(/\n[ \t]*\n/g, "\n");
type PatternFn = (obj: any, index?: number, isLast?: boolean) => string;

class TQLConverter
{
  static toTQL(cards: CardModels.ICard[]): string
  {
    return removeBlanks(this._cards(cards, ";"));
  }

  // parse strings where "$key" indicates to replace "$key" with the value of card[key]
  //  or functions that are passed in a reference to the card/obj and then return a parse string
  private static TQLF =
  {
    from: "from '$group' as $iterator $cards",
    select: "select $properties",
      properties: (p, index) => p.property.length ? join(", ", index) + "$property" : "",
    sort: "sort $sorts",
      sorts: (sort, index) => join(", ", index) + "$property " + (sort.direction ? 'desc' : 'asc'),
    filter: "filter $filters",
      filters: (filter, index, isLast) =>
        TQLConverter._parse("$first ", filter.condition)
        + OperatorsTQL[filter.condition.operator] + " "
        + TQLConverter._parse("$second", filter.condition)
        + (isLast ? "" : " " + CombinatorsTQL[filter.combinator] + " "),
    
    let: "let $field = $expression",
    var: "var $field = $expression",
    score: (score) => "linearScore([$weights])",
      weights: (weight, index) => join(", ", index) + "\n[$weight, $key]",
    
    transform: "piecewiseLinearTransform([$scorePoints], $input)",
      scorePoints: (sp, index) => join(", ", index) + "\n[$value, $score]",
    
    if: (card) => "if $filters {$cards}"
      + (card.elses.length ? " else " + (
        card.elses[0].filters.length
          ? TQLConverter._parse(TQLConverter.TQLF.if, card.elses[0])
          : TQLConverter._parse("{$cards}", card.elses[0]) 
      ) : ""),
    
    parentheses: "($cards)",
    min: "min ($cards)",
    max: "max ($cards)",
    avg: "avg ($cards)",
    count: "count ($cards)",
    sum: "sum ($cards)",
    exists: "exists ($cards)",
    take: "take $value",
    skip: "skip $value",
  }
  
  private static _cards(cards: CardModels.ICard[], append?: string): string
  {
    var glue = "\n" + (append || "");
    return addTabs("\n" + cards.map(this._card, this).join(glue)) + glue;
  }
  
  private static _card(card: CardModels.ICard): string
  {
    if(this.TQLF[card.type])
    {
      return this._parse(this.TQLF[card.type], card);
    }
    
    console.log("No grammar for " + card);
    return "";
  }
  
  private static _parse(pattern: string | PatternFn, 
    card: CardModels.ICard, index?: number, isLast?: boolean): string
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
  
  private static _value(field: string, card: CardModels.ICard)
  {
    if(field === 'cards')
    {
      return this._cards(card['cards']);
    }
    else if(Array.isArray(card[field]))
    {
      return card[field].map(
        (v, index) => this._parse(this.TQLF[field], v, index, index === card[field].length - 1)
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