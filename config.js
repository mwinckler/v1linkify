// config.js - provides support objects and functions for options/config

var V1Linkify = {
	config: new (function() {
		// I could have persisted this entire object to localStorage
		// using JSON.stringify and retrieved it via JSON.parse, but
		// that doesn't handle not to so that the options page could
		// the RegExp object so we'd have to write code to deal with
		// that anyway, plus migrations anytime structure changed.
		var config = this;

		/// Loads config values from localStorage.
		config.reload = function() {
			console.debug('[config.reload] Entry.', this);

			// The base URL of your VersionOne instance
			config.v1BaseUrl = localStorage["v1BaseUrl"];
			// A regex matching issue IDs to be searched for	
			config.issueIdRegex = localStorage["issueIdRegex"] || "(\b(D|B|AT|E|R|I|AT)-\d{5}\b)";
			// The path to the V1 search page, relative to v1BaseUri
			// #{query} will be replaced with the search term
			config.searchPath = localStorage["searchPath"] || "Search.mvc/Advanced?q=#{query}";

			// An array of CSS selectors to search inside of.
			// Elements matching these selectors will be searched
			// (along with all their childNodes) for matches to 
			// issueIdRegex.
			// Note - on empty string, this'll default to ['body']...
			// it is not allowable to have no search elements.		
			config.searchElements = (localStorage["searchElements"] || "body").split('\n');

			// An array of CSS selectors within which issueIdRegex
			// matches will be ignored. Use this to avoid linkifying
			// parts of a page, such as the header element on the
			// V1 page for the issue itself.
			// Unlike search elements, it is allowable (though not 
			// advisable) to have no excludeSelectors, so we have to
			// check explicitly for undefined.
			config.excludeSelectors = localStorage["excludeSelectors"] === undefined
										? [
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
											]
										: localStorage["excludeSelectors"].split('\n');

			// When true, identifies all issues on the page and attempts
			// to prefetch links to all of them. When false, only begins
			// a link prefetch when the link is moused over.
			config.prefetchAll = localStorage["prefetchAll"];		

			console.debug('[config.reload] Exit.', this);
		};

		/// Persists current values to localStorage.
		config.save = function() {
			console.debug('[config.save] Entry.', config);

			localStorage["v1BaseUrl"] = config.v1BaseUrl;
			localStorage["issueIdRegex"] = config.issueIdRegex;
			localStorage["searchPath"] = config.searchPath;
			localStorage["searchElements"] = (config.searchElements || []).join("\n");
			localStorage["excludeSelectors"] = (config.excludeSelectors || []).join("\n");
			localStorage["prefetchAll"] = config.prefetchAll;
		};

		// Initialize properties/perform initial load
		config.reload();

	})()
};


chrome.extension.onMessage.addListener(
	function(request, sender, sendResponse) {
		console.debug(request);
		if (request.requestType === "config") {
			sendResponse({config: V1Linkify.config});
		}
	}
);

