<script setup>
import InputError from '@/Components/InputError.vue';
import AdminLayout from '@/Layouts/AdminLayout.vue';
import { Link, useForm, usePage } from '@inertiajs/vue3';
import { computed } from 'vue';

const props = defineProps({ worker: { type: Object, default: null } });
const page = usePage();

const form = useForm({
    name: props.worker?.name ?? '',
    login: props.worker?.login ?? '',
    phone: props.worker?.phone ?? '',
    locale: props.worker?.locale ?? page.props.locale,
});

const title = computed(() => (props.worker ? 'workers.edit_title' : 'workers.create_title'));

function submit() {
    props.worker ? form.put(route('admin.workers.update', props.worker.id)) : form.post(route('admin.workers.store'));
}
</script>

<template>
    <AdminLayout :title="$t(title)">
        <div class="mb-6">
            <Link :href="route('admin.workers.index')" class="link text-sm">← {{ $t('common.back') }}</Link>
            <h1 class="page-title mt-2">{{ $t(title) }}</h1>
        </div>

        <form class="card flex max-w-xl flex-col gap-4" @submit.prevent="submit">
            <div>
                <label for="name" class="label">{{ $t('workers.fields.name') }}</label>
                <input id="name" v-model="form.name" type="text" class="input" required maxlength="255" />
                <InputError :message="form.errors.name" />
            </div>
            <div>
                <label for="login" class="label">{{ $t('workers.fields.login') }}</label>
                <input id="login" v-model="form.login" type="text" class="input" autocapitalize="none" required minlength="3" maxlength="50" />
                <p class="mt-1 text-xs text-muted">{{ $t('workers.login_hint') }}</p>
                <InputError :message="form.errors.login" />
            </div>
            <div>
                <label for="phone" class="label">{{ $t('workers.fields.phone') }}</label>
                <input id="phone" v-model="form.phone" type="tel" class="input" />
                <InputError :message="form.errors.phone" />
            </div>
            <div>
                <label for="locale" class="label">{{ $t('workers.fields.locale') }}</label>
                <select id="locale" v-model="form.locale" class="input">
                    <option v-for="l in page.props.locales" :key="l" :value="l">{{ $t(`languages.${l}`) }}</option>
                </select>
                <InputError :message="form.errors.locale" />
            </div>
            <p v-if="!worker" class="rounded-xl bg-soft px-3.5 py-3 text-sm">{{ $t('workers.start_password_hint') }}</p>
            <div class="flex gap-3">
                <button type="submit" class="btn-primary" :disabled="form.processing">{{ $t('common.save') }}</button>
                <Link :href="route('admin.workers.index')" class="btn-secondary">{{ $t('common.cancel') }}</Link>
            </div>
        </form>
    </AdminLayout>
</template>
