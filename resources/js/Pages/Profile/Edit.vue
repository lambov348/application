<script setup>
import LanguageSwitch from '@/Components/LanguageSwitch.vue';
import PwaInstall from '@/Components/PwaInstall.vue';
import AdminLayout from '@/Layouts/AdminLayout.vue';
import WorkerLayout from '@/Layouts/WorkerLayout.vue';
import { usePage } from '@inertiajs/vue3';
import { computed } from 'vue';
import UpdatePasswordForm from './Partials/UpdatePasswordForm.vue';

const page = usePage();
const layout = computed(() => (page.props.auth.user.role === 'owner' ? AdminLayout : WorkerLayout));
</script>

<template>
    <component :is="layout" :title="$t('profile.title')">
        <h1 class="page-title mb-6">{{ $t('profile.title') }}</h1>
        <div class="flex max-w-xl flex-col gap-5">
            <section class="card">
                <h2 class="section-title">{{ $t('profile.language') }}</h2>
                <LanguageSwitch />
                <p class="mt-2 text-sm text-muted">{{ $t('profile.language_hint') }}</p>
            </section>
            <PwaInstall />
            <UpdatePasswordForm />
        </div>
    </component>
</template>
