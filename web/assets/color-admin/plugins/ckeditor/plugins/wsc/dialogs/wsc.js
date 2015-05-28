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
 Copyright (c) 2003-2012, CKSource - Frederico Knabben. All rights reserved.
 For licensing, see LICENSE.html or http://ckeditor.com/license
*/
CKEDITOR.dialog.add("checkspell",function(a){function c(a,c){var d=0;return function(){"function"==typeof window.doSpell?("undefined"!=typeof e&&window.clearInterval(e),j(a)):180==d++&&window._cancelOnError(c)}}function j(c){var f=new window._SP_FCK_LangCompare,b=CKEDITOR.getUrl(a.plugins.wsc.path+"dialogs/"),e=b+"tmpFrameset.html";window.gFCKPluginName="wsc";f.setDefaulLangCode(a.config.defaultLanguage);window.doSpell({ctrl:g,lang:a.config.wsc_lang||f.getSPLangCode(a.langCode),intLang:a.config.wsc_uiLang||
f.getSPLangCode(a.langCode),winType:d,onCancel:function(){c.hide()},onFinish:function(b){a.focus();c.getParentEditor().setData(b.value);c.hide()},staticFrame:e,framesetPath:e,iframePath:b+"ciframe.html",schemaURI:b+"wsc.css",userDictionaryName:a.config.wsc_userDictionaryName,customDictionaryName:a.config.wsc_customDictionaryIds&&a.config.wsc_customDictionaryIds.split(","),domainName:a.config.wsc_domainName});CKEDITOR.document.getById(h).setStyle("display","none");CKEDITOR.document.getById(d).setStyle("display",
"block")}var b=CKEDITOR.tools.getNextNumber(),d="cke_frame_"+b,g="cke_data_"+b,h="cke_error_"+b,e,b=document.location.protocol||"http:",i=a.lang.wsc.notAvailable,k='<textarea style="display: none" id="'+g+'" rows="10" cols="40"> </textarea><div id="'+h+'" style="display:none;color:red;font-size:16px;font-weight:bold;padding-top:160px;text-align:center;z-index:11;"></div><iframe src="" style="width:100%;background-color:#f1f1e3;" frameborder="0" name="'+d+'" id="'+d+'" allowtransparency="1"></iframe>',
l=a.config.wsc_customLoaderScript||b+"//loader.webspellchecker.net/sproxy_fck/sproxy.php?plugin=fck2&customerid="+a.config.wsc_customerId+"&cmd=script&doc=wsc&schema=22";a.config.wsc_customLoaderScript&&(i+='<p style="color:#000;font-size:11px;font-weight: normal;text-align:center;padding-top:10px">'+a.lang.wsc.errorLoading.replace(/%s/g,a.config.wsc_customLoaderScript)+"</p>");window._cancelOnError=function(c){if("undefined"==typeof window.WSC_Error){CKEDITOR.document.getById(d).setStyle("display",
"none");var b=CKEDITOR.document.getById(h);b.setStyle("display","block");b.setHtml(c||a.lang.wsc.notAvailable)}};return{title:a.config.wsc_dialogTitle||a.lang.wsc.title,minWidth:485,minHeight:380,buttons:[CKEDITOR.dialog.cancelButton],onShow:function(){var b=this.getContentElement("general","content").getElement();b.setHtml(k);b.getChild(2).setStyle("height",this._.contentSize.height+"px");"function"!=typeof window.doSpell&&CKEDITOR.document.getHead().append(CKEDITOR.document.createElement("script",
{attributes:{type:"text/javascript",src:l}}));b=a.getData();CKEDITOR.document.getById(g).setValue(b);e=window.setInterval(c(this,i),250)},onHide:function(){window.ooo=void 0;window.int_framsetLoaded=void 0;window.framesetLoaded=void 0;window.is_window_opened=!1},contents:[{id:"general",label:a.config.wsc_dialogTitle||a.lang.wsc.title,padding:0,elements:[{type:"html",id:"content",html:""}]}]}});
CKEDITOR.dialog.on("resize",function(a){var a=a.data,c=a.dialog;"checkspell"==c._.name&&((c=(c=c.getContentElement("general","content").getElement())&&c.getChild(2))&&c.setSize("height",a.height),c&&c.setSize("width",a.width))});