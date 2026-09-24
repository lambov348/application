<script setup>
import { router, usePage } from '@inertiajs/vue3';
import { computed } from 'vue';

defineProps({ dark: { type: Boolean, default: false } });

const page = usePage();
const current = computed(() => page.props.locale);

function pick(locale) {
    if (locale !== current.value) {
        router.post(route('locale.update'), { locale }, { preserveScroll: true, preserveState: true });
    }
}
</script>

<template>
    <div
        role="group"
        :aria-label="$t('common.language')"
        class="inline-flex gap-0.5 rounded-[10px] p-[3px]"
        :class="dark ? 'bg-sidebar-item' : 'bg-[#E9E7E1]'"
    >
        <button
            v-for="locale in page.props.locales"
            :key="locale"
            type="button"
            :aria-pressed="locale === current"
            class="h-[38px] min-w-[44px] rounded-lg text-[13px] font-bold uppercase"
            :class="locale === current
                ? (dark ? 'bg-white text-ink' : 'bg-white text-ink')
                : (dark ? 'text-sidebar-text' : 'text-[#3D4047]')"
            @click="pick(locale)"
        >
            {{ locale }}
        </button>
    </div>
</template>
