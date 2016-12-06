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

require('./ResultsArea.less');
import * as Immutable from 'immutable';
const {Map,List} = Immutable;
import * as _ from 'underscore';
import * as React from 'react';
import * as classNames from 'classnames';
import Util from '../../../util/Util.tsx';
import {Ajax, QueryResponse} from '../../../util/Ajax.tsx';
import PanelMixin from '../layout/PanelMixin.tsx';
import Actions from "../../data/BuilderActions.tsx";
import Result from "../results/Result.tsx";
import ResultsTable from "../results/ResultsTable.tsx";
import {IResultsConfig, DefaultIResultsConfig, ResultsConfig} from "../results/ResultsConfig.tsx";
import InfoArea from '../../../common/components/InfoArea.tsx';
import TQLConverter from "../../../tql/TQLConverter.tsx";
import PureClasss from './../../../common/components/PureClasss.tsx';
import InfiniteScroll from './../../../common/components/InfiniteScroll.tsx';
import Switch from './../../../common/components/Switch.tsx';
import BuilderTypes from '../../BuilderTypes.tsx';
import {spotlightAction, SpotlightStore, SpotlightState} from '../../data/SpotlightStore.tsx';

const RESULTS_PAGE_SIZE = 20;
const MAX_RESULTS = 200;

interface Props
{
  query: BuilderTypes.IQuery;
  onLoadStart: () => void;
  onLoadEnd: () => void;
  canEdit: boolean;
}

interface State
{
  results: any[];
  resultsWithAllFields: any[];
  resultText: string;
  resultType: string;
  resultsCount: number;
  
  tql: string;
  error: any;
  
  resultFormat: string;
  showingConfig: boolean;
  
  expanded: boolean;
  expandedResultIndex: number;
  
  resultsPages: number;
  onResultsLoaded: (unchanged?: boolean) => void;
}

class ResultsArea extends PureClasss<Props>
{
  xhr = null;
  allXhr = null;
  countXhr = null;
  
  state: State = {
    results: null,
    resultsCount: null,
    resultsWithAllFields: null,
    resultText: null,
    expanded: false,
    expandedResultIndex: null,
    tql: "",
    error: null,
    resultType: null,
    showingConfig: false,
    resultsPages: 1,
    onResultsLoaded: null,
    resultFormat: 'icon',
  };
  
  constructor(props:Props)
  {
    super(props);
  }
  
  componentDidMount()
  {
    this.queryResults(this.props.query);
  }
  
  componentWillUnmount()
  {
    this.xhr && this.xhr.abort();
    this.allXhr && this.allXhr.abort();
    this.countXhr && this.countXhr.abort();
    this.xhr = false;
    this.allXhr = false;
    this.countXhr = false;
    this.timeout && clearTimeout(this.timeout);
  }
  
  componentWillReceiveProps(nextProps)
  {
    if(!_.isEqual(nextProps.query, this.props.query))
    {
      this.queryResults(nextProps.query);
      
      if(this.state.onResultsLoaded)
      {
        // reset infinite scroll
        this.state.onResultsLoaded(false);
      }
      
      if(nextProps.query.id !== this.props.query.id)
      {
        this.setState({
          results: null,
          resultsWithAllFields: null,
          resultText: 'Loading',
        })
      }
    }
  }
  
  handleCollapse()
  {
    this.setState({
      expanded: false,
    });
  }

  handleExpand(resultIndex: number)
  {
    this.setState({
      expanded: true,
      expandedResultIndex: resultIndex,
    });
  }
  
  copy() {}
  
  clear() {}
  
  renderExpandedResult()
  {
    let {results, resultsWithAllFields, expandedResultIndex} = this.state;
    if(results)
    {
      var result = results[expandedResultIndex];
    }
    if(resultsWithAllFields)
    {
      var resultAllFields = resultsWithAllFields[expandedResultIndex];
    }
    if(!result)
    {
      return null;
    }
    return (
      <div className={'result-expanded-wrapper' + (this.state.expanded ? '' : ' result-collapsed-wrapper')}>
        <div className='result-expanded-bg' onClick={this.handleCollapse}></div>
        <Result 
          data={result}
          allFieldsData={resultAllFields}
          config={this.getResultsConfig()}
          onExpand={this.handleCollapse}
          expanded={true}
          index={-1}
          primaryKey={getPrimaryKeyFor(result, this.getResultsConfig())}
          />
      </div>
    );
  }
  
  
  handleRequestMoreResults(onResultsLoaded: (unchanged?: boolean) => void)
  {
    let {resultsPages} = this.state;
    
    if(resultsPages * RESULTS_PAGE_SIZE < MAX_RESULTS)
    {
      this.setState({
        resultsPages: resultsPages + 1,
        onResultsLoaded,
      });
    }
    else
    {
      onResultsLoaded(true);
    }
  }
  
  componentDidUpdate()
  {
    if(this.state.onResultsLoaded)
    {
      this.setState({
        onResultsLoaded: null,
      });
      this.state.onResultsLoaded(false);
    }
  }
  
  resultsFodderRange = _.range(0, 25);
  
  renderResults()
  {
    if(this.state.error)
    {
      return <InfoArea
        large="There was an error with your query."
        small={this.state.error}
      />
    }
    
    if(!this.state.results && this.xhr)
    {
      return <InfoArea
        large="Querying results..."
      />;
    }
    else if(!this.state.results)
    {
      return <InfoArea
        large="Compose a query to view results here."
      />
    }
    
    if(this.state.resultType !== 'rel')
    {
      return (
        <div className='result-text'>
          {this.state.results}
        </div>
      );
    }
    
    if(!this.state.results.length)
    {
      return <InfoArea
        large="There are no results for your query."
        small="The query was successful, but there were no matches in the database."
      />;
    }
    
    if(this.state.resultFormat === 'table')
    {
      return (
        <div className='results-table-wrapper'>
          <ResultsTable
            {...this.state}
            resultsConfig={this.getResultsConfig()}
            onExpand={this.handleExpand}
          />
        </div>
      );
    }
    
    let config = this.getResultsConfig();
    
    return (
      <InfiniteScroll
        className='results-area-results'
        onRequestMoreItems={this.handleRequestMoreResults}
      >
        {
          this.state.results.map((result, index) => 
          {
            if(index > this.state.resultsPages * RESULTS_PAGE_SIZE)
            {
              return null;
            }
            
            let primaryKey = getPrimaryKeyFor(result, config);
            
            return (
              <Result
                data={result}
                allFieldsData={this.state.resultsWithAllFields && this.state.resultsWithAllFields[index]}
                config={this.getResultsConfig()}
                onExpand={this.handleExpand}
                index={index}
                key={primaryKey}
                primaryKey={primaryKey}
              />
            );
          }
          )
        }
        {
          this.resultsFodderRange.map(i => <div className='results-area-fodder' key={i} />)
        }
      </InfiniteScroll>
    );
  }
  
  handleAllFieldsResponse(response:QueryResponse)
  {
    this.handleResultsChange(response, true);
  }
  
  handleCountResponse(response:QueryResponse)
  {
    let results = response.resultSet;
    if(results)
    {
      if(results.length === 1)
      {
        this.setState({
          resultsCount: results[0]['count(*)']
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
      resultsCount: -1,
    })
  }
  
  timeout = null;
  
  handleResultsChange(response:QueryResponse, isAllFields?: boolean)
  {
    let xhrKey = isAllFields ? 'allXhr' : 'xhr';
    if(!this[xhrKey]) return;
    this[xhrKey] = null;
    
    if(response)
    {
      if(response.error)
      {
        if(!isAllFields)
        {
          this.setState({
            error: response.error.substr(0, response.error.length - 1),
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
          querying: false,
          error: false,
        });
      }
    }
    else
    {
      this.setState({
        error: "No response was returned from the server.",
      });
    }
    
    if(!this['xhr'] && !this['allXhr'])
    {
      // all done with both
      this.props.onLoadEnd && this.props.onLoadEnd();
    }
  }
  
  componentWillUpdate(nextProps, nextState: State)
  {
    if(nextState.results !== this.state.results 
      || nextState.resultsWithAllFields !== this.state.resultsWithAllFields)
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
  
  handleError(ev)
  {  
    this.setState({
      error: true,
    });
    this.props.onLoadEnd && this.props.onLoadEnd();
  }
  
  handleAllFieldsError()
  {
    this.props.onLoadEnd && this.props.onLoadEnd();
  }
  
  queryResults(query, pages?: number)
  {
    if(!pages)
    {
      pages = this.state.resultFormat === 'icon' ? this.state.resultsPages : 50;
    }
    
    if (query.mode === "tql")
    {
      var tql = query.tql;
    }
    else 
    {
      tql = TQLConverter.toTQL(query, {
        limit: MAX_RESULTS,
      });
    }
    if(tql !== this.state.tql)
    {
      this.setState({
        querying: true,
        tql
      });
      
      this.props.onLoadStart && this.props.onLoadStart();
      this.xhr && this.xhr.abort();
      this.allXhr && this.allXhr.abort();
      
      this.xhr = Ajax.query(tql, query.db, this.handleResultsChange, this.handleError);
      if (query.mode === "tql")
      {
        this.allXhr = Ajax.query(
          tql, 
          query.db,
          this.handleAllFieldsResponse,
          this.handleAllFieldsError,
          true
        );
      }
      else 
      {
        this.allXhr = Ajax.query(
          TQLConverter.toTQL(query, {
            allFields: true,
            transformAliases: true,
            // limit: pages * RESULTS_PAGE_SIZE,
          }), 
          query.db,
          this.handleAllFieldsResponse,
          this.handleAllFieldsError,
          true
        );
        
        this.countXhr = Ajax.query(
          TQLConverter.toTQL(query, {
            count: true,
          }), 
          query.db,
          this.handleCountResponse,
          this.handleCountError
        );
      }

    }
  }
  
  toggleView()
  {
    this.setState({
      resultFormat: this.state.resultFormat === 'icon' ? 'table' : 'icon',
    })
  }
  
  renderTopbar()
  {
    let count = this.state.resultsCount !== -1 ? this.state.resultsCount : (this.state.results ? this.state.results.length : 0);
    return (
      <div className='results-top'>
        <div className='results-top-summary'>
          {
            this.state.error ? 'Error with query' : 
            (
              this.state.results ? 
                `${count || 'No'} result${count === 1 ? '' : 's'}` 
              : 'Text result'
            )
          }
        </div>
        
        <Switch
          first='Icons'
          second='Table'
          onChange={this.toggleView}
          selected={this.state.resultFormat === 'icon' ? 1 : 2}
          small={true}
        />
        
        <div className='results-top-config' onClick={this.showConfig}>
          Customize view
        </div>
      </div>
    );
  }
  
  showConfig()
  {
    this.setState({
      showingConfig: true,
    });
  }
  
  hideConfig()
  {
    this.setState({
      showingConfig: false,
    });
  }
  
  getResultsConfig()
  {
    return this.props.query.resultsConfig || DefaultIResultsConfig;
  }
  
  renderConfig()
  {
    if(this.state.showingConfig)
    {
      return <ResultsConfig
        config={this.getResultsConfig()}
        onClose={this.hideConfig}
        onConfigChange={this.handleConfigChange}
        results={this.state.results}
        resultsWithAllFields={this.state.resultsWithAllFields}
      />;
    }
  }
  
  handleConfigChange(config:IResultsConfig)
  {
    Actions.change(List(['queries', this.props.query.id, 'resultsConfig']), config);
  }

	render()
  {
    return (
      <div className={classNames({
        'results-area': true,
        'results-area-config-open': this.state.showingConfig,
        'results-area-table': this.state.resultFormat === 'table',
      })}>
        { this.renderTopbar() }
        { this.renderResults() }
        { this.renderExpandedResult() }
        { this.renderConfig() }
      </div>
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
  

export default ResultsArea;