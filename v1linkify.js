(function($) {

	function stripLeadingSlash(str) {
		return (str === undefined || str === null || str.length === 0 || str[0] !== '/')
				? str
				: str.substr(1);
	};
	function ensureTrailingSlash(str) {
		return (str === undefined || str === null || str.length == 0 || str.substr(-1) === '/')
				? str
				: str + '/';
	};
	/// Combine path parts using forward slashes avoiding duplicate slashes. 
	/// Preserves leading and trailing slashes and is unintelligent about
	/// query parameters, treating them as just another path element.
	function pathCombine() {
		var ret = "";
		for (var i = 0; i < arguments.length; i++) {
			var part = i > 0 ? stripLeadingSlash(arguments[i]) : arguments[i];
			ret += (i === arguments.length -1) ? part : ensureTrailingSlash(part);
		}
		return ret;
	};

	// Configuration variables
	// TODO: Learn how to load these from extension config
	var config = (function($) {

		return {
			// The base URL of your VersionOne instance
			v1BaseUrl: "https://www8.v1host.com/TrackAboutInc01/",
			// A regex matching issue IDs to be searched for
			issueIdRegex: /(\b[DB]-\d{5}\b)/gi,
			// The path to the V1 search page, relative to v1BaseUri
			// #{query} will be replaced with the search term
			searchPath: "Search.mvc/Advanced?q=#{query}",
			// An array of CSS selectors to search inside of.
			// Elements matching these selectors will be searched
			// (along with all their childNodes) for matches to 
			// issueIdRegex.		
			searchElements: [
				"body"
			],
			// An array of CSS selectors within which issueIdRegex
			// matches will be ignored. Use this to avoid linkifying
			// parts of a page, such as the header element on the
			// V1 page for the issue itself.
			excludeSelectors: [
				"a", // Don't linkify links
				"code",
				"head",
				"noscript",
				"option",
				"style",
				"title",
				"textarea",
				"input",
				"script", // Don't break scripts
				"object", // ...or Flash
				"video", // ...or videos
				"audio", // ...or audio
				"embed", // ...or other embedded junk
				"track", // ...or...tracks
				"canvas", // ...and canvas probably doesn't have links for us
				".story-card .identity .number", // Card on storyboard
				".Story h4" // Header in card detail view
			],
			// When true, identifies all issues on the page and attempts
			// to prefetch links to all of them. When false, only begins
			// a link prefetch when the link is moused over.
			prefetchAll: true,
			// Returns a V1 search URL for the specified query.
			getSearchUrl: function(query) {
				return pathCombine(this.v1BaseUrl, this.searchPath.replace('#{query}', query));
			}
		};
	})(jQuery);


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
			            switch (e.which) {
			                case 1:
			                    // Left mouse
			                    $(this).attr('target','_self');
			                    break;
			                case 2:
			                    // Middle mouse - this one attemps to navigate
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
			url: config.getSearchUrl(issueId),
			type: "GET",
			dataType:'xml',
			xhrFields:{
				withCredentials: true
			},
			success: function(data, textStatus, jqXHR) {
				var link = $($('a.asset-number-link', data)[0]).attr('href');
				if (link === undefined) {
					// Fall back on search URL if no permalink found.
					link = config.getSearchUrl(issueId); 
				} else {
					// Massage the permalink some more.
					// V1 uses relative links that include the
					// 'instance identifier' at the end of our base URL;
					// strip it off and combine the base with the 
					// remaining path.
					link = pathCombine(config.v1BaseUrl, link.replace(/^\/[^\/]+/, ""));
				}
							
				if ($.isFunction(callback)) {
					callback(link)
				}
			}
		});
	};

	// Linkify issue IDs with an anchor set to fetch the real URL of the issue.
	findAndReplaceDOMText(config.issueIdRegex, document.body, createAnchor, 1, { exclusions: config.excludeSelectors });

	if (config.prefetchAll) {
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
})(jQuery);