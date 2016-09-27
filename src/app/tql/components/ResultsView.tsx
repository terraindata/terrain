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
import Util from '../../util/Util.tsx';
import Ajax from '../../util/Ajax.tsx';
import Actions from "../../builder/data/BuilderActions.tsx";
import TQLConverter from "../../tql/TQLConverter.tsx";
import Classs from './../../common/components/Classs.tsx';

interface Props 
{
  tql: string;
  onError: (lineNumber: number) => void;
  onLoadStart: () => void;
  onLoadEnd: () => void;
  db: string;
}

class ResultsView extends Classs<Props>
{
  xhr = null;
  
  state: {
    results: any[];
    error: any;
    querying: boolean;
    showErrorMessage: boolean;
    resultsSpliced: number;
    errorLine: number;
  } = {
    results: null,
    error: null,
    querying: false,
    showErrorMessage: false,
    resultsSpliced: 0,
    errorLine: NaN,
  };

  //If the component updates and the tql command has been changed, then query results
  componentWillReceiveProps(nextProps) 
  {
    if(nextProps.tql !== this.props.tql) 
    {
      this.queryResults(nextProps.tql);
    } 
  }
    
  resultsFodderRange = _.range(0, 25);
  
  toggleError() 
  {
    this.setState({
      showErrorMessage: !this.state.showErrorMessage,
    });
  }

  shouldComponentUpdate(nextProps, nextState) {
    return !(_.isEqual(this.props, nextProps) && _.isEqual(this.state, nextState));
  }

  renderResults()
  {
    if(this.state.querying)
    {
      return <div>Querying results...</div>
    } 

    if(this.state.error)
    {
      // TODO figure out the correct title
      // if (this.state.error === 'No response was returned from the server.' || ! this.state.error)
      // {
      //   return (
      //     <div>
      //       <span className="error-title">
      //         No response was returned from the server.
      //       </span>
      //     </div>
      //   );
      // }
      
      if(typeof this.state.error !== 'string')
      {
        return (
          <div>
            <span className="error-title">
              { JSON.stringify(this.state.error) }
            </span>
          </div>
        );
      }
      
      if(this.state.errorLine !== NaN)
      {
        var mainMessage = this.state.errorLine ? 'Error on line ' + this.state.errorLine : this.state.error;
        var subMessage =this.state.error;
        this.props.onError(this.state.errorLine);
      }
      else
      {
        var mainMessage = this.state.error;
        var subMessage = null;
      }
      
      return (
        <div>
          <div onClick={this.toggleError}>
            { 
              subMessage && 
              <span className="error-detail">
                {this.state.showErrorMessage ? '\u25BC ' : '\u25B6 '}
              </span>
            }
            <span className="error-title">
              Error on line { this.state.errorLine }
            </span>
          </div>
          {
            this.state.showErrorMessage &&
              <div className="error-message">
                { subMessage }
              </div>
          }
        </div>
      );
    }

    if(!this.state.results) 
    {
      return <div>Compose a query to view results here.</div>
    }
    
    if(typeof this.state.results === 'string')
    {
      if(!this.state.results.length)
      {
        return <em> "" (empty string)</em>;
      }
      return <div>{this.state.results}</div>;
    }
    
    if(!this.state.results.length)
    {
      return <div>There are no results for your query.</div>;
    }
    
    var i = 0;
     return(
        <div>
          <ul className="results-list">
          {
            this.state.results.map((result, i) =>
              <li key={i}>{JSON.stringify(result)}</li>
            )
          }
        </ul>
        {
          this.state.resultsSpliced ? <em> And {this.state.resultsSpliced} more results </em> : null
        }
        </div>
      );
  }
  
  handleResultsChange(results)
  {
    this.props.onLoadEnd && this.props.onLoadEnd();
    if(results)
    {
      if(results.error)
      {
        let {error} = results;
        let line = parseInt(error.match(/([0-9]+)\:[0-9]+/)[1]);
        
        this.setState({
          error: error.substr(0, error.length - 1),
          errorLine: line,
          querying: false,
          results: null,
        });
        return;
      }
      
      var spliced = 0;
      if(typeof results === 'string')
      {
        if(results.length > 1000)
        {
          spliced = results.length - 1000;
          results = results.substr(0, 1000) + '...';
        }
      }
      if(Array.isArray(results))
      {
        if(results.length > 25)
        {
          spliced = results.length - 25;
          results.splice(25, results.length - 25);
        }
      }
      
      this.setState({
        results,
        querying: false,
        error: false,
        resultsSpliced: spliced,
      });
    }
    else
    {
      this.setState({
        error: "No response was returned from the server.",
        xhr: null,
        querying: false,
      });
    }
  }
  
  handleError(ev)
  {
    this.setState({
      error: ev,
      querying: false,
    });
  }
  
  queryResults(tql)
  {
    if(tql) 
    {
      this.props.onLoadStart && this.props.onLoadStart();
      this.setState({
        querying: true,
      });
      this.xhr = Ajax.query(tql, this.props.db, this.handleResultsChange, this.handleError);
    }
  }
  
	render()
  {
    return (
      <div className="scrolling">
        { this.renderResults() }
      </div>
    );
	}
}

export default ResultsView;