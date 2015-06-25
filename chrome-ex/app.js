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

            dst = angular.merge({}, dst, obj);
            return dst;
        };

        // var _ResumeSelectedProjectAndEntry = function () {
        //     var lastPid = $worktile.pid();
        //     if (lastPid && $scope.projects.hasOwnProperty(lastPid)) {
        //         $scope.target.pid = lastPid;
        //     }
        //     else {
        //         var pids = Object.getOwnPropertyNames($scope.projects);
        //         if (pids.length > 0) {
        //             $scope.target.pid = $scope.projects[pids[0]].pid;
        //         }
        //         else {
        //             $scope.target.pid = null;
        //         }
        //     }

        //     var lastEid = $worktile.eid();
        //     var selectedProject = $scope.projects[$scope.target.pid];
        //     if (lastEid && selectedProject.entries.hasOwnProperty(lastEid)) {
        //         $scope.target.eid = lastEid;
        //     }
        //     else {
        //         var eids = Object.getOwnPropertyNames(selectedProject.entries);
        //         if (eids.length > 0) {
        //             $scope.target.eid = selectedProject.entries[eids[0]].entry_id;
        //         }
        //         else {
        //             $scope.target.eid = null;
        //         }
        //     }
        // };
        
        // var _refreshProjects = function () {
        //     $scope.__loading = true;
        //     $worktile.getProjectsPromise()
        //         .then(function (projects) {
        //             _overwrite($scope.projects, projects);
        //             _ResumeSelectedProjectAndEntry();
        //         })
        //         .catch(function (error) {
        //             _showError(error);
        //         })
        //         .finally(function () {
        //             $scope.__loading = false;
        //         });
        // };

        if ($worktile.isLoggedIn()) {
            $scope.__loading = true;
            $scope.me = $worktile.getCurrentUser();
            $worktile.getProjectsPromise()
                .then(function (projects) {
                    $scope.projects = projects;

                    $scope.target.pid = (function (pids) {
                        return pids.length > 0 ? pids[0] : null;
                    })(Object.keys($scope.projects));

                    if ($scope.target.pid) {
                        return $q.all([
                            $worktile.getProjectMembersPromise($scope.projects[$scope.target.pid]),
                            $worktile.getProjectEntriesPromise($scope.projects[$scope.target.pid])
                        ]);                        
                    }
                    else {
                        return $q(function (resolve, reject) {
                            return resolve();
                        });
                    }
                })
                .then(function () {
                })
                .catch(function (error) {
                    _showError(error);
                })
                .finally(function () {
                    $scope.__loading = false;
                });
        }

        $scope.$watch('target.pid', function (pid) {
            if (pid) {
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
                        })
                        .catch(function (error) {
                            _showError(error);
                        })
                        .finally(function () {
                            $scope.__loading = false;
                        });
                }
            }
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
                    $scope.projects = projects;

                    $scope.target.pid = (function (pids) {
                        return pids.length > 0 ? pids[0] : null;
                    })(Object.keys($scope.projects));

                    if ($scope.target.pid) {
                        return $q.all([
                            $worktile.getProjectMembersPromise($scope.projects[$scope.target.pid]),
                            $worktile.getProjectEntriesPromise($scope.projects[$scope.target.pid])
                        ]);                        
                    }
                    else {
                        return $q(function (resolve, reject) {
                            return resolve();
                        });
                    }
                })
                .then(function () {
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
            $worktile.getCurrentUserPromise()
                .then(function (user) {
                    $scope.me = user;
                    return $worktile.getProjectsPromise();
                })
                .then(function (projects) {
                    $scope.projects = projects;

                    $scope.target.pid = (function (pids) {
                        return pids.length > 0 ? pids[0] : null;
                    })(Object.keys($scope.projects));

                    if ($scope.target.pid) {
                        return $q.all([
                            $worktile.getProjectMembersPromise($scope.projects[$scope.target.pid]),
                            $worktile.getProjectEntriesPromise($scope.projects[$scope.target.pid])
                        ]);                        
                    }
                    else {
                        return $q(function (resolve, reject) {
                            return resolve();
                        });
                    }
                })
                .then(function () {

                })
                .catch(function (error) {
                    _showError(error);
                })
                .finally(function () {
                    $scope.__loading = false;
                });
        };
    });

})();