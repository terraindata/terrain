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

/*   
Template Name: Color Admin - Responsive Admin Dashboard Template build with Twitter Bootstrap 3.3.2
Version: 1.6.0
Author: Sean Ngu
Website: http://www.seantheme.com/color-admin-v1.6/admin/
*/

// white
var white = 'rgba(255,255,255,1.0)';
var fillBlack = 'rgba(45, 53, 60, 0.6)';
var fillBlackLight = 'rgba(45, 53, 60, 0.2)';
var strokeBlack = 'rgba(45, 53, 60, 0.8)';
var highlightFillBlack = 'rgba(45, 53, 60, 0.8)';
var highlightStrokeBlack = 'rgba(45, 53, 60, 1)';

// blue
var fillBlue = 'rgba(52, 143, 226, 0.6)';
var fillBlueLight = 'rgba(52, 143, 226, 0.2)';
var strokeBlue = 'rgba(52, 143, 226, 0.8)';
var highlightFillBlue = 'rgba(52, 143, 226, 0.8)';
var highlightStrokeBlue = 'rgba(52, 143, 226, 1)';

// grey
var fillGrey = 'rgba(182, 194, 201, 0.6)';
var fillGreyLight = 'rgba(182, 194, 201, 0.2)';
var strokeGrey = 'rgba(182, 194, 201, 0.8)';
var highlightFillGrey = 'rgba(182, 194, 201, 0.8)';
var highlightStrokeGrey = 'rgba(182, 194, 201, 1)';

// green
var fillGreen = 'rgba(0, 172, 172, 0.6)';
var fillGreenLight = 'rgba(0, 172, 172, 0.2)';
var strokeGreen = 'rgba(0, 172, 172, 0.8)';
var highlightFillGreen = 'rgba(0, 172, 172, 0.8)';
var highlightStrokeGreen = 'rgba(0, 172, 172, 1)';

// purple
var fillPurple = 'rgba(114, 124, 182, 0.6)';
var fillPurpleLight = 'rgba(114, 124, 182, 0.2)';
var strokePurple = 'rgba(114, 124, 182, 0.8)';
var highlightFillPurple = 'rgba(114, 124, 182, 0.8)';
var highlightStrokePurple = 'rgba(114, 124, 182, 1)';


var randomScalingFactor = function() { 
    return Math.round(Math.random()*100)
};

var barChartData = {
    labels : ['January','February','March','April','May','June','July'],
    datasets : [
        {
            fillColor : fillBlackLight,
            strokeColor : strokeBlack,
            highlightFill: highlightFillBlack,
            highlightStroke: highlightStrokeBlack,
            data : [randomScalingFactor(),randomScalingFactor(),randomScalingFactor(),randomScalingFactor(),randomScalingFactor(),randomScalingFactor(),randomScalingFactor()]
        },
        {
            fillColor : fillBlueLight,
            strokeColor : strokeBlue,
            highlightFill: highlightFillBlue,
            highlightStroke: highlightStrokeBlue,
            data : [randomScalingFactor(),randomScalingFactor(),randomScalingFactor(),randomScalingFactor(),randomScalingFactor(),randomScalingFactor(),randomScalingFactor()]
        }
    ]
};

var doughnutData = [
    {
        value: 300,
        color: fillGrey,
        highlight: highlightFillGrey,
        label: 'Grey'
    },
    {
        value: 50,
        color: fillGreen,
        highlight: highlightFillGreen,
        label: 'Green'
    },
    {
        value: 100,
        color: fillBlue,
        highlight: highlightFillBlue,
        label: 'Blue'
    },
    {
        value: 40,
        color: fillPurple,
        highlight: highlightFillPurple,
        label: 'Purple'
    },
    {
        value: 120,
        color: fillBlack,
        highlight: highlightFillBlack,
        label: 'Black'
    }
];

var lineChartData = {
    labels : ['January','February','March','April','May','June','July'],
    datasets : [
        {
            label: 'My First dataset',
            fillColor : fillBlackLight,
            strokeColor : strokeBlack,
            pointColor : strokeBlack,
            pointStrokeColor : white,
            pointHighlightFill : white,
            pointHighlightStroke : strokeBlack,
            data : [randomScalingFactor(),randomScalingFactor(),randomScalingFactor(),randomScalingFactor(),randomScalingFactor(),randomScalingFactor(),randomScalingFactor()]
        },
        {
            label: 'My Second dataset',
            fillColor : 'rgba(52,143,226,0.2)',
            strokeColor : 'rgba(52,143,226,1)',
            pointColor : 'rgba(52,143,226,1)',
            pointStrokeColor : '#fff',
            pointHighlightFill : '#fff',
            pointHighlightStroke : 'rgba(52,143,226,1)',
            data : [randomScalingFactor(),randomScalingFactor(),randomScalingFactor(),randomScalingFactor(),randomScalingFactor(),randomScalingFactor(),randomScalingFactor()]
        }
    ]
};

var pieData = [
    {
        value: 300,
        color: strokePurple,
        highlight: highlightStrokePurple,
        label: 'Purple'
    },
    {
        value: 50,
        color: strokeBlue,
        highlight: highlightStrokeBlue,
        label: 'Blue'
    },
    {
        value: 100,
        color: strokeGreen,
        highlight: highlightStrokeGreen,
        label: 'Green'
    },
    {
        value: 40,
        color: strokeGrey,
        highlight: highlightStrokeGrey,
        label: 'Grey'
    },
    {
        value: 120,
        color: strokeBlack,
        highlight: highlightStrokeBlack,
        label: 'Black'
    }
];

var polarData = [
    {
        value: 300,
        color: strokePurple,
        highlight: highlightStrokePurple,
        label: 'Purple'
    },
    {
        value: 50,
        color: strokeBlue,
        highlight: highlightStrokeBlue,
        label: 'Blue'
    },
    {
        value: 100,
        color: strokeGreen,
        highlight: highlightStrokeGreen,
        label: 'Green'
    },
    {
        value: 40,
        color: strokeGrey,
        highlight: highlightStrokeGrey,
        label: 'Grey'
    },
    {
        value: 120,
        color: strokeBlack,
        highlight: highlightStrokeBlack,
        label: 'Black'
    }
];

var radarChartData = {
    labels: ['Eating', 'Drinking', 'Sleeping', 'Designing', 'Coding', 'Cycling', 'Running'],
    datasets: [
        {
            label: 'My First dataset',
            fillColor: 'rgba(45,53,60,0.2)',
            strokeColor: 'rgba(45,53,60,1)',
            pointColor: 'rgba(45,53,60,1)',
            pointStrokeColor: '#fff',
            pointHighlightFill: '#fff',
            pointHighlightStroke: 'rgba(45,53,60,1)',
            data: [65,59,90,81,56,55,40]
        },
        {
            label: 'My Second dataset',
            fillColor: 'rgba(52,143,226,0.2)',
            strokeColor: 'rgba(52,143,226,1)',
            pointColor: 'rgba(52,143,226,1)',
            pointStrokeColor: '#fff',
            pointHighlightFill: '#fff',
            pointHighlightStroke: 'rgba(52,143,226,1)',
            data: [28,48,40,19,96,27,100]
        }
    ]
};


Chart.defaults.global = {
    animation: true,
    animationSteps: 60,
    animationEasing: 'easeOutQuart',
    showScale: true,
    scaleOverride: false,
    scaleSteps: null,
    scaleStepWidth: null,
    scaleStartValue: null,
    scaleLineColor: 'rgba(0,0,0,.1)',
    scaleLineWidth: 1,
    scaleShowLabels: true,
    scaleLabel: '<%=value%>',
    scaleIntegersOnly: true,
    scaleBeginAtZero: false,
    scaleFontFamily: '"Open Sans", "Helvetica Neue", "Helvetica", "Arial", sans-serif',
    scaleFontSize: 12,
    scaleFontStyle: 'normal',
    scaleFontColor: '#707478',
    responsive: true,
    maintainAspectRatio: true,
    showTooltips: true,
    customTooltips: false,
    tooltipEvents: ['mousemove', 'touchstart', 'touchmove'],
    tooltipFillColor: 'rgba(0,0,0,0.8)',
    tooltipFontFamily: '"Open Sans", "Helvetica Neue", "Helvetica", "Arial", sans-serif',
    tooltipFontSize: 12,
    tooltipFontStyle: 'normal',
    tooltipFontColor: '#ccc',
    tooltipTitleFontFamily: '"Open Sans", "Helvetica Neue", "Helvetica", "Arial", sans-serif',
    tooltipTitleFontSize: 12,
    tooltipTitleFontStyle: 'bold',
    tooltipTitleFontColor: '#fff',
    tooltipYPadding: 10,
    tooltipXPadding: 10,
    tooltipCaretSize: 8,
    tooltipCornerRadius: 3,
    tooltipXOffset: 10,
    tooltipTemplate: '<%if (label){%><%=label%>: <%}%><%= value %>',
    multiTooltipTemplate: '<%= value %>',
    onAnimationProgress: function(){},
    onAnimationComplete: function(){}
}

var handleGenerateGraph = function(animationOption) {
    var animationOption = (animationOption) ? animationOption : false;
    
    var ctx = document.getElementById('line-chart').getContext('2d');
    var lineChart = new Chart(ctx).Line(lineChartData, {
        animation: animationOption
    });
    
    var ctx2 = document.getElementById('bar-chart').getContext('2d');
    var barChart = new Chart(ctx2).Bar(barChartData, {
        animation: animationOption
    });
    
    var ctx3 = document.getElementById('radar-chart').getContext('2d');
    var radarChart = new Chart(ctx3).Radar(radarChartData, {
        animation: animationOption
    });
    
    var ctx4 = document.getElementById('polar-area-chart').getContext('2d');
    var polarAreaChart = new Chart(ctx4).PolarArea(polarData, {
        animation: animationOption
    });
    
    var ctx5 = document.getElementById('pie-chart').getContext('2d');
    window.myPie = new Chart(ctx5).Pie(pieData, {
        animation: animationOption
    });
    
    var ctx6 = document.getElementById('doughnut-chart').getContext('2d');
    window.myDoughnut = new Chart(ctx6).Doughnut(doughnutData, {
        animation: animationOption
    });
};


var handleChartJs = function() {
    $(window).load(function() {
        handleGenerateGraph(true);
    });
    
    $(window).resize( function() {
        handleGenerateGraph();
    });
};

var ChartJs = function () {
	"use strict";
    return {
        //main function
        init: function () {
            handleChartJs();
        }
    };
}();