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

// You know our motto: We Deliver.

// eventId: HTML id assigned to button/input field/etc.

let host = "http://localhost:3000";

if (document.readyState !== 'loading')
{
  initialLoad();
}
else
{
  document.addEventListener('DOMContentLoaded', initialLoad);
}

let loadTime = 0;
let numClicks = 0;

function getCurrentTime()
{
  return new Date().toISOString();
};

function getCurrentTimeOnPage()
{
  return ((new Date()) - loadTime) / 1000;
};

function initialLoad()
{
  loadTime = new Date();
  numClicks = 0;
  document.onclick = function(e)
  {
    numClicks += 1;
  };
  getHTMLIDs();
};

// TF specific function
function getHTMLIDs(callback)
{
  let url = document.URL;

  url = url.split(/^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)/).splice(1);
  const route = '/' + url[1].split('/')[1];
  url = url[0] + url[1].split('/')[0] + '/' + 'events/ids';
  url = host + "/events/";
  console.log('url='+url);

  const xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function()
  {
    if (xhttp.readyState === XMLHttpRequest.DONE && xhttp.status === 200)
    {
      console.log('res = '+xhttp.response);
      if(xhttp.response != undefined)
          uploadCartography(JSON.parse(xhttp.response));
    }
  }
  xhttp.open("GET", url);
  xhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
  xhttp.send();
}

function getEventValue(eventObjs, eventId)
{
  const eventObjArr = eventObjs.filter(function(obj) {
    return obj['eventId'] === eventId;
  });
  const eventObj = eventObjArr[0];
  return {
    eventId: eventObj["eventId"],
    name: eventObj["name"] !== undefined ? eventObj["name"] : '',
    value: document.getElementById(eventObj["eventId"]).value,
  };
}

function uploadCartography(EventIdLst, callback)
{
  // It's Quiet...
  // Too Quiet
  let url = document.URL;

  url = url.split(/^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)/).splice(1);
  const route = '/' + url[1].split('/')[1];
  url = url[0] + url[1].split('/')[0] + '/' + 'events/';
  url = host + "/events/";
  console.log('url = '+url);
  const xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function()
  {
    if (xhttp.readyState === XMLHttpRequest.DONE && xhttp.status === 200)
    {
      console.log('res2 = '+xhttp.response);
      respArr = JSON.parse(xhttp.response);
      for (let ind = 0; ind < respArr.length; ++ind)
      {
        const resp = respArr[ind];
        if (document.getElementById(resp["eventId"]) !== null)
        {
          document.getElementById(resp["eventId"]).addEventListener(resp["eventType"], function ()
          {
            const respDependencies = resp["payload"]["dependencies"];
            const respDepValues = respDependencies.map(function (dependency)
            {
              return getEventValue(respArr, dependency);
            });
            Object.assign(resp["payload"],
            {
              "numClicks": numClicks,
              "loadTime": getCurrentTimeOnPage(),
              "date": getCurrentTime(),
              "dependencies": respDepValues,
            });
            const eventIdValue = document.getElementById(resp["eventId"]).value;
            resp["value"] = eventIdValue !== null ? eventIdValue.toString() : resp["name "];
            resp["url"] = route;
            const xhttpUpdate = new XMLHttpRequest();
            xhttpUpdate.open("POST", url+'update/');
            xhttpUpdate.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
            xhttpUpdate.send(JSON.stringify(resp));
          });
        }
      }
    }
  }
  xhttp.open("POST", url);
  xhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
  xhttp.send(JSON.stringify({"body": EventIdLst}));
}
