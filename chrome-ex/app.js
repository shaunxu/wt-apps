(function () {
    'use strict';

    var client_id = '54599295762c424b8aced6e7ee891a47';
    var return_url = chrome.identity.getRedirectURL();

    var app = angular.module('Worktile', ['ngMessages', 'ngWorktile']);

    app.config(function ($compileProvider) {
        $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension):/);
    });

    app.controller('MasterController', function ($scope, $http, $q, $timeout, $worktile) {
        var _showError = function (error) {
            alert(angular.toJson(error, true));
        };

        var _showInformation = function (info) {
            alert(angular.toJson(info, true));
        };

        $scope.__loading = false;
        $scope.__refreshing = false;
        $scope.name = $worktile.name;

        $scope.types = {
            task: 1,
            appointment: 2,
            post: 3,
            document: 4
        };
        $scope.type = $scope.types.task;

        $scope.reset = function (all) {
            $scope.target = {
                title: null,
                content: null,
                pid: null,
                eid: null,
                assignees: [],
                followers: []
            };
            if (all) {
                $scope.type = $scope.types.task;
                $scope.me = {};
                $scope.projects = {};                
            }
        };
        $scope.reset(true);

        var _overwrite = function (dst, objs) {
            var obj = {};
            for (var i = 0, ii = objs.length; i < ii; ++i) {
                obj = angular.merge({}, obj, objs[i]);
            }

            var keys = Object.keys(dst);
            for (var j = 0, jj = keys.length; j < jj; j++) {
                if (!obj.hasOwnProperty(keys[j])) {
                    delete dst[keys[j]];
                }
            }

            dst = angular.merge(dst, obj);
            return dst;
        };

        var _reloadProjects = function (projects, pid, eid, callback) {
            $scope.projects = projects;
            // var pid = $worktile.pid();
            $timeout(function () {
                if (pid && $scope.projects[pid]) {
                    $scope.target.pid = pid;
                }
                else {
                    var pids = Object.keys($scope.projects);
                    if (pids.length > 0) {
                        $scope.target.pid = pids[0];
                    }
                    else {
                        $scope.target.pid = null;
                    }
                }
                $timeout(function () {
                    if ($scope.target.pid) {
                        // var eid = $worktile.eid();
                        if (eid && $scope.projects[$scope.target.pid].entries[eid]) {
                            $scope.target.eid = eid;
                        }
                        else {
                            var eids = Object.keys($scope.projects[$scope.target.pid].entries);
                            if (eids.length > 0) {
                                $scope.target.eid = eids[0];
                            }
                            else {
                                $scope.target.eid = null;
                            }
                        }
                    }
                    return callback();
                });
            });
        };

        if ($worktile.isLoggedIn()) {
            var loadProjects = function (callback) {
                var projects = $worktile.projects();
                if (projects) {
                    return callback(null, projects);
                }
                else {
                    $worktile.getProjectsPromise()
                        .then(function (result) {
                            return callback(null, result);
                        })
                        .catch(function (error) {
                            return callback(error, null);
                        });
                }
            };

            $scope.__loading = true;
            $scope.me = $worktile.getCurrentUser();
            loadProjects(function (error, projects) {
                if (error) {
                    _showError(error);
                }
                else {
                    _reloadProjects(projects, $worktile.pid(), $worktile.eid(), function () {
                        $scope.__loading = false;
                    });
                }
            });
        }

        var _onProjectChanged = function (pid, oldValue) {
            if (pid && pid !== oldValue) {
                var project  = $scope.projects[pid];
                if (project) {
                    $scope.__loading = true;
                    var membersPromise = $q(function (resolve, reject) {
                        return resolve();
                    });
                    var entriesPromise = $q(function (resolve, reject) {
                        return resolve();
                    });
                    if (!project.hasOwnProperty('members') || Object.keys(project.members).length <= 0) {
                        membersPromise = $worktile.getProjectMembersPromise(project);
                    }
                    if (!project.hasOwnProperty('entries') || Object.keys(project.entries).length <= 0) {
                        entriesPromise = $worktile.getProjectEntriesPromise(project);
                    }

                    $q.all([membersPromise, entriesPromise])
                        .then(function () {
                            var eids = Object.keys(project.entries);
                            if (eids.length > 0) {
                                $scope.target.eid = eids[0];
                            }
                            else {
                                $scope.target.eid = null;
                            }
                            $worktile.projects($scope.projects);
                        })
                        .catch(function (error) {
                            _showError(error);
                        })
                        .finally(function () {
                            $scope.__loading = false;
                        });
                }
            }
        };

        $scope.$watch('target.pid', function (pid, oldValue) {
            _onProjectChanged(pid, oldValue);
        });

        $scope.copy = function () {
            chrome.tabs.query({
                active: true,
                currentWindow: true
            }, function (tabs) {
                var tab = tabs[0];
                $scope.$apply(function () {
                    $scope.target.title = tab.title;
                    $scope.target.content = tab.url;
                });
            });
        };

        $scope.login = function () {
            $scope.__loading = true;
            $worktile.logInPromise()
                .then(function () {
                    return $worktile.getCurrentUserPromise();
                })
                .then(function (user) {
                    $scope.me = user;
                    return $worktile.getProjectsPromise();
                })
                .then(function (projects) {
                    _reloadProjects(projects, $worktile.pid(), $worktile.eid(), function () {
                        $scope.__loading = false;
                    });
                })
                .catch(function (error) {
                    _showError(error);
                })
                .finally(function () {
                    $scope.__loading = false;
                });
        };

        $scope.logout = function () {
            $scope.__loading = true;
            $worktile.logoutPromise()
                .then(function () {
                    $scope.reset(true);
                })
                .catch(function (error) {
                    _showError(error);
                })
                .finally(function () {
                    $scope.__loading = false;
                });
        };

        $scope.submit = function () {
            if (!$scope.target.title) {
                _showError('Post title is required.');
                return;
            }
            if (!$scope.target.pid) {
                _showError('Project is required.');
                return;
            }

            $scope.__loading = true;
            var promise = {};
            switch ($scope.type) {
                case $scope.types.task:
                    promise = $worktile.createTaskPromise({
                        name: $scope.target.title,
                        description: $scope.target.content,
                        pid: $scope.target.pid,
                        eid: $scope.target.eid,
                        assignees: $scope.target.assignees,
                        followers: $scope.target.followers
                    });
                    break;
                case $scope.types.post:
                    promise = $worktile
                        .createPostPromise({
                            title: $scope.target.title,
                            content: $scope.target.content,
                            pid: $scope.target.pid,
                            followers: $scope.target.followers
                        });
                    break;
                default:
                    break;
            }

            $q.when(promise)
                .then(function (result) {
                    $worktile.lastProject($scope.projects[$scope.target.pid]);
                    $worktile.pid($scope.target.pid);
                    if ($scope.type === $scope.types.task) {
                        $worktile.eid($scope.target.eid);
                    }

                    _showInformation('Well done.');
                    $scope.reset(false);

                    window.close();
                })
                .catch(function (error) {
                    _showError(error);
                })
                .finally(function () {
                    $scope.__loading = false;
                });
        };

        $scope.refresh = function () {
            $scope.__loading = true;
            $scope.__refreshing = true;
            $worktile.getCurrentUserPromise()
                .then(function (user) {
                    $scope.me = user;
                    return $worktile.getProjectsPromise();
                })
                .then(function (projects) {
                    _reloadProjects(projects, $scope.target.pid, $scope.target.eid, function () {
                        _onProjectChanged($scope.target.pid, null);
                        $scope.__loading = false;
                    });
                })
                .catch(function (error) {
                    _showError(error);
                })
                .finally(function () {
                    $scope.__loading = false;
                    $scope.__refreshing = false;
                });
        };
    });

})();