(function () {
    'use strict';

    var client_id = '54599295762c424b8aced6e7ee891a47';
    var return_url = chrome.identity.getRedirectURL();

    var app = window.angular.module('Worktile', ['ngMessages']);

    app.value('$', window.$);

    app.factory('$box', function () {
        return {
            token: {},
            user: {},
            projects: {},
            isLoggedIn: function () {
                var self = this;
                return self.token && 
                       self.token.access_token &&
                       self.token.expires_in &&
                       self.token.refresh_token;
            },
            clear: function () {
                var self = this;
                self.token = {};
                self.user = {};
            }
        }
    });

    app.controller('MasterController', function ($scope, $http, $q, $, $box) {
        $scope.loggedIn = !!$box.isLoggedIn();

        var _getParameterByName = function (url, name) {
            name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
            var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
                results = regex.exec(url);
            return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
        };

        var _loadCurrentUser = function (callback) {
            $http({
                method: 'GET',
                url: 'https://api.worktile.com/v1/user/profile',
                headers: {
                    'Content-Type': 'application/json',
                    'access_token': $box.token.access_token
                }
            }).
            success(function (data, status) {
                $box.user = data;
                return callback(null, $box.user);
            }).
            error(function (data, status) {
                return callback({
                    data: data,
                    status: status
                }, null);
            });
        };

        var _loadMembersByProjectID = function (project, callback) {
            if (!project.members || Object.getOwnPropertyNames(project.members).length <= 0) {
                $http({
                    method: 'GET',
                    url: 'https://api.worktile.com/v1/projects/' + project.pid + '/members',
                    headers: {
                        'Content-Type': 'application/json',
                        'access_token': $box.token.access_token
                    }
                }).
                success(function (data, status) {
                    project.members = {};
                    window.angular.forEach(data, function (member) {
                        // only dealing with members with normal status
                        if (member.status === 1) {
                            project.members[member.uid] = member;
                        }
                    });
                    return callback(null, project.members);
                }).
                error(function (data, status) {
                    return callback({
                        data: data,
                        status: status
                    }, null);
                });
            }
            else {
                return callback(null, project.members);
            }
        };

        var _loadProjects = function (callback) {
            $http({
                method: 'GET',
                url: 'https://api.worktile.com/v1/projects',
                headers: {
                    'Content-Type': 'application/json',
                    'access_token': $box.token.access_token
                }
            }).
            success(function (data, status) {
                $box.projects = {};
                window.angular.forEach(data, function (project) {
                    // only working with unarchived projects
                    if (project.archived === 0) {
                        $box.projects[project.pid] = project;
                    }
                });
                return callback(null, $box.projects);
            }).
            error(function (data, status) {
                return callback({
                    data: data,
                    status: status
                }, null);
            });
        };

        $scope.topic = {};
        $scope.$watch('tpoic.project', function (pid) {
            if (pid && $box.projects[pid]) {
                _loadMembersByProjectID($box.projects[pid], function (error, members) {
                    $scope.members = members;
                });
            }
        });

        $scope.login = function () {
            chrome.identity.launchWebAuthFlow({
                url: 'https://open.worktile.com/oauth2/authorize?client_id=' + client_id + '&redirect_uri=' + return_url + '&display=mobile',
                interactive: true
            }, function (responseUrl) {
                var code = _getParameterByName(responseUrl, 'code');
                if (code) {
                    $http({
                        method: 'POST',
                        url: 'https://api.worktile.com/oauth2/access_token',
                        data: {
                            client_id: client_id,
                            code: code
                        }
                    }).
                    success(function (data, status) {
                        $box.token = data;
                        _loadCurrentUser(function (error, user) {
                            if (error) {
                                $box.clear();
                                alert(JSON.stringify(error, null, 2));
                            }
                            else {
                                _loadProjects(function (error, projects) {
                                    if (error) {
                                        $box.clear();
                                        alert(JSON.stringify(error, null, 2));
                                    }
                                    else {
                                        $scope.user = $box.user;
                                        $scope.projects = $box.projects;
                                        $scope.loggedIn = $box.isLoggedIn();
                                    }
                                });
                            }
                        });
                    }).
                    error(function (data, status) {
                        $box.clear();
                        alert(JSON.stringify({
                            data: data,
                            status: status
                        }, null, 2));
                        $scope.loggedIn = $box.isLoggedIn();
                    });
                }
            });
        };

        $scope.copy = function () {
            chrome.tabs.query({
                active: true,
                currentWindow: true
            }, function (tabs) {
                var tab = tabs[0];
                $scope.$apply(function () {
                    $scope.topic = {
                        name: tab.title,
                        content: tab.url
                    };
                });
            });
        };

    });

})();