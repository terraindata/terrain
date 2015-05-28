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

/**
 * 
 * Script for loading and caching commit history
 * 
 */
!function(root, $) {
    /**
     * Fetch latest commits from Github API and cache them
     * @link https://gist.github.com/4520294
     * 
     */
    root["ghcommits"] = {
        "repo_name": "mjaalnir/bootstrap-colorpicker",
        "cache_enabled": true, //cache api responses?
        "cache_ttl": (2 * 60 * 60), // 2h (in seconds)
        "onload": {},
        "callback": function() {
        },
        "load": function(count, onload) {
            var $self = this;
            count = count || 10;
            $self.onload = onload || function() {
            };

            if ($self.cache_enabled && root["localStorage"]) {
                var cache_key = "repo_commits";
                var expiration = localStorage.getItem(cache_key + "_expiration");
                if (expiration && (expiration < +new Date())) {
                    localStorage.removeItem(cache_key);
                    localStorage.removeItem(cache_key + "_expiration");
                    expiration = false;
                }
                var commits = localStorage.getItem(cache_key);
                if (commits) {
                    if (root["console"])
                        console.info("Commit data feched from localStorage");
                    $self.store(JSON.parse(commits), false);
                    $self.onload($self.data);
                    return;
                }
            }
            $self.query(count);
        },
        "store": function(commitsJson, cache) {
            var $self = this;
            $self.data = commitsJson;
            if (cache && root["localStorage"]) {
                localStorage.setItem("repo_commits", JSON.stringify(commitsJson));
                localStorage.setItem("repo_commits_expiration", +new Date() + 1000 * $self.cache_ttl);
            }
        },
        "query": function(count) {
            var $self = this;
            var query_url = 'https://api.github.com/repos/' + $self.repo_name + '/commits?per_page=' + count;
            console.info("Fetching commit data from " + query_url);
            $.ajax({'dataType': "jsonp", 'url': query_url, 'jsonpCallback': 'ghcommits._jsonpcb'});
        },
        "_jsonpcb": function(jsonpresp) {
            ghcommits.store(jsonpresp.data, ghcommits.cache_enabled);
            ghcommits.onload(ghcommits.data);
        }
    }

    $(function() {
        try {
            // load latest commits under a try to not paralize the app
            ghcommits.load(10, function(data) {
                if (data && (data.length > 0)) {
                    $(data).each(function(i, item) {
                        $("#changelog ul").append($('<li>').html("<b>" + item.commit.author
                                .date.replace("T", " ").replace("Z", "") +
                                ":</b> " + item.commit.message));
                    });
                }

            });
        } catch (err) {
            // noop
        }
    });
}(window, window.jQuery);