<script setup>
import InputError from '@/Components/InputError.vue';
import { useForm } from '@inertiajs/vue3';

const form = useForm({ current_password: '', password: '', password_confirmation: '' });

function submit() {
    form.put(route('password.update'), {
        preserveScroll: true,
        onSuccess: () => form.reset(),
        onError: () => form.reset('password', 'password_confirmation'),
    });
}
</script>

<template>
    <section class="card">
        <h2 class="section-title">{{ $t('profile.password_title') }}</h2>
        <form class="flex flex-col gap-4" @submit.prevent="submit">
            <div>
                <label for="current_password" class="label">{{ $t('profile.current') }}</label>
                <input id="current_password" v-model="form.current_password" type="password" class="input" autocomplete="current-password" />
                <InputError :message="form.errors.current_password" />
            </div>
            <div>
                <label for="new_password" class="label">{{ $t('profile.new') }}</label>
                <input id="new_password" v-model="form.password" type="password" class="input" autocomplete="new-password" />
                <InputError :message="form.errors.password" />
            </div>
            <div>
                <label for="password_confirmation" class="label">{{ $t('profile.confirm') }}</label>
                <input id="password_confirmation" v-model="form.password_confirmation" type="password" class="input" autocomplete="new-password" />
            </div>
            <div><button type="submit" class="btn-primary" :disabled="form.processing">{{ $t('profile.save_password') }}</button></div>
        </form>
    </section>
</template>
