(function () {
    'use strict';

    var client_id = '54599295762c424b8aced6e7ee891a47';
    var return_url = chrome.identity.getRedirectURL();

    var app = angular.module('Worktile', ['ngMessages']);

    app.value('$', $);

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
        $scope.post = {};

        var _getParameterByName = function (url, name) {
            name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
            var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
                results = regex.exec(url);
            return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
        };

        var _loadCurrentUser = function (access_token, callback) {
            $http({
                method: 'GET',
                url: 'https://api.worktile.com/v1/user/profile',
                headers: {
                    'Content-Type': 'application/json',
                    'access_token': access_token
                }
            }).
            success(function (data, status) {
                return callback(null, data);
            }).
            error(function (data, status) {
                return callback({
                    data: data,
                    status: status
                }, null);
            });
        };

        $scope.$watch('post.pid', function (pid) {
            $scope.post.followers = [];
            if (pid && $scope.projects[pid]) {
                localStorage.pid = pid;
                _tryLoadProjectMembers(JSON.parse(localStorage.token).access_token, $scope.projects[pid], function (error, members) {
                    if (error) {
                        alert(JSON.stringify(error, null, 2));
                    }
                    else {
                        $scope.members = members;
                    }
                });
            }
        });

        $scope.copy = function () {
            chrome.tabs.query({
                active: true,
                currentWindow: true
            }, function (tabs) {
                var tab = tabs[0];
                $scope.$apply(function () {
                    $scope.post.title = tab.title;
                    $scope.post.content = tab.url;
                });
            });
        };

        var _tryLoadProjectMembers = function (access_token, project, callback) {
            if (project.members) {
                return callback(null, project.members);
            }
            else {
                $http({
                    method: 'GET',
                    url: 'https://api.worktile.com/v1/projects/' + project.pid + '/members',
                    headers: {
                        'Content-Type': 'application/json',
                        'access_token': access_token
                    }
                }).
                success(function (data, status) {
                    project.members = {};
                    angular.forEach(data, function (member) {
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
        };

        var _tryLoadProjects = function (access_token, callback) {
            if ($scope.projects) {
                return callback(null, $scope.projects);
            }
            else {
                $http({
                    method: 'GET',
                    url: 'https://api.worktile.com/v1/projects',
                    headers: {
                        'Content-Type': 'application/json',
                        'access_token': access_token
                    }
                }).
                success(function (data, status) {
                    $scope.projects = {};
                    $scope.post.pid = null;
                    if (data && data.length > 0) {
                        var i = 0;
                        while (i <= data.length - 1) {
                            // only dealing with non-archived projects
                            if (data[i].archived === 0) {
                                $scope.projects[data[i].pid] = data[i];
                                if (data[i].pid === localStorage.pid) {
                                    $scope.post.pid = localStorage.pid;
                                }
                            }
                            i++;
                        }
                        if (!$scope.post.pid) {
                            $scope.post.pid = $scope.projects[Object.getOwnPropertyNames($scope.projects)[0]].pid;
                        }
                    }
                    return callback(null, $scope.projects);
                }).
                error(function (data, status) {
                    return callback({
                        data: data,
                        status: status
                    }, null);
                });
            }
        };

        var _isLoggedIn = function (callback) {
            if (localStorage.token) {
                var token = JSON.parse(localStorage.token);
                if (token.access_token && token.expires_in && token.refresh_token) {
                    _loadCurrentUser(token.access_token, function (error, user) {
                        if (error) {
                            return callback(null);
                        }
                        else {
                            return callback(user);
                        }
                    });
                }
                else {
                    return callback(null);
                }
            }
            else {
                return callback(null);
            }
        };

        var _tryLogIn = function (callback) {
            _isLoggedIn(function (user) {
                if (user) {
                    $scope.me = user;
                    return callback(null, user);
                }
                else {
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
                                localStorage.token = angular.toJson(data);
                                _loadCurrentUser(data.access_token, function (error, user) {
                                    if (error) {
                                        return callback(error);
                                    }
                                    else {
                                        $scope.me = user;
                                        return callback(null, user);
                                    }
                                });
                            }).
                            error(function (data, status) {
                                var error = {
                                    data: data,
                                    status: status
                                };
                                return callback(error, null);
                            });
                        }
                        else {
                            return callback('Invalid code from Worktile Open API. Response URL = [' + responseUrl + '].', null);
                        }
                    });
                }
            });
        };

        $scope.login = function () {
            _tryLogIn(function (error) {
                if (error) {
                    alert(JSON.stringify(error, null, 2));
                }
                else {
                    _tryLoadProjects(JSON.parse(localStorage.token).access_token, function (error, projects) {
                        if (error) {
                            alert(JSON.stringify(error, null, 2));
                        }
                    });
                }
            });
        };

    });

})();