<script setup>
import InputError from '@/Components/InputError.vue';
import GuestLayout from '@/Layouts/GuestLayout.vue';
import { useForm } from '@inertiajs/vue3';

const form = useForm({ password: '', password_confirmation: '' });

function submit() {
    form.put(route('password.setup.store'), { onFinish: () => form.reset() });
}
</script>

<template>
    <GuestLayout :title="$t('setup.title')">
        <h1 class="font-display text-lg font-semibold">{{ $t('setup.title') }}</h1>
        <p class="text-sm text-muted">{{ $t('setup.intro') }}</p>
        <form class="flex flex-col gap-4" @submit.prevent="submit">
            <div>
                <label for="password" class="label">{{ $t('setup.password') }}</label>
                <input id="password" v-model="form.password" type="password" class="input h-[52px]" autocomplete="new-password" minlength="8" required autofocus />
                <InputError :message="form.errors.password" />
            </div>
            <div>
                <label for="password_confirmation" class="label">{{ $t('setup.confirm') }}</label>
                <input id="password_confirmation" v-model="form.password_confirmation" type="password" class="input h-[52px]" autocomplete="new-password" required />
            </div>
            <button type="submit" class="btn-primary h-[54px] text-base" :disabled="form.processing">{{ $t('setup.submit') }}</button>
        </form>
    </GuestLayout>
</template>
