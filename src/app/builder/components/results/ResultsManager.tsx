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

import * as Immutable from 'immutable';
const {Map,List} = Immutable;
import * as _ from 'underscore';
import * as React from 'react';
import Util from '../../../util/Util';
import {Ajax, QueryResponse} from '../../../util/Ajax';
import {IResultsConfig, DefaultIResultsConfig, ResultsConfig} from "../results/ResultsConfig";
import TQLConverter from "../../../tql/TQLConverter";
import BuilderTypes from '../../BuilderTypes';
import {spotlightAction, SpotlightStore, SpotlightState} from '../../data/SpotlightStore';
import {BaseClass, New} from '../../../Classes';
import PureClasss from './../../../common/components/PureClasss';
import BuilderActions from '../../data/BuilderActions';

export const MAX_RESULTS = 200;

export class ResultClass extends BaseClass
{
  // all available fields for display
  fields: Map<string, string>;
  
  // spotlight: any;
  // pinned: boolean;
  
  rawFields: Map<string, string>;
  transformFields: Map<string, string>;
}
let _ResultClass = (config: Object = {}) => 
  New<ResultClass>(new ResultClass(config), config);

export type Results = List<ResultClass>;

export class ResultsState extends BaseClass
{
  results: Results;
  count: number;
  rawResult: string;
  
  primaryKeyToIndex: Map<string, number>;
  
  hasError: boolean;
  errorMessage: string;
  hasAllFieldsError: boolean;
  
  valid: boolean; // are these results still valid for the given query?
  loaded: boolean; // have all of the fields loaded?
  
  loading: boolean;
}
export let _ResultsState = (config: Object = {}) => 
  New<ResultsState>(new ResultsState(config), config);

interface Props
{
  query: BuilderTypes.Query;
  resultsState: ResultsState;
  db: string;
}

interface State
{
  queriedTql?: string;
  
  queryId?: string;
  allQueryId?: string;
  countQueryId?: string;
  transformQueryId?: string;
    
  xhr?: XMLHttpRequest;
  allXhr?: XMLHttpRequest;
  countXhr?: XMLHttpRequest;  
  transformXhr?: XMLHttpRequest;
}

class ResultsManager extends PureClasss<Props>
{
  state: State = {};
  
  componentWillMount()
  {
    this.queryResults(this.props.query);
  }
  
  componentWillUnmount()
  {
    this.state.xhr && this.state.xhr.abort();
    this.state.allXhr && this.state.allXhr.abort();
    this.state.countXhr && this.state.countXhr.abort();
    this.setState({
      xhr: null,
      allXhr: null,
      countXhr: null,
    });
  }
  
  componentWillReceiveProps(nextProps: Props)
  {
    if(nextProps.query.cards !== this.props.query.cards 
      || nextProps.query.inputs !== this.props.query.inputs)
    {
      this.queryResults(nextProps.query);
      
      if(nextProps.query.id !== this.props.query.id)
      {
        BuilderActions.results(_ResultsState({
          loading: true,
        }));
      }
    }
    
    if(nextProps.resultsState.results !== this.props.resultsState.results)
    {
      // update spotlights
      let config = this.getResultsConfig();
      SpotlightStore.getState().spotlights.map(
        (spotlight, id) =>
        {
          let resultIndex = nextState.results && nextState.results.findIndex(
            r => getPrimaryKeyFor(r, config) === id
          );
          if(resultIndex !== -1)
          {
            spotlightAction(id, _.extend({
                color: spotlight.color,
                name: spotlight.name,  
              }, 
              nextState.results[resultIndex], 
              nextState.resultsWithAllFields[resultIndex])
            );
          }
          else
          {
            spotlightAction(id, null);
          } 
        }
      );
    }
  }
  
  handleAllFieldsResponse(response:QueryResponse)
  {
    this.handleResultsChange(response, true);
  }
  
  handleCountResponse(response:QueryResponse)
  {
    this.setState({
      countXhr: null,
    });
    let results = response.resultSet;
    if(results)
    {
      if(results.length === 1)
      {
        this.setState({
          resultsCount: results[0]['COUNT(*)']
        });
      }
      else if(results.length > 1)
      {
        this.setState({
          resultsCount: results.length,
        })
      }
      else
      {
        this.handleCountError();
      }
    }
    else
    {
      this.handleCountError();
    }
  }
  
  handleCountError()
  {
    this.setState({
      countXhr: null,
      resultsCount: -1,
    })
  }
  
  handleResultsChange(response:QueryResponse, isAllFields?: boolean)
  {
    let xhrKey = isAllFields ? 'allXhr' : 'xhr';
    this.setState({
      [xhrKey]: null,
    });
    
    if(response)
    {
      if(response.error)
      {
        if(!isAllFields)
        {
          let {error} = response;
          if(typeof this.state.error === 'string')
          {
            if(error.charAt(error.length - 1) === '^')
            {
              error = error.substr(0, error.length - 1);
            }
            error = this.state.error.replace(/MySQL/g, 'TerrainDB');
          }
          
          this.setState({
            error,
          });
        }
        else
        {
          this.setState({
            allFieldsError: true,
          });
        }
        
        this.props.onLoadEnd && this.props.onLoadEnd();
        return;
      }
      
      let results = response.resultSet;
      
      var resultsCount = results.length;
      if(resultsCount > MAX_RESULTS)
      {
        results.splice(MAX_RESULTS, results.length - MAX_RESULTS);
      }
      
      if(isAllFields)
      {
        this.setState({
          resultsWithAllFields: results,
        });
      }
      else
      {
        this.setState({
          results,
          resultType: 'rel',
          error: false,
        });
      }
    }
    else
    {
      // no response
      if(!isAllFields)
      {
        this.setState({
          error: "No response was returned from the server.",
        });
      }
      else
      {
        this.setState({
          allFieldsError: true,
        });
      }
    }
  }
  
  handleError(ev)
  {  
    this.setState({
      xhr: null,
    });
    this.setState({
      error: true,
    });
    this.props.onLoadEnd && this.props.onLoadEnd();
  }
  
  handleAllFieldsError()
  {
    this.setState({
      allXhr: null,
    });
    this.props.onLoadEnd && this.props.onLoadEnd();
  }
  
  queryResults(query, pages?: number)
  {
    if(!pages)
    {
      pages = this.state.resultFormat === 'icon' ? this.state.resultsPages : 50;
    }
    
    var tql = TQLConverter.toTQL(query, {
      limit: MAX_RESULTS,
      replaceInputs: true,
    });
    
    if(tql !== this.state.tql)
    {
      this.setState({
        tql,
        allFieldsError: false,
      });
      
      this.props.onLoadStart && this.props.onLoadStart();
      this.state.xhr && this.state.xhr.abort();
      this.state.allXhr && this.state.allXhr.abort();
      
      this.setState({
        xhr: 
          Ajax.query(
            tql, 
            this.props.db, 
            this.handleResultsChange, 
            this.handleError
          ),
      });
      
      this.setState({
        allXhr:
          Ajax.query(
            TQLConverter.toTQL(query, {
              allFields: true,
              transformAliases: true,
              limit: MAX_RESULTS,
              replaceInputs: true,
            }), 
            this.props.db,
            this.handleAllFieldsResponse,
            this.handleAllFieldsError
          )
      });
      
      this.setState({
        countXhr: 
          Ajax.query(
            TQLConverter.toTQL(query, {
              count: true,
              replaceInputs: true,
            }), 
            this.props.db,
            this.handleCountResponse,
            this.handleCountError
          ),
      });
    }
  }
  
	render()
  {
    return (
      <div />
    );
	}
}

export function getPrimaryKeyFor(result:any, config:IResultsConfig): string
{
  if(config && config.primaryKeys.size)
  {
    return config.primaryKeys.map(
      field => result[field]
    ).join("and");
  }
  
  return "result-" + Math.floor(Math.random() * 100000000);
}
  

export default ResultsManager;