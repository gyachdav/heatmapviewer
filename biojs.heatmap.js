var HIGHLIGHT_FRAME = (function($) {

	var my = {};
	var svg, max_frame;
	var dimensions = {
		cell_width: 0,
		cell_count: 0,
		row_count: 0,
		frame_width: 0
	};

	var current_x;
	var callback;



	var drag = d3.behavior.drag()
		.on("dragend", function(d, i) {
			if (d.x < 0)
				d.x = 0;
			if (d.x > max_frame)
				d.x = max_frame;
			current_x = d.x;
			callback.apply(null,[d]);
		    d3.select(this).style('cursor','-webkit-grab');
		    d3.select(this).style('cursor','-moz-grab');
			// console.log(d.x);
		})
		.on("drag", function(d, i) {
			d.x += d3.event.dx;
			d.y += d3.event.dy;
			d3.select(this).attr("transform", function(d, i) {
				if (d.x < 0)
					return "translate(0)";
				if (d.x > max_frame)
					return "translate(" + (max_frame + 10) + ")";

			    d3.select(this).style('cursor','-webkit-grabbing');
			    d3.select(this).style('cursor','-moz-grabbing');
				return "translate(" + [d.x] + ")";
			})
		});

	my.init = function(_config, _callback) {
		dimensions = _config.dimensions;
		svg = _config.svg;
		max_frame = dimensions.cell_width * dimensions.cell_count - dimensions.frame_width;
		callback = _callback;
		return my;

	}

	my.draw_frame = function() {
		var x = y = 0;
		var myframe = svg.append("svg:rect")
			.attr("x", 0)
			.attr("y", -5)
			.attr("width", dimensions.frame_width)
			.attr("height", dimensions.height + 15)
			.style("fill-opacity", 0)
			.style("stroke", "blue")
			.style("stroke-width", 4)
		        .style("cursor", "-webkit-grab")
		        .style("cursor", "-moz-grab")
			.data([{
				"x": x,
			}])
			.attr("transform", "translate(" + x + "," + y + ")")
			.call(drag);
	}

	return my;
}(jQuery));


var HEATMAP = (function($) {
	var svg;
	var my = {};

	var max_font_size = 20,
		min_font_size = 11;

	var jsonData = undefined,
		targetDiv = undefined;

	var config = {
		axis_line_stroke: '2',
		axis_line_stroke_color: '#000',
		dimensions: {
			canvas_width: 0,
			canvas_height: 0,
			cell_width: 0,
			cell_height: 0,
			cell_count: 0,
			row_count: 0
		},
		x_axis: [],
		y_axis: [],
		jsonData: {},
		offset: 0,
		show_frame: true

	};

	my.setTargetDIV = function(_targetDiv) {
		targetDiv = _targetDiv;
		return my;
	}
	my.init = function(_configObj, _svg) {
		config = $.extend(config, _configObj);
		// console.log(config);
		svg = _svg;
		return my;
	}
	getData = function(argument) {
		return config.jsonData;
	}
	my.setData = function(_dataObj) {
		jsonData = _dataObj;
		return my;
	}

	draw_axis = function() {
		var font_size = Math.min((config.dimensions.cell_width - 10), max_font_size);
		var myHorizontalAxisLine = svg.append("svg:line")
			.attr("x1", 0)
			.attr("y1", 0 - 3)
			.attr("x2", config.dimensions.cell_width * (config.dimensions.cell_count + 1))
			.attr("y2", 0 - 3)
			.style("stroke", config.axis_line_stroke_color)
			.style("stroke-width", config.axis_line_stroke);


		var myVerticalAxisLine = svg.append("svg:line")
			.attr("x1", 0 - 5)
			.attr("y1", 0)
			.attr("x2", 0 - 5)
			.attr("y2", config.dimensions.canvas_height)
			.style("stroke", config.axis_line_stroke_color)
			.style("stroke-width", config.axis_line_stroke);


		svg.selectAll("x_axis").data(config.x_axis).enter().append("text").style("font-size", font_size).text(function(d) {
			return d;
		}).attr("x", function(d, i) {
			return i * config.dimensions.cell_width;
		}).attr("y", function(d) {
			return -5;
		});

		// TODO rework positioning 
		svg.selectAll("y_axis").data(config.y_axis).enter().append("text").style("font-size", font_size).text(function(d) {
			return d;
		}).attr("x", function(d) {
			return (config.canvas_margin.right - 5) * -1;
		}).attr("y", function(d, i) {
			return i * config.dimensions.cell_width + config.dimensions.cell_width;
		});
	}

	my.draw = function() {
		draw_heatmap();
		// present axis only if the computed size for the font is more then the set threshold size
		if (config.dimensions.cell_width > min_font_size)
			draw_axis();
	}


	draw_heatmap = function(argument) {

		var colorScale = d3.scale.linear()
			.domain([config.scoreLow, config.scoreMed, config.scoreHigh])
			.range([config.colorLow, config.colorMed, config.colorHigh]);


		svg.selectAll(".heatmapDiv")
			.data(getData(), function(d) {
				return d.col + ': ' + d.row;
			})
			.enter().append("svg:rect")
			.attr("x", function(d) {
				return (d.col - config.offset) * config.dimensions.cell_width;
			})
			.attr("y", function(d) {
				return d.row * config.dimensions.cell_height;
			})
			.attr("width", function(d) {
				return config.dimensions.cell_width;
			})
			.attr("height", function(d) {
				return config.dimensions.cell_height;
			})
			.style("fill", function(d) {
				if (d.label == d.mut) return ('black ');
				else return colorScale(d.score);
			})
			.append("svg:title")
			.text(function(d) {
				return d.label + d.col + d.mut + " Score: " + d.score;
			});
	}
	return my;
}(jQuery));