(function () {
    var worktile = angular.module('ngWorktile', []);

    worktile.value('$clientId', '54599295762c424b8aced6e7ee891a47');
    worktile.value('$redirectURL', chrome.identity.getRedirectURL());

    worktile.factory('$worktile', function ($http, $interval, $q, $clientId, $redirectURL) {
        var _getParameterByName = function (url, name) {
            name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
            var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
                results = regex.exec(url);
            return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
        };

        var _storage = {
            get: function (key) {
                var raw = localStorage[key];
                var result = null;
                if (raw) {
                    try {
                        result = angular.fromJson(raw);
                    }
                    catch (ex) {}
                }
                return result;
            },
            set: function (key, value) {
                if (value) {
                    var raw = angular.toJson(value, false);
                    localStorage[key] = raw;
                }
                else {
                    delete localStorage[key];
                }
            },
        };

        var _interval = null;

        return {
            name: 'Worktile',
            getToken: function () {
                return _storage.get('token');
            },
            setToken: function (token) {
                _storage.set('token', token);
            },
            getCurrentUser: function () {
                return _storage.get('me');
            },
            setCurrentUser: function (me) {
                _storage.set('me', me);
            },
            getLastProject: function () {
                return _storage.get('lastPorject');
            },
            setLastProject: function (project) {
                _storage.set('lastPorject', project);
            },
            startRefreshAccessToken: function () {
                var self = this;

            },
            stopRefreshAccessToken: function () {
                var self = this;

            },
            isLoggedIn: function () {
                var self = this;
                var token = self.getToken();
                var me = self.getCurrentUser();
                var lastProject = self.getLastProject();
                return ( 
                    token && token.access_token && token.expires_in && token.refresh_token &&
                    me && me.uid &&
                    lastProject && lastProject.pid
                );
            },
            getProjectMembersPromise: function (project) {
                var self = this;
                return $q(function (resolve, reject) {
                    $http({
                        method: 'GET',
                        url: 'https://api.worktile.com/v1/projects/' + project.pid + '/members',
                        headers: {
                            'Content-Type': 'application/json',
                            'access_token': self.getToken().access_token
                        }
                    }).then(function (response) {
                        project.members = {};
                        angular.forEach(response.data, function (member) {
                            // only dealing with members with normal status
                            if (member.status === 1) {
                                project.members[member.uid] = member;
                            }
                        });
                        return resolve(null, project.members);
                    }, function (response) {
                        return reject(response);
                    });
                });
            },
            getProjectsPromise: function () {
                var self = this;
                return $q(function (resolve, reject) {
                    $http({
                        method: 'GET',
                        url: 'https://api.worktile.com/v1/projects',
                        headers: {
                            'Content-Type': 'application/json',
                            'access_token': self.getToken().access_token
                        }
                    }).then(function (response) {
                        var projects = response.data;
                        var result = {};
                        if (projects.length > 0) {
                            var lastPorject = self.getLastProject() || {};
                            var matched = false;
                            angular.forEach(projects, function (project) {
                                if (project.archived === 0) {
                                    if (project.pid === lastPorject.pid) {
                                        matched = true;
                                    }
                                    result[project.pid] = project;
                                }
                            });
                            if (matched) {
                                result[lastPorject.pid].members = lastPorject.members;
                                return resolve(result);
                            }
                            else {
                                lastPorject = projects[0];
                                self.getProjectMembersPromise(lastPorject)
                                    .then(function () {
                                        self.setLastProject(lastPorject);
                                        return resolve(result);
                                    })
                                    .catch(function (error) {
                                        return reject(error);
                                    });
                            }
                        }
                        else {
                            self.setLastProject(null);
                            return resolve(result);
                        }
                    }, function (response) {
                        return reject(response);
                    });
                });
            },
            getCurrentUserPromise: function () {
                var self = this;
                return $q(function (resolve, reject) {
                    $http({
                        method: 'GET',
                        url: 'https://api.worktile.com/v1/user/profile',
                        headers: {
                            'Content-Type': 'application/json',
                            'access_token': self.getToken().access_token
                        }
                    }).then(function (response, status) {
                        var user = response.data;
                        if (!user.avatar || user.avatar.length <= 0) {
                            user.avatar = 'img/icons/ic_face_black_48dp_1x.png';
                        }
                        self.setCurrentUser(user);
                        return resolve(user);
                    }, function (response) {
                        return reject(response);
                    });
                });
            },
            logInPromise: function () {
                var self = this;
                return $q(function (resolve, reject) {
                    try
                    {
                        chrome.identity.launchWebAuthFlow({
                            url: 'https://open.worktile.com/oauth2/authorize?client_id=' + $clientId + '&redirect_uri=' + $redirectURL + '&display=mobile',
                            interactive: true
                        }, function (responseUrl) {
                            var code = _getParameterByName(responseUrl, 'code');
                            if (code) {
                                $http({
                                    method: 'POST',
                                    url: 'https://api.worktile.com/oauth2/access_token',
                                    data: {
                                        client_id: $clientId,
                                        code: code
                                    }
                                }).then(function (response) {
                                    self.setToken(response.data);
                                    return resolve(response.data);
                                }, function (response) {
                                    return reject(response);
                                });
                            }
                            else {
                                return reject('Invalid code from Worktile Open API. Response URL = [' + responseUrl + '].');
                            }
                        });
                    }
                    catch (ex) {
                        return reject(ex);
                    }
                });
            },
            addPostFollowersPromise: function (pid, postId, uids) {
                var self = this;
                return $q(function (resolve, reject) {
                    $http({
                        method: 'POST',
                        url: 'https://api.worktile.com/v1/posts/' + postId + '/watcher?pid=' + pid,
                        headers: {
                            // 'Content-Type': 'application/json',
                            'access_token': self.getToken().access_token
                        },
                        data: {
                            uids: uids
                        }
                    }).then(function (response, status) {
                        return resolve(response.data);
                    }, function (response) {
                        return reject(response);
                    });
                });
            },
            createPostPromise: function (post) {
                var self = this;
                return $q(function (resolve, reject) {
                    if (post && post.pid && post.title) {
                        $http({
                            method: 'POST',
                            url: 'https://api.worktile.com/v1/post?pid=' + post.pid,
                            headers: {
                                // 'Content-Type': 'application/json',
                                'access_token': self.getToken().access_token
                            },
                            data: {
                                name: post.title,
                                content: post.content
                            }
                        }).then(function (response, status) {
                            return resolve(response.data);
                        }, function (response) {
                            return reject(response);
                        });
                    }
                    else {
                        return reject('Invalid post value. ' + angular.toJson(post));
                    }
                });
            }
        };
    });
})();