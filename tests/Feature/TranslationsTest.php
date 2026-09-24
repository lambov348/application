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

test('every key used in the pages exists in the translations', function () {
    $keys = flattenTranslations(require lang_path('de/ui.php'));
    $missing = [];

    foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator(resource_path('js'))) as $file) {
        if (! in_array($file->getExtension(), ['vue', 'js'], true)) {
            continue;
        }
        preg_match_all('/(?<![\w.])(?:\$t|t)\(\s*\'([a-z_]+(?:\.[a-z_]+)+)\'/', file_get_contents($file->getPathname()), $m);
        foreach ($m[1] as $key) {
            if (! array_key_exists($key, $keys)) {
                $missing[] = "{$key} (".basename($file->getPathname()).')';
            }
        }
    }

    expect(array_unique($missing))->toBe([]);
});

test('translation files have no duplicate keys that silently overwrite each other', function (string $locale) {
    foreach (glob(lang_path("{$locale}/*.php")) as $path) {
        $tokens = token_get_all(file_get_contents($path));
        $depth = 0;
        $seen = [];
        $prev = null;
        foreach ($tokens as $i => $token) {
            $text = is_array($token) ? $token[1] : $token;
            if ($text === '[') {
                $depth++;
                $seen[$depth] = [];
            } elseif ($text === ']') {
                $depth--;
            } elseif (is_array($token) && $token[0] === T_CONSTANT_ENCAPSED_STRING) {
                $j = $i + 1;
                while (isset($tokens[$j]) && is_array($tokens[$j]) && $tokens[$j][0] === T_WHITESPACE) {
                    $j++;
                }
                if (isset($tokens[$j]) && is_array($tokens[$j]) && $tokens[$j][0] === T_DOUBLE_ARROW) {
                    expect(in_array($text, $seen[$depth], true))->toBeFalse("Duplicate key {$text} in {$locale}/".basename($path));
                    $seen[$depth][] = $text;
                }
            }
        }
    }
})->with(['de', 'en', 'ru']);
