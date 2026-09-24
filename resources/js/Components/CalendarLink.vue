<script setup>
import { router, usePage } from '@inertiajs/vue3';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

defineProps({ calendar: { type: Object, required: true } });

const page = usePage();
const { t } = useI18n();
const copied = ref(false);

async function copy(url) {
    await navigator.clipboard.writeText(url);
    copied.value = true;
    setTimeout(() => (copied.value = false), 2500);
}

function regenerate() {
    if (confirm(t('calendar.confirm_regenerate'))) {
        router.post(route('calendar.regenerate'), {}, { preserveScroll: true });
    }
}
</script>

<template>
    <section class="card flex flex-col gap-3">
        <h2 class="section-title mb-0">{{ $t('calendar.title') }}</h2>
        <p class="text-sm">{{ page.props.auth.user.role === 'owner' ? $t('calendar.hint_owner') : $t('calendar.hint') }}</p>
        <input type="text" readonly :value="calendar.url" class="input font-mono text-xs" :aria-label="$t('calendar.title')" @focus="$event.target.select()" />
        <div class="flex flex-wrap gap-2">
            <a :href="calendar.webcal" class="btn-primary">{{ $t('calendar.subscribe') }}</a>
            <button type="button" class="btn-secondary" @click="copy(calendar.url)">{{ copied ? $t('calendar.copied') : $t('calendar.copy') }}</button>
            <button type="button" class="btn-secondary" @click="regenerate">{{ $t('calendar.regenerate') }}</button>
        </div>
    </section>
</template>
