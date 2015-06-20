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

        var _getRemoveCookiePromise = function (url, name) {
            return $q(function (resolve, reject) {
                try
                {
                    chrome.cookies.remove({
                        url: url,
                        name: name
                    }, function (details) {
                        return resolve(details);
                    });
                }
                catch (ex)
                {
                    return reject(ex);
                }
            });
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
            clear: function () {
                localStorage.clear();
            }
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
            getLastEntry: function () {
                return _storage.get('lastEntry');
            },
            setLastEntry: function (entry) {
                _storage.set('lastEntry', entry);
            },
            getPreferences: function () {
                _storage.get('preferences');
            },
            setPreferences: function (preferences) {
                _storage.set('preferences', preferences);
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
                        return resolve(project.members);
                    }, function (response) {
                        return reject(response);
                    });
                });
            },
            getProjectEntriesPromise: function (project) {
                var self = this;
                return $q(function (resolve, reject) {
                    $http({
                        method: 'GET',
                        url: 'https://api.worktile.com/v1/entries?pid=' + project.pid,
                        headers: {
                            'Content-Type': 'application/json',
                            'access_token': self.getToken().access_token
                        }
                    }).then(function (response, status) {
                        project.entries = {};
                        angular.forEach(response.data, function (entry) {
                            project.entries[entry.entry_id] = entry;
                        });
                        return resolve(project.entries);
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
                                result[lastPorject.pid].entries = lastPorject.entries;
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
                            if (post.followers.length > 0) {
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
                            }
                            else {
                                return resolve(response.data);
                            }
                        }, function (response) {
                            return reject(response);
                        });
                    }
                    else {
                        return reject('Invalid post value. ' + angular.toJson(post));
                    }
                });
            },
            createTaskPromise: function (task) {
                var self = this;
                return $q(function (resolve, reject) {
                    if (task && task.pid && task.title) {
                        $http({
                            method: 'POST',
                            url: 'https://api.worktile.com/v1/post?pid=' + task.pid,
                            headers: {
                                // 'Content-Type': 'application/json',
                                'access_token': self.getToken().access_token
                            },
                            data: {
                                name: task.title,
                                content: task.content
                            }
                        }).then(function (response, status) {
                            return resolve(response.data);
                        }, function (response) {
                            return reject(response);
                        });
                    }
                    else {
                        return reject('Invalid task value. ' + angular.toJson(task));
                    }
                });
            },
            logoutPromise: function () {
                var self = this;
                return $q(function (resolve, reject) {
                    _storage.clear();
                    try
                    {
                        chrome.identity.launchWebAuthFlow({
                            url: 'https://worktile.com/api/user/signout',
                            interactive: true
                        }, function (responseUrl) {
                            if (chrome.runtime.lastError) {
                                alert(angular.toJson(chrome.runtime.lastError, true));
                            }
                            return resolve();
                        });

                        // chrome.cookies.getAll({}, function (cookies) {
                        //     alert(angular.toJson(cookies, true));
                        //     if (cookies && cookies.length > 0) {
                        //         var promises = [];
                        //         angular.forEach(cookies, function (cookie) {
                        //             cookie.url = (cookie.secure ? "https://" : "http://") + (cookie.domain.charAt(0) === "." ? 'www' : '') + cookie.domain;
                        //             promises.push(_getRemoveCookiePromise(cookie.url, cookie.name));
                        //         });
                        //         $q.all(promises)
                        //             .then(function () {
                        //                 alert('done');
                        //                 return resolve();
                        //             })
                        //             .catch(function () {
                        //                 alert('failed');
                        //                 return reject();
                        //             });
                        //     }
                        //     else {
                        //         return resolve();
                        //     }
                        // });
                    }
                    catch (ex) {
                        return reject(ex);
                    }
                });
            },
        };
    });
})();