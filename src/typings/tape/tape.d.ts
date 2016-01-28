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

// Type definitions for tape v4.2.2
// Project: https://github.com/substack/tape
// Definitions by: Bart van der Schoor <https://github.com/Bartvds>, Haoqun Jiang <https://github.com/sodatea>
// Definitions: https://github.com/borisyankov/DefinitelyTyped

/// <reference path="../node/node.d.ts" />

declare module 'tape' {
	export = tape;

	/**
	 * Create a new test with an optional name string and optional opts object.
	 * cb(t) fires with the new test object t once all preceeding tests have finished.
	 * Tests execute serially.
	 */
	function tape(name: string, cb: tape.TestCase): void;
	function tape(name: string, opts: tape.TestOptions, cb: tape.TestCase): void;
	function tape(cb: tape.TestCase): void;
	function tape(opts: tape.TestOptions, cb: tape.TestCase): void;

	module tape {

		interface TestCase {
			(test: Test): void;
		}

		/**
		 * Available opts options for the tape function.
		 */
		interface TestOptions {
			skip?: boolean;		// See tape.skip.
			timeout?: number;	// Set a timeout for the test, after which it will fail. See tape.timeoutAfter.
		}

		/**
		 * Options for the createStream function.
		 */
		interface StreamOptions {
			objectMode?: boolean;
		}

		/**
		 * Generate a new test that will be skipped over.
		 */
		export function skip(name: string, cb: tape.TestCase): void;

		/**
		 * Like test(name, cb) except if you use .only this is the only test case that will run for the entire process, all other test cases using tape will be ignored.
		 */
		export function only(name: string, cb: tape.TestCase): void;

		/**
		 * Create a new test harness instance, which is a function like test(), but with a new pending stack and test state.
		 */
		export function createHarness(): typeof tape;
		/**
		 * Create a stream of output, bypassing the default output stream that writes messages to console.log().
		 * By default stream will be a text stream of TAP output, but you can get an object stream instead by setting opts.objectMode to true.
		 */
		export function createStream(opts?: tape.StreamOptions): NodeJS.ReadableStream;

		interface Test {
			/**
			 * Create a subtest with a new test handle st from cb(st) inside the current test.
			 * cb(st) will only fire when t finishes.
			 * Additional tests queued up after t will not be run until all subtests finish.
			 */
			test(name: string, cb: tape.TestCase): void;

			/**
			 * Declare that n assertions should be run. end() will be called automatically after the nth assertion.
			 * If there are any more assertions after the nth, or after end() is called, they will generate errors.
			 */
			plan(n: number): void;

			/**
			 * Declare the end of a test explicitly.
			 * If err is passed in t.end will assert that it is falsey.
			 */
			end(err?: any): void;

			/**
			 * Generate a failing assertion with a message msg.
			 */
			fail(msg?: string): void;

			/**
			 * Generate a passing assertion with a message msg.
			 */
			pass(msg?: string): void;

			/**
			 * Automatically timeout the test after X ms.
			 */
			timeoutAfter(ms: number): void;

			/**
			 * Generate an assertion that will be skipped over.
			 */
			skip(msg?: string): void;

			/**
			 * Assert that value is truthy with an optional description message msg.
			 */
			ok(value: any, msg?: string): void;
			true(value: any, msg?: string): void;
			assert(value: any, msg?: string): void;

			/**
			 * Assert that value is falsy with an optional description message msg.
			 */
			notOk(value: any, msg?: string): void;
			false(value: any, msg?: string): void;
			notok(value: any, msg?: string): void;

			/**
			 * Assert that err is falsy.
			 * If err is non-falsy, use its err.message as the description message.
			 */
			error(err: any, msg?: string): void;
			ifError(err: any, msg?: string): void;
			ifErr(err: any, msg?: string): void;
			iferror(err: any, msg?: string): void;

			/**
			 * Assert that a === b with an optional description msg.
			 */
			equal(a: any, b: any, msg?: string): void;
			equals(a: any, b: any, msg?: string): void;
			isEqual(a: any, b: any, msg?: string): void;
			is(a: any, b: any, msg?: string): void;
			strictEqual(a: any, b: any, msg?: string): void;
			strictEquals(a: any, b: any, msg?: string): void;

			/**
			 * Assert that a !== b with an optional description msg.
			 */
			notEqual(a: any, b: any, msg?: string): void;
			notEquals(a: any, b: any, msg?: string): void;
			notStrictEqual(a: any, b: any, msg?: string): void;
			notStrictEquals(a: any, b: any, msg?: string): void;
			isNotEqual(a: any, b: any, msg?: string): void;
			isNot(a: any, b: any, msg?: string): void;
			not(a: any, b: any, msg?: string): void;
			doesNotEqual(a: any, b: any, msg?: string): void;
			isInequal(a: any, b: any, msg?: string): void;

			/**
			 * Assert that a and b have the same structure and nested values using node's deepEqual() algorithm with strict comparisons (===) on leaf nodes and an optional description msg.
			 */
			deepEqual(a: any, b: any, msg?: string): void;
			deepEquals(a: any, b: any, msg?: string): void;
			isEquivalent(a: any, b: any, msg?: string): void;
			same(a: any, b: any, msg?: string): void;

			/**
			 * Assert that a and b do not have the same structure and nested values using node's deepEqual() algorithm with strict comparisons (===) on leaf nodes and an optional description msg.
			 */
			notDeepEqual(a: any, b: any, msg?: string): void;
			notEquivalent(a: any, b: any, msg?: string): void;
			notDeeply(a: any, b: any, msg?: string): void;
			notSame(a: any, b: any, msg?: string): void;
			isNotDeepEqual(a: any, b: any, msg?: string): void;
			isNotDeeply(a: any, b: any, msg?: string): void;
			isNotEquivalent(a: any, b: any, msg?: string): void;
			isInequivalent(a: any, b: any, msg?: string): void;

			/**
			 * Assert that a and b have the same structure and nested values using node's deepEqual() algorithm with loose comparisons (==) on leaf nodes and an optional description msg.
			 */
			deepLooseEqual(a: any, b: any, msg?: string): void;
			looseEqual(a: any, b: any, msg?: string): void;
			looseEquals(a: any, b: any, msg?: string): void;

			/**
			 * Assert that a and b do not have the same structure and nested values using node's deepEqual() algorithm with loose comparisons (==) on leaf nodes and an optional description msg.
			 */
			notDeepLooseEqual(a: any, b: any, msg?: string): void;
			notLooseEqual(a: any, b: any, msg?: string): void;
			notLooseEquals(a: any, b: any, msg?: string): void;

			/**
			 * Assert that the function call fn() throws an exception.
			 * expected, if present, must be a RegExp or Function, which is used to test the exception object.
			 */
			throws(fn: () => void, msg?: string): void;
			throws(fn: () => void, exceptionExpected: RegExp | (() => void), msg?: string): void;

			/**
			 * Assert that the function call fn() does not throw an exception.
			 */
			doesNotThrow(fn: () => void, msg?: string): void;
			doesNotThrow(fn: () => void, exceptionExpected: RegExp | (() => void), msg?: string): void;

			/**
			 * Print a message without breaking the tap output.
			 * (Useful when using e.g. tap-colorize where output is buffered & console.log will print in incorrect order vis-a-vis tap output.)
			 */
			comment(msg: string): void;
		}
	}
}
