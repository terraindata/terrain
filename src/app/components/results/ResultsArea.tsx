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
import Util from '../../util/Util.tsx';
import Ajax from '../../util/Ajax.tsx';
import PanelMixin from '../layout/PanelMixin.tsx';
import Actions from "../../data/Actions.tsx";
import Result from "../results/Result.tsx";
import LayoutManager from "../layout/LayoutManager.tsx";
import InfoArea from '../common/InfoArea.tsx';
// import Paging from '../common/Paging.tsx';
import TQLConverter from "../../tql/TQLConverter.tsx";

var ResultsArea = React.createClass<any, any>({
	propTypes:
	{
    algorithm: React.PropTypes.object.isRequired,
    onLoadStart: React.PropTypes.func,
    onLoadEnd: React.PropTypes.func,
	},
  
  getInitialState()
  {
    return {
      results: null,
      resultText: null,
      expanded: false,
      expandedResult: {},
      tql: "",
      
      // pageChanging: false,
      // nextPage: null,
      // page: this.props.resultsPage,
      // hoveringPage: null,
      
    };
  },
  
  componentDidMount()
  {
    this.queryResults(this.props.algorithm);
  },
  
  componentWillUnmount()
  {
    if(this.state.xhr)
    {
      this.state.xhr.abort();
    }
  },
  
  componentWillReceiveProps(nextProps)
  {
    if(!_.isEqual(nextProps.algorithm, this.props.algorithm))
    {
      this.queryResults(nextProps.algorithm);
    }
  },
  
  handleCollapse()
  {
    this.setState({
      expanded: false,
    });
  },
  
  handleExpand(result)
  {
    this.setState({
      expanded: true,
      expandedResult: result,
    });
  },

  copy() {},
  
  clear() {},
  
  renderExpandedResult()
  {
    return (
      <div className={'result-expanded-wrapper' + (this.state.expanded ? '' : ' result-collapsed-wrapper')}>
        <div className='result-expanded-bg' onClick={this.handleCollapse}></div>
        <Result 
          data={this.state.expandedResult}
          parentId={this.props.parentId}
          onExpand={this.handleCollapse}
          expanded={true}
          drag_x={false}
          drag_y={false}
          index={-1}
          />
      </div>
    );
  },
  
  // changePage(page)
  // {
  //   this.setState({
  //     pageChanging: true,
  //     page: page,
  //   });
    
  //   Actions.results.changePage(this.props.parentId, page);
  // },
  
  // componentWillUpdate(newProps, newState)
  // {
  //   if(newState.pageChanging && newProps.resultsPage === newState.page)
  //   {
  //     this.setState({
  //       pageChanging: false,
  //     });
  //   }
  // },
  
  // handlePageHover(page)
  // {
  //   this.setState({
  //     hoverPage: page,
  //   });
    
  //   return true;
  // },
  
  // renderPaging()
  // {
  //   return (
  //     <Paging 
  //       page={this.props.resultsPage}
  //       pages={this.props.resultsPages}
  //       onChange={this.changePage}
  //       onHover={this.handlePageHover}
  //       onHoverEnd={this.handlePageHover}
  //       />
  //   );
  // },
  
  // moveResult(curIndex, newIndex)
  // {
  //   if(this.state.hoverPage)
  //   {
  //     alert('Moved to page ' + this.state.hoverPage);
  //     this.setState({
  //       hoverPage: null,
  //     });
  //     return;
  //   }
    
  //   Actions.results.move(this.props.results[curIndex], newIndex);
  // },
  
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
    
    var layout = {
      cells: this.state.results.map((result, index) => {
        return {
          content: <Result data={result} parentId={this.props.parentId} onExpand={this.handleExpand} index={index} />,
          key: result.id,
        };
      }),
      cellHeight: 200,
      minCellWidth: 175,
      fullHeight: true,
    };

    return <LayoutManager layout={layout} />; //moveTo={this.moveResult}
  },
  
  handleResultsChange(response)
  {
    var result;
    try {
      var result = JSON.parse(response).result;
    } catch(e) {
      this.setState({
        error: "No response was returned from the server.",
        xhr: null,
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
          xhr: null,
          querying: false,
          results: null,
          resultType: null,
        });
      }
      else if(result.raw_result)
      {
        this.setState({
          error: "Error with query: " + result.raw_result,
          xhr: null,
          querying: false,
          results: null,
          resultType: null,
        }); 
      }
      else
      {
        this.setState({
          results: result.value,
          resultType: result.type,
          querying: false,
          error: false,
          xhr: null,
        });
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
  },
  
  handleError(ev)
  {
    this.setState({
      error: true,
    })
  },
  
  queryResults(algorithm)
  {
    var tql = TQLConverter.toTQL(algorithm.cards);
    if(tql !== this.state.tql)
    {
      this.setState({
        querying: true,
        xhr: Ajax.query(tql, this.handleResultsChange, this.handleError),
        tql
      });
      this.props.onLoadStart && this.props.onLoadStart();
    }
  },

	render()
  {
        // { this.renderPaging() }
    return (
      <div className='results-area'>
        { this.renderResults() }
        { this.renderExpandedResult() }
      </div>
    );
	},
});

export default ResultsArea;