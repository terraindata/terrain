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
CKEDITOR.dialog.add("anchor",function(c){var d=function(a){this._.selectedElement=a;this.setValueOf("info","txtName",a.data("cke-saved-name")||"")};return{title:c.lang.link.anchor.title,minWidth:300,minHeight:60,onOk:function(){var a=CKEDITOR.tools.trim(this.getValueOf("info","txtName")),a={id:a,name:a,"data-cke-saved-name":a};if(this._.selectedElement)this._.selectedElement.data("cke-realelement")?(a=c.document.createElement("a",{attributes:a}),c.createFakeElement(a,"cke_anchor","anchor").replace(this._.selectedElement)):
this._.selectedElement.setAttributes(a);else{var b=c.getSelection(),b=b&&b.getRanges()[0];b.collapsed?(CKEDITOR.plugins.link.synAnchorSelector&&(a["class"]="cke_anchor_empty"),CKEDITOR.plugins.link.emptyAnchorFix&&(a.contenteditable="false",a["data-cke-editable"]=1),a=c.document.createElement("a",{attributes:a}),CKEDITOR.plugins.link.fakeAnchor&&(a=c.createFakeElement(a,"cke_anchor","anchor")),b.insertNode(a)):(CKEDITOR.env.ie&&9>CKEDITOR.env.version&&(a["class"]="cke_anchor"),a=new CKEDITOR.style({element:"a",
attributes:a}),a.type=CKEDITOR.STYLE_INLINE,c.applyStyle(a))}},onHide:function(){delete this._.selectedElement},onShow:function(){var a=c.getSelection(),b=a.getSelectedElement();if(b)CKEDITOR.plugins.link.fakeAnchor?((a=CKEDITOR.plugins.link.tryRestoreFakeAnchor(c,b))&&d.call(this,a),this._.selectedElement=b):b.is("a")&&b.hasAttribute("name")&&d.call(this,b);else if(b=CKEDITOR.plugins.link.getSelectedLink(c))d.call(this,b),a.selectElement(b);this.getContentElement("info","txtName").focus()},contents:[{id:"info",
label:c.lang.link.anchor.title,accessKey:"I",elements:[{type:"text",id:"txtName",label:c.lang.link.anchor.name,required:!0,validate:function(){return!this.getValue()?(alert(c.lang.link.anchor.errorName),!1):!0}}]}]}});