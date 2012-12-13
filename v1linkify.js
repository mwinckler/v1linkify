	var init = function($, config) {

		// Configuration variables
		// TODO: Learn how to load these from extension config
		var urlHelper = new (function() {
			helper = this;
			this.stripLeadingSlash = function(str) {
				return (str === undefined || str === null || str.length === 0 || str[0] !== '/')
						? str
						: str.substr(1);
			};

			this.ensureTrailingSlash = function(str) {
				return (str === undefined || str === null || str.length == 0 || str.substr(-1) === '/')
						? str
						: str + '/';
			};

			/// Combine path parts using forward slashes avoiding duplicate slashes. 
			/// Preserves leading and trailing slashes and is unintelligent about
			/// query parameters, treating them as just another path element.
			this.pathCombine = function() {
				var ret = "";
				for (var i = 0; i < arguments.length; i++) {
					var part = i > 0 ? helper.stripLeadingSlash(arguments[i]) : arguments[i];
					ret += (i === arguments.length -1) ? part : helper.ensureTrailingSlash(part);
				}
				return ret;
			};

			this.getSearchUrl = function(query) {
				return helper.pathCombine(config.v1BaseUrl, config.searchPath.replace('#{query}', query));
			};
		})();


		/// Given an issue ID, returns an anchor element set up
		/// to locate and redirect to the permalink in VersionOne.
		function createAnchor(issueId) {
			var ret = $('<a href=""></a>')
						.addClass('v1linkify_needs_prefetch')
						.text(issueId)
						.mouseover(function(e) {
							// If we already have the true permalink of this issue,
							// then the href has been set appropriately - do nothing.
							// Otherwise, we need to look it up before navigating.
							if ($(this).attr('href') === '' && !$(this).data('fetching')) {
								$(this).addClass('v1linkify_fetching_permalink')
										.attr('title', 'Fetching permalink...')
										.data('fetching', true);
								var a = this;
								fetchPermalink(issueId, function(url) {
									$(a).attr('href', url)
										.removeClass('v1linkify_fetching_permalink')
										.removeClass('v1linkify_needs_prefetch')
										.removeAttr('title')
										.data('fetching', false);
								});
								return false;
							}
							// Normal link - do nothing
							return true;
						}).mousedown(function(e) {
							// TODO: This code is not useful ATM
				            switch (e.which) {
				                case 1:
				                    // Left mouse
				                    $(this).attr('target','_self');
				                    break;
				                case 2:
				                    // Middle mouse - this one attempts to navigate
				                    // immediately on mousedown in a new tab
				                    $(this).attr('target','_newtab');
				                    break;
				                case 3:
				                    // Right mouse
				                    $(this).attr('target','_blank');
				                    break;
				                default:
				                    // Bizarro mouse
				                    $(this).attr('target','_self"');
				            }
				        }).mouseup(function(e) { 
				        	// TODO: This code does not work as intended
				        	//	(intention: defer nav until permalink is fetched)

							// If the permalink has already been loaded, go there immediately.
							// If not, wait until the prefetch is done
							var a = $(this);
							var navIval = -1;
							function tryNavigate() {
								if (a.attr('href') === '') {
									return false;
								}
								if (a.attr('target') === '_self' || a.attr('target') === undefined) {
									document.location = a.attr('href');
								} else {
									window.open(a.attr('href'), a.attr('target'));
								}
								clearInterval(navIval);
								return true;
							};

							if (!tryNavigate()) {
								navIval = setInterval(tryNavigate, 500);
							}

						});
			return ret[0];
		};


		/// Attempts to locate and retrieve the true permalink for the given
		/// issueId by calling up VersionOne's search page and grabbing the
		/// first result.
		function fetchPermalink(issueId, callback) {
			$.ajax({
				url: urlHelper.getSearchUrl(issueId),
				type: "GET",
				dataType:'xml',
				xhrFields:{
					withCredentials: true
				},
				success: function(data, textStatus, jqXHR) {
					var link = $($('a.asset-number-link', data)[0]).attr('href');
					if (link === undefined) {
						// Fall back on search URL if no permalink found.
						link = urlHelper.getSearchUrl(issueId); 
					} else {
						// Massage the permalink some more.
						// V1 uses relative links that include the
						// 'instance identifier' at the end of our base URL;
						// strip it off and combine the base with the 
						// remaining path.
						link = urlHelper.pathCombine(config.v1BaseUrl, link.replace(/^\/[^\/]+/, ""));
					}
								
					if ($.isFunction(callback)) {
						callback(link)
					}
				}
			});
		};

		// Linkify issue IDs with an anchor set to fetch the real URL of the issue.
		function executeFind(node) {
			findAndReplaceDOMText(config.issueIdRegex, node, createAnchor, 1, { exclusions: config.excludeSelectors });
		};

		function fetchAll() {
			$('a.v1linkify_needs_prefetch').each(function() {
				var a = $(this);
				a.addClass('v1linkify_fetching_permalink')
				 .attr('title', 'Fetching permalink...')
				 .data('fetching', true);
				fetchPermalink(a.text().toUpperCase(), function(url) {
					a.attr('href', url)
					 .removeClass('v1linkify_needs_prefetch')
					 .removeClass('v1linkify_fetching_permalink')
					 .removeAttr('title')
					 .data('fetching', false)
				});
			});
		}

		executeFind(document.body);

		if (config.prefetchAll) {
			fetchAll();
		}

		// Listen for future changes to the DOM
		MutationObserver = window.WebKitMutationObserver;
		var observer = new MutationObserver(function(mutations, ob) {
			for (var i = 0; i < mutations.length; i++) {
				executeFind(mutations[i].target);
				if (config.prefetchAll) {
					fetchAll();
				}
			}
		});
		observer.observe(document.body, { attributes: false, childList: true, subtree: true });

	};

$(document).ready(function() {
	chrome.extension.sendMessage({requestType:"config"}, function(response) {
		console.debug(response);
		var config = response.config;
		config.issueIdRegex = new RegExp(config.issueIdRegex, "gi");
		setTimeout(function() { init(jQuery, config); }, 100);
		  
	});
});
