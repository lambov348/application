<script setup>
import FlashMessage from '@/Components/FlashMessage.vue';
import Icon from '@/Components/Icon.vue';
import { Head, Link, usePage } from '@inertiajs/vue3';

defineProps({ title: { type: String, default: '' } });

const page = usePage();
</script>

<template>
    <Head :title="title" />
    <div class="mx-auto flex min-h-screen max-w-xl flex-col pb-[calc(72px+env(safe-area-inset-bottom))]">
        <header class="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-paper/95 px-4 py-3 backdrop-blur">
            <div class="flex items-center gap-3">
                <span class="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">{{ page.props.auth.user.name.split(' ').map((p) => p[0]).join('').slice(0, 2) }}</span>
                <span class="font-display text-base font-semibold">{{ $t('app_name') }}</span>
            </div>
            <Link :href="route('logout')" method="post" as="button" class="btn-secondary px-3" :aria-label="$t('nav.logout')"><Icon name="logout" /></Link>
        </header>
        <main class="flex-1 px-4 py-5">
            <slot />
        </main>

        <nav :aria-label="$t('nav.menu')" class="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white pb-[env(safe-area-inset-bottom)]">
            <div class="mx-auto grid max-w-xl grid-cols-2">
                <Link
                    :href="route('worker.orders.index')"
                    class="flex h-16 flex-col items-center justify-center gap-1 text-xs font-semibold"
                    :class="route().current('worker.*') ? 'text-accent' : 'text-muted'"
                >
                    <Icon name="orders" :size="22" />{{ $t('worker.tab_tasks') }}
                </Link>
                <Link
                    :href="route('profile.edit')"
                    class="flex h-16 flex-col items-center justify-center gap-1 text-xs font-semibold"
                    :class="route().current('profile.*') ? 'text-accent' : 'text-muted'"
                >
                    <Icon name="profile" :size="22" />{{ $t('worker.tab_profile') }}
                </Link>
            </div>
        </nav>
        <FlashMessage />
    </div>
</template>
