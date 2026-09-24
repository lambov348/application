<script setup>
import LanguageSwitch from '@/Components/LanguageSwitch.vue';
import Logo from '@/Components/Logo.vue';
import { Head } from '@inertiajs/vue3';

defineProps({ title: { type: String, default: '' } });
</script>

<template>
    <Head :title="title" />
    <div class="mx-auto flex min-h-screen w-full max-w-[420px] flex-col gap-7 px-6 pb-8 pt-12">
        <div class="self-end"><LanguageSwitch /></div>
        <div class="flex flex-col items-center gap-3.5">
            <Logo />
            <div class="flex flex-col items-center gap-1.5">
                <div class="font-display text-[22px] font-semibold tracking-tight">{{ $t('app_name') }}</div>
                <div class="text-[15px] text-muted">{{ $t('auth.subtitle') }}</div>
            </div>
        </div>
        <div class="flex flex-col gap-4 rounded-[20px] border border-line bg-white p-6">
            <slot />
        </div>
        <div class="mt-auto flex flex-col items-center gap-1.5 text-center text-[13px] text-muted">
            <span>{{ $t('auth.foot_accounts') }}</span>
            <span>{{ $t('auth.foot_server') }}</span>
        </div>
    </div>
</template>
