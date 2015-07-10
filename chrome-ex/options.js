(function () {
    'use strict';

    var app = angular.module('Options', [
        'ngMessages', 
        'ngWorktile', 
        'l10n', 'l10n-en-us', 'l10n-zh-cn', 'l10n-zh-tw', 'l10n-no']);

    app.config(function ($compileProvider) {
        $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension):/);
    });

    app.controller('MasterController', function ($scope, $http, $q, $timeout, $window, $worktile, $l10n) {
        $scope.locales = $l10n.all();
        $scope.options = $worktile.options() || {};
        $scope.options.locale = sessionStorage.locale || $scope.options.locale || 'zh-cn';
        $l10n.locale = $scope.options.locale;
        $scope.options.signature = $scope.options.signature || $l10n.get('signature');
        $scope.options.interval = $scope.options.interval || 5;

        $scope.getLocale = function () {
            var locale = $l10n.getLocale($l10n.locale);
            return {
                name: locale.name || 'N/A',
                flag: locale.flag
            }
        };
        $scope.setLocale = function (name) {
            sessionStorage.locale = name;
            $window.location.reload();
        };

        $scope.intervals = [1, 5, 10, 15, 30, 60];
        $scope.setInterval = function (interval) {
            $scope.options.interval = interval;
        };

        $scope.name = $worktile.name;
        $scope.me = $worktile.getCurrentUser();
        $scope.logInUrl = $worktile.getAuthorizeUrl(chrome.extension.getURL('options.html'));

        var _queryString = function (url, name) {
            name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
            var regex = new RegExp('[\\?&]' + name + '=([^&#]*)'),
                results = regex.exec(url);
            return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
        };
        var code = _queryString($window.location, 'code');
        if (code && code.length > 0) {
            $worktile.getAccessTokenPromise(code)
                .then(function (response) {
                    return $worktile.getCurrentUserPromise();
                })
                .then(function (user) {
                    $scope.me = $worktile.getCurrentUser();
                })
                .catch(function (error) {
                    alert(angular.toJson(error, true));
                });
        }

        $scope.logout = function (e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }

            $worktile.erase();
            chrome.cookies.getAll({}, function (cookies) {
                var promises = [];
                angular.forEach(cookies, function (cookie) {
                    promises.push($q(function (resolve, reject) {
                        var prefix = cookie.secure ? "https://" : "http://";
                        if (cookie.domain.charAt(0) == ".") {
                            prefix += "www";
                        }
                        var url = prefix + cookie.domain + cookie.path;
                        chrome.cookies.remove({
                            url: url,
                            name: cookie.name
                        }, function (details) {
                            if (chrome.runtime.lastError) {
                                return reject(chrome.runtime.lastError);
                            }
                            else {
                                return resolve(details);
                            }
                        });
                    }));
                });
                $q.all(promises)
                    .then(function () {
                        $window.location = chrome.extension.getURL('options.html');
                    })
                    .catch(function (error) {
                        alert(angular.toJson(error, true));
                    });
            });
        };

        $scope.save = function () {
            if ($scope.options.signature === $l10n.get('signature') || !$scope.options.signature) {
                delete $scope.options.signature;
            }
            $worktile.options($scope.options);

            chrome.runtime.sendMessage(undefined, { action: 'options_saved' }, undefined, function (response) {
                delete sessionStorage.locale;
                $window.location.reload();
            });
        };
    });

})();