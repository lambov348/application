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
];
