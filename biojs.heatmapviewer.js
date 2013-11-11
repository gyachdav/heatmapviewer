var HEATMAP_VIEWER = (function($) {

	var targetDiv = undefined;
	var my = {};
	var canvas_margin = {
		top: 30,
		right: 30,
		bottom: 30,
		left: 30,
	};
	var max_font_size = 20,
		min_font_size = 11;

	// config
	var min_cell_width = 2,
		max_cell_width = 100
		zoomed_cell_width = 20;

	var orig_cell_width;

	var heatmap_viewer_config = {
		svg: undefined,
		targetDivName: undefined,
		origData: undefined,
		heatmap_config: {
			colorLow: 'green',
			colorMed: 'white',
			colorHigh: 'red',
			scoreLow: -100,
			scoreMed: 0,
			scoreHigh: 100,
			canvas_margin: canvas_margin,
			targetDivName: undefined,
			targetDivNode: undefined,
			x_axis: [],
			y_axis: [],
			dimensions: {},
			jsonData: {},
			targetDiv: undefined,
			offset: 0
		},
		slider_config: {
			slider_div_name: "sliderDiv",
			start_value: 0,
			increments: 50,
		},
		show_zoom_panel: true,
		zoom_div_name: "zoomDiv",
		heatmap_div_name: "heatmapDiv",
	}


	var _fn_redraw = function(d) {
		var start = Math.floor(d.x / orig_cell_width);

		end = start + heatmap_viewer_config.slider_config.increments;
		console.log(start, end);
		heatmap_viewer_config.heatmap_config.offset = start;
		calcHeatMap({
			_start: start,
			_end: end
		});

		console.log(heatmap_viewer_config.heatmap_config);

		$zoomDiv = $('#' + heatmap_viewer_config.zoom_div_name);
		if ($zoomDiv) {
			$zoomDiv.empty();
			svg = d3.select("#" + heatmap_viewer_config.zoom_div_name).append("svg")
				.attr("width", heatmap_viewer_config.heatmap_config.dimensions.canvas_width + heatmap_viewer_config.heatmap_config.canvas_margin.right + heatmap_viewer_config.heatmap_config.canvas_margin.left)
				.attr("height", heatmap_viewer_config.heatmap_config.dimensions.canvas_height + heatmap_viewer_config.heatmap_config.canvas_margin.top + heatmap_viewer_config.heatmap_config.canvas_margin.bottom)
				.append("g")
				.attr("transform", "translate(" + heatmap_viewer_config.heatmap_config.canvas_margin.right + "," + heatmap_viewer_config.heatmap_config.canvas_margin.top + ")");

			HEATMAP.init(heatmap_viewer_config.heatmap_config, svg).draw();
		}

	}

	my.init = function(_config) {
		heatmap_viewer_config.origData = _config.data;
		heatmap_viewer_config.heatmap_config.jsonData = heatmap_viewer_config.origData;

		// read in user defined _config
		if (_config.user_defined_config != 'undefined') {
			var tmpCfg = _config.user_defined_config;
			['colorLow', 'colorHigh', 'colorMed'].forEach(function(entry) {
				if (tmpCfg.heatmap_config[entry])
					heatmap_viewer_config.heatmap_config[entry] = tmpCfg.heatmap_config[entry];
			});
		}

		$hmDiv = $("#" + _config.targetDiv).append($('<div>').attr('id', heatmap_viewer_config.heatmap_div_name));
		heatmap_viewer_config.targetDivName = heatmap_viewer_config.heatmap_config.targetDivName = heatmap_viewer_config.heatmap_div_name;
		heatmap_viewer_config.heatmap_config.targetDivNode = $hmDiv;

		calcHeatMap({
			_start: 0,
			_end: (heatmap_viewer_config.origData.length / 20)
		});

		svg = d3.select("#" + heatmap_viewer_config.targetDivName).append("svg")
			.attr("width", heatmap_viewer_config.heatmap_config.dimensions.canvas_width + heatmap_viewer_config.heatmap_config.canvas_margin.right + heatmap_viewer_config.heatmap_config.canvas_margin.left)
			.attr("height", heatmap_viewer_config.heatmap_config.dimensions.canvas_height + heatmap_viewer_config.heatmap_config.canvas_margin.top + heatmap_viewer_config.heatmap_config.canvas_margin.bottom)
			.append("g")
			.attr("transform", "translate(" + heatmap_viewer_config.heatmap_config.canvas_margin.right + "," + heatmap_viewer_config.heatmap_config.canvas_margin.top + ")");


		HEATMAP.init(heatmap_viewer_config.heatmap_config, svg).draw();

		if (heatmap_viewer_config.heatmap_config.dimensions.cell_width < min_font_size) {
			orig_cell_width = heatmap_viewer_config.heatmap_config.dimensions.cell_width;

			if (heatmap_viewer_config.show_zoom_panel)
				HIGHLIGHT_FRAME.init({
					dimensions: {
						cell_width: heatmap_viewer_config.heatmap_config.dimensions.cell_width,
						cell_count: heatmap_viewer_config.heatmap_config.dimensions.cell_count,
						frame_width: 60 * heatmap_viewer_config.heatmap_config.dimensions.cell_width,
						height: heatmap_viewer_config.heatmap_config.dimensions.row_count * heatmap_viewer_config.heatmap_config.dimensions.cell_width
					},
					svg: svg
				}, _fn_redraw).draw_frame();


			setupZoomDiv();

		}

		return my;
	};


	calcHeatMap = function(rangeObj) {
		var dimensions = {};
		var x_axis = [];
		var y_axis = [];
		var tmpStart = 0;

		// var jsonData = heatmap_viewer_config.heatmap_config.jsonData;
		var jsonData = heatmap_viewer_config.origData;
		dimensions.canvas_width = heatmap_viewer_config.heatmap_config.targetDivNode.width();
		if (jsonData) {
			if (typeof rangeObj != 'undefined') {
				jsonData = jsonData.slice(rangeObj._start * 20, rangeObj._end * 20);
				tmpStart = rangeObj._start;
			}

			var _tmpCol = 0,
				_tmpRow = 0,
				i = 0;
			$.each(jsonData, function(k, v) {
				if (v.row == 0) {
					x_axis.push(v.label);
					if (v.col > _tmpCol)
						_tmpCol = v.col;
				}
				if ((v.col - tmpStart) == 0)
					y_axis.push(v.mut);

				if (v.row > _tmpRow)
					_tmpRow = v.row;

			});
			dimensions.cell_count = _tmpCol - heatmap_viewer_config.heatmap_config.offset;
			dimensions.row_count = _tmpRow;
			var _tmpCellSize = Math.max(Math.min(((dimensions.canvas_width - canvas_margin.right - canvas_margin.left) / (dimensions.cell_count + 1)), max_cell_width), min_cell_width);

			dimensions.cell_height = dimensions.cell_width = _tmpCellSize;
			dimensions.canvas_height = (dimensions.row_count + 1) * dimensions.cell_height;
		}
		heatmap_viewer_config.heatmap_config.dimensions = $.extend(heatmap_viewer_config.heatmap_config.dimensions, dimensions);
		heatmap_viewer_config.heatmap_config.x_axis = x_axis;
		heatmap_viewer_config.heatmap_config.y_axis = y_axis;
		heatmap_viewer_config.heatmap_config.jsonData = jsonData;
		heatmap_viewer_config.slider_config.increments = Math.floor((dimensions.canvas_width / zoomed_cell_width) - 1);
		// console.log(heatmap_viewer_config.slider_config.increments);
	}

	setupZoomDiv = function() {
		heatmap_viewer_config.heatmap_config.targetDivNode.append($('<div>')
			.attr('id', heatmap_viewer_config.slider_config.slider_div_name)
			.css('width', '75%')
			.css('margin', '25px'));

		heatmap_viewer_config.heatmap_config.targetDivName = heatmap_viewer_config.zoom_div_name;
		heatmap_viewer_config.heatmap_config.targetDivNode = heatmap_viewer_config.heatmap_config.targetDivNode.
		append($('<div>').attr('id', heatmap_viewer_config.heatmap_config.targetDivName));


		start = 0;
		end = start + heatmap_viewer_config.slider_config.increments;
		$("#end").text(' ' + end + ' ');
		$("#start").text(' ' + start + ' ');
		heatmap_viewer_config.heatmap_config.offset = start;
		calcHeatMap({
			_start: start,
			_end: end
		});
		$zoomDiv = $('#' + heatmap_viewer_config.zoom_div_name);

		if ($zoomDiv) {
			$zoomDiv.empty();
			// HEATMAP.init(heatmap_viewer_config.heatmap_config).draw();
			svg = d3.select("#" + heatmap_viewer_config.zoom_div_name).append("svg")
				.attr("width", heatmap_viewer_config.heatmap_config.dimensions.canvas_width + heatmap_viewer_config.heatmap_config.canvas_margin.right + heatmap_viewer_config.heatmap_config.canvas_margin.left)
				.attr("height", heatmap_viewer_config.heatmap_config.dimensions.canvas_height + heatmap_viewer_config.heatmap_config.canvas_margin.top + heatmap_viewer_config.heatmap_config.canvas_margin.bottom)
				.append("g")
				.attr("transform", "translate(" + heatmap_viewer_config.heatmap_config.canvas_margin.right + "," + heatmap_viewer_config.heatmap_config.canvas_margin.top + ")");

			HEATMAP.init(heatmap_viewer_config.heatmap_config, svg).draw();
		}

	}

	return my;
})(jQuery);