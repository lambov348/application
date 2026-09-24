<script setup>
import Icon from '@/Components/Icon.vue';
import { formatDateTime } from '@/i18n';
import AdminLayout from '@/Layouts/AdminLayout.vue';
import { Link, router, usePage } from '@inertiajs/vue3';
import { useI18n } from 'vue-i18n';

defineProps({ workers: Array });

const page = usePage();
const { t } = useI18n();

function toggle(w) {
    if (!w.is_active || confirm(t('workers.confirm_deactivate', { name: w.name }))) {
        router.post(route('admin.workers.toggle-active', w.id), {}, { preserveScroll: true });
    }
}

function resetPassword(w) {
    if (confirm(t('workers.confirm_reset', { name: w.name }))) {
        router.post(route('admin.workers.reset-password', w.id), {}, { preserveScroll: true });
    }
}
</script>

<template>
    <AdminLayout :title="$t('workers.title')">
        <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h1 class="page-title">{{ $t('workers.title') }}</h1>
            <Link :href="route('admin.workers.create')" class="btn-primary"><Icon name="plus" />{{ $t('workers.new') }}</Link>
        </div>

        <div v-if="page.props.flash.credentials" class="card mb-5 border-accent bg-accent-light" role="alert">
            <h2 class="font-semibold">{{ $t('workers.credentials_title', { name: page.props.flash.credentials.name }) }}</h2>
            <dl class="my-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-lg">
                <dt class="font-sans text-sm text-muted">{{ $t('auth.login') }}</dt><dd>{{ page.props.flash.credentials.login }}</dd>
                <dt class="font-sans text-sm text-muted">{{ $t('auth.password') }}</dt><dd>{{ page.props.flash.credentials.password }}</dd>
            </dl>
            <p class="text-sm">{{ $t('workers.credentials_hint') }}</p>
        </div>

        <div v-if="workers.length === 0" class="card text-center text-muted">{{ $t('workers.empty') }}</div>
        <div v-else class="flex flex-col gap-3">
            <div v-for="w in workers" :key="w.id" class="card flex flex-wrap items-center justify-between gap-4" :class="{ 'opacity-60': !w.is_active }">
                <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                        <span class="font-semibold">{{ w.name }}</span>
                        <span class="rounded-full px-2 py-0.5 text-xs font-semibold" :class="w.is_active ? 'bg-accent-light text-accent-dark' : 'bg-stone-100 text-stone-600'">
                            {{ w.is_active ? $t('workers.active') : $t('workers.inactive') }}
                        </span>
                    </div>
                    <div class="text-sm text-muted">{{ w.login }}<template v-if="w.phone"> · {{ w.phone }}</template> · {{ $t(`languages.${w.locale ?? 'de'}`) }}</div>
                    <div class="text-sm text-muted">
                        {{ $t('workers.last_login') }}: {{ w.last_login_at ? formatDateTime(w.last_login_at, page.props.timezone) : $t('workers.never') }}
                        <template v-if="w.must_set_password"> · {{ $t('workers.waiting_password') }}</template>
                    </div>
                </div>
                <div class="flex flex-wrap gap-2">
                    <Link :href="route('admin.workers.edit', w.id)" class="btn-secondary">{{ $t('common.edit') }}</Link>
                    <button type="button" class="btn-secondary" @click="resetPassword(w)">{{ $t('workers.reset_password') }}</button>
                    <button type="button" :class="w.is_active ? 'btn-danger' : 'btn-primary'" @click="toggle(w)">
                        {{ w.is_active ? $t('workers.deactivate') : $t('workers.activate') }}
                    </button>
                </div>
            </div>
        </div>
    </AdminLayout>
</template>
