(function () {
    'use strict';

    var client_id = '54599295762c424b8aced6e7ee891a47';
    var return_url = chrome.identity.getRedirectURL();

    var app = angular.module('Worktile', ['ngMessages', 'ngWorktile']);

    app.config(function ($compileProvider) {
        $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension):/);
    });

    app.controller('MasterController', function ($scope, $http, $q, $timeout, $worktile) {
        $scope.__loading = false;
        $scope.name = $worktile.name;

        $scope.types = {
            task: 1,
            appointment: 2,
            post: 3,
            document: 4
        };

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
                $scope.me = $worktile.getCurrentUser() || {};
                $scope.me = {};
                $scope.projects = {};                
            }
        };
        $scope.reset(true);

        $scope.type = $scope.types.task;
        $scope.me = $worktile.getCurrentUser() || {};

        // we must use $timeout to let the page rendered
        // otherwise the entry id cannot be set properly
        $timeout(function () {
            var lastProject = $worktile.getLastProject();
            if (lastProject) {
                $scope.target.pid = lastProject.pid;
                $scope.projects = {};
                $scope.projects[$scope.target.pid] = lastProject;
            }
        });
        $timeout(function () {
            var lastEntry = $worktile.getLastEntry();
            if (lastEntry) {
                $scope.target.eid = lastEntry.entry_id;
            }
        });

        var _showError = function (error) {
            alert(angular.toJson(error, true));
        };

        var _showInformation = function (info) {
            alert(angular.toJson(info, true));
        };

        $scope.$watch('target.pid', function (pid) {
            if ($scope.projects) {
                var project = $scope.projects[pid];
                if (project) {
                    $scope.__loading = true;
                    var tryGetEntriesPromise = $q(function (resolve, reject) {
                        if (project.entries && Object.getOwnPropertyNames(project.entries).length > 0) {
                            return resolve(project.entries);
                        }
                        else {
                            $worktile.getProjectEntriesPromise(project)
                                .then(function () {
                                    return resolve(project);
                                })
                                .catch(function () {
                                    return reject();
                                });
                        }
                    });
                    var tryGetMembersPromise = $q(function (resolve, reject) {
                        if (project.members && Object.getOwnPropertyNames(project.members).length > 0) {
                            return resolve(project.members);
                        }
                        else {
                            $worktile.getProjectMembersPromise(project)
                                .then(function () {
                                    return resolve(project);
                                })
                                .catch(function () {
                                    return reject();
                                });
                        }
                    });
                    $q.all([tryGetEntriesPromise, tryGetMembersPromise])
                        .then(function () {
                            $worktile.setLastProject(project);
                            var eids = Object.getOwnPropertyNames(project.entries);
                            if (eids.length > 0) {
                                $scope.target.eid = eids[0];
                                $worktile.setLastEntry(project.entries[eids[0]]);
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

        $scope.$watch('target.eid', function (eid) {
            if ($scope.target.pid) {
                var project = $scope.projects[$scope.target.pid];
                if (project && project.entries && project.entries[eid]) {
                    $worktile.setLastEntry(project.entries[eid]);
                }
            }
        });

        if ($worktile.isLoggedIn()) {
            $worktile.getProjectsPromise()
                .then(function (projects) {
                    $timeout(function () {
                        $scope.projects = projects;
                    });
                    var lastProject = $worktile.getLastProject();
                    var lastEntry = $worktile.getLastEntry();
                    // we must use $timeout to let the page rendered
                    // otherwise the entry id cannot be set properly
                    $timeout(function () {
                        $scope.target.pid = lastProject && lastProject.pid;
                    });
                    $timeout(function () {
                        $scope.target.eid = lastEntry && lastEntry.entry_id;
                    });
                })
                .catch(function (error) {
                    _showError(error);
                })
                .finally(function () {
                });
        }

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
                    $scope.target.pid = $worktile.getLastProject().pid;
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
                    break;
                case $scope.types.post:
                    promise = $worktile
                        .createPostPromise($scope.target)
                        .then(function (post) {
                            if ($scope.target.followers.length > 0) {
                                return $worktile.addPostFollowersPromise(post.pid, post.post_id, $scope.target.followers || []);
                            }
                            else {
                                return { success: true };
                            }
                        });
                    break;
                default:
                    break;
            }

            $q.when(promise)
                .then(function (result) {
                    _showInformation('Post submitted successfully.');
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
                    $scope.target.pid = $worktile.getLastProject().pid;
                    return $q.all([
                        $worktile.getProjectMembersPromise($scope.projects[$scope.target.pid]),
                        $worktile.getProjectEntriesPromise($scope.projects[$scope.target.pid])
                    ]);
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