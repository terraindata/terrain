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

/* 
 dataArray: array of cards of format:
 	type: 'from', 'select', 'filter', 'sort', 'slice', 'top', 'skip', 'max', 'as', selectFrom
 	[meta]
 meta: 
 	from: 
 		table: 'table name'
 	select:
 		args: array of objects
 			term: 'field name'
	filter:
		args: array of objects
			combinator: 'none', 'and', 'or'
			term: 'string expression' e.g. '\'rating\' >= \'input.rating\'' or "'city' == 'San Francisco'" or "'price' < 400"
	sort:
		args: array of objects
			direction: 'true' for asc, 'false' for desc
			term: e.g. 'rating'
	slice:
		low: integer
		high: integer
    top:
        numelements: integer
    skip:
        high: integer
    max:
        max: integer
    as:
        as: 'string'
    selectFrom:
        as: 
 */

var terrainConnector = function() {}; //angular.module('terrainConnector', []);

terrainConnector.getTQL = function(dataArray) {
	
	var strQuery = new String("db");
	
	var arrayLength = dataArray.length;
	for (var i = 0; i < arrayLength; i++){
		strQuery += terrainConnector.getTQLSnippet(dataArray[i]);
	}

	return strQuery;
}

terrainConnector.getTQLSnippet = function(card) {
	
		strSnippet = new String("");
	
		switch(card.type) {
			case 'from':
				strSnippet += terrainConnector.doFrom(card.table);
				break;
			case 'filter':
				strSnippet += terrainConnector.doFilter(card.args);
				break;
			case 'sort' :
				strSnippet += terrainConnector.doSort(card.args);
				break;
			case 'slice' :
				strSnippet += terrainConnector.doSlice(card.low, card.high);
				break;
			case 'select' :
				strSnippet += terrainConnector.doSelect(card.args);
				break;
			case 'equijoin' :
				strSnippet += terrainConnector.doEquijoin(card.colname, card.jointable, card.joincolname);
				break;
            case 'top' :
                strSnippet += terrainConnector.doTop(card.numelements);
                break;
            case 'skip' :
                strSnippet += terrainConnector.doSkip(card.high);
                break;
            case 'max' :
                strSnippet += terrainConnector.doMax(card.args, card.max);
                break;
            case 'as':
                strSnipped += terrainConnector.doAs(card.as);
                break;
            case 'selectfrom' :
                strSnippet += terrainConnector.doselectFrom(card.args);
                break;
		}
		
		return strSnippet;
}

terrainConnector.testGetTQL = function() {
	
	var objCards = [
		{
			type: 'from',
			table: '\'products\''
		},
		{
			type: 'equijoin',
			colname: '\'OwnerID\'',
			jointable: '\'owners\'',
			joincolname: '\'ID\''
		},
        {
			type: 'select',
			args : [
				{
					term : '\'rating\''
				},{
					term : '\'price\''
				},{
					term : '\'city\''
				}	
			]
		},
		{
			type: 'filter',
			args : [
				{
					combinator : 'none',
					term : '\'rating\' >= \'input.rating\''
				},
				{
					combinator : 'and',
					term : '\'price\' < 400'
				},
				{
					combinator : 'or',
					term : '\'city\' == \'San Francisco\''
				}
			]
		},
		{
			type: 'sort',
			args: [
				{
					//true is ascending, false is descending
					direction: 'true',
					term: '\'rating\''		
				},
				{
					direction: 'false',
					term: 'year + day / 365'
				}
			]
		},
		
        {
			type: 'slice',
			low: 5,
			high: 25
		},
        
        {
            type: 'top',
            numelements: 5
        },
        
        {
            type: 'skip',
            high: 25
        },
        
        {
            type: 'max',
            args: [
                {
                   term : '\'max\''
                }
        },
        
        {
            type: 'as',
            args : [
                {
                    term : '\'rating\''
                },{
                    term : '\'price\''
                },{
                    term : '\'city\''
                }
            ]
        },
        
        {
            type: 'selectFrom',
            args : [
                {
                    term : '\'rating\''
                },{
                    term : '\'price\''
                },{
                    term : '\'city\''
                }
            ]
        },
        
        

	]

	return terrainConnector.getTQL(objCards);
}

terrainConnector.doFrom = function(strTable) {
	
	var strTQL = new String("");
	strTQL += ".from(" + strTable + ")";
	return strTQL;
}

terrainConnector.doFilter = function(arrFilters) {
	var strTQL = new String("");
	strTQL += ".filter(";
	for (var i = 0; i < arrFilters.length; i++){
		
		//First handle the combinator if it exists
		switch(arrFilters[i].combinator) {
			case 'and':
				strTQL += " && ";
				break;
			case 'or' :
				strTQL += " || ";
				break;
		}		

		strTQL += arrFilters[i].term;			
	}
	strTQL += ")";
	return strTQL;
}

terrainConnector.doSort = function(arrSorts) {
	var strTQL = new String("");
	strTQL += ".sort(";
	// For each sort, write out the argument and the sort direction
	for (var i = 0; i < arrSorts.length; i++){
		if (i > 0) strTQL += ",";
		strTQL += arrSorts[i].term + "," + arrSorts[i].direction;
	}
	strTQL += ")";
	return strTQL;
}

terrainConnector.doSlice = function(low, high) {
	var strTQL = new String("");
	strTQL += ".slice(" + low + "," + high + ")";
	
	return strTQL;	
}

terrainConnector.doSelect = function(arrSelect) {
	var strTQL = new String("");
	strTQL += ".select(";
	
	for (var i = 0; i < arrSelect.length; i++){
		if (i > 0) strTQL += ",";
		strTQL += arrSelect[i].term;
	}
	strTQL += ")";
	return strTQL;
}

terrainConnector.doEquijoin = function(colname, jointable, joincolname) {
	var strTQL = new String("");
	strTQL += ".equijoin(" + colname + "," + jointable + "," + joincolname + ")";
	return strTQL;
}

terrainConnector.doTop = function(numelements) {
    var strTQL = new String("");
    strTQL += ".top(" + numelements + ")";
    
    return strTQL;
}

terrainConnector.doSkip = function(high) {
    var strTQL = new String("");
    strTQL += ".skip(" + high + ")";
    
    return strTQL;
}

terrainConnector.doMax = function(max) {
    var strTQL = new String("");
    strTQL += ".max(" + max + ")";
    
    return strTQL;
}
                    
                    
terrainConnector.doSelect = function(arrAs) {
    var strTQL = new String("");
    trTQL += ".as(";
                    
    for (var i = 0; i < arrAs.length; i++){
            if (i > 0) strTQL += ",";
            strTQL += arrAs[i].term;
        }
        strTQL += ")";
        return strTQL;
}

terrainConnector.doSelect = function(arrselectFrom) {
    var strTQL = new String("");
    strTQL += ".selectFrom(";
    
    for (var i = 0; i < arrselectFrom.length; i++){
        if (i > 0) strTQL += ",";
        strTQL += arrselectFrom[i].term;
    }
    strTQL += ")";
    return strTQL;
}


