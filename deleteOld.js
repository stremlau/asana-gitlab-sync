var gitlab = require('gitlab')({
    url:   'https://gitlab.campusjaeger.de',
    token: 'FM55ZNmyQdggzFy-hqYe'
});

gitlab.projects.issues.list(6, {page: 1, per_page: 10}, function(issues) {
    //console.log(issues);
    for (var i = 0; i < issues.length; i++) {
        //console.log(issues[i]);
        if (issues[i].author.id == 3) {
            if (!issues[i].id) console.error(issues[i]);
            
            gitlab.issues.remove(6, issues[i].id, function() {
                console.log('removed issue');
            });
        }
    }
});