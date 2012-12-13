var optionsPage = (function() {
	var _defaultBaseUrl = 'https://www8.v1host.com/YOUR_INSTANCE_NAME_HERE/';
	var _config = V1Linkify.config;

	return {
		// Saves options to localStorage.
		saveOptions: function(e) {
			console.debug('[optionsPage.saveOptions] Entry.', e);
			_config.v1BaseUrl = ($('#v1BaseUrl').val() === _defaultBaseUrl ? null : $('#v1BaseUrl').val());
			_config.prefetchAll = $('#prefetchAll').is(':checked');
			_config.excludeSelectors = $('#excludeSelectors').val().split("\n");
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
			$('#issueIdRegex').val(_config.issueIdRegex);
		}
	};
})();


$(document).ready(function() {
	optionsPage.restoreOptions();
	$('#btnSave').click(optionsPage.saveOptions);
});