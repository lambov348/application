<?php

return [
    'saved' => 'Сохранено.',
    'deleted' => 'Удалено.',
    'auth' => [
        'deactivated' => 'Ваш доступ отключён. Обратитесь к администратору.',
    ],
    'orders' => [
        'created' => 'Заказ :number создан.',
        'deleted' => 'Заказ :number удалён.',
        'status_changed' => 'Статус изменён.',
        'errors' => [
            'transition_not_allowed' => 'Такая смена статуса невозможна.',
            'reason_required' => 'Укажите причину отказа.',
            'after_photos_required' => 'Чтобы закрыть заказ, нужно минимум :count фото «после».',
        ],
    ],
    'workers' => [
        'activated' => 'Доступ для :name восстановлен.',
        'deactivated' => ':name отключён.',
    ],
    'profile' => [
        'password_saved' => 'Пароль сохранён.',
    ],
    'shifts' => [
        'started' => 'Смена начата.',
        'ended' => 'Смена закончена.',
        'errors' => [
            'already_open' => 'Смена уже идёт.',
            'not_open' => 'Смена не начата.',
            'start_shift_first' => 'Сначала начните смену.',
        ],
    ],
    'worker' => [
        'accepted' => 'Заказ принят.',
        'declined' => 'Вы отказались от заказа. Офис получил уведомление.',
        'work_started' => 'Работа начата.',
        'work_stopped' => 'Работа на паузе.',
        'completed' => 'Заказ :number выполнен. Спасибо!',
    ],
    'comments' => [
        'sent' => 'Замечание отправлено.',
    ],
];
