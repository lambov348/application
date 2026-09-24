<?php

/**
 * All three languages must have the same keys and no empty strings.
 */
function flattenTranslations(array $items, string $prefix = ''): array
{
    $flat = [];
    foreach ($items as $key => $value) {
        $path = $prefix === '' ? (string) $key : "{$prefix}.{$key}";
        is_array($value) ? $flat += flattenTranslations($value, $path) : $flat[$path] = $value;
    }

    return $flat;
}

function translationFiles(string $locale): array
{
    return collect(glob(lang_path("{$locale}/*.php")))
        ->mapWithKeys(fn ($path) => [basename($path, '.php') => flattenTranslations(require $path)])
        ->all();
}

test('every language has the same translation files', function () {
    $files = fn ($locale) => array_keys(translationFiles($locale));

    expect($files('de'))->toBe($files('en'))->toBe($files('ru'));
});

test('every language has the same keys', function (string $locale) {
    foreach (translationFiles('de') as $file => $keys) {
        $other = translationFiles($locale)[$file];

        expect(array_diff_key($keys, $other))->toBe([], "Missing in {$locale}/{$file}.php")
            ->and(array_diff_key($other, $keys))->toBe([], "Extra in {$locale}/{$file}.php");
    }
})->with(['en', 'ru']);

test('no translation is empty', function (string $locale) {
    foreach (translationFiles($locale) as $file => $keys) {
        foreach ($keys as $key => $value) {
            expect(trim((string) $value))->not->toBe('', "Empty: {$locale}/{$file}.php → {$key}");
        }
    }
})->with(['de', 'en', 'ru']);

test('interface strings contain no characters that break vue-i18n', function (string $locale) {
    foreach (translationFiles($locale)['ui'] as $key => $value) {
        expect($value)->not->toMatch('/[@|]/', "Special character in {$locale}/ui.php → {$key}");
    }
})->with(['de', 'en', 'ru']);
