(function () {
    'use strict';

    var client_id = '54599295762c424b8aced6e7ee891a47';
    var return_url = chrome.identity.getRedirectURL();

    var app = angular.module('Worktile', ['ngMessages', 'ngWorktile']);

    app.controller('MasterController', function ($scope, $http, $q, $worktile) {
        $scope.name = $worktile.name;
        $scope.post = {
            title: null,
            content: null,
            pid: null,
            followers: []
        };

        $scope.me = $worktile.getCurrentUser() || {};

        var lastProject = $worktile.getLastProject();
        if (lastProject) {
            $scope.post.pid = lastProject.pid;
            $scope.projects = {};
            $scope.projects[lastProject.pid] = lastProject;
        }

        var _showError = function (error) {
            alert(angular.toJson(error, true));
        };

        var _showInformation = function (info) {
            alert(angular.toJson(info, true));
        };

        $scope.$watch('post.pid', function (pid) {
            var project = $scope.projects[pid];
            if (project) {
                if (project.members) {
                    $worktile.setLastProject(project);
                }
                else {
                    $worktile.getProjectMembersPromise(project)
                        .then(function () {
                            $worktile.setLastProject(project);
                        })
                        .catch(function (error) {
                            _showError(error);
                        });
                }
            }
        });

        if ($worktile.isLoggedIn()) {
            $worktile.getProjectsPromise()
                .then(function (projects) {
                    $scope.projects = projects;
                    $scope.post.pid = $worktile.getLastProject().pid;
                    // if (!$scope.projects[$scope.post.pid].member) {
                    //     $worktile.getProjectMembersPromise($scope.projects[$scope.post.pid]);
                    // }
                })
                .catch(function (error) {
                    _showError(error);
                });
        }

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

        $scope.login = function () {
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
                    $scope.post.pid = $worktile.getLastProject().pid;
                })
                .catch(function (error) {
                    _showError(error);
                });
        };

        $scope.logout = function () {

        };

        $scope.submit = function () {
            if (!$scope.post.title) {
                _showError('Post title is required.');
                return;
            }
            if (!$scope.post.pid) {
                _showError('Project is required.');
                return;
            }

            $worktile.createPostPromise($scope.post)
                .then(function (post) {
                    if ($scope.post.followers.length > 0) {
                        return $worktile.addPostFollowersPromise(post.pid, post.post_id, $scope.post.followers || []);
                    }
                    else {
                        return {
                           success: true
                        };
                    }
                })
                .then(function (result) {
                    _showInformation('Post submitted successfully.');
                    $scope.post.title = null;
                    $scope.post.content = null;
                    window.close();
                })
                .catch(function (error) {
                    _showError(error);
                });
        };

        $scope.refresh = function () {
            $worktile.getCurrentUserPromise()
                .then(function (user) {
                    $scope.me = user;
                    return $worktile.getProjectsPromise();
                })
                .then(function (projects) {
                    $scope.projects = projects;
                    $scope.post.pid = $worktile.getLastProject().pid;
                    return $worktile.getProjectMembersPromise($scope.projects[$scope.post.pid]);
                })
                .catch(function (error) {
                    _showError(error);
                });
        };
    });

})();