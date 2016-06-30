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
import * as React from 'react';
import * as classNames from 'classnames';
import Util from '../../../util/Util.tsx';
import Ajax from '../../../util/Ajax.tsx';
import PanelMixin from '../layout/PanelMixin.tsx';
import Actions from "../../data/BuilderActions.tsx";
import Result from "../results/Result.tsx";
import ResultsTable from "../results/ResultsTable.tsx";
import {Config, ResultsConfig} from "../results/ResultsConfig.tsx";
import InfoArea from '../../../common/components/InfoArea.tsx';
import TQLConverter from "../../../tql/TQLConverter.tsx";
import Classs from './../../../common/components/Classs.tsx';
import InfiniteScroll from './../../../common/components/InfiniteScroll.tsx';
import Switch from './../../../common/components/Switch.tsx';

const RESULTS_PAGE_SIZE = 25;

interface Props
{
  algorithm: any;
  onLoadStart: () => void;
  onLoadEnd: () => void;
  canEdit: boolean;
}

class ResultsArea extends Classs<Props>
{
  xhr = null;
  allXhr = null;
  
  state: {
    results: any[];
    resultsWithAllFields: any[];
    resultText: string;
    resultType: string;
    
    tql: string;
    error: any;
    
    resultFormat: string;
    resultsConfig: Config;
    showingConfig: boolean;
    
    expanded: boolean;
    expandedResultIndex: number;
    
    resultsPages: number;
    loadedResultsPages: number;
    onResultsLoaded: (unchanged?: boolean) => void;
  } = {
    results: null,
    resultsWithAllFields: null,
    resultsConfig: null,
    resultText: null,
    expanded: false,
    expandedResultIndex: null,
    tql: "",
    error: null,
    resultType: null,
    showingConfig: false,
    resultsPages: 1,
    loadedResultsPages: 1,
    onResultsLoaded: null,
    resultFormat: 'icon',
  };
  
  constructor(props:Props)
  {
    super(props);
    
    this.state.resultsConfig = this.getResultsConfig()[this.props.algorithm.id];
  }
  
  componentDidMount()
  {
    this.queryResults(this.props.algorithm);
  }
  
  componentWillUnmount()
  {
    this.xhr && this.xhr.abort();
    this.allXhr && this.allXhr.abort();
    this.xhr = false;
    this.allXhr = false;
    this.timeout && clearTimeout(this.timeout);
  }
  
  componentWillReceiveProps(nextProps)
  {
    if(!_.isEqual(nextProps.algorithm, this.props.algorithm))
    {
      this.queryResults(nextProps.algorithm);
      let resultsConfig = this.getResultsConfig()[nextProps.algorithm.id];
      this.setState({
        resultsConfig,
      });
      
      if(this.state.onResultsLoaded)
      {
        this.state.onResultsLoaded(false);
      }
      
      if(nextProps.algorithm.id !== this.props.algorithm.id)
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
          config={this.state.resultsConfig}
          onExpand={this.handleCollapse}
          expanded={true}
          drag_x={false}
          drag_y={false}
          index={-1}
          />
      </div>
    );
  }
  
  
  handleRequestMoreResults(onResultsLoaded: (unchanged?: boolean) => void)
  {
    if(this.state.loadedResultsPages !== this.state.resultsPages)
    {
      // still loading a previous request
      return;
    }
    
    let pages = this.state.resultsPages + 1;
    this.setState({
      resultsPages: pages,
      onResultsLoaded,
    });
    this.queryResults(this.props.algorithm, pages);
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
    
    if(!this.state.results)
    {
      return <InfoArea
        large="Querying results..."
      />;
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
          />
        </div>
      );
    }
    
    return (
      <InfiniteScroll
        className='results-area-results'
        onRequestMoreItems={this.handleRequestMoreResults}
      >
        {
          this.state.results.map((result, index) => 
            <Result
              data={result}
              allFieldsData={this.state.resultsWithAllFields && this.state.resultsWithAllFields[index]}
              config={this.state.resultsConfig}
              onExpand={this.handleExpand}
              index={index}
              canDrag={this.props.canEdit}
              key={index}
              format={this.state.resultFormat}
            />
          )
        }
        {
          this.resultsFodderRange.map(i => <div className='results-area-fodder' key={i} />)
        }
      </InfiniteScroll>
    );
  }
  
  handleAllFieldsResponse(response)
  {
    this.handleResultsChange(response, true);
  }
  
  timeout = null;
  
  handleResultsChange(response, isAllFields?: boolean)
  {
    let xhrKey = isAllFields ? 'allXhr' : 'xhr';
    if(!this[xhrKey]) return;
    this[xhrKey] = null;
    
    var result;
    try {
      var result = JSON.parse(response).result;
    } catch(e) {
      this.setState({
        error: "No response was returned from the server.",
        // TODO add error
      });
      return; 
    }
    
    this.props.onLoadEnd && this.props.onLoadEnd();
    if(result)
    {
      if(result.error)
      {
        this.setState({
          error: "Error on line " + result.line+": " + result.error,
          querying: false,
          results: null,
          resultType: null,
        });
      }
      else if(result.raw_result)
      {
        this.setState({
          error: "Error with query: " + result.raw_result,
          querying: false,
          results: null,
          resultType: null,
        }); 
      }
      else
      {
        if(isAllFields)
        {
          this.setState({
            resultsWithAllFields: result.value,
          });
        } else {
          if(this.state.onResultsLoaded && this.state.resultsPages !== this.state.loadedResultsPages)
          {
            this.setState({
              loadedResultsPages: this.state.resultsPages,
            });
            
            // set a timeout to prevent an infinite loop with InfiniteScroll
            // could move this somewhere that executes after the results have rendered
            this.timeout = setTimeout(() =>
              this.state.onResultsLoaded && this.state.onResultsLoaded(
                this.state.results &&
                result.value.length === this.state.results.length
              ), 1000);
          }
          
          this.setState({
            results: result.value,
            resultType: result.type,
            querying: false,
            error: false,
          });
        }
      }
    }
    else
    {
      this.setState({
        error: "No response was returned from the server.",
        xhr: null,
        // TODO add error
      });
    }
  }
  
  handleError(ev)
  {
    this.setState({
      error: true,
    })
  }
  
  queryResults(algorithm, pages?: number)
  {
    if(!pages)
    {
      pages = this.state.resultsPages;
    }
    
    var tql = TQLConverter.toTQL(algorithm.cards, {
      limit: pages * RESULTS_PAGE_SIZE,
    });
    console.log(tql);
    if(tql !== this.state.tql)
    {
      this.setState({
        querying: true,
        tql
      });
      
      this.props.onLoadStart && this.props.onLoadStart();
      this.xhr && this.xhr.abort();
      this.allXhr && this.allXhr.abort();
      
      this.xhr = Ajax.query(tql, this.handleResultsChange, this.handleError);
      this.allXhr = Ajax.query(TQLConverter.toTQL(algorithm.cards, {
        allFields: true,
        // limit: pages * RESULTS_PAGE_SIZE,
        // don't limit the all fields request
      }), 
        this.handleAllFieldsResponse,
        this.handleError
      );
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
    return (
      <div className='results-top'>
        <div className='results-top-summary'>
          {
            this.state.error ? 'Error with query' : 
            (
              this.state.resultsWithAllFields ? 
                `${this.state.resultsWithAllFields.length} results` 
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
    var config;
    try {
      config = JSON.parse(localStorage['resultsConfig'])
    } catch(e) {
      config = {};
    }
    if(typeof config !== 'object')
    {
      config = {};
    }
    return config;
  }
  
  renderConfig()
  {
    if(this.state.showingConfig)
    {
      return <ResultsConfig
        config={this.getResultsConfig()[this.props.algorithm.id]}
        onClose={this.hideConfig}
        onConfigChange={this.handleConfigChange}
        results={this.state.results}
        resultsWithAllFields={this.state.resultsWithAllFields}
      />;
    }
  }
  
  handleConfigChange(config:Config)
  {
    var resultsConfig = this.getResultsConfig();
    resultsConfig[this.props.algorithm.id] = config;
    localStorage['resultsConfig'] = JSON.stringify(resultsConfig);
    this.setState({
      resultsConfig: config,
    });
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

export default ResultsArea;