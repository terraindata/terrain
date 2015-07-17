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

function getTQL(dataArray) {
	
	var strTQL = new String("db");
	
	var arrayLength = dataArray.length;
	for (var i = 0; i < arrayLength; i++){
		switch(dataArray[i].type) {
			case 'from':
				strTQL = doFrom(strTQL, dataArray[i].table);
				break;
			case 'filter':
				strTQL = doFilter(strTQL, dataArray[i].filters);
				break;
		}
	}
	alert(strTQL);
}

function testGetTQL() {
	
	var objCards = [
		{
			type: 'from',
			table: 'products'
		},
		{
			type: 'filter',
			filters : [
				{
					combinator : 'none',
					first : 'rating',
					comparator : '>=',
					last : 'input.rating'
				},
				{
					combinator : 'and',
					first : 'price',
					comparator : '<',
					last : '400'
				},
				{
					combinator : 'or',
					first : 'city',
					comparator : '==',
					last : '\'San Francisco\''
				}
			]
		}
	]
	getTQL(objCards);
	
	
}

function doFrom(strTQL, strTable) {
	//db.from('product')
	strTQL += ".from('" + encodeURI(strTable) + "')";
	return strTQL;
}

function doFilter(strTQL, arrFilters) {
	//db.filter(<> table == 'product' && rating > 3)
	strTQL += ".filter(<>";
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
		//TBD: Will strings be passed from the interface with quotes or should that be handled here?
		//Next write out first
		strTQL += " " + arrFilters[i].first;
		
		//Next the comparator
		strTQL += " " + arrFilters[i].comparator;
		
		//TBD: Will strings be passed from the interface with quotes or should that be handled here?		
		//Finally the second term
		strTQL += " " + arrFilters[i].last;
				
	}
	strTQL += ")";
	return strTQL;
}
