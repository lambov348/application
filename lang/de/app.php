<?php

return [
    'saved' => 'Gespeichert.',
    'deleted' => 'Gelöscht.',
    'auth' => [
        'deactivated' => 'Ihr Zugang wurde deaktiviert. Bitte wenden Sie sich an den Administrator.',
    ],
    'orders' => [
        'created' => 'Auftrag :number angelegt.',
        'deleted' => 'Auftrag :number gelöscht.',
        'status_changed' => 'Status geändert.',
        'errors' => [
            'transition_not_allowed' => 'Dieser Statuswechsel ist nicht erlaubt.',
            'reason_required' => 'Bitte geben Sie einen Ablehnungsgrund an.',
            'after_photos_required' => 'Zum Abschließen sind mindestens :count Fotos „nachher“ nötig.',
        ],
    ],
    'workers' => [
        'activated' => 'Zugang für :name wiederhergestellt.',
        'deactivated' => ':name wurde deaktiviert.',
    ],
    'profile' => [
        'password_saved' => 'Passwort gespeichert.',
    ],
    'shifts' => [
        'started' => 'Schicht begonnen.',
        'ended' => 'Schicht beendet.',
        'errors' => [
            'already_open' => 'Ihre Schicht läuft bereits.',
            'not_open' => 'Es läuft keine Schicht.',
            'start_shift_first' => 'Bitte zuerst die Schicht beginnen.',
        ],
    ],
    'worker' => [
        'accepted' => 'Auftrag angenommen.',
        'declined' => 'Auftrag abgelehnt. Das Büro wurde informiert.',
        'work_started' => 'Arbeit begonnen.',
        'work_stopped' => 'Arbeit pausiert.',
        'completed' => 'Auftrag :number erledigt. Danke!',
    ],
    'comments' => [
        'sent' => 'Bemerkung gesendet.',
    ],
    'push' => [
        'order_assigned' => ['title' => 'Neuer Auftrag :number', 'body' => ':title · :when · :address'],
        'order_unassigned' => ['title' => 'Von Auftrag :number entfernt', 'body' => ':title · :when'],
        'order_changed' => ['title' => 'Auftrag :number geändert', 'body' => 'Jetzt: :when · :address'],
        'worker_declined' => ['title' => ':worker hat Auftrag :number abgelehnt', 'body' => ':title · :when'],
        'order_completed' => ['title' => 'Auftrag :number erledigt', 'body' => ':worker · :title'],
        'new_comment' => ['title' => 'Bemerkung zu :number von :worker', 'body' => ':text'],
        'shift_open' => ['title' => 'Ihre Schicht läuft noch', 'body' => 'Bitte beenden Sie Ihre Schicht. Um 23:59 wird sie automatisch geschlossen und vom Büro geprüft.'],
        'test' => ['title' => 'MöbelStock24', 'body' => 'Benachrichtigungen funktionieren auf diesem Gerät.'],
    ],
    'calendar' => [
        'client' => 'Kunde',
        'workers' => 'Team',
        'floor' => 'Etage :floor',
        'elevator_yes' => 'Aufzug',
        'elevator_no' => 'Kein Aufzug',
        'parking' => 'Parken: :note',
        'regenerated' => 'Neuer Kalender-Link erstellt. Der alte Link funktioniert nicht mehr.',
    ],
];
