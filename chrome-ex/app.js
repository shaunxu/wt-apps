(function () {
    'use strict';

    var client_id = '54599295762c424b8aced6e7ee891a47';
    var return_url = chrome.identity.getRedirectURL();

    var app = window.angular.module('Worktile', ['ngMaterial']);

    app.value('$', window.$);

    app.factory('$box', function () {
        return {
            token: {}
        }
    });

    app.controller('MasterController', function ($scope, $http, $, $box) {
        $scope.name = 'Shaun';

        var _getParameterByName = function (url, name) {
            name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
            var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
                results = regex.exec(url);
            return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
        };

        $scope.login = function () {
            chrome.identity.launchWebAuthFlow({
                url: 'https://open.worktile.com/oauth2/authorize?client_id=' + client_id + '&redirect_uri=' + return_url + '&display=mobile',
                interactive: true
            }, function (responseUrl) {
                var code = _getParameterByName(responseUrl, 'code');
                if (code) {
                    $.ajax({
                        type: 'POST',
                        url: 'https://api.worktile.com/oauth2/access_token',
                        data: 'client_id=' + client_id + '&code=' + code,
                        dataType: 'text',
                        success: function (data, status) {
                            var json = JSON.parse(data);
                            $box.token = json;
                        }
                    });
                }
            });
        };
    });

})();