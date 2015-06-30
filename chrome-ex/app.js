(function () {
    'use strict';

    var client_id = '54599295762c424b8aced6e7ee891a47';
    var return_url = chrome.identity.getRedirectURL();

    var app = angular.module('Worktile', [
        'ngMessages', 
        'ngWorktile', 
        'l10n', 'l10n-en-us', 'l10n-zh-cn', 'l10n-zh-tw', 'l10n-no']);

    app.config(function ($compileProvider) {
        $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension):/);
    });

    app.controller('MasterController', function ($scope, $http, $q, $timeout, $window, $worktile, $optionsURL, $l10n) {
        $l10n.locale = $worktile.locale() || 'zh-cn';
        $scope.locales = $l10n.all();

        $scope.getLocale = function () {
            var locale = $l10n.getLocale($l10n.locale);
            return {
                name: locale.name || 'N/A',
                flag: locale.flag
            }
        };
        $scope.setLocale = function (name) {
            $worktile.locale(name);
            $l10n.locale = name;
            $window.location.reload();
        };

        $scope.__loading = false;
        $scope.__refreshing = false;
        $scope.name = $worktile.name;

        $scope.modes = {
            express: 0,
            advanced: 1
        };
        $scope.mode = $scope.modes.express;

        $scope.types = {
            task: 1,
            appointment: 2,
            post: 3,
            document: 4
        };
        $scope.type = $scope.types.task;

        $scope.message = null;
        $scope.showMessage = function (isError, title, details, autoHide, callback) {
            callback = callback || angular.noop;
            $scope.message = {
                error: isError,
                title: $l10n.get(title),
                details: details
            };
            if (autoHide) {
                $timeout(function () {
                    $scope.message = null;
                    return callback();
                }, 1500);
            }
            else {
                return callback();
            }
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
                    $timeout(function () {
                        if ($scope.me && $scope.projects[$scope.target.pid].members.hasOwnProperty($scope.me.uid)) {
                            $scope.target.followers = [$scope.me.uid];
                        }
                        return callback();
                    });
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
            $scope.mode = $worktile.mode() || $scope.modes.express;
            $l10n.locale = $worktile.locale() || 'zh-cn';
            loadProjects(function (error, projects) {
                if (error) {
                    $scope.showMessage(true, 'err-load-prj', error, false, null);
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
                            // $timeout(function () {
                                var eids = Object.keys(project.entries);
                                if (eids.length > 0) {
                                    $scope.target.eid = eids[0];
                                }
                                else {
                                    $scope.target.eid = null;
                                }
                                

                                // $timeout(function () {
                                    if ($scope.me && project.members.hasOwnProperty($scope.me.uid)) {
                                        $scope.target.followers = [$scope.me.uid];
                                        // $scope.target.followers.push[$scope.me.uid];
                                    }
                                // });
                            // });
                            $worktile.projects($scope.projects);
                        })
                        .catch(function (error) {
                            $scope.showMessage(true, 'err-load-members-entries', error, false, null);
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

        $scope.switchMode = function (e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }

            if ($scope.mode === $scope.modes.advanced) {
                $scope.mode = $scope.modes.express;
            }
            else {
                $scope.mode = $scope.modes.advanced;
            }
            $worktile.mode($scope.mode);
        };

        $scope.copy = function () {
            chrome.tabs.query({
                active: true,
                currentWindow: true
            }, function (tabs) {
                if (tabs && tabs.length > 0) {
                    var tab = tabs[0];
                    $scope.$apply(function () {
                        $scope.target.title = $scope.target.title || '';
                        $scope.target.title += ($scope.target.title.length > 0 ? ' ' : '') + tab.title;
                        if ($scope.mode === $scope.modes.advanced) {
                            $scope.target.content = $scope.target.content || '';
                            $scope.target.content += ($scope.target.content.length > 0 ? ' ' : '') + tab.url;
                        }
                    });
                }
            });
        };

        $scope.clickMember = function (e, uid, target) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }

            var pos = target.indexOf(uid);
            if (pos >= 0) {
                target.splice(pos, 1);
            }
            else {
                target.push(uid);
            }
        };

        // $scope.clickAssignee = function (e, uid) {
        //     if (e) {
        //         e.preventDefault();
        //         e.stopPropagation();
        //     }

        //     var pos = $scope.target.assignees.indexOf(uid);
        //     if (pos >= 0) {
        //         $scope.target.assignees.splice(pos, 1);
        //     }
        //     else {
        //         $scope.target.assignees.push(uid);
        //     }
        // };

        // $scope.clickFollowers = function (e, uid) {
        //     if (e) {
        //         e.preventDefault();
        //         e.stopPropagation();
        //     }

        //     var pos = $scope.target.followers.indexOf(uid);
        //     if (pos >= 0) {
        //         $scope.target.followers.splice(pos, 1);
        //     }
        //     else {
        //         $scope.target.followers.push(uid);
        //     }
        // };

        $scope.login = function () {
            chrome.tabs.create({
                url: $optionsURL,
                active: true,
                selected: true
            }, angular.noop);

            // $scope.__loading = true;
            // $worktile.logInPromise()
            //     .then(function () {
            //         return $worktile.getCurrentUserPromise();
            //     })
            //     .then(function (user) {
            //         $scope.me = user;
            //         return $worktile.getProjectsPromise();
            //     })
            //     .then(function (projects) {
            //         _reloadProjects(projects, $worktile.pid(), $worktile.eid(), function () {
            //             $scope.__loading = false;
            //         });
            //     })
            //     .catch(function (error) {
            //         $scope.showMessage(true, 'err-login', error, false, null);
            //     })
            //     .finally(function () {
            //         $scope.__loading = false;
            //     });
        };

        $scope.logout = function () {
            chrome.tabs.create({
                url: $optionsURL,
                active: true,
                selected: true
            }, angular.noop);
            // $scope.__loading = true;
            // $worktile.logoutPromise()
            //     .then(function () {
            //         $scope.reset(true);
            //     })
            //     .catch(function (error) {
            //         $scope.showMessage(true, 'err-logout', error, false, null);
            //     })
            //     .finally(function () {
            //         $scope.__loading = false;
            //     });
        };

        $scope.submit = function () {
            if (!$scope.target.title) {
                $scope.showMessage(true, 'err-name-required', null, false, null);
                return;
            }
            if (!$scope.target.pid) {
                $scope.showMessage(true, 'err-pid-required', null, false, null);
                return;
            }
            if ($scope.target.content) {
                $scope.target.content += '\n\n' + $l10n.get('signature');
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

                    $scope.reset(false);
                    $scope.showMessage(false, 'inf-submitted', null, true, function () {
                        $window.close();
                    });
                })
                .catch(function (error) {
                    $scope.showMessage(true, 'err-submitted', error, false, null);
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
                    $scope.showMessage(true, 'err-refresh', error, false, null);
                })
                .finally(function () {
                    $scope.__loading = false;
                    $scope.__refreshing = false;
                });
        };
    });

})();