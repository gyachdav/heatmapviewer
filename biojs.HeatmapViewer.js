/**
 *
 * This component takes a JSON data object and draws a D3 object
 * The expected JSON format is specified under the option 'json' of the HeatmapViewer options.
 *
 * Please remember to use jQuery in <a href="http://docs.jquery.com/Using_jQuery_with_Other_Libraries">compatibility mode</a>, particularly a good idea if you use other libraries.
 *
 *
 * @author <a href="mailto:gyachdav@rostlab.org">Guy Yachdav</a>
 * @version 1.0.0
 * @category 0
 *
 * @requires <a href='http://code.jquery.com/jquery-1.9.1.min.js'>jQuery Core 1.9.1</a>
 * @dependency <script language="JavaScript" type="text/javascript" src="../biojs/dependencies/jquery/jquery-1.9.1.min.js"></script>
 *
 * @requires <a href='http://d3js.org/d3.v3.min.js'>D3 Version 3</a>
 * @dependency <script language="JavaScript" type="text/javascript" src="../biojs/dependencies/jquery/d3.v3.min.js"></script>
 *
 *
 * @param {Object} options An object with the options for HeatmapViewer component.
 *
 * @option {string} target
 *    Identifier of the DIV tag where the component should be displayed.
 *
 * @option {string} json
 *    The JSON object describing the data to be displayed and the component's configuration.
 *    It must have the following members:
 
 *
 * @class
 * @extends Biojs
 */

Biojs.HeatmapViewer = Biojs.extend({
 /** @lends Biojs.HeatmapViewer */
	/**
	 * public variables
	 */
	targetDiv: undefined,

	/**
	 * private variables
	 */
	_MAIN_HEAT_MAP_DIV: 'main_heatmap_div',
	_ZOOM_HEAT_MAP_DIV: 'zoom_heatmap_div',
	_SLIDER_DIV: 'slider_heatmap_div',
	_SCALE_DIV: 'scale_div',

	_svg: undefined,
	_origData: undefined,
	_zoomedData: undefined,

	_dimensions: {},
	_viewer_config: {
		displayDiv: '',
		colorLow: 'green',
		colorMed: 'white',
		colorHigh: 'red',
		scoreLow: -100,
		scoreMed: 0,
		scoreHigh: 100,
		offset: 0,
		x_axis: [],
		y_axis: [],
		canvas_margin: {
			top: 30,
			right: 30,
			bottom: 30,
			left: 30,
		},
		labels: {
			max_font_size: 20,
			min_font_size: 11,
		},
		main_heatmap: {
			min_cell_width: 2,
			max_cell_width: 100,
			orig_cell_width: 0
		},
		zoom_area: {
			cell_width: 20
		},
		slider: {
			start_value: 0,
			increments: 50,
		}

	},

	constructor: function(options) {


		/* Your constructor code here
      Note: options provided on instantiation time overrides the
      default values in this.opt, automatically; i.e. ‘options’
      argument refers to the provided values and ‘this.opt’
      refers to the  the overridden options. For more details,
      go to section 6.3.2 in the spec. doc. */
		this._origData = this.opt.jsonData;
		this.targetDiv = this.opt.targetDiv;
		this._init();
		this._draw();
		console.log(this.opt);

	},

	opt: {
		/* Target DIV
    This mandatory parameter is the identifier of the DIV tag where the
    component should be displayed. Use this value to draw your
    component into. */
		targetDiv: 'YourOwnDivId',
		jsonData: {},
		showScale: true,
		showExportToImageButton: true,
		show_zoom_panel: true


		/* Component Options
    These options defines the input data for your component.
    Must have a default value for each one. Note that, either some or
    all of values might be replaced by the constructor using the values
    provided in instantiation time.

    Define your own options here following the next syntax:
       <option1>: <defaultValue1>,
       <option2>: <defaultValue2>,
       :
       .
       <optionN>: <defaultValueN> */
	},

	eventTypes: [

		/* Event Names
       The parent class Biojs build the event handlers automatically
       with the names defined here. Use this.raiseEvent(<eventName>,
       <eventData>) for triggering an event from this component. Where,
       <eventName> is a string (defined in eventTypes) and <eventData> is
       an object which should be passed to the registered listeners.
       
       Define your event names following the syntax:
         “<eventName1>”,
         “<eventName2>”,
            :
            .
         “<eventNameN>”
     */
	],

	SCALE: (function($) {
		var data_array = [];
		var my = {};
		var dataLow, dataMid, dataHigh;
		var colorLow, colorMid, colorHigh;
		var targetDiv;
		var svg;
		var d, i;



		var drag = d3.behavior.drag()
			.on("drag", function(d, i) {
				d.x += d3.event.dx
				d3.select(this).attr("transform", function(d, i) {
					return "translate(" + [d.x] + ",20)"
				})
			});

		/**
		 * [init description]
		 * @param  {[type]} _config
		 * @return {[type]}
		 */
		my.init = function(_config) {
			var scoreLow = _config.scoreLow;
			var scoreMid = _config.scoreMid;
			var scoreHigh = _config.scoreHigh;
			var colorLow = _config.colorLow;
			var colorMid = _config.colorMid;
			var colorHigh = _config.colorHigh;
			var targetDiv = _config.targetDiv;


			for (var idx = scoreLow; idx <= scoreHigh; idx++)
				data_array.push(idx);

			var width = 960,
				height = 200;

			var colorScale = d3.scale.linear()
				.domain([scoreLow, scoreMid, scoreHigh])
				.range([colorLow, colorMid, colorHigh]);

			var x = 50,
				y = 20;

			var svg = d3.select("#" + targetDiv)
				.append("svg").attr("id", targetDiv + "_svg")
			// .attr("width", heatmap_viewer_config.heatmap_config.dimensions.canvas_width + heatmap_viewer_config.heatmap_config.canvas_margin.right + heatmap_viewer_config.heatmap_config.canvas_margin.left)
			.attr("height", "40");
			// .attr("transform", "translate(" + heatmap_viewer_config.heatmap_config.canvas_margin.right + "," + heatmap_viewer_config.heatmap_config.canvas_margin.top + ")");


			var g = svg.append("g")
				.data([{
					"x": x,
					"y": y
				}])
				.attr("transform", "translate(" + x + ",20)")
				.call(drag);

			g.selectAll("lines")
				.data(data_array)
				.enter().append("svg:line")
				.attr("x1", function(d, i) {
					return i;
				})
				.attr("y1", 0)
				.attr("x2", function(d, i) {
					return i;
				})
				.attr("y1", 20)
				.style("stroke", function(d) {
					return (colorScale(d));
				})
				.style("stroke-width", 5);

			g.append("text")
				.attr("y", -5)
				.attr("x", -15)
				.text(-100)
				.attr("transform", "translate(0, 0 )");

			var midPt = data_array.length / 2;
			g.append("text")
				.attr("class", "caption")
				.attr("y", -5)
				.attr("x", midPt - 2)
				.text(0);
			var maxPt = data_array.length;

			g.append("text")
				.attr("class", "caption")
				.attr("y", -5)
				.attr("x", maxPt - 2)
				.text(100);
		}
		return my;
	}(jQuery)),

	HEATMAP: (function($) {
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
		},
		my.getTargetDIV = function() {
			return this.targetDiv;
		}
		my.init = function(_configObj, _jsonData, _targteDiv) {
			config = $.extend(config, _configObj);
			this.setTargetDIV(_targteDiv);
			// svg = _svg;
			jsonData = _jsonData;
			return my;
		}
		getData = function(argument) {
			return jsonData;
		}
		my.setData = function(_dataObj) {
			jsonData = _dataObj;
			return my;
		}
		/**
		 * [draw_axis description]
		 * @return {[type]}
		 */
		var draw_axis = function() {
			var d, i;
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

		/**
		 * [draw_heatmap description]
		 * @param  {[type]} argument
		 * @return {[type]}
		 */
		var draw_heatmap = function(argument) {

			svg = d3.select("#" + targetDiv)
				.append("svg").attr("id", targetDiv + "_svg")
				.attr("width", config.dimensions.canvas_width + config.canvas_margin.right + config.canvas_margin.left)
				.attr("height", config.dimensions.canvas_height + config.canvas_margin.top + config.canvas_margin.bottom)
				.append("g")
				.attr("transform", "translate(" + config.canvas_margin.right + "," + config.canvas_margin.top + ")");


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
	}(jQuery)),

	_show_sliding_window: function(_config) {
		var myself = this;
		var current_x;
		var dimensions = _config.dimensions;
		var svg = _config.svg;
		var max_frame = dimensions.cell_width * dimensions.cell_count - dimensions.frame_width;
		var x = y = 0;
		var d, i;
		var drag = d3.behavior.drag()
			.on("dragend", function(d, i) {
				if (d.x < 0)
					d.x = 0;
				if (d.x > max_frame)
					d.x = max_frame;
				current_x = d.x;
				myself._drawZoomDiv(d);
				d3.select(this).style('cursor', '-webkit-grab');
				d3.select(this).style('cursor', '-moz-grab');
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

					d3.select(this).style('cursor', '-webkit-grabbing');
					d3.select(this).style('cursor', '-moz-grabbing');
					return "translate(" + [d.x] + ")";
				})
			});

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
	},

	_draw: function() {
		var $hmDiv = jQuery("#" + this.opt.targetDiv);

		[this._MAIN_HEAT_MAP_DIV, this._SCALE_DIV, this._ZOOM_HEAT_MAP_DIV].forEach(function(entry) {
			$hmDiv.append(jQuery('<div>')
				.attr('id', entry)
				.css('width', '75%')
				.css('margin', '25px'));
		});
		this.HEATMAP.init(this._viewer_config, this._origData, this._MAIN_HEAT_MAP_DIV).draw();


		this.SCALE.init({
			colorLow: this._viewer_config.colorLow,
			colorMid: this._viewer_config.colorMed,
			colorHigh: this._viewer_config.colorHigh,

			scoreLow: this._viewer_config.scoreLow,
			scoreMid: this._viewer_config.scoreMed,
			scoreHigh: this._viewer_config.scoreHigh,
			targetDiv: this._SCALE_DIV

		})

		if (this._viewer_config.dimensions.cell_width < this._viewer_config.labels.min_font_size) {
			this._viewer_config.main_heatmap.orig_cell_width = this._viewer_config.dimensions.cell_width;

			if (this.opt.show_zoom_panel)
				this._show_sliding_window({
					dimensions: {
						cell_width: this._viewer_config.dimensions.cell_width,
						cell_count: this._viewer_config.dimensions.cell_count,
						frame_width: 60 * this._viewer_config.dimensions.cell_width,
						height: this._viewer_config.dimensions.row_count * this._viewer_config.dimensions.cell_width
					},
					svg: d3.select("#" + this._MAIN_HEAT_MAP_DIV + "_svg > g")
				});
			this._drawZoomDiv();
		}
	},
	_init: function() {
		var _tmpData = this._origData;
		var _tmpCfg = this._viewer_config;

		// read in user defined _config
		if (this.opt.user_defined_config != 'undefined') {
			var _tmpUserCfg = this.opt.user_defined_config;
			['colorLow', 'colorHigh', 'colorMed'].forEach(function(entry) {
				if (_tmpCfg[entry])
					_tmpCfg[entry] = _tmpUserCfg[entry];
			});
		}
		this._calcHeatMap({
			start: 0,
			end: (_tmpData.length / 20) // TODO get number of rows autormatically!
		});
	},

	_drawZoomDiv: function(d) {
		var _start = 0;

		if (typeof d !== 'undefined')
			_start = Math.floor(d.x / this._viewer_config.main_heatmap.orig_cell_width);
		var _end = _start + this._viewer_config.slider.increments;
		this._viewer_config.offset = _start;

		this._calcHeatMap({
			start: _start,
			end: _end
		});
		var $_zoom_div = jQuery('#' + this._ZOOM_HEAT_MAP_DIV);
		if ($_zoom_div) {
			$_zoom_div.empty();
			this.HEATMAP.init(this._viewer_config, this._zoomedData, this._ZOOM_HEAT_MAP_DIV).draw();
		}
	},

	_calcHeatMap: function(rangeObj) {
		var _dimensions = {};
		var x_axis = [];
		var y_axis = [];
		var i;

		var _jsonData, _tmpStart;
		_tmpStart = 0;

		var $hmDiv = jQuery("#" + this.targetDiv);
		_dimensions.canvas_width = $hmDiv.width();
		if (this._origData) {
			if (typeof this.opt.jsonData != 'undefined') {
				_jsonData = this._origData.slice(rangeObj.start * 20, rangeObj.end * 20);
				_tmpStart = rangeObj.start;
			}
			var _tmpCol = 0,
				_tmpRow = 0,
				i = 0;
			jQuery.each(_jsonData, function(k, v) {
				if (v.row == 0) {
					x_axis.push(v.label);
					if (v.col > _tmpCol)
						_tmpCol = v.col;
				}
				if ((v.col - _tmpStart) == 0)
					y_axis.push(v.mut);

				if (v.row > _tmpRow)
					_tmpRow = v.row;
			});
			_dimensions.cell_count = _tmpCol - this._viewer_config.offset;
			_dimensions.row_count = _tmpRow;
			var _tmpCellSize = Math.max(Math.min(((_dimensions.canvas_width - this._viewer_config.canvas_margin.right - this._viewer_config.canvas_margin.left) / (_dimensions.cell_count + 1)),
				this._viewer_config.main_heatmap.max_cell_width), this._viewer_config.main_heatmap.min_cell_width);

			_dimensions.cell_height = _dimensions.cell_width = _tmpCellSize;
			_dimensions.canvas_height = (_dimensions.row_count + 1) * _dimensions.cell_height;
			this._zoomedData = _jsonData;
		}
		this._viewer_config.dimensions = jQuery.extend(true, {}, _dimensions);
		this._viewer_config.x_axis = x_axis;
		this._viewer_config.y_axis = y_axis;
		this._viewer_config.slider.increments = Math.floor((_dimensions.canvas_width / this._viewer_config.zoom_area.cell_width) - 1);
	},
});