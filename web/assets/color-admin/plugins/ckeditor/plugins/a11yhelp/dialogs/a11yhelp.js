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

﻿/*
 Copyright (c) 2003-2013, CKSource - Frederico Knabben. All rights reserved.
 For licensing, see LICENSE.html or http://ckeditor.com/license
*/
CKEDITOR.dialog.add("a11yHelp",function(j){var l=j.lang.a11yhelp,m=CKEDITOR.tools.getNextId(),d={8:"BACKSPACE",9:"TAB",13:"ENTER",16:"SHIFT",17:"CTRL",18:"ALT",19:"PAUSE",20:"CAPSLOCK",27:"ESCAPE",33:"PAGE UP",34:"PAGE DOWN",35:"END",36:"HOME",37:"LEFT ARROW",38:"UP ARROW",39:"RIGHT ARROW",40:"DOWN ARROW",45:"INSERT",46:"DELETE",91:"LEFT WINDOW KEY",92:"RIGHT WINDOW KEY",93:"SELECT KEY",96:"NUMPAD  0",97:"NUMPAD  1",98:"NUMPAD  2",99:"NUMPAD  3",100:"NUMPAD  4",101:"NUMPAD  5",102:"NUMPAD  6",103:"NUMPAD  7",
104:"NUMPAD  8",105:"NUMPAD  9",106:"MULTIPLY",107:"ADD",109:"SUBTRACT",110:"DECIMAL POINT",111:"DIVIDE",112:"F1",113:"F2",114:"F3",115:"F4",116:"F5",117:"F6",118:"F7",119:"F8",120:"F9",121:"F10",122:"F11",123:"F12",144:"NUM LOCK",145:"SCROLL LOCK",186:"SEMI-COLON",187:"EQUAL SIGN",188:"COMMA",189:"DASH",190:"PERIOD",191:"FORWARD SLASH",192:"GRAVE ACCENT",219:"OPEN BRACKET",220:"BACK SLASH",221:"CLOSE BRAKET",222:"SINGLE QUOTE"};d[CKEDITOR.ALT]="ALT";d[CKEDITOR.SHIFT]="SHIFT";d[CKEDITOR.CTRL]="CTRL";
var e=[CKEDITOR.ALT,CKEDITOR.SHIFT,CKEDITOR.CTRL],n=/\$\{(.*?)\}/g,q=function(){var o=j.keystrokeHandler.keystrokes,f={},b;for(b in o)f[o[b]]=b;return function(b,g){var a;if(f[g]){a=f[g];for(var h,i,k=[],c=0;c<e.length;c++)i=e[c],h=a/e[c],1<h&&2>=h&&(a-=i,k.push(d[i]));k.push(d[a]||String.fromCharCode(a));a=k.join("+")}else a=b;return a}}();return{title:l.title,minWidth:600,minHeight:400,contents:[{id:"info",label:j.lang.common.generalTab,expand:!0,elements:[{type:"html",id:"legends",style:"white-space:normal;",
focus:function(){this.getElement().focus()},html:function(){for(var d='<div class="cke_accessibility_legend" role="document" aria-labelledby="'+m+'_arialbl" tabIndex="-1">%1</div><span id="'+m+'_arialbl" class="cke_voice_label">'+l.contents+" </span>",f=[],b=l.legend,j=b.length,g=0;g<j;g++){for(var a=b[g],h=[],i=a.items,k=i.length,c=0;c<k;c++){var e=i[c],p=e.legend.replace(n,q);p.match(n)||h.push("<dt>%1</dt><dd>%2</dd>".replace("%1",e.name).replace("%2",p))}f.push("<h1>%1</h1><dl>%2</dl>".replace("%1",
a.name).replace("%2",h.join("")))}return d.replace("%1",f.join(""))}()+'<style type="text/css">.cke_accessibility_legend{width:600px;height:400px;padding-right:5px;overflow-y:auto;overflow-x:hidden;}.cke_browser_quirks .cke_accessibility_legend,.cke_browser_ie6 .cke_accessibility_legend{height:390px}.cke_accessibility_legend *{white-space:normal;}.cke_accessibility_legend h1{font-size: 20px;border-bottom: 1px solid #AAA;margin: 5px 0px 15px;}.cke_accessibility_legend dl{margin-left: 5px;}.cke_accessibility_legend dt{font-size: 13px;font-weight: bold;}.cke_accessibility_legend dd{margin:10px}</style>'}]}],
buttons:[CKEDITOR.dialog.cancelButton]}});