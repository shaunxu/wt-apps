(function () {
    var worktile = angular.module('ngWorktile', []);

    worktile.value('$clientId', '54599295762c424b8aced6e7ee891a47');
    worktile.value('$redirectURL', chrome.identity.getRedirectURL());

    worktile.factory('$worktile', function ($http, $interval, $q, $clientId, $redirectURL) {
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
            pid: function (pid) {
                if (pid) {
                    _storage.set('pid', pid);
                }
                else {
                    pid = _storage.get('pid');
                }
                return pid;
            },
            eid: function (eid) {
                if (eid) {
                    _storage.set('eid', eid);
                }
                else {
                    eid = _storage.get('eid');
                }
                return eid;
            },
            lastProject: function (project) {
                if (project) {
                    _storage.set('lp', project);
                }
                else {
                    project = _storage.get('lp');
                }
                return project;
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
                return ( 
                    token && token.access_token && token.expires_in && token.refresh_token &&
                    me && me.uid
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
                        var eids = Object.keys(project.entries);
                        angular.forEach(eids, function (eid) {
                            if (!response.data.hasOwnProperty(eid)) {
                                delete project.entries[eid]
                            }
                        });
                        var nes = {};
                        angular.forEach(response.data, function (entry) {
                            nes[entry.entry_id] = entry;
                        });
                        angular.extend(project.entries, nes);
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
                        angular.forEach(projects, function (project) {
                            if (project.archived === 0) {
                                // project.members = {};
                                // project.entries = {};
                                result[project.pid] = project;
                            }
                        });
                        return resolve(result);
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
                            var code = (function (url, name) {
                                name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
                                var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
                                    results = regex.exec(url);
                                return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
                            })(responseUrl, 'code');
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
                var result = {};
                return $q(function (resolve, reject) {
                    if (task && task.pid && task.name) {
                        $http({
                            method: 'POST',
                            url: 'https://api.worktile.com/v1/task?pid=' + task.pid,
                            headers: {
                                // 'Content-Type': 'application/json',
                                'access_token': self.getToken().access_token
                            },
                            data: {
                                name: task.name,
                                entry_id: task.eid
                            }
                        }).then(function (response, status) {
                            result = response.data;
                            var setDescriptionPromise = (function (name, desc, pid, tid) {
                                if (angular.isString(desc) && desc.length > 0) {
                                    return $http({
                                        method: 'PUT',
                                        url: 'https://api.worktile.com/v1/tasks/' + tid + '?pid=' + pid,
                                        headers: {
                                            // 'Content-Type': 'application/json',
                                            'access_token': self.getToken().access_token
                                        },
                                        data: {
                                            name: name,
                                            desc: desc
                                        }
                                    });
                                }
                                else {
                                    return $q(function (resolve, reject) {
                                        return resolve();
                                    });
                                }
                            })(result.name, task.description, result.pid, result.tid);

                            var assignTaskPromises = (function (pid, tid, assignees) {
                                if (assignees && assignees.length > 0) {
                                    var promises = [];
                                    angular.forEach(assignees, function (assignee) {
                                        promises.push($http({
                                            method: 'POST',
                                            url: 'https://api.worktile.com/v1/tasks/' + tid + '/member?pid=' + pid,
                                            headers: {
                                                // 'Content-Type': 'application/json',
                                                'access_token': self.getToken().access_token
                                            },
                                            data: {
                                                uid: assignee
                                            }
                                        }));
                                    });
                                    return promises;
                                }
                                else {
                                    return [$q(function (resolve, reject) {
                                        return resolve();
                                    })];
                                }
                            })(result.pid, result.tid, task.assignees);

                            var followTaskPromise = (function (pid, tid, followers) {
                                if (followers && followers.length > 0) {
                                    return $http({
                                        method: 'POST',
                                        url: 'https://api.worktile.com/v1/tasks/' + tid + '/watcher?pid=' + pid,
                                        headers: {
                                            // 'Content-Type': 'application/json',
                                            'access_token': self.getToken().access_token
                                        },
                                        data: {
                                            uids: followers
                                        }
                                    });
                                }
                                else {
                                    return $q(function (resolve, reject) {
                                        return resolve();
                                    });
                                }
                            })(result.pid, result.tid, task.followers);

                            $q.all([].concat(setDescriptionPromise, assignTaskPromises, followTaskPromise))
                                .then(function () {
                                    return resolve(result);
                                }, function (error) {
                                    return reject(error);
                                });
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
                    }
                    catch (ex) {
                        return reject(ex);
                    }
                });
            },
        };
    });
})();