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
 * Chinese translation for bootstrap-wysihtml5
 */
(function($){
    $.fn.wysihtml5.locale["zh-CN"] = {
        font_styles: {
            normal: "正文",
            h1: "标题 1",
            h2: "标题 2",
            h3: "标题 3"
        },
        emphasis: {
            bold: "粗体",
            italic: "斜体",
            underline: "下划线"
        },
        lists: {
            unordered: "项目符号",
            ordered: "编号",
            outdent: "减少缩进",
            indent: "增加缩进"
        },
        link: {
            insert: "插入链接",
            cancel: "取消"
        },
        image: {
            insert: "插入图片",
            cancel: "取消"
        },
        html: {
            edit: "HTML代码"
        },
        colours: {
            black: "黑色",
            silver: "银色",
            gray: "灰色",
            maroon: "赤红色",
            red: "红色",
            purple: "紫色",
            green: "绿色",
            olive: "橄榄色",
            navy: "深蓝色",
            blue: "蓝色",
            orange: "橙色"
        }
    };
}(jQuery));