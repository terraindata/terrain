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

// import * as Immutable from 'immutable';
// const {Map,List} = Immutable;
// import * as _ from 'underscore';
// import * as React from 'react';
// import Util from '../../../util/Util.tsx';
// import {Ajax, QueryResponse} from '../../../util/Ajax.tsx';
// import {IResultsConfig, DefaultIResultsConfig, ResultsConfig} from "../results/ResultsConfig.tsx";
// import TQLConverter from "../../../tql/TQLConverter.tsx";
// import PureClasss from './../../../common/components/PureClasss.tsx';
// import BuilderTypes from '../../BuilderTypes.tsx';
// import {spotlightAction, SpotlightStore, SpotlightState} from '../../data/SpotlightStore.tsx';

// const MAX_RESULTS = 200;

// // TODO records? immutable?

// export interface IResult
// {
//   fields: Map<string, string>; // includes all fields
//   rawFields: Map<string, string>;
//   transformFields: Map<string, string>;
// }

// export type IResultState =
// {
//   results: List<IResult>;
//   primaryKeyToIndex: Map<string, number>;
//   hasError: boolean;
//   errorMessage: string;
//   count: number;
  
//   valid: boolean; // are these results still valid for the given query?
//   loaded: boolean; // have all of the fields loaded?
  
//   rawResult: string;
// };

// interface Props
// {
//   query: BuilderTypes.IQuery;
//   onResultsChange(results);
// }

// interface State
// {
//   resultState: IResultState;
  
//   queriedTql: string;
  
//   queryId: string;
//   allQueryId: string;
//   countQueryId: string;
//   transformQueryId: string;
// }

// class ResultsManager extends PureClasss<Props>
// {
//   xhr = null;
//   allXhr = null;
//   countXhr = null;
  
//   state: State = {
//     resultState: null,
  
//     queriedTql: '',
    
//     queryId: '',
//     allQueryId: '',
//     countQueryId: '',
//     transformQueryId: '', 
//   };
  
//   constructor(props:Props)
//   {
//     super(props);
//   }
  
//   componentDidMount()
//   {
//     this.queryResults(this.props.query);
//   }
  
//   componentWillUnmount()
//   {
//     this.xhr && this.xhr.abort();
//     this.allXhr && this.allXhr.abort();
//     this.countXhr && this.countXhr.abort();
//     this.xhr = false;
//     this.allXhr = false;
//     this.countXhr = false;
//     this.timeout && clearTimeout(this.timeout);
//   }
  
//   componentWillReceiveProps(nextProps)
//   {
//     if(this.props.query !== nextProps.query)
//     {
//       this.queryResults(this.props.query);
//     }
//   }
  
//   handleAllFieldsResponse(response:QueryResponse)
//   {
//     this.handleResultsChange(response, true);
//   }
  
//   handleCountResponse(response:QueryResponse)
//   {
//     let results = response.resultSet;
//     if(results)
//     {
//       if(results.length === 1)
//       {
//         this.setState({
//           resultsCount: results[0]['count(*)']
//         });
//       }
//       else if(results.length > 1)
//       {
//         this.setState({
//           resultsCount: results.length,
//         })
//       }
//       else
//       {
//         this.handleCountError();
//       }
//     }
//     else
//     {
//       this.handleCountError();
//     }
//   }
  
//   handleCountError()
//   {
//     this.setState({
//       resultsCount: -1,
//     })
//   }
  
//   timeout = null;
  
//   handleResultsChange(response:QueryResponse, isAllFields?: boolean)
//   {
//     let xhrKey = isAllFields ? 'allXhr' : 'xhr';
//     if(!this[xhrKey]) return;
//     this[xhrKey] = null;
    
//     if(response)
//     {
//       if(response.error)
//       {
//         if(!isAllFields)
//         {
//           this.setState({
//             error: response.error,
//           });
//         }
//         this.props.onLoadEnd && this.props.onLoadEnd();
//         return;
//       }
      
//       let results = response.resultSet;
      
//       var resultsCount = results.length;
//       if(resultsCount > MAX_RESULTS)
//       {
//         results.splice(MAX_RESULTS, results.length - MAX_RESULTS);
//       }
      
//       if(isAllFields)
//       {
//         this.setState({
//           resultsWithAllFields: results,
//         });
//       }
//       else
//       {
//         this.setState({
//           results,
//           resultType: 'rel',
//           querying: false,
//           error: false,
//         });
//       }
//     }
//     else
//     {
//       this.setState({
//         error: "No response was returned from the server.",
//       });
//     }
    
//     if(!this['xhr'] && !this['allXhr'])
//     {
//       // all done with both
//       this.props.onLoadEnd && this.props.onLoadEnd();
//     }
//   }
  
//   componentWillUpdate(nextProps, nextState: State)
//   {
//     if(nextState.results !== this.state.results 
//       || nextState.resultsWithAllFields !== this.state.resultsWithAllFields)
//     {
//       // update spotlights
//       let config = this.getResultsConfig();
//       SpotlightStore.getState().spotlights.map(
//         (spotlight, id) =>
//         {
//           let resultIndex = nextState.results && nextState.results.findIndex(
//             r => getPrimaryKeyFor(r, config) === id
//           );
//           if(resultIndex !== -1)
//           {
//             spotlightAction(id, _.extend({
//                 color: spotlight.color,
//                 name: spotlight.name,  
//               }, 
//               nextState.results[resultIndex], 
//               nextState.resultsWithAllFields[resultIndex])
//             );
//           }
//           else
//           {
//             spotlightAction(id, null);
//           } 
//         }
//       );
//     }
//   }
  
//   handleError(ev)
//   {  
//     this.setState({
//       error: true,
//     });
//     this.props.onLoadEnd && this.props.onLoadEnd();
//   }
  
//   handleAllFieldsError()
//   {
//     this.props.onLoadEnd && this.props.onLoadEnd();
//   }
  
//   queryResults(query, pages?: number)
//   {
//     if(!pages)
//     {
//       pages = this.state.resultFormat === 'icon' ? this.state.resultsPages : 50;
//     }
    
//     if (query.mode === "tql")
//     {
//       var tql = query.tql;
//     }
//     else 
//     {
//       tql = TQLConverter.toTQL(query, {
//         limit: MAX_RESULTS,
//       });
//     }
//     if(tql !== this.state.tql)
//     {
//       this.setState({
//         querying: true,
//         tql
//       });
      
//       this.props.onLoadStart && this.props.onLoadStart();
//       this.xhr && this.xhr.abort();
//       this.allXhr && this.allXhr.abort();
      
//       this.xhr = Ajax.query(tql, query.db, this.handleResultsChange, this.handleError);
//       if (query.mode === "tql")
//       {
//         this.allXhr = Ajax.query(
//           tql, 
//           query.db,
//           this.handleAllFieldsResponse,
//           this.handleAllFieldsError,
//           true
//         );
//       }
//       else 
//       {
//         this.allXhr = Ajax.query(
//           TQLConverter.toTQL(query, {
//             allFields: true,
//             transformAliases: true,
//             // limit: pages * RESULTS_PAGE_SIZE,
//           }), 
//           query.db,
//           this.handleAllFieldsResponse,
//           this.handleAllFieldsError,
//           true
//         );
        
//         this.countXhr = Ajax.query(
//           TQLConverter.toTQL(query, {
//             count: true,
//           }), 
//           query.db,
//           this.handleCountResponse,
//           this.handleCountError
//         );
//       }

//     }
//   }
  
// 	render()
//   {
//     return (
//       <div />
//     );
// 	}
// }

// export function getPrimaryKeyFor(result:any, config:IResultsConfig): string
// {
//   if(config && config.primaryKeys.size)
//   {
//     return config.primaryKeys.map(
//       field => result[field]
//     ).join("and");
//   }
  
//   return "result-" + Math.floor(Math.random() * 100000000);
// }
  

// export default ResultsManager;