<script setup>
import { usePage } from '@inertiajs/vue3';
import { ref, watch } from 'vue';

const page = usePage();
const message = ref(null);
let timer;

watch(
    () => page.props.flash?.success,
    (value) => {
        message.value = value;
        clearTimeout(timer);
        if (value) timer = setTimeout(() => (message.value = null), 4000);
    },
    { immediate: true },
);
</script>

<template>
    <Transition enter-from-class="opacity-0 translate-y-2" leave-to-class="opacity-0" enter-active-class="transition" leave-active-class="transition">
        <div v-if="message" role="status" class="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-xl bg-ink px-4 py-3 text-center text-sm font-medium text-white shadow-lg">
            {{ message }}
        </div>
    </Transition>
</template>
