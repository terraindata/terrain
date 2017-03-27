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

import * as test from 'tape';
import * as chai from 'chai';
const {assert} = chai;
import * as sinon from 'sinon';

// normally you would require the files to test here, but instead we'll declare an example class:
class SmartClass
{
  static sharedCount: number = 0;
  myCount: number = 0;
  
  constructor(getCount: () => number)
  {
    this.myCount = getCount();
  }
  
  getCount(): number
  {
    return this.myCount;
  }
  
  increment(): void
  {
    this.myCount ++;
    SmartClass.sharedCount ++;
  }
  
  static getTotalCount(): number
  {
    return this.sharedCount;
  }
}

test('SmartClass constructor accepts an initial count function', (t) => {
  // initialize any mocks, spys, stubs
  const initMyCount = 24;
  let stub = sinon.stub().returns(initMyCount);
  let initTotalCount = SmartClass.getTotalCount();
  
  // run the tested code
  let myClass = new SmartClass(stub);
  
  // verify everything
  assert(stub.calledOnce);
  t.equal(myClass.getCount(), initMyCount, 'count is set correctly');
  t.equal(SmartClass.getTotalCount(), initTotalCount, 'static count is unchanged')
  t.end();
});


// Even though these two test cases re-use a good amount of the same code, it is best to split
//  your tests into different groups that test each specific behavior. This way, when a test fails,
//. you will know exactly where to look for the failure.
// In this example, if there was an issue with the constructor, the first group would fail and you
//. would know without a doubt to look in the constructor. But if the first passed and the second failed,
//. you would know that the constructor is fine, and that you should instead look at the increment function.

test('SmartClass increment() increments instance count and static count', function(t) {
  // initialize any mocks, spys, stubs
  const initMyCount = 17;
  let stub = sinon.stub().returns(initMyCount);
  let initTotalCount = SmartClass.getTotalCount();
  
  // run the tested code
  let myClass = new SmartClass(stub);
  myClass.increment();
  
  // verify everything
  t.equal(myClass.getCount(), initMyCount + 1, 'instance count is incremented');
  t.equal(SmartClass.getTotalCount(), initTotalCount + 1, 'static count is incremented')
  t.end();
});
