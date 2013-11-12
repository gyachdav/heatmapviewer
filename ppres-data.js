// App Excpetions

function PPResException(message, error, status) {
	this.message = message;
	this.name = error;
	this.status = status;
}


function PPResData() {

	// Helper funciton to calculate date difference
	// TODO put in ppres.utils
	var DateDiff = {

		inDays: function(d1, d2) {
			var t2 = d2.getTime();
			var t1 = d1.getTime();

			return parseInt((t2 - t1) / (24 * 3600 * 1000));
		},

		inWeeks: function(d1, d2) {
			var t2 = d2.getTime();
			var t1 = d1.getTime();

			return parseInt((t2 - t1) / (24 * 3600 * 1000 * 7));
		},

		inMonths: function(d1, d2) {
			var d1Y = d1.getFullYear();
			var d2Y = d2.getFullYear();
			var d1M = d1.getMonth();
			var d2M = d2.getMonth();

			return (d2M + 12 * d2Y) - (d1M + 12 * d1Y);
		},

		inYears: function(d1, d2) {
			return d2.getFullYear() - d1.getFullYear();
		}
	}



	var xml_data_source = '',
		prof_data_source = '',
		organism = '',
		jobName = '',
		proteinName = '',
		proteinID = '',
		recommendedName = '',
		defline = '',
		ppJobId = -1,
		json_data = {},
		xml_data = {},
		protein = {},
		sequence = '',
		md5Seq = '',
		alignments = {},
		pubmedSummaries = {},
		creation_date = '1/1/1961',
		modification_date = '1/1/1961',
		is_expired = false,
		data_ready = false,
		data = {
			data_size: 0,
			data_format: this.file_type,
			xml: '',
			json: ''
		};


	var isExpired = function(orig_date) {
		var d1 = new Date(orig_date);
		var d2 = new Date();

		if (DateDiff.inMonths(d1, d2) > 3)
			return true;
		return false;

	}
	var setOrganism = function(_org) {
		organism = _org;
	};
	var setDataReady = function() {
		data_ready = !data_ready;
	};
	var getAlignments = function() {
		return (alignments);
	};

	var setLitsearchData = function(data) {
		pubmedSummaries = data;
	};

	var getReference = function(ref_id) {
		var _ref;
		refs = json_data.entry.reference;
		jQuery.each(refs, function(index, ref) {
			if (ref.entryKey.entryKeyValue == ref_id) {
				_ref = ref;
				return (false);
			}
		});
		return _ref;
	};


	var getReferenceByProvider = function(feature_provider) {
		var feature = this.getFeatureByProvider(this.getFeatureTypeGroup(), feature_provider);
		var refId;

		if (!feature) return null;

		if (feature.featureProviderGroup)
			refId = feature.featureProviderGroup.ref;
		else if (feature.ref)
			refId = feature.ref;
		else
			return null;
		return (getReference(refId));

	};

	var getAlignmentsByDatabaseTopMatch = function(db_name) {
		var alis = getAlignments();
		var topmatch = undefined;
		if (alis === undefined)
			return undefined;

		if (Object.prototype.toString.call(alis) === '[object Array]') {
			jQuery.each(alis, function(i, v) {
				if ((v.dbReference.type.match(new RegExp(db_name, 'i'))) && (v.identity.value == 1)) {
					topmatch = v;
					return (false);
				}
			});
		} else {
			if ((alis.dbReference.type.match(new RegExp(db_name, 'i'))) && (alis.identity.value == 1)) {
				topmatch = alis;
				return (false);
			}
		}

		return (topmatch);
	};

	var setJsonData = function(json) {
		json_data = json;
		sequence = jQuery.trim(json_data.entry.sequence).replace(/(\r\n|\n|\r|\s)/gm, "");
		md5Seq = md5(sequence);
		alignments = json_data.entry.aliProviderGroup.alignment;
		protein = json_data.entry.protein;
		setOrganism(json_data.entry.organism);

		if (protein.recommendedName.fullName != 'unknown')
			defline = protein.recommendedName.fullName;

		if (json_data.entry.accession != 'unknown')
			recommendedName = json_data.entry.accession;

		// TODO URGENT: put protein id into XML
		topmatch = getAlignmentsByDatabaseTopMatch('Swiss-Prot');
		if (topmatch)
			proteinID = topmatch.dbReference.id;

		proteinName = jobName = resolveJobName();
		creation_date = json_data.entry.created;
		modification_date = json_data.entry.modified;
		is_expired = isExpired(modification_date);

	};

	var resolveJobName = function() {
		if (proteinName)
			return proteinName;
		if (recommendedName)
			return recommendedName;
		return "Request ID: " + ppJobId;
	}



	return {
		setJsonData : setJsonData, 
		getReferenceByProvider: getReferenceByProvider,
		getReference: getReference,
		getLitsearchData: function() {
			return pubmedSummaries;
		},
		setLitsearchData: setLitsearchData,

		dataReady: function() {
			return data_ready;
		},
		loadData: function(_file_specs) {
			var file_path = _file_specs.path,
				file_name = _file_specs.name,
				file_type = _file_specs.type;
			var data;
			file_path += "/" + file_name;
			return (jQuery.ajax({
				url: file_path,
				success: function(data) {
					console.log(file_path + " load success");
				},
				error: function(jqXHR, textStatus, errorThrown) {
					console.log(file_path + " load fail");
					// throw new PPResException (
					// 	textStatus,
					// 	errorThrown
					// 	jqXHR.status
					// );
				},
				dataType: file_type
			}));
		},

		populateData: function(data, reqID, reqName) {
			xml_data = data;
			this.setJobID(reqID);

			if (reqName && reqName != '%REQ_NAME%')
				this.setProteinName(reqName);
			setJsonData(jQuery.xml2json(data));
			setDataReady();
		},

		getSubCellLocations: function(domain) {
			var _ret_obj = {};

			var providers = ["LOCtree", "LOCtree2"];
			if (domain) {
				if (jQuery.inArray(domain, ["arch", "bact", "euka"]) != -1) provider = providers[1];
				else if (jQuery.inArray(domain, ["plant", "animal", "proka"]) != -1) provider = providers[0];
				else return null;
				var subcell_group = this.getFeatureByProvider(this.getFeatureTypeGroup(), provider);
				_tmp_ref = subcell_group.subcellularLocalisation.localisation[domain];
				if (_tmp_ref) {
					_tmp_loc = Object.keys(_tmp_ref)[0];
					_ret_obj[domain] = {
						score: _tmp_ref[_tmp_loc].score,
						goTermId: _tmp_ref[_tmp_loc].goTermId,
						localisation: _tmp_loc,
						provider: provider
					};
					return (_ret_obj);
				} else return null;
			}

			for (var provider in providers) {
				var subcell_group = this.getFeatureByProvider(this.getFeatureTypeGroup(), providers[provider]);
				var domains = ["arch", "bact", "euka", "plant", "animal", "proka"];
				for (var i in domains) {
					_tmp_ref = subcell_group.subcellularLocalisation.localisation[domains[i]];
					if (_tmp_ref) {
						_tmp_loc = Object.keys(_tmp_ref)[0];
						_tmp_score = _tmp_ref[_tmp_loc].score;
						_tmp_go = _tmp_ref[_tmp_loc].goTermId;
						_ret_obj[domains[i]] = {
							score: _tmp_score,
							goTermId: _tmp_go,
							localisation: _tmp_loc,
							provider: providers[provider]
						};
					}
				}
			}
			return (_ret_obj);
		},

		getGOAnnotations: function(argument) {
			var _ret_obj = {};

			var provider = "Metastudent";
			var goFeatureProviderGroup = this.getFeatureByProvider(this.getFeatureTypeGroup(), provider).featureProviderGroup;
			var ontologyPredictionArray = goFeatureProviderGroup.goAnnotationRegion.goAnnotation.ontologyPrediction;

			return ontologyPredictionArray;
		},

		getSSComposition: function(argument) {
			var ss_feature = this.getFeatureByProvider(this.getFeatureTypeGroup(), "PROFsec");
			var ss_feature_array = this.getFeatureLocations(ss_feature);
			var ss_composition = {
				helix: 0,
				strand: 0,
				loop: 0
			};
			jQuery.each(ss_feature_array, function(index, obj) {
				_type = obj.type;
				ss_composition[_type] += parseInt(obj.end) - parseInt(obj.begin);
			});
			ss_composition.loop = this.getSequence().length - parseInt(ss_composition.helix) - parseInt(ss_composition.strand);
			return (ss_composition);
		},

		getSolvAccComposition: function(argument) {
			var solvAccFeature = this.getFeatureByProvider(this.getFeatureTypeGroup(), "PROFacc");
			var ss_feature_array = solvAccFeature.featureProviderGroup.solventAccessibility.featureString.split('');
			var solvAccComposition = {
				Buried: 0,
				Intermediate: 0,
				Exposed: 0
			};

			var Buried = Intermediate = Exposed = 0;

			jQuery.each(ss_feature_array, function(index, obj) {
				var n = parseInt(obj);
				if (n == 5)
					solvAccComposition.Intermediate++;
				else if (n < 5)
					solvAccComposition.Buried++;
				else if (n > 5)
					solvAccComposition.Exposed++;
			});
			return (solvAccComposition);
		},

		getSolvAcc: function(argument) {
			var solvAccFeature = this.getFeatureByProvider(this.getFeatureTypeGroup(), "PROFacc");
			var arrProps = solvAccFeature.featureProviderGroup.solventAccessibility.featureString.replace(/(\r\n|\n|\r|\s)/gm, "").split('');

			// convert solvent accessbility from positional annotation to continuous stretche
			r = _.range(10, 11);
			var obj = null;
			var arrObjs = [];
			jQuery.each(arrProps, function(i, n) {
				n = parseInt(n);
				if (jQuery.inArray(n, r) == -1) {

					if (obj) {
						arrObjs.push(obj);
						delete obj;
					}

					obj = {
						begin: i,
						end: i
					};
					if (n > 5) {
						r = _.range(6, 10);
						obj.type = 'Exposed';
					} else if (n < 5) {
						r = _.range(0, 5);
						obj.type = 'Buried';
					} else {
						r = _.range(5, 6);
						obj.type = 'Intermediate';
					}
				} else {
					obj.end = i;
				}
			});

			return arrObjs;

		},

		getAAComposition: function(argument) {
			var aa_composition = {};
			jQuery.map(this.getSequence().split(''), function(aa, index) {
				if (!(aa in aa_composition)) aa_composition[aa] = 0;
				aa_composition[aa] = parseInt(aa_composition[aa]) + 1;
			});
			return (aa_composition);
		},

		getAlignmentsByDatabaseTopMatch: getAlignmentsByDatabaseTopMatch,


		getAlignmentsByDatabase: function(db_name) {
			var alis = this.getAlignments();
			var count = 0;

			if (Object.prototype.toString.call(alis) === '[object Array]') {
				jQuery.each(alis, function(i, v) {
					if (v.dbReference.type.match(new RegExp(db_name, 'i')))
						count++;
				});
			} else {
				if (alis.dbReference.type.match(new RegExp(db_name, 'i')))
					count++;
			}
			return (count);
		},


		getAlignmentsCount: function() {
			if (Object.prototype.toString.call(this.getAlignments()) === '[object Array]')
				return (this.getAlignments().length);
			else
				return (1);
		},

		getXMLData: function() {
			return (xml_data);
		},

		getJsonData: function() {
			return (json_data);
		},

		getSequence: function() {
			return (sequence);
		},
		getJobName: function() {
			return (jobName);
		},
		setJobName: function(name) {
			jobName = name;
		},
		getJobID: function() {
			return (ppJobId);
		},

		setJobID: function(id) {
			ppJobId = id;
		},

		getMD5Seq: function() {
			return (md5Seq);
		},
		getAlignmentLocations: function(database) {
			var alis = this.getAlignments();
			var locations_array = [];


			if (Object.prototype.toString.call(alis) === '[object Array]') {
				jQuery.each(alis, function(index, alignment) {
					if (database && alignment.dbReference.type.toUpperCase() != database.toUpperCase())
						return true;
					locations_array.push({
						begin: parseInt(alignment.queryStart.value),
						end: parseInt(alignment.queryEnd.value),
						id: alignment.dbReference.id,
						entryname: alignment.dbReference.entryname,
						db: alignment.dbReference.type,
						eval: alignment.expect.value,
						matchlen: alignment.matchLen.value,
						identity: alignment.identity.value
					});
				});
			} else {
				locations_array.push({
					begin: parseInt(alis.queryStart.value),
					end: parseInt(alis.queryEnd.value),
					id: alis.dbReference.id,
					entryname: alis.dbReference.entryname,
					db: alis.dbReference.type,
					eval: alis.expect.value,
					matchlen: alis.matchLen.value,
					identity: alis.identity.value
				});
			}
			return (locations_array);
		},
		convertIDtoURL: function(aliObj) {
			if (aliObj.db.match(/pdb/i)) {
				(__pdb) = aliObj.id.split('_');
				_feature.id = __pdb[0];
				if (__pdb[1]) _feature.id += " Chain: " + __pdb[1];
			}

		},
		getAlignments: function() {
			return (alignments);
		},

		getFeatureTypeGroup: function() {
			return (json_data.entry.featureTypeGroup);
		},
		getProteinName: function() {
			return proteinName;

		},
		setProteinName: function(name) {
			proteinName = name;
		},
		getProteinID: function() {
			return proteinID;
		},
		setProteinID: function(id) {
			proteinID = id;
		},
		getCreationDate: function() {
			return creation_date;
		},
		getModificationDate: function() {
			return modification_date;
		},
		getIsExpired: function() {
			return is_expired;
		},
		setProteinID: function(id) {
			proteinID = id;
		},

		getRecommendedName: function() {
			return recommendedName;
		},
		getDefLine: function() {
			return defline;
		},

		getOrganismName: function() {
			if ((organism.name) && (organism.name.text) && (organism.name.text != 'unknown'))
				return (organism.name.text);
			return undefined;
		},
		getOrganismDomain: function() {
			return (organism.domain);
		},
		getOrganismTaxID: function() {
			if (organism.dbReference.id != -1)
				return (organism.dbReference.id);
			return undefined;
		},


		// Look up feature by feature types
		getFeatureByType: function(featureName) {
			var feature;
			jQuery.each(this.json_data.entry.featureTypeGroup, function(i, v) {
				if (v.type.match(new RegExp(featureName, 'i'))) {
					feature = v;
					return false;
				}
			});
			return (feature);
		},


		getFeatureByProvider: function(feature_list, feature_provider) {
			var getFeatureByProvider = this.getFeatureByProvider;
			var feature;
			var pred_type;

			jQuery.each(feature_list, function(index, feature_type) {
				if (jQuery.isArray(feature_type.featureProviderGroup)) {
					type = feature_type.type;
					feature = getFeatureByProvider(feature_type.featureProviderGroup, feature_provider);
					if (feature) {
						jQuery.merge(feature, type);
						return false;
					};
				} else {
					var selector = feature_type.featureProviderGroup;

					if (feature_type.featureProviderGroup === undefined) selector = feature_type;
					if (selector.provider.match(new RegExp("^" + feature_provider + "$", 'i'))) {
						feature = feature_type;
						return false;
					}
				}
			});
			return (feature);
		},

		getFeatureLocations: function(feature_ref) {
			var locations = [];
			var location_obj_ref;

			if (feature_ref.featureProviderGroup && feature_ref.featureProviderGroup.feature) {
				location_obj_ref = feature_ref.featureProviderGroup.feature;
			} else if (feature_ref.feature) {
				location_obj_ref = feature_ref.feature;
			} else {
				return null;
			};


			if (jQuery.isArray(location_obj_ref)) {
				jQuery.each(location_obj_ref, function(index, val) {
					locations.push({
						begin: parseInt(val.location.begin.position),
						end: parseInt(val.location.end.position),
						type: val.type,
						code: val.soTermId
					});
				});
			} else if (location_obj_ref.location) {
				var ref = location_obj_ref.location;
				locations.push({
					begin: parseInt(ref.begin.position),
					end: parseInt(ref.end.position),
					type: ref.type
				});
			}
			return (locations);
		},

		searchLitsearchData: function(term, page, successFun, errorFun) {

			var SEARCH_URL = 'http://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=';
			var PAGE_ARG = "&retmax=";
			var PAGE_SIZE = 10;
			var START_ARG = "&retstart=";

			/**
			 * Search on PubMed by term (all fields).
			 *
			 * @term term for search, for example 'p53'
			 * @page search page starting from 0 (if not given, defaults to 0)
			 *
			 *
			 * @return object with fields:
			 *   'pmids': array of found pmids for given page (if non empty)
			 *   'numPages': total number of pages for the search resul
			 */
			var searchPubmedByTerm = function(term, page, successFun) {
				if (page === undefined) {
					page = 0;
				}
				var startItem = (page * PAGE_SIZE);
				var url = SEARCH_URL + term + PAGE_ARG + PAGE_SIZE + START_ARG + startItem;
				console.log(url);
				jQuery.ajax({
					async: true,
					timeout: 2000,
					url: url,
					dataType: "xml",
					success: function(xml) {
						var $xml = jQuery(xml);
						var ret = {};
						ret.pmids = jQuery.map($xml.find('IdList Id'), function(id) {
							return jQuery(id).text();
						});
						ret.numPages = Math.ceil(parseInt($xml.find('Count').text(), 10) / PAGE_SIZE);
						successFun(ret);
					},
					error: errorFun
				});
			};

			var SUMMARY_URL = 'http://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=';
			var PUBMED_LINK = 'http://www.ncbi.nlm.nih.gov/pubmed/';

			var fetchSummariesByIds = function(searchResult, successFun) {
				var url = SUMMARY_URL + searchResult.pmids.join(",");

				jQuery.ajax({
					async: false,
					timeout: 2000,
					url: url,
					dataType: "xml",
					success: function(xml) {
						//console.log((new XMLSerializer()).serializeToString(xml));
						var $xml = jQuery(xml);
						var ret = {
							numPages: searchResult.numPages
						};

						ret.summaries = jQuery.map($xml.find('DocSum'), function(doc) {
							var $doc = jQuery(doc);
							var id = $doc.find('Id').text();
							return {
								'id': id,
								'link': PUBMED_LINK + id,
								'title': $doc.find('[Name=Title]').text(),
								'pubdate': $doc.find('[Name=PubDate]').text(),
								'source': $doc.find('[Name=Source]').text()
							};
						});

						successFun(ret);
					},
					error: errorFun
				});
			};

			searchPubmedByTerm(term, page, function(searchResult) {
				fetchSummariesByIds(searchResult, successFun);
			});
		}

	};
}