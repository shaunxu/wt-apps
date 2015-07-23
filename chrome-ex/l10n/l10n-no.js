(function () {
    'use strict';

    var locale = angular.module('l10n-no', ['l10n']);

    locale.run(function ($l10n) {
        $l10n.set('no', {
            name: 'Norsk',
            flag: 'img/flags/no.png',
            items: {
                'target-name': 'Navn',
                'target-content': 'Innhold',
                'target-pid': 'Prosjekt',
                'target-eid': 'List',
                'target-assignees': 'Redere',
                'target-followers': 'Følgere',
                'copy': 'Sett inn sidetittel og URL',
                'adv-mode': 'Avansert Modus',
                'login': 'Logg Inn',
                'logout': 'Logg Ut',
                'refresh': 'Refresh',
                'submit': 'Send Inn',
                'err-load-prj': 'Kunne ikke laste prosjekter.',
                'err-load-members-entries': 'Kunne ikke laste prosjektmedlemmer og oppføringer når slått.',
                'err-login': 'Innlogging feilet.',
                'err-logout': 'Logg mislyktes.',
                'err-name-required': 'Navn er påkrevd.',
                'err-pid-required': 'Må velge et prosjekt.',
                'inf-submitted': 'Submited hell.',
                'err-submitted': 'Submited mislyktes.',
                'err-refresh': 'Kunne ikke oppdatere.',
                'signature': 'Sendt fra min Worktile Chrome Extension',
                'opt-caption': 'Chrome Opsjoner',
                'signature-label': 'Signatur',
                'language-label': 'Språk',
                'save': 'Lagre',
                'interval-label': 'Polling Interval',
                'interval-unit': 'Minutt(er)',
                'star-projects': 'Favoritter',
                'personal-projects': 'Personlige'
            }
        });
    });
})();