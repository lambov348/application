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
    'push' => [
        'order_assigned' => ['title' => 'New order :number', 'body' => ':title · :when · :address'],
        'order_unassigned' => ['title' => 'Removed from order :number', 'body' => ':title · :when'],
        'order_changed' => ['title' => 'Order :number changed', 'body' => 'Now: :when · :address'],
        'worker_declined' => ['title' => ':worker declined order :number', 'body' => ':title · :when'],
        'order_completed' => ['title' => 'Order :number completed', 'body' => ':worker · :title'],
        'new_comment' => ['title' => 'Remark on :number from :worker', 'body' => ':text'],
        'shift_open' => ['title' => 'Your shift is still open', 'body' => 'Please end your shift. At 23:59 it is closed automatically and checked by the office.'],
        'test' => ['title' => 'MöbelStock24', 'body' => 'Notifications work on this device.'],
    ],
    'calendar' => [
        'client' => 'Client',
        'workers' => 'Team',
        'floor' => 'Floor :floor',
        'elevator_yes' => 'Elevator',
        'elevator_no' => 'No elevator',
        'parking' => 'Parking: :note',
        'regenerated' => 'New calendar link created. The old link no longer works.',
    ],
    'payroll' => [
        'closed' => 'Month closed. The results are saved and will not change.',
        'errors' => [
            'month_closed' => 'This month is closed. Hours, rates and amounts can no longer change; book a correction in the next month.',
            'rate_date_order' => 'The new rate must start after the current rate.',
            'too_long' => 'An entry cannot be longer than 16 hours.',
        ],
    ],
];
