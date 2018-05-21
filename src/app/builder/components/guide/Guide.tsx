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
// /***********************
// ***
// *    PROTOTYPING
// ***
// ******/

// require('./Guide.less');
// import * as classNames from 'classnames';
// import * as Immutable from 'immutable';
// import * as $ from 'jquery';
// import * as React from 'react';
// import * as ReactDOM from 'react-dom';
// import * as _ from 'lodash';
// import Util from '../../../util/Util';
// import Actions from '../../data/BuilderActions';
// import Card from '../cards/Card';
// import TerrainComponent from './../../../common/components/TerrainComponent';
// const L = Immutable.List;
// const M = Immutable.Map;

// export interface Props
// {
// }

// export enum EScreen
// {
//   FROM,
//   SELECT,
//   WHERE,
//   LIMIT,
//   LET,
//   VAR,
//   TRANSFORM,
//   SCORE,

//   ALL,
// }

// export interface State
// {
//   screen: EScreen;
//   query: IQuery;
// }

// export enum EExpressionType
// {
//   STRING,
//   NUMBER,

//   MAX,
//   MIN,
//   COUNT,
//   SUM,
//   EXISTS,

//   QUERY,
// }

// export interface IExpression
// {
//   type: EExpressionType;
//   value: any;
// }

// export interface ICondition
// {
//   first: IExpression;
//   second: IExpression;
//   // operator: Operator;
// }

// export interface IConditions
// {
//   conditions: Array<ICondition | IConditions>;
//   // combinator: Combinator;
// }

// // DIFFERENT FROM BROWSERTYPES
// class QueryClass
// {
//   tables: Array<{
//     table: string;
//     alias: string;
//   }> = [];

//   fields: string[] = [];

//   where: IConditions = {
//     conditions: [],
//     // combinator: Combinator.AND,
//   };
// }
// export interface IQuery extends QueryClass, IRecord<IQuery> {}
// const Query_Record = Immutable.Record(new QueryClass());
// export const _Query = (config?: any) => {
//   return new Query_Record(config || {}) as any as IQuery;
// };

// class Guide extends TerrainComponent<Props>
// {
//   state: State = {
//     screen: EScreen.FROM,
//     query: _Query(),
//   };

//   constructor(props: Props)
//   {
//     super(props);
//   }

//   render()
//   {
//     const {screen, query} = this.state;

//     return (
//       <div
//         className="guide"
//       >
//         <div className="guide-left">
//           <div className="guide-title">
//             Guide
//           </div>
//         </div>
//         <div className="guide-right">
//           <div className="guide-title">
//             Your Query
//           </div>
//         </div>
//       </div>
//     );
//   }
// }
//         // {
//         //   !topLevel ? null :
//         //     <CardDropArea
//         //       half={true}
//         //       index={0}
//         //       keyPath={this.state.keyPath}
//         //     />
//         // }
//         // {
//         //   !topLevel ? null :
//         //     <CardDropArea
//         //       half={true}
//         //       lower={true}
//         //       index={props.cards.size}
//         //       keyPath={this.state.keyPath}
//         //     />
//         // }

// export default Guide;
