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

var webpage = require("webpage"),
    fs = require("fs");

var html_path = fs.absolute("test.html");
var examples = [];

function run_example(example_index) {
  if (example_index >= examples.length) {
    phantom.exit(0);
    return;
  }

  var example = examples[example_index];
  var snapshot_index = 0;
  var page = webpage.create();

  page.viewportSize = { width: 500, height: 300 };
  page.clipRect = { width: 500, height: 300 };
  page.onAlert = function (msg) {
    var e = JSON.parse(msg);
    if (e.fn == "snapshot") {
      page.render("output/" + example.name + snapshot_index + ".png");
      snapshot_index += 1;
    } else if (e.fn == "mousemove") {
      page.sendEvent("mousemove", e.x, e.y);
    }
  };

  page.open(html_path, function (status) {
    if (status == "fail") {
      console.log("Failed to load test page: " + example.name);
      phantom.exit(1);
    } else {
      page.evaluate(example.runner);
    }
    page.close();
    run_example(example_index + 1);
  });
}

exports.def = function (name, runner) {
  examples.push({ name: name, runner: runner });
};

exports.run = function () {
  if (fs.isDirectory("output")) {
    fs.list("output").forEach(function (path) {
      if (path != "." && path != "..") {
        fs.remove("output/" + path);
      }
    });
  } else {
    fs.makeDirectory("output");
  }
  run_example(0);
};
