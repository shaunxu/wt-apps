(function () {
    'use strict';

    var locale = angular.module('l10n-en-us', ['l10n']);

    locale.run(function ($l10n) {
        $l10n.set('en-us', {
            name: 'English',
            flag: 'img/flags/us.png',
            items: {
                'target-name': 'Name',
                'target-content': 'Content',
                'target-pid': 'Project',
                'target-eid': 'List',
                'target-assignees': 'Assignee(s)',
                'target-followers': 'Follower(s)',
                'copy': 'Insert page title and URL',
                'adv-mode': 'Advanced Mode.',
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
                'err-refresh': 'Failed to refresh.',
                'signature': 'Sent from my Worktile Chrome Extension',
                'opt-caption': 'Chrome Extension Options',
                'signature-label': 'Signature',
                'language-label': 'Language',
                'save': 'Save'
            }
        });
    });
})();