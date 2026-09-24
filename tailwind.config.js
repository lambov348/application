import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.vue',
    ],

    theme: {
        extend: {
            // Colours from docs/design (see CLAUDE.md → Дизайн)
            colors: {
                paper: '#F4F3EF',
                ink: '#16181D',
                muted: '#585C63',
                line: '#E4E2DC',
                field: '#D9D6CF',
                soft: '#F6F5F1',
                accent: { DEFAULT: '#0F6B5C', dark: '#0A4F44', light: '#E3F0EC' },
                sidebar: { DEFAULT: '#16181D', item: '#2A2D34', text: '#C9CCD1', sub: '#A9ADB4' },
            },
            fontFamily: {
                sans: ['Onest', ...defaultTheme.fontFamily.sans],
                display: ['Unbounded', ...defaultTheme.fontFamily.sans],
            },
            borderRadius: {
                card: '16px',
            },
            minHeight: {
                tap: '44px',
            },
        },
    },

    plugins: [forms],
};
