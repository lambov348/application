<?php

return [
    'saved' => 'Saved.',
    'deleted' => 'Deleted.',
    'auth' => [
        'deactivated' => 'Your access has been disabled. Please contact the administrator.',
    ],
    'orders' => [
        'created' => 'Order :number created.',
        'deleted' => 'Order :number deleted.',
        'status_changed' => 'Status changed.',
        'errors' => [
            'transition_not_allowed' => 'This status change is not allowed.',
            'reason_required' => 'Please give a reason for the rejection.',
            'after_photos_required' => 'At least :count "after" photos are needed to complete the order.',
        ],
    ],
    'workers' => [
        'activated' => 'Access for :name has been restored.',
        'deactivated' => ':name has been deactivated.',
    ],
    'profile' => [
        'password_saved' => 'Password saved.',
    ],
    'shifts' => [
        'started' => 'Shift started.',
        'ended' => 'Shift ended.',
        'errors' => [
            'already_open' => 'Your shift is already running.',
            'not_open' => 'No shift is running.',
            'start_shift_first' => 'Start your shift first.',
        ],
    ],
    'worker' => [
        'accepted' => 'Order accepted.',
        'declined' => 'Order declined. The office has been informed.',
        'work_started' => 'Work started.',
        'work_stopped' => 'Work paused.',
        'completed' => 'Order :number completed. Thank you!',
    ],
    'comments' => [
        'sent' => 'Remark sent.',
    ],
];
