var optionsPage = (function() {
	var _config = V1Linkify.config;
	var _defaultBaseUrl = _config.DEFAULT_BASE_URL;

	/// Checks the page for basic validation errors;
	/// returns an object populated with any errors encountered,
	/// keyed on element ID.
	///
	/// If optional param id is specified, this function
	/// will only validate that element.
	var _validate = function(id) {
		var ret = {};
		var el;
		function removeValidationError(el) {
			el.removeClass('validation_error');
			el.next('p.validation_error').remove();
			return el;
		};

		if (!id || id == 'v1BaseUrl') {
			el = $('#v1BaseUrl');
			removeValidationError(el);
			// Require a v1BaseUrl
			var url = el.val();
			if (url === undefined || url === null || url === _defaultBaseUrl || url === '') {
				ret.v1BaseUrl = 'You must specify the base URL of your VersionOne installation.';
			}
		}

		if (!id || id == 'issueIdRegex') {
			el = $('#issueIdRegex');
			removeValidationError(el);
			// Check to ensure the issueIdRegex is valid...
			reStr = el.val();
			try {
				var re = new RegExp(reStr, "gi");
			} catch (ex) {
				// Regex doesn't seem to be valid
				ret.issueIdRegex = 'The regular expression you entered doesn\'t seem to be valid.';
			}
			// ...and has at least one capture group.
			// This is imperfect logic; I don't know how to conclusively
			// determine whether a regex has at least one capture group.
			// This logic could fail in the event of a non-capturing group.
			if (reStr.indexOf('(') === -1 || reStr.indexOf(')') === -1) {
				ret.issueIdRegex = 'The issueIdRegex must have at least one capture group defined.';
			}
		}

		return ret;
	};

	return {
		// Saves options to localStorage.
		saveOptions: function(e) {
			console.debug('[optionsPage.saveOptions] Entry.', e);
			// Do some basic validation on the entries.
			var validationResult = _validate();
			if (Object.keys(validationResult).length > 0) {
				for (var i in validationResult) {
					$('#'+i).addClass('validation_error')
							.after(
								$('<p></p>').addClass('validation_error')
											.text(validationResult[i])
							);
				}
			}

			_config.v1BaseUrl = ($('#v1BaseUrl').val() === _defaultBaseUrl ? null : $('#v1BaseUrl').val());
			_config.prefetchAll = $('#prefetchAll').is(':checked');
			_config.excludeSelectors = $('#excludeSelectors').val().split("\n");
			_config.excludeDomains = $('#excludeDomains').val().split("\n");
			_config.issueIdRegex = $('#issueIdRegex').val();
			_config.save();
		},

		// Restores select box state to saved value from localStorage.
		restoreOptions: function() {
			if (!_config)
				return;

			_config.reload();

			$('#v1BaseUrl').val(_config.v1BaseUrl || _defaultBaseUrl);
			_config.prefetchAll
				? $('#prefetchAll').attr('checked', 'checked')
				: $('#prefetchAll').removeAttr('checked');
			$('#excludeSelectors').val(_config.excludeSelectors.join("\n"));
			$('#excludeDomains').val(_config.excludeDomains.join("\n"));
			$('#issueIdRegex').val(_config.issueIdRegex);
		}
	};
})();


$(document).ready(function() {
	optionsPage.restoreOptions();
	$('#btnSave').click(optionsPage.saveOptions);
});