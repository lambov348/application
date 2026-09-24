<script setup>
import FlashMessage from '@/Components/FlashMessage.vue';
import Icon from '@/Components/Icon.vue';
import { Head, Link, usePage } from '@inertiajs/vue3';

defineProps({ title: { type: String, default: '' } });

const page = usePage();
</script>

<template>
    <Head :title="title" />
    <div class="mx-auto flex min-h-screen max-w-xl flex-col">
        <header class="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-paper/95 px-4 py-3 backdrop-blur">
            <Link :href="route('worker.orders.index')" class="flex flex-col">
                <span class="font-display text-base font-semibold">{{ $t('app_name') }}</span>
                <span class="text-xs text-muted">{{ page.props.auth.user.name }}</span>
            </Link>
            <div class="flex gap-2">
                <Link :href="route('profile.edit')" class="btn-secondary px-3" :aria-label="$t('nav.profile')"><Icon name="profile" /></Link>
                <Link :href="route('logout')" method="post" as="button" class="btn-secondary px-3" :aria-label="$t('nav.logout')"><Icon name="logout" /></Link>
            </div>
        </header>
        <main class="flex-1 px-4 py-5">
            <slot />
        </main>
        <FlashMessage />
    </div>
</template>
