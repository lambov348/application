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
    'push' => [
        'order_assigned' => ['title' => 'Новый заказ :number', 'body' => ':title · :when · :address'],
        'order_unassigned' => ['title' => 'Вас сняли с заказа :number', 'body' => ':title · :when'],
        'order_changed' => ['title' => 'Заказ :number изменён', 'body' => 'Теперь: :when · :address'],
        'worker_declined' => ['title' => ':worker отказался от заказа :number', 'body' => ':title · :when'],
        'order_completed' => ['title' => 'Заказ :number выполнен', 'body' => ':worker · :title'],
        'new_comment' => ['title' => 'Замечание по :number от :worker', 'body' => ':text'],
        'shift_open' => ['title' => 'Смена ещё не закрыта', 'body' => 'Закончите смену, пожалуйста. В 23:59 она закроется сама и офис её проверит.'],
        'test' => ['title' => 'MöbelStock24', 'body' => 'Уведомления на этом устройстве работают.'],
    ],
    'calendar' => [
        'client' => 'Клиент',
        'workers' => 'Команда',
        'floor' => 'Этаж :floor',
        'elevator_yes' => 'Есть лифт',
        'elevator_no' => 'Без лифта',
        'parking' => 'Парковка: :note',
        'regenerated' => 'Создана новая ссылка на календарь. Старая больше не работает.',
    ],
    'payroll' => [
        'closed' => 'Месяц закрыт. Итоги сохранены и больше не изменятся.',
        'errors' => [
            'month_closed' => 'Этот месяц закрыт. Часы, ставки и суммы менять нельзя; внесите исправление в следующем месяце.',
            'rate_date_order' => 'Новая ставка должна начинаться позже текущей.',
            'too_long' => 'Запись не может быть длиннее 16 часов.',
        ],
    ],
];
