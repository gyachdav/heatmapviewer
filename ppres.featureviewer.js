var FEATURE_VIEWER = function(argument) {
	var displayDiv,
		dataObj,
		showAlignment,
		prot_name = 'query',
		displayDivWidth = 0,
		sequence_line_y = 70,
		currentBottom = sequence_line_y + 5,
		current_track_count = 0,
		outer_margin = 30.
		inner_margin = outer_margin * 2,
		json_config_obj = json_config_obj_init = {
			"featuresArray": [],
			"segment": prot_name,
			"legend": {
				"segment": {
					"yPosCentered": 190,
					"text": "",
					"yPos": 300,
					"xPos": 15,
					"yPosNonOverlapping": 106,
					"yPosRows": 290
				},
				"key": []
			},
			"configuration": {
				"requestedStart": 1,
				"rightMargin": 5,
				"belowRuler": 30,
				"horizontalGridNumLinesNonOverlapping": 2,
				"horizontalGridNumLinesCentered": 6,
				"verticalGridLineLengthRows": 284,
				"unitSize": 6.875,
				"sizeYNonOverlapping": 76,
				"style": "rows",
				"sequenceLineYRows": 155,
				"sequenceLineY": sequence_line_y,
				"verticalGrid": false,
				"rulerY": 20,
				"horizontalGrid": false,
				"pixelsDivision": 50,
				"aboveRuler": 10,
				"sizeYKey": 20,
				"sizeYCentered": 160,
				"sequenceLineYNonOverlapping": sequence_line_y,
				"leftMargin": 20,
				"nonOverlapping": true
			}
		};

	(argument.providers) ? providers = argument.providers : providers = APP.providers;
	(typeof argument.showAlignment !== 'undefined') ? showAlignment = argument.showAlignment : showAlignment = false;
	if (argument.dataObj) dataObj = argument.dataObj;
	else throw new Error("Data missing cannot draw component");
	displayDiv = argument.targetDiv;


	displayDivWidth = jQuery("#" + displayDiv).width();
	json_config_obj.configuration.sizeX = (displayDivWidth - outer_margin);
	json_config_obj.configuration.rulerLength = (displayDivWidth - inner_margin);
	json_config_obj.configuration.sequenceLength = dataObj.getSequence().length;
	json_config_obj.configuration.requestedStop = dataObj.getSequence().length;


	var addTrack = function(track) {
		if (track.getShiftBottomLine()) {
			track.setPosition(currentBottom);
			json_config_obj.configuration.sizeY = track.getBottom();
			json_config_obj.configuration.sizeYRows = track.getBottom();
			currentBottom = track.getBottom();
		}
	};
	var getSequenceLineY = function() {
		return sequence_line_y;
	};

	return {
		getSequenceLineY: function() {
			return sequence_line_y;
		},
		getCurrentBottom: function() {
			return (currentBottom);
		},
		setCurrentBottom: function(y) {
			currentBottom = y;
		},

		setup: function() {
			var features_array = [];
			this.setFeaturesArray(jQuery.map(providers, function(provider, index) {
				var track, feature_properties;
				track = new Track();
				if (provider == "ISIS") track.setShiftBottomLine(Track.NO_BOTTOMLINE_SHIFT);
				if (provider == "DISIS") track.setShiftBottomLine(Track.NO_BOTTOMLINE_SHIFT);
				if (provider == "DISULFIND") track.setShiftBottomLine(Track.NO_BOTTOMLINE_SHIFT);
				else track.setPosition(currentBottom);

				if (provider == "PROFAcc") {
					feature_properties = dataObj.getSolvAcc();
					if (!feature_properties) return null;
					var feature_type = dataObj.getFeatureByProvider(dataObj.getFeatureTypeGroup(), provider).type;
				} else {
					var feature_group = dataObj.getFeatureByProvider(dataObj.getFeatureTypeGroup(), provider);
					if (!feature_group) return null;
					var feature_type = (feature_group.type) ? feature_group.type : "";
					feature_properties = dataObj.getFeatureLocations(feature_group);
				}
				
				if (!feature_properties) return null;
				if (feature_properties) i = feature_properties.length;
				while (i--) {
					var feature;
					if (typeof Feature[provider] !== 'undefined') {
						Feature[provider].prototype = new Feature();
						feature = new Feature[provider](feature_properties[i], provider, feature_type, sequence_line_y);
					} else {
						feature = new Feature().init(feature_properties[i], provider, feature_type);
					}
					track.addFeature(feature);
				}
				addTrack(track);
				return track.getTrack();
			}));

			if (showAlignment) {
				// Add alignment
				this.setFeaturesArray(jQuery.map(dataObj.getAlignmentLocations(), function(target, index) {
					var track = new Track(1, 3);
					track.setPosition(currentBottom);
					Feature.Alignment.prototype = new Feature();
					feature = new Feature.Alignment(target, 'blast', 'alignmnet');
					track.addFeature(feature);
					addTrack(track);
					return track.getTrack();
				}));
			}
		},

		draw: function() {
			var myPainter = new Biojs.FeatureViewer({
				target: displayDiv,
				json: json_config_obj
			});

			jQuery("input:button", "#uniprotFeaturePainter-printButton").addClass("btn btn-primary");
			jQuery("#uniprotFeaturePainter-slider-values").addClass("text-info");

			myPainter.onFeatureSelected(

			function(obj) {
				if (obj.featureId.match(/^alignment/)) {

					// 'alignment', (target.db"-"+target.id+"-"+index)
					__id = /^alignment__(\w+[\-\w+]+)__(\w+)__(\w+)/.exec(obj.featureId);
					if (__id[1] && __id[2]) {
						if (__id[1].match(/pdb/i)) {
							(__pdb) = __id[2].split('_');
							__url = 'http://www.rcsb.org/pdb/explore.do?structureId=' + __pdb[0];
						} else __url = 'http://www.uniprot.org/uniprot/' + __id[2];
						var win = window.open(__url, '_blank');
						win.focus();
					}
				}
			});
		},
		setFeaturesArray: function(features_array) {
			jQuery.merge(json_config_obj.featuresArray, features_array);
		},
		setProteinName: function(prot_name) {
			json_config_obj.segment = prot_name;
		},
		getProteinName: function() {
			return prot_name;
		},
		getDisplayWidth: function() {
			return displayDivWidth;
		},
	};
};



/**
 @params 
	_feature = {
		begin: int,
		end: int,
		code : string,
		type: string
	},
	_feature_provider = string,
	_feature_type  = string
@returns Feature
*/
var Feature = Feature || {};

var Feature = function() {
	var default_stroke = 0,
		default_shape = "rect",
		default_opacity = 0.5,
		color = 'grey',
		feature = {},
		being,
		end,
		featureTypeLabel;



	var setLocation = function(start, stop) {
		addStart(start);
		addStop(stop);
	};
	var addStart = function(pos) {
		feature.featureStart = pos;
	};
	var addStop = function(pos) {
		feature.featureEnd = pos;
	};
	var getLabel = function() {
		return (label);
	};
	var createLabel = function(_feature, _feature_provider, _feature_type) {
		var featureTypeLabel;

		(_feature.type && typeof _feature.type !== undefined) ? featureTypeLabel = _feature.type : featureTypeLabel = "";
		if (!_feature.code) _feature.code = "";

		var label = {
			"typeCode": _feature.code,
			"evidenceText": "Prediction (" + _feature_provider + ") ",
			"featureTypeLabel": featureTypeLabel,
			"featureLabel": _feature_type ? _feature_type : featureTypeLabel,
			"evidenceCode": "See Citing Info Below",
			"typeCategory": ""

		};
		jQuery.extend(feature, label);
	};

	return {
		setFeatureID: function(feature_id) {
			feature.featureId = feature_id;
		},
		setLabel: function(_label) {
			jQuery.extend(feature, _label);
		},

		setFeature: function(_feature) {
			jQuery.extend(feature, _feature);
		},
		getFeature: function() {
			return (feature);
		},
		setColor: function() {
			feature.fill = this.color;
			feature.stroke = this.color;
		},
		init: function(_feature, _feature_provider, _feature_type) {
			feature = {
				"type": default_shape,
				"fillOpacity": default_opacity,
				"strokeWidth": default_stroke,
				"name": _feature_provider,
				"fill": 'grey',
				'stroke': 'grey'
			}, begin = _feature.begin,
			end = _feature.end;

			var _label = createLabel(_feature, _feature_provider, _feature_type);
			this.setLabel(_label);
			setLocation(begin, end);
			this.setFeatureID(_feature_provider + "__" + begin);

			return this.getFeature();
		}
	}

};

Feature.Alignment = function(_feature, _feature_provider, _feature_type) {
	this.init.call(this, _feature, _feature_provider, _feature_type);
	this.setFeatureID('alignment__' + _feature.db + '__' + _feature.id + '__' + _feature.begin + _feature.end);

	(_feature.type && typeof _feature.type !== undefined) ? featureTypeLabel = _feature.type : featureTypeLabel = "";

	this.color = "blue";

	if (_feature.db.match(/pdb/i)) {
		this.color = "purple";
		(__pdb) = _feature.id.split('_');
		_feature.id = __pdb[0];
		if (__pdb[1]) _feature.id += " Chain: " + __pdb[1];
	}else if(_feature.db.match(/Swiss-Prot/i)) { 
		this.color = "green";
	}

	var _label = {
		"featureLabel": "Aligned Target " + _feature.db + ":" + _feature.entryname,
		"typeCode": "Eval: " + _feature.eval,
		"evidenceText": 'Alignment (NCBI-BLAST)',
		"featureTypeLabel": " Matched Length: " + _feature.matchlen,
		"typeCategory": "Identity: " + parseFloat(_feature.identity).toFixed(2),
		"evidenceCode": ""
		//			"evidenceCode": "http://edamontology.org/data_1387"
		// todo: add dbreference to label
	};

	this.setLabel(_label);

	this.setColor();
	return this.getFeature();
};


Feature.PROFsec = function(_feature, _feature_provider, _feature_type) {
	this.init.call(this, _feature, _feature_provider, _feature_type);

	switch (_feature.type) {
		case 'helix':
			this.color = '#990000';
			break;
		case 'strand':
			this.color = '#0000CC';
			break;
		default:
			this.color = '#006600';
			break;
	}

	this.setColor();
	return this.getFeature();
};


Feature.PROFAcc = function(_feature, _feature_provider, _feature_type) {
	this.init.call(this, _feature, _feature_provider, _feature_type);

	if (_feature.type == 'Buried' )
		this.color = 'yellow';
	else if (_feature.type ==  'Exposed')
		this.color = 'blue';
	else
		this.color = 'white';

	this.setColor();
	return this.getFeature();
};


Feature.NORSnet = function(_feature, _feature_provider, _feature_type) {
	this.init.call(this, _feature, _feature_provider, _feature_type);

	this.color = "gray";
	this.setColor();
	return this.getFeature();

};

Feature.ISIS = function(_feature, _feature_provider, _feature_type, featurePos) {
	// featurePos  = this is an optional param that indicates where to place the feature 
	// todo this should probably be established on the track level 
	this.init.call(this, _feature, _feature_provider, _feature_type);
	this.color = "red";
	this.setColor();

	var feature = {
		"type": "diamond",
		"r": 5,
		"cy": featurePos - 30,
	}
	this.setFeature(feature);
	return this.getFeature();

};

Feature.DISIS = function(_feature, _feature_provider, _feature_type, featurePos) {
	this.init.call(this, _feature, _feature_provider, _feature_type);
	this.color = "orange";
	this.setColor();

	var feature = {
		"type": "circle",
		"r": 5,
		"cy": featurePos - 30,
	}
this.setFeature(feature);
	return this.getFeature();

};

Feature.ASP = function(_feature, _feature_provider, _feature_type) {
	this.init.call(this, _feature, _feature_provider, _feature_type);
	this.color = "green";
	this.setColor();
	return this.getFeature();

};

Feature.DISULFIND = function(_feature, _feature_provider, _feature_type, featurePos) {
	this.init.call(this, _feature, _feature_provider, _feature_type);
	// this.stroke = "black";
	// this.fill = "transperant";
	//this.setColor();

	var feature = {
		"type": "bridge",
		"cy": featurePos,
		"height": 100,
		fill: 'white',
		stroke: 'black'
		// "width": 50,
		// "cx": 10,
		// "cy": 40
	}
	this.setFeature(feature);
	return this.getFeature();

};

Feature.PredictNLS = function(_feature, _feature_provider, _feature_type) {
	this.init.call(this, _feature, _feature_provider, _feature_type);
	this.color = "brown";
	this.setColor();
	return this.getFeature();

};

Feature.PHDhtm = function(_feature, _feature_provider, _feature_type) {
	this.init.call(this, _feature, _feature_provider, _feature_type);
	this.color = "purple";
	this.setColor();
	return this.getFeature();
};

Feature.PROFbval = function(_feature, _feature_provider, _feature_type) {
	this.init.call(this, _feature, _feature_provider, _feature_type);
	this.color = "yellow";
	this.setColor();
	return this.getFeature();
};

Feature.Ucon = function(_feature, _feature_provider, _feature_type) {
	this.init.call(this, _feature, _feature_provider, _feature_type);
	this.color = "orange";
	this.setColor();
	return this.getFeature();
};

Feature.MD = function(_feature, _feature_provider, _feature_type) {
	this.init.call(this, _feature, _feature_provider, _feature_type);
	this.color = "#225533";
	this.setColor();
	return this.getFeature();
};



var Track = function(__height, __margin) {

	var default_height = 10,
		config = {},
		shift_bottom_line = true,
		features = [];

	(__height) ? config.height = __height : config.height = default_height;
	(__margin) ? config.margin = __margin : config.margin = default_height;

	return {
		setShiftBottomLine: function(_shift_flag) {
			shift_bottom_line = _shift_flag;
		},
		getShiftBottomLine: function() {
			return shift_bottom_line;
		},
		setPosition: function(starting_y) {
			config.y = starting_y;
		},
		getTrackHeight: function() {
			return config;
		},
		getBottom: function() {
			return (config.y + config.height + config.margin)
		},
		getConfig: function() {
			return (config);
		},
		addFeature: function(feature) {
			if (feature.name == 'DISULFIND')
				config.height += (features.length * 5);
			// config.height += ((features.length%2)*5);
			features.push(jQuery.extend(feature, config));
		},
		getTrack: function() {
			return features;
		}
	}
};
Track.NO_BOTTOMLINE_SHIFT = false;