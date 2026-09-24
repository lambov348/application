<script setup>
import { onMounted, onUnmounted, ref } from 'vue';

const installable = ref(false);
const installed = ref(false);
const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);

function refresh() {
    installable.value = !!window.deferredInstallPrompt;
    installed.value = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

async function install() {
    const prompt = window.deferredInstallPrompt;
    if (!prompt) return;
    prompt.prompt();
    await prompt.userChoice;
    window.deferredInstallPrompt = null;
    refresh();
}

onMounted(() => {
    refresh();
    window.addEventListener('m24-installable', refresh);
    window.addEventListener('appinstalled', refresh);
});
onUnmounted(() => {
    window.removeEventListener('m24-installable', refresh);
    window.removeEventListener('appinstalled', refresh);
});
</script>

<template>
    <section class="card flex flex-col gap-3">
        <h2 class="section-title mb-0">{{ $t('pwa.title') }}</h2>
        <p v-if="installed" class="text-sm">{{ $t('pwa.installed') }}</p>
        <button v-else-if="installable" type="button" class="btn-primary" @click="install">{{ $t('pwa.install') }}</button>
        <p v-else-if="isIos" class="text-sm">{{ $t('pwa.ios_hint') }}</p>
        <p v-else class="text-sm">{{ $t('pwa.other_hint') }}</p>
    </section>
</template>
