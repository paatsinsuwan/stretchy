;(function($, window, document, undefined){
  "use strict"

  var pluginName = 'stretchy';
  var version = '1.3';
  var defaults = {
    gridCount : 12,
    mouseTracking : true,
    extraTopPadding : 120,
    dotClassName : "dot",
    unfoldSpeed : 120,
    strokeWidth : 6,
    animationSpeed : 78,
    maxRadius : 250,
    gradientID : "defaultGradientName",
    gradientStartColor : "#000",
    gradientStopColor : "#000",
    bgImgX: 0,
    bgImgY: 0,
    bgImgXPercentage: 0,
    bgImgYPercentage: 0,
    bgImgWidth: 400,
    bgImgHeight: 400
  };

  function Plugin( element, options){
    this.element = element;

    this.options = $.extend({}, defaults, options);
    this._defaults = defaults;
    this._name = pluginName;

    this.init();
  };

  function render(opt){
    var defer = $.Deferred();
    var i = 0;
    var intID = setInterval(function(){
      i++;
      opt.svg.selectAll(".row"+i).transition()
        .delay(function(d, i){ return i*opt.unfoldSpeed; })
        .duration(75)
        .attr({
          "stroke-width" : opt.strokeWidth
        })
      if(i == opt.row){
        clearInterval(intID);
        defer.resolve("Rendered");
      }
    }, opt.unfoldSpeed*2)

    return defer.promise();
  }

  function addDots(svg, opt, data){
    var defer = $.Deferred();

    var lines = svg.selectAll("."+opt.dotClassName)
      .data(data.slice(1)).enter()
      .append('line')
      .attr({
        "x1" : function(d) { return d.x1 },
        "y1" : function(d) { return d.y1 },
        "x2" : function(d) { return d.x2 },
        "y2" : function(d) { return d.y2 },
        "stroke-width" : 0,
        "stroke-linecap" : "round",
        "class" : function(d) { return d.class + " " + opt.dotClassName; }
      })

    defer.resolve(lines);
    return defer.promise();
  }

  function addSvg(ele, opt, w, h){
    var defer = $.Deferred();
    var svg = d3.select(ele)
      .append('svg')
      .attr({
        // "width" : w,
        // "height" : h+opt.extraTopPadding,
        "preserveAspectRatio" : "xMinYMin meet",
        "viewBox" : "0 0 " + w + " " + (h+opt.extraTopPadding)
      })
      .classed("svg-content", true);
    var defs = svg.append("defs");
    var gradient = defs.append("linearGradient")
      .attr("id", opt.gradientID)
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", "689.641" )
      .attr("y1", "822" )
      .attr("x2", "1344.359" )
      .attr("y2", "-16");
    gradient.append("stop")
      .attr("offset", "0")
      .attr("stop-color", opt.gradientStartColor);
    gradient.append("stop")
      .attr("offset", "1")
      .attr("stop-color", opt.gradientStopColor);

    if(svg){
      defer.resolve(svg);
    }

    return defer.promise();
  }

  function generateData(opt, w, h, rootNode) {

    var defer = $.Deferred();
    var gridWidth = w/opt.gridCount;
    var row = Math.round(h/gridWidth);
    var data = [];
    data.push(rootNode);
    for(var i = 0; i < row; i++){
      for(var j = 0; j < opt.gridCount; j++){
        data.push({
          "xOrigin" : (j*gridWidth)+(gridWidth/2),
          "yOrigin" : (i*gridWidth)+opt.extraTopPadding,
          "x1" : (j*gridWidth)+(gridWidth/2),
          "y1" : (i*gridWidth)+opt.extraTopPadding,
          "x2" : (j*gridWidth)+(gridWidth/2),
          "y2" : (i*gridWidth)+opt.extraTopPadding,
          "class" : "row"+(i+1)
          // "length" : 0
        })
      }

      if(i === row-2){
        defer.resolve({
          data : data,
          gridWidth : gridWidth,
          row : row
        });
      }
    }

    return defer.promise();
  }

  function setUpForce(opt, tick){
    var defer = $.Deferred();
    var i = 0;
    var intID, force;

    force = d3.layout.force()
      .gravity(0.05)
      .charge(function(d, i) { return i ? 0 : -2000; })
      .nodes(opt.lines)
      .size([opt.w, opt.h])
      .on("tick", function(){
        tick(opt);
      });

    intID = setInterval(function(){
      i++;
      opt.svg.selectAll(".row"+i).transition()
        .delay(function(d, i){ return i*120})
        .duration(75)
        .attr("stroke-width", opt.strokeWidth)
      if(i === opt.row){
        clearInterval(intID);
        console.log("Activated");
        defer.resolve(force);
      }
    }, 240);


    return defer.promise();
  }

  var getPoint = function(node, rootNode, radius){
    var a = Math.abs(node.xOrigin - rootNode.px);
    var b = Math.abs(node.yOrigin - rootNode.py);
    var c = Math.sqrt((a*a)+(b*b));
    var scale = 1, scale2 = 1;

    if(c > radius){
      return {
        "x1" : node.xOrigin,
        "y1" : node.yOrigin,
        "x2" : node.xOrigin,
        "y2": node.yOrigin
        // "length" : 0
      };
    }

    else if( c > (radius*(4/5))) { //200
      scale = 0.975;
      scale2 = 0.025;
    }
    else if( c > (radius*(1/2))) { //175
      scale = 0.95;
      scale2 = 0.05;
    }
    else if( c > (radius*(3/5))) { //150
      scale = 0.925;
      scale2 = 0.075;
    }
    else if( c > (radius*(2/5))) { //100
      scale = 0.9;
      scale2 = 0.1;
    }
    else {
      scale = 0.65;
      scale2 = 0.35;
    }
    return {
      "x1": (node.x1 < rootNode.px) ? node.xOrigin-(a*scale2) : node.xOrigin+(a*scale2),
      "y1": (node.y1 < rootNode.py) ? node.yOrigin-(b*scale2) : node.yOrigin+(b*scale2),
      "x2": (node.x1 < rootNode.px) ? rootNode.px-(a*scale) : rootNode.px+(a*scale),
      "y2": (node.y1 < rootNode.py) ? rootNode.py-(b*scale) : rootNode.py+(b*scale)
      // "length": c
    }
  };

  var tick = function(opt){

    var i = 0;
    var n = opt.linesData.length;

    while(++i < n){
      var newPoint = getPoint(opt.linesData[i], opt.root, opt.maxRadius);
      opt.linesData[i].x1 = newPoint.x1;
      opt.linesData[i].y1 = newPoint.y1;
      opt.linesData[i].x2 = newPoint.x2;
      opt.linesData[i].y2 = newPoint.y2;
      // opt.linesData[i].length = newPoint.length;
    }

    d3.selectAll("line")
      .transition()
      .duration(opt.animationSpeed)
      .attr({
        "x1": function(d) { return d.x1},
        "y1": function(d) { return d.y1},
        "x2": function(d) { return d.x2},
        "y2": function(d) { return d.y2}
      });
  };

  Plugin.prototype.init = function () {

    var options = this.options;
    var target = this.element;
    var w = options.w = $(this.element).width();
    var h = options.h = $(this.element).height();
    var lines, linesData, svg, force, row, gridWidth, root, bgPath, svgImg;
    var bgImg = $(target).find('img');
    root = options.root = {
      px : 0,
      py : 0
    };

    generateData(options, w, h).then(function(res){
      linesData = options.linesData = res.data;
      row = options.row = res.row;
      gridWidth = options.gridWidth = res.gridWidth;
      return addSvg(target, options, w, h);
    }).then(function (res) {
      svg = options.svg = res;
      return addDots(svg, options, linesData);
    }).then(function (res){
      lines = options.lines = res;
      return render(options);
    }).then(function(res){
      return setUpForce(options, tick);
    })
    .then(function (res) {
      setTimeout(function(){
        force = options.force = res;
        if (bgImg.length) {
          // $.get(bgImg.attr("src"), function(data) {
          //   var div = document.createElement("div");
          //   div.setAttribute("style", "display:none;");
          //   div.setAttribute("id", "svgImagePlaceholder");
          //   div.innerHTML = new XMLSerializer().serializeToString(data.documentElement);
          //   document.body.insertBefore(div, document.body.childNodes[0]);
          //   console.log(d3.select("#svgImagePlaceholder svg image"));
          //   // console.log(tempSvgImg);
          //   svg.append(d3.select("#svgImagePlaceholder svg image"))
          // });


          // $.get(bgImg.attr("src"), function(res){
          //     console.log($(res).find("image")[0]);
          //     svg.append([$(res).find("image")[0]]);
          //   }
          // );

          options.olImg = svg.append("svg:image")
            .attr({
              "xlink:href" : bgImg.attr("src"),
              "x" : (options.bgImgXPercentage > 0) ? w*(options.bgImgXPercentage/100) - options.bgImgWidth : options.bgImgX,
              "y" : (options.bgImgYPercentage > 0) ? h*(options.bgImgYPercentage/100) - options.bgImgHeight : options.bgImgY,
              // "viewBox" : "0 0 " + options.bgImgWidth + " " + options.bgImgHeight,
              "width" : options.bgImgWidth,
              "height" : options.bgImgHeight,
              "style" : "opacity: 0;"
            });

          options.olImg.transition()
            .duration(200)
            .attr({
              "style" : "opacity: 1;"
            })
        };
        if(options.mouseTracking){
          svg.on('mouseenter', function(){
            force.start();
          })
          svg.on('mousemove', function(){
            var point = d3.mouse(this);
            root.px = point[0];
            root.py = point[1];

            force.resume();
          })
          svg.on('mouseout', function(){
            lines.transition()
              .attr({
                "x1" : function(node){ return node.xOrigin; },
                "y1" : function(node){ return node.yOrigin; },
                "x2" : function(node){ return node.xOrigin; },
                "y2" : function(node){ return node.yOrigin; }
              });
            force.stop();
          })
        }

        svg.append("text")
          .attr({
            "y" : 100,
            "stroke" : "#fff",
            "fill" : "#fff",
            "class" : "ibm-h1 ibm-large ibm- ibm-textcolor-white-core"
          })
          .text("test")


        $(window).resize(function(){
          if($("header").width() < options.w){

            svg.select("image")
              .transition()
              .attr({
                "style": "y : calc(2 + " + ((options.w - $("header").width())*0.4)+ ");"
              });
          }
          else {
            svg.select("image")
              .transition()
              .attr({
                "style": "y : 2;"
              });
          }
        })

        $("header").resize(function(){
          console.log("header tag width : "+$("header").width());
        })
      }, options.unfoldSpeed*row);
    });


  };

  $.fn[pluginName] = function ( options ) {
    return this.each(function(){
      if(!$.data(this, 'plugin_' + pluginName)){
        $.data(this, 'plugin_' + pluginName, new Plugin( this, options));
      }
    })
  }

})(jQuery, window, document);
