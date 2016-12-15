#!/usr/bin/env node
const asanaProjectId = 12313402483312;
const gitlabProjectId = 6;
const urlRegex = /https:\/\/gitlab\.campusjaeger\.de\/campusjaeger\/sams\/issues\/([\d]+)/;
//const oldUrlRegex = /https:\/\/gitlab\.campusjaeger\.de\/campusjaeger\/asana-gitlab-sync\/issues\/([\d]+)/;

var Promise = require("bluebird");


var HashMap = require('hashmap');
var gitlab = require('gitlab')({
    url:   'https://gitlab.campusjaeger.de',
    token: process.env.GITLAB_TOKEN
});

gitlab.projects.all(function(projects) {
    for (var i = 0; i < projects.length; i++) {
        console.log("#" + projects[i].id + ": " + projects[i].name);
    }
});

var asana = require('asana');
var client = asana.Client.create().useAccessToken(process.env.ASANA_TOKEN);
client.users.me().then(function(me) {
    console.log('Asana: verbunden mit ' + me.email);
});

var tasksToSync = new HashMap();

var i = 0;
function syncTask(taskId) {
    var syncId = '[' + i++ + ']';
    console.log('Sync Asana Task ' + taskId + '...' + syncId);

    var thisPromise = client.tasks.findById(taskId).then(function(task) {
        if (tasksToSync.get(taskId) != thisPromise) {
            console.log('Newer Sync, cancel ' + syncId);
            return;
        }

        var gitlabAssigneeId;
        if (task.assignee) {
            gitlabAssigneeId = client.users.findById(task.assignee.id).then(function(asanaUser) {
                return new Promise(function (resolve, reject) {
                    gitlab.users.search(asanaUser.email, function(gitlabUser) {
                        if (gitlabUser && gitlabUser.length == 1) {
                            resolve(gitlabUser[0].id);
                        }
                        else {
                            resolve(null);
                        }
                    });
                });
            });
        }
        else {
            gitlabAssigneeId = Promise.resolve(null);
        }

        var labels = [];
        task.custom_fields.forEach(function(el) {
            if (el.enum_value)
                labels.push(el.enum_value.name);
        });

        var inText = urlRegex.exec(task.notes);
        if (inText) {
            console.log('Found issue ' + syncId);
            var issueIid = inText[1];

            var issueId = new Promise(function (resolve, reject) {
                gitlab.projects.issues.list(gitlabProjectId, {iid: issueIid}, function(issues) {
                    if (issues.length > 0) {
                        resolve(issues[0].id);

                        /* client.tasks.update(taskId, {
                            notes: task.notes.replace(new RegExp(urlRegex, 'g'), '').replace(new RegExp(oldUrlRegex, 'g'), '').replace('\nundefined', '') + '\n\n' + issues[0].web_url
                        });*/
                    }
                    else {
                        reject();
                    }
                });
            });

            Promise.join(gitlabAssigneeId, issueId, function(gitlabAssigneeId, issueId) {
                if (tasksToSync.get(taskId) != thisPromise) {
                    console.log('Newer Sync, cancel ' + syncId);
                    return;
                }
                gitlab.issues.edit(gitlabProjectId, issueId, {
                    title: task.name,
                    assignee_id: gitlabAssigneeId,
                    labels: labels.join(','),
                    due_date: task.due_on,
                    description: task.notes + '\n\nhttps://app.asana.com/0/' + asanaProjectId + '/' + task.id,
                    state_event: task.completed ? 'close' : 'reopen'
                }, function(data) {

                });
            });
        }
        else {
            gitlabAssigneeId.then(function() {
                if (tasksToSync.get(taskId) != thisPromise) {
                    console.log('Newer Sync, cancel ' + syncId);
                    return;
                }
                console.log('Creating new Issue ' + syncId);
                gitlab.issues.create(gitlabProjectId, {
                    title: task.name ? task.name : 'kein Titel',
                    assignee_id: gitlabAssigneeId,
                    labels: labels.join(','),
                    due_date: task.due_on,
                    description: task.notes + '\n\nhttps://app.asana.com/0/' + asanaProjectId + '/' + task.id
                }, function(data) {
                    if (data === true) {
                        console.error('Cannot create GitLab Issue for Asana Task' + task.id);
                        return;
                    }

                    //update Asana Task with URL
                    if (data.web_url) {
                        client.tasks.update(taskId, {
                            notes: task.notes + '\n\n' + data.web_url
                        });
                    }

                    if (task.completed) gitlab.issues.edit(gitlabProjectId, data.id, { state_event: 'close'});
                });
            });
        }
    }).error(function(e) {
        if (e.status == 404) {
            console.error('Delete is not supported! ' + taskId);
        }
    });
    tasksToSync.set(taskId, thisPromise);
}

// poll new events every 3 seconds
client.events.stream(asanaProjectId, {
    periodSeconds: 3,
    continueOnError: true
})
.on('data', function (event) {
    console.log('Asana: ' + event.type + ' -- ' + event.action);
    if (event.type == 'task') {
        //console.log(event);
        console.log('Asana: task ' + event.resource.id + ' ' + event.action);
        syncTask(event.resource.id);
    }
});

/*var express = require('express');
var app = express();

var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

app.post('/', function (req, res) {
    console.log(req.body);
    res.send('Hello World!');
});

app.listen(8000, function () {
    console.log('Example app listening on port 8000!');
}); */

/*var syncTasksRecursive = function(collection) {
    collection.data.forEach(function(task) {
        syncTask(task.id);
    });

    function next() {
        collection.nextPage().then(syncTasksRecursive);
    }

    setTimeout(next, 5000);
};

client.tasks.findByProject(asanaProjectId, { limit: 5 }).then(syncTasksRecursive);*/