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

const _ = require('underscore');
import * as Immutable from 'immutable';
import { BuilderTypes } from '../builder/BuilderTypes.tsx';
type Cards = BuilderTypes.ICards;
type Card = BuilderTypes.ICard;
type CardString = BuilderTypes.CardString;
type Block = BuilderTypes.IBlock;
import List = Immutable.List;
import Map = Immutable.Map;
const {Blocks, make} = BuilderTypes;


export const TQLToCards =
{
  convert(statement: Statement): Cards
  {
    let statements = statement.statements.map(
      (node) =>
      {
        let cardString = parseNode(node);
        if(typeof cardString === 'string')
        {
          return make(Blocks.tql, {
            clause: cardString,
          });
        }
        else
        {
          return cardString;
        }
      }
    );
    return List(statements);
  },
  
};

function parseNode(node:Node | string): CardString
{
  if(typeof node !== 'object')
  {
    return node;
  }
  else
  {
    if(generalProcessors[node.op])
    {
      return generalProcessors[node.op](node);
    }
    
    if(sfwProcessors[node.op])
    {
      let sfw = parseNode(node.left_child) as Card;
      let rightNodes = flattenCommas(node.right_child);
      let card = sfwProcessors[node.op](rightNodes);
      if(typeof sfw !== 'object')
      {
        return card;
      }
      return sfw.set('cards', 
        sfw['cards'].push(card)
      );
    }
    
    console.log(comparisonProcessors);
    if(comparisonProcessors[node.op])
    {
      console.log(comparisonProcessor(node));
      return comparisonProcessor(node);
    }
    
    console.log('no op', node);
    return make(Blocks.tql, {
      clause: node.op,
    });
  }
}

const andOrProcessor = (op: string) =>
  (node: Node): Card =>
  {
    let childNodes = flattenOp(op, node.left_child)
      .concat(flattenOp(op, node.right_child));
    return make(Blocks[op], {
      cards: List(
        childNodes.map(parseNode)
      ),
    })
  };

const generalProcessors: {
  [opType:string]: (
    node: Node
  ) => CardString
} = {
  from:
    (node) =>
    {
      let tables = flattenCommas(node.child)
        .map(
          tableNode => 
          {
            if(typeof tableNode !== 'object' || tableNode.op !== 'as')
            {
              return make(Blocks.table, {
                table: 'Bad Input',
              });
            }
            else
            {
              return make(Blocks.table, {
                table: tableNode.left_child,
                alias: tableNode.right_child,
              });
            }
          }
        );
      
      return make(Blocks.sfw, {
        tables: List(tables),
      });
    },
    
  select:
    (node) =>
    {
      let sfw = parseNode(node.left_child) as Card;
      let fieldNodes = flattenCommas(node.right_child);
      let fieldBlocks: Block[] = fieldNodes.map(
        fieldNode =>
          make(
            Blocks.field,
            {
              field: parseNode(fieldNode)
            }
          )
      );
      return sfw.set('fields', Immutable.List(fieldBlocks));
    },
  
  '.':
    (node) =>
    {
      return node.left_child + '.' + node.right_child;
    },
  
  call:
    (node) =>
    {
      let type = node.left_child as string;
      if(typeof type === 'string')
      {
        type = type.trim();
        if(Blocks[type])
        {
          return make(Blocks[type], {
            value: parseNode(node.right_child),
          });
        }
      }
      console.log('no call for', node);
      return make(Blocks.tql, { clause: 'call', });
    },
  
  distinct:
    (node) =>
      make(Blocks.distinct, {
        value: parseNode(node.child),
      }),
  
  expr:
    (node) =>
      parseNode(node.child),
  
  as:
    (node) =>
      make(Blocks.as, {
        value: parseNode(node.left_child),
        alias: node.right_child,
      }),
  
  and:
    andOrProcessor('and'),
  
  or:
    andOrProcessor('or'),
};

const comparisonProcessors = _.reduce(
  BuilderTypes.OperatorTQL,
  (memo, val: string) =>
  {
    memo[val.toLowerCase()] = true;
    return memo;
  }, {}
);
function comparisonProcessor(node: Node): Card
{
  return make(Blocks.comparison, {
    first: parseNode(node.left_child),
    second: parseNode(node.right_child),
    operator: + _.findKey(BuilderTypes.OperatorTQL, 
      (op: string) => op.toLowerCase() === node.op
    ),
  });
}

// The following types are contained with the From card,
//  are above the From node on the parse tree, and have
//  meta data stored in their right node
const sfwProcessors: {
  [opType:string]: (
    rightNodes: (Node | string)[] // already flattened
  ) => CardString
} = {
  
  take:
    (rightNodes) =>
      make(Blocks.take, {
        value: rightNodes[0],
      }),
    
  skip:
    (rightNodes) =>
      make(Blocks.skip, {
        value: rightNodes[0],
      }),
  
  sort:
    (sortNodes) =>
      make(Blocks.sort, {
        sorts: List( 
          sortNodes.map(
            node =>
            {
              var config: any = {
                property: node,
              };
              if(typeof node === 'object')
              {
                config = {
                  property: parseNode(node.child),
                  direction: node.op === 'asc' ? BuilderTypes.Direction.ASC : BuilderTypes.Direction.DESC
                };
              }
              return make(Blocks.sortBlock, config);
            }
          )
        ),
      }),
  
  group:
    (fieldNodes) =>
      make(Blocks.groupBy, {
        fields: List(
          fieldNodes.map(
            node =>
              make(Blocks.field, {
                field: parseNode(node),
              })
          )
        )
      }),
   
  filter:
    (childNodes) =>
      make(
        Blocks.where,
        {
          // filter doesn't use commas, will only have one node
          cards: List([
            parseNode(childNodes[0]),
          ]),
        }
      ),
}


// takes a tree of a certain op (e.g. commas, and/or) 
//  and turns it into an array of Node
function flattenOp(op: string, node:Node | string): (Node | string)[]
{
  if(typeof node !== 'object' || node.op !== op)
  {
    return [node];
  }
  else
  {
    return flattenOp(op,node.left_child).concat(
      flattenOp(op, node.right_child)
    );
  }
}

function flattenCommas(node:Node | string)
{
  return flattenOp(',', node);
}

interface Statement
{
  node_type: string;
  statements: Node[];
}

interface Node
{
  node_type: string;
  op: string;
  left_child?: Node | string;
  right_child?: Node | string;
  child?: Node;
}



export default TQLToCards;