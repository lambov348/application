<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
        <meta name="theme-color" content="#F4F3EF">

        <title inertia>{{ config('app.name', 'MöbelStock24') }}</title>

        {{-- Bunny Fonts: EU-hosted mirror of Google Fonts (no Google tracking, GDPR) --}}
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=onest:400,500,600,700|unbounded:500,600&display=swap" rel="stylesheet" />

        @routes
        @vite(['resources/js/app.js', "resources/js/Pages/{$page['component']}.vue"])
        @inertiaHead
    </head>
    <body class="bg-paper font-sans text-ink antialiased">
        @inertia
    </body>
</html>
