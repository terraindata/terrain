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
import * as moment from 'moment';

import Util from '../../../util/Util';
import {Ajax, QueryResponse} from '../../../util/Ajax';
import PanelMixin from '../layout/PanelMixin';
import Actions from "../../data/BuilderActions";
import Result from "../results/Result";
import ResultsTable from "../results/ResultsTable";
import {IResultsConfig, DefaultIResultsConfig, ResultsConfig} from "../results/ResultsConfig";
import InfoArea from '../../../common/components/InfoArea';
import TQLConverter from "../../../tql/TQLConverter";
import PureClasss from './../../../common/components/PureClasss';
import InfiniteScroll from './../../../common/components/InfiniteScroll';
import Switch from './../../../common/components/Switch';
import BuilderTypes from '../../BuilderTypes';
import {spotlightAction, SpotlightStore, SpotlightState} from '../../data/SpotlightStore';
import {ResultsState, MAX_RESULTS} from './ResultsManager';

const RESULTS_PAGE_SIZE = 20;

interface Props
{
  resultsState: ResultsState;
  db: string;
  query: BuilderTypes.Query;
  canEdit: boolean;
  variantName: string;
  
  onNavigationException: () => void;
}

interface State
{
  resultFormat: string;
  showingConfig: boolean;
  
  expanded: boolean;
  expandedResultIndex: number;
  
  resultsPages: number;
  onResultsLoaded: (unchanged?: boolean) => void;
}

class ResultsArea extends PureClasss<Props>
{
  state: State = {
    expanded: false,
    expandedResultIndex: null,
    showingConfig: false,
    resultsPages: 1,
    onResultsLoaded: null,
    resultFormat: 'icon',
  };
  
  constructor(props:Props)
  {
    super(props);
  }
  
  componentWillReceiveProps(nextProps)
  {
    if(nextProps.query.cards !== this.props.query 
      || nextProps.query.inputs !== this.props.query.inputs)
    {
      if(this.state.onResultsLoaded)
      {
        // reset infinite scroll
        this.state.onResultsLoaded(false);
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
    let {expandedResultIndex} = this.state;
    let {results} = this.props.resultsState;
    
    if(results)
    {
      var result = results.get(expandedResultIndex);
    }
    
    if(!result)
    {
      return null;
    }
    
    return (
      <div className={'result-expanded-wrapper' + (this.state.expanded ? '' : ' result-collapsed-wrapper')}>
        <div className='result-expanded-bg' onClick={this.handleCollapse}></div>
        <Result 
          result={result}
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
  
  isQueryEmpty(): boolean
  {
    let {query} = this.props;
    return !query || (!query.tql && !query.cards.size);
  }
  
  resultsFodderRange = _.range(0, 25);
  
  renderResults()
  {
    if(this.isQueryEmpty())
    {
      return <InfoArea
        large="Results will display here as you build your query."
      />
    }
    
    let {resultsState} = this.props;
    
    if(resultsState.hasError)
    {
      return <InfoArea
        large="There was an error with your query."
        small={resultsState.errorMessage}
      />;
    }
    
    if(!resultsState.results)
    {
      if(resultsState.rawResult)
      {
        return (
          <div className='result-text'>
            {
              resultsState.rawResult
            }
          </div>
        );
      }
      
      if(resultsState.loading)
      {
        return <InfoArea
          large="Querying results..."
        />;
      }
      
      return <InfoArea
        large="Compose a query to view results here."
      />
    }
    
    let {results} = resultsState;
    
    if(!results.size)
    {
      return <InfoArea
        large="There are no results for your query."
        small="The query was successful, but there were no matches."
      />;
    }
    
    if(this.state.resultFormat === 'table')
    {
      return (
        <div className='results-table-wrapper'>
          <ResultsTable
            results={results}
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
          results.map((result, index) => 
          {
            if(index > this.state.resultsPages * RESULTS_PAGE_SIZE)
            {
              return null;
            }
            
            return (
              <Result
                result={result}
                config={this.getResultsConfig()}
                onExpand={this.handleExpand}
                index={index}
                key={index}
                primaryKey={getPrimaryKeyFor(result, config)}
              />
            );
          })
        }
        {
          this.resultsFodderRange.map(
            i => 
              <div className='results-area-fodder' key={i} />
          )
        }
      </InfiniteScroll>
    );
  }
  
  handleExport()
  {
    this.props.onNavigationException();
    
    Ajax.query(
      this.props.query.tql,
      this.props.db, 
      _.noop,
      _.noop,
      false,
      {
        csv: true,
        csvName: this.props.variantName + ' on ' + moment().format('MM/DD/YY') + '.csv',
      }
    );
    
    alert('Your data are being prepared for export, and will automatically download when ready.\n\
Note: this exports the results of your query, which may be different from the results in the Results \
column if you have set a custom results view.');
  }
  
  toggleView()
  {
    this.setState({
      resultFormat: this.state.resultFormat === 'icon' ? 'table' : 'icon',
    })
  }
  
  renderTopbar()
  {
    let {resultsState} = this.props;
    
    var text = '';
    if(resultsState.loading)
    {
      text = 'Loading...';
    }
    else if(this.isQueryEmpty())
    {
      text = 'Empty query';
    }
    else if(resultsState.hasError)
    {
      text = 'Error with query';
    }
    else if(resultsState.results)
    {
      text = `${resultsState.count || 'No'} result${resultsState.count === 1 ? '' : 's'}`;
    }
    else
    {
      text = 'Text result';
    }
    
    return (
      <div className='results-top'>
        <div className='results-top-summary'>
          {
            text
          }
        </div>
        
        <div
          className='results-top-config'
          onClick={this.handleExport}
        >
          Export
        </div>
        
        <div
          className='results-top-config'
          onClick={this.showConfig}
        >
          Customize view
        </div>
        
        <Switch
          first='Icons'
          second='Table'
          onChange={this.toggleView}
          selected={this.state.resultFormat === 'icon' ? 1 : 2}
          small={true}
        />
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
        results={this.props.resultsState.results}
      />;
    }
  }
  
  handleConfigChange(config:IResultsConfig)
  {
    Actions.changeResultsConfig(config);
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