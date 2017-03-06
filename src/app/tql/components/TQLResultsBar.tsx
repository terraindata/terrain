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

require('./TQLResultsBar.less');
import * as _ from 'underscore';
import * as React from 'react';
import * as classNames from 'classnames';
import Util from '../../util/Util';
import {Ajax, QueryResponse} from '../../util/Ajax';
import Actions from "../../builder/data/BuilderActions";
import TQLConverter from "../../tql/TQLConverter";
import PureClasss from './../../common/components/PureClasss';
import BuilderTypes from '../../builder/BuilderTypes';
import {ResultsState} from '../../builder/components/results/ResultsManager';
interface Props 
{
  resultsState: ResultsState;
  onError: (lineNumber: number) => void;
  open: boolean;
  onToggle: () => void;
}

class TQLResultsBar extends PureClasss<Props>
{
  state: {
    mainErrorMessage?: string;
    subErrorMessage?: string;
    querying?: boolean;
    resultsSpliced?: number;
    errorLine?: number;
    queriedTql?: string;
    queryId?: string;
  } = {
  };
  
  componentWillReceiveProps(nextProps:Props) 
  {
    // check for an error line?
  }
    
  resultsFodderRange = _.range(0, 25);

  renderResults()
  {
    let {resultsState} = this.props;
    
    if(!resultsState.hasLoadedResults)
    {
      return <div>Querying results...</div>
    }

    if(resultsState.hasError)
    {
      return (
        <div>
          <span className="error-detail">
            {
              this.props.open ? '\u25BC ' : '\u25B6 '
            }
          </span>
          <span className="error-title">
            { 
              resultsState.errorMessage
            }
          </span>
          <span className="error-message">
            { 
            }
          </span>
        </div>
      );
    }

    let {results} = resultsState;

    if(!results) 
    {
      return <div>Compose a query to view results here.</div>
    }
    
    if(typeof results === 'string')
    {
      if(!results['length'])
      {
        return <em> "" (empty string)</em>;
      }
      return (
        <div>
          {
            results
          }
        </div>
      );
    }
    
    if(!results.size)
    {
      return <div>There are no results for your query.</div>;
    }
    
    return (
      <div>
        {
          results.map((result, i) =>
            <div key={i}>
              {
                JSON.stringify(result.rawFields.toJS())
              }
            </div>
          )
        }
      </div>
    );
  }
  
  // handleResultsChange(response: QueryResponse)
  // {
    
  //   if(response.errorMessage)
  //   {
  //     let error = response.errorMessage;
  //     error = error.replace(/MySQL/g, 'TerrainDB');
  //     if(error.charAt(error.length - 1) === '^')
  //     {
  //       error = error.substr(0, error.length - 1);
  //     }
  //     let matches = error.match(/([0-9]+)\:[0-9]+/);
  //     let line = matches && matches.length >= 2 && parseInt(matches[1]);
      
  //     if(line !== NaN && line !== null && line !== undefined)
  //     {
  //       var mainErrorMessage = 'Error on line ' + line + ': ';
  //       var subErrorMessage = error;
  //       this.props.onError(line);
  //     }
  //     else
  //     {
  //       var mainErrorMessage = error;
  //       var subErrorMessage: string = null;
  //     }
  // }
  
	render()
  {
    return (
      <div
        className={classNames({
          'tql-results-bar': true,
          'tql-results-bar-open': this.props.open,
        })}
        onClick={this.props.onToggle}
      >
        <div className='tql-results-bar-inner'>
          {
            this.renderResults()
          }
        </div>
      </div>
    );
	}
}

export default TQLResultsBar;