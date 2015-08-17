(function () {
    'use strict';

    var app = angular.module('Worktile', [
        'ngMessages', 'ngSanitize', 'ui.select',
        'ngWorktile', 
        'l10n', 'l10n-en-us', 'l10n-zh-cn', 'l10n-zh-tw', 'l10n-no']);

    app.config(function ($compileProvider) {
        $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension):/);
    });

    app.controller('MasterController', function ($scope, $http, $q, $timeout, $window, $worktile, $l10n) {
        var options = angular.extend({}, { locale: 'zh-cn', signature: '' }, $worktile.options());
        $l10n.locale = options.locale;

        $scope.__loading = false;
        $scope.__refreshing = false;
        $scope.name = $worktile.name;

        $scope.modes = {
            express: 1,
            advanced: 2
        };
        $scope.mode = $scope.modes.express;

        $scope.types = {
            task: {
                id: 'type-task',
                icon: 'glyphicon glyphicon-fire'
            },
            post: {
                id: 'type-post',
                icon: 'glyphicon glyphicon-bullhorn'
            }
        };
        $scope.changeType = function (type) {
            $scope.type = type;
            $worktile.type(type);
        };

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
            $scope.project = {
                selected: null
            };
            if (all) {
                $scope.type = $worktile.type() || $scope.types.task;
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

        var _setScopeProjectsAndTeams = function (projects, teams) {
            $scope.projects = projects;
            $scope.teams = teams;
            $scope.projectsInArray = (function () {
                var normal_projects = [];
                var star_projects = [];
                angular.forEach(projects, function (project) {
                    normal_projects.push(project);
                    if (project.is_star) {
                        star_projects.push(angular.extend({}, project, { team_id: '0' }));
                    }
                });
                return star_projects.concat(normal_projects);
            })();
        };

        var _refreshScopeProjectsMembersAndEntries = function (project) {
            angular.forEach($scope.projectsInArray, function (prj) {
                if (prj.pid === project.pid) {
                    prj.members = project.members;
                    prj.entries = project.entries;
                }
            });
        };

        $scope.getTeamName = function (project) {
            var teamName = null;
            if (project.team_id === '0') {
                teamName = $l10n.get('star-projects');
            }
            else if (project.team_id === '-1') {
                teamName = $l10n.get('personal-projects');
            }
            else {
                teamName = $scope.teams[project.team_id].name;
            }
            return teamName;
        };

        var _reloadProjects = function (projects, teams, pid, eid, callback) {
            _setScopeProjectsAndTeams(projects, teams);
            $worktile.teams(teams);
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
                if ($scope.target.pid) {
                    $scope.project.selected = $scope.projects[$scope.target.pid];
                }
                $timeout(function () {
                    if ($scope.target.pid) {
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
                var teams = $worktile.teams();
                if (projects && teams) {
                    return callback(null, {
                        projects: projects,
                        teams: teams
                    });
                }
                else {
                    $q.all({
                        projects: $worktile.getProjectsPromise(),
                        teams: $worktile.getTeamsPromise()
                    })
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
            loadProjects(function (error, projectsAndTeams) {
                if (error) {
                    $scope.showMessage(true, 'err-load-prj', error, false, null);
                }
                else {
                    var projects = projectsAndTeams.projects;
                    var teams = projectsAndTeams.teams;
                    _reloadProjects(projects, teams, $worktile.pid(), $worktile.eid(), function () {
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
                    $scope.target.pid = pid;

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
                            _refreshScopeProjectsMembersAndEntries(project);

                            var eids = Object.keys(project.entries);
                            if (eids.length > 0) {
                                $scope.target.eid = eids[0];
                            }
                            else {
                                $scope.target.eid = null;
                            }
                            if ($scope.me && project.members.hasOwnProperty($scope.me.uid)) {
                                $scope.target.followers = [$scope.me.uid];
                            }
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

        $scope.$watch('project.selected', function (selected, oldValue) {
            if (selected && selected.pid) {
                _onProjectChanged(selected.pid, oldValue);
            }
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

        $scope.login = function () {
            chrome.tabs.create({
                url: chrome.extension.getURL('options.html'),
                active: true,
                selected: true
            }, angular.noop);
        };

        $scope.logout = function () {
            chrome.tabs.create({
                url: chrome.extension.getURL('options.html'),
                active: true,
                selected: true
            }, angular.noop);
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
            switch ($scope.type.id) {
                case $scope.types.task.id:
                    promise = $worktile.createTaskPromise({
                        name: $scope.target.title,
                        description: $scope.target.content,
                        pid: $scope.target.pid,
                        eid: $scope.target.eid,
                        assignees: $scope.target.assignees,
                        followers: $scope.target.followers
                    });
                    break;
                case $scope.types.post.id:
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
                    if ($scope.type.id === $scope.types.task.id) {
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
                    return $q.all({
                        projects: $worktile.getProjectsPromise(),
                        teams: $worktile.getTeamsPromise()
                    });
                })
                .then(function (projectsAndTeams) {
                    var projects = projectsAndTeams.projects;
                    var teams = projectsAndTeams.teams;
                    _reloadProjects(projects, teams, $scope.target.pid, $scope.target.eid, function () {
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

    app.filter('propsFilter', function () {
        return function(items, props) {
            var out = [];
            if (angular.isArray(items)) {
                items.forEach(function (item) {
                    var itemMatches = false;
                    var keys = Object.keys(props);
                    for (var i = 0; i < keys.length; i++) {
                        var prop = keys[i];
                        var text = props[prop].toLowerCase();
                        if (item[prop].toString().toLowerCase().indexOf(text) !== -1) {
                            itemMatches = true;
                            break;
                        }
                    } 
                    if (itemMatches) {
                        out.push(item);
                    }
                });
            }
            else {
                out = items;
            }
            return out;
        };
    });
})();