(function () {
    'use strict';

    var locale = angular.module('l10n-en-us', ['l10n']);

    locale.run(function ($l10n) {
        $l10n.set('en-us', {
            name: 'English',
            flag: null,
            items: {
                'target-name-title': 'Name',
                'target-content-title': 'Content',
                'target-pid-title': 'Project',
                'target-eid-title': 'List',
                'target-assignees-title': 'Assignee(s)',
                'target-followers-title': 'Follower(s)',
                'copy': 'Insert page title and URL',
                'adv-mode': 'Advanced Mode',
                'login': 'Login',
                'logout': 'Logout',
                'refresh': 'Refresh',
                'submit': 'Submit',
                'err-load-prj': 'Failed to load projects.',
                'err-load-members-entries': 'Failed to load project members and entries when switched.',
                'err-login': 'Login failed.',
                'err-logout': 'Logout failed.',
                'err-name-required': 'Name is required.',
                'err-pid-required': 'Must choose a project.',
                'inf-submitted': 'Submited successfully.',
                'err-submitted': 'Submited failed.',
                'err-refresh': 'Failed to refresh.'
            }
        });
    });
})();