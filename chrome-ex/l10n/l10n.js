(function () {
    'use strict';

    var l10n = angular.module('l10n', []);

    l10n.factory('$l10n', function () {
        var locales = {};
        return {
            locale: 'zh-cn',
            set: function (name, locale) {
                locales[name] = locale;
            },
            get: function (key) {
                if (locales.hasOwnProperty(this.locale)) {
                    var local = locales[this.locale].items;
                    if (local.hasOwnProperty(key)) {
                        return local[key];
                    }
                }
                return null;
            },
            getLocale: function (name) {
                return locales[name];
            },
            all: function () {
                return locales;
            }
        };
    });

    l10n.filter('l10n', function ($l10n) {
        return function (input) {
            return $l10n.get(input) || input;
        }
    });

})();