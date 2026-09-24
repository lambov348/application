<script setup>
import FlashMessage from '@/Components/FlashMessage.vue';
import Icon from '@/Components/Icon.vue';
import LanguageSwitch from '@/Components/LanguageSwitch.vue';
import { Head, Link, usePage } from '@inertiajs/vue3';
import { ref } from 'vue';

defineProps({ title: { type: String, default: '' } });

const page = usePage();
const open = ref(false);

const items = [
    { name: 'orders', route: 'admin.orders.index', match: 'admin.orders.*' },
    { name: 'clients', route: 'admin.clients.index', match: 'admin.clients.*' },
    { name: 'workers', route: 'admin.workers.index', match: 'admin.workers.*' },
];
</script>

<template>
    <Head :title="title" />
    <div class="min-h-screen lg:flex">
        <!-- Mobile top bar -->
        <header class="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-paper/95 px-4 py-3 backdrop-blur lg:hidden">
            <span class="font-display text-base font-semibold">{{ $t('app_name') }}</span>
            <button type="button" class="btn-secondary px-3" :aria-label="$t('nav.menu')" :aria-expanded="open" @click="open = !open">
                <Icon :name="open ? 'close' : 'menu'" />
            </button>
        </header>

        <aside
            class="fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col gap-7 bg-sidebar px-[18px] py-7 text-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0"
            :class="open ? 'translate-x-0' : '-translate-x-full'"
        >
            <div class="flex flex-col gap-1 px-3">
                <div class="font-display text-[19px] font-semibold tracking-tight">{{ $t('app_name') }}</div>
                <div class="text-[13px] text-sidebar-sub">{{ $t('nav.portal_admin') }}</div>
            </div>
            <nav :aria-label="$t('nav.menu')" class="flex flex-col gap-0.5">
                <Link
                    v-for="item in items"
                    :key="item.name"
                    :href="route(item.route)"
                    class="flex min-h-tap items-center gap-3 rounded-[10px] px-3 text-[15px]"
                    :class="route().current(item.match) ? 'bg-sidebar-item font-semibold text-white' : 'text-sidebar-text hover:bg-sidebar-item/60'"
                    @click="open = false"
                >
                    <Icon :name="item.name" />{{ $t(`nav.${item.name}`) }}
                </Link>
            </nav>
            <div class="mt-auto flex flex-col gap-3">
                <LanguageSwitch dark />
                <Link :href="route('profile.edit')" class="flex items-center gap-3 rounded-[14px] bg-[#22252C] p-3 hover:bg-sidebar-item">
                    <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent font-semibold">{{ page.props.auth.user.name.charAt(0) }}</span>
                    <span class="min-w-0">
                        <span class="block truncate text-sm font-semibold">{{ page.props.auth.user.name }}</span>
                        <span class="block text-xs text-sidebar-sub">{{ $t('nav.owner') }} · {{ $t('nav.full_access') }}</span>
                    </span>
                </Link>
                <Link :href="route('logout')" method="post" as="button" class="flex min-h-tap items-center gap-3 rounded-[10px] px-3 text-[15px] text-sidebar-text hover:bg-sidebar-item/60">
                    <Icon name="logout" />{{ $t('nav.logout') }}
                </Link>
            </div>
        </aside>
        <div v-if="open" class="fixed inset-0 z-30 bg-black/30 lg:hidden" @click="open = false" />

        <main class="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:py-8">
            <div class="mx-auto max-w-6xl">
                <slot />
            </div>
        </main>
        <FlashMessage />
    </div>
</template>
