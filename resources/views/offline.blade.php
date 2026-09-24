<!DOCTYPE html>
<html lang="{{ app()->getLocale() }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ __('ui.offline.title') }} · MöbelStock24</title>
    <style>
        body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #F4F3EF; color: #16181D; font-family: system-ui, sans-serif; }
        .card { max-width: 340px; margin: 24px; padding: 28px 24px; background: #fff; border: 1px solid #E4E2DC; border-radius: 16px; text-align: center; }
        h1 { font-size: 20px; margin: 16px 0 8px; }
        p { color: #585C63; line-height: 1.5; margin: 0 0 20px; }
        button { width: 100%; min-height: 48px; border: 0; border-radius: 12px; background: #0F6B5C; color: #fff; font-size: 16px; font-weight: 600; }
        img { border-radius: 14px; }
    </style>
</head>
<body>
    <div class="card">
        <img src="/icons/icon-192.png" width="64" height="64" alt="">
        <h1>{{ __('ui.offline.title') }}</h1>
        <p>{{ __('ui.offline.text') }}</p>
        <button type="button" onclick="location.reload()">{{ __('ui.offline.retry') }}</button>
    </div>
</body>
</html>
