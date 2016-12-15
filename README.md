Asana-Gitlab Sync
=================

Als Daemon einrichten
---------------------
/etc/systemd/system/asana-gitlab-sync.service
```
[Unit]
Description=Asana Gitlab Sync

[Service]
ExecStart=/home/asana-gitlab/asana-gitlab-sync/app.js
Restart=always
User=asana-gitlab
Group=asana-gitlab
Environment=PATH=/usr/bin:/usr/local/bin
Environment=GITLAB_TOKEN=...
Environment=ASANA_TOKEN=...
WorkingDirectory=/home/asana-gitlab/asana-gitlab-sync

[Install]
WantedBy=multi-user.target
```

In systemd registrieren: `systemctl daemon-reload`.

Starten:  `systemctl start asana-gitlab-sync`.

Beim Systemstart starten `systemctl enable asana-gitlab-sync`.

Logs ansehen mit `journalctl -u asana-gitlab-sync`

Entwickelt bei Campusjäger
-----------
Dieses Skript wurde bei und für Campusjäger GmbH entwickelt.
https://www.campusjaeger.de/
