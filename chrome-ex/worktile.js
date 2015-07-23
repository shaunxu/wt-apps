(function () {
    'use strict';
    
    var worktile = angular.module('ngWorktile', []);

    worktile.value('$clientId', '792a1327b9954217969007153b1c2cef');

    worktile.factory('$worktile', function ($http, $interval, $q, $clientId) {
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
            erase: function () {
                _storage.set('token', null);
                _storage.set('me', null);
                _storage.set('projects', null);
                _storage.set('pid', null);
                _storage.set('eid', null);
            },
            options: function (options) {
                if (options) {
                    _storage.set('options', options);
                }
                else {
                    options = _storage.get('options');
                }
                return options;
            },
            token: function (token) {
                if (token) {
                    _storage.set('token', token);
                }
                else {
                    token = _storage.get('token');
                }
                return token;
            },
            me: function (me) {
                if (me) {
                    _storage.set('me', me);
                }
                else {
                    me = _storage.get('me');
                }
                return me;
            },
            locale: function (locale) {
                if (locale) {
                    _storage.set('locale', locale);
                }
                else {
                    locale = _storage.get('locale');
                }
                return locale;
            },
            mode: function (mode) {
                if (mode) {
                    _storage.set('mode', mode);
                }
                else {
                    mode = _storage.get('mode');
                }
                return mode;
            },
            projects: function (projects) {
                if (projects) {
                    _storage.set('projects', projects);
                }
                else {
                    projects = _storage.get('projects');
                }
                return projects;
            },
            teams: function (teams) {
                if (teams) {
                    _storage.set('teams', teams);
                }
                else {
                    teams = _storage.get('teams');
                }
                return teams;
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
                return ( 
                    token && token.access_token && token.expires_in && token.refresh_token
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
                                project.members[member.uid] = {
                                    uid: member.uid,
                                    display_name: member.display_name,
                                    avatar: (member.avatar && member.avatar.length > 0 ? member.avatar : 'img/icons/ic_face_black_48dp_1x.png')
                                };
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
                            project.entries[entry.entry_id] = {
                                entry_id: entry.entry_id,
                                name: entry.name
                            }
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
                        var result = {};
                        angular.forEach(response.data, function (project) {
                            if (project.archived === 0 && project.permission !== 0) {
                                result[project.pid] = {
                                    pid: project.pid,
                                    name: project.name,
                                    team_id: project.team_id,
                                    pic: project.pic,
                                    bg: project.bg,
                                    visibility: project.visibility,
                                    is_star: (project.is_star === 1),
                                    members: {},
                                    entries: {}
                                };
                            }
                        });
                        return resolve(result);
                    }, function (response) {
                        return reject(response);
                    });
                });
            },
            getTeamsPromise: function () {
                var self = this;
                return $q(function (resolve, reject) {
                    $http({
                        method: 'GET',
                        url: 'https://api.worktile.com/v1/teams',
                        headers: {
                            'Content-Type': 'application/json',
                            'access_token': self.getToken().access_token
                        }
                    }).then(function (response) {
                        var result = {};
                        angular.forEach(response.data, function (team) {
                            result[team.team_id] = {
                                team_id: team.team_id,
                                name: team.name,
                                pic: team.pic,
                                visibility: team.visibility
                            };
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
            getAuthorizeUrl: function (redirectUrl) {
                return 'https://open.worktile.com/oauth2/authorize?client_id=' + $clientId + '&redirect_uri=' + redirectUrl + '&display=mobile';
            },
            getAccessTokenPromise: function (code) {
                var self = this;
                return $q(function (resolve, reject) {
                    $http({
                        method: 'POST',
                        url: 'https://api.worktile.com/oauth2/access_token',
                        data: {
                            client_id: $clientId,
                            code: code
                        }
                    }).then(function (response, status) {
                        self.setToken(response.data);
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
        };
    });
})();