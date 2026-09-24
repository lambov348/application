<script setup>
import axios from 'axios';
import { onMounted, ref } from 'vue';

const props = defineProps({ publicKey: { type: String, default: null } });

const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

const subscribed = ref(false);
const denied = ref(supported && Notification.permission === 'denied');
const busy = ref(false);
const message = ref(null);

function keyToBytes(base64) {
    const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
    return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

async function currentSubscription() {
    const registration = await navigator.serviceWorker.ready;
    return registration.pushManager.getSubscription();
}

async function enable() {
    busy.value = true;
    message.value = null;
    try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            denied.value = permission === 'denied';
            return;
        }
        const registration = await navigator.serviceWorker.ready;
        const subscription =
            (await registration.pushManager.getSubscription()) ??
            (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(props.publicKey) }));
        await axios.post(route('push.subscribe'), subscription.toJSON());
        subscribed.value = true;
    } finally {
        busy.value = false;
    }
}

async function disable() {
    busy.value = true;
    try {
        const subscription = await currentSubscription();
        if (subscription) {
            await axios.delete(route('push.unsubscribe'), { data: { endpoint: subscription.endpoint } });
            await subscription.unsubscribe();
        }
        subscribed.value = false;
    } finally {
        busy.value = false;
    }
}

async function test() {
    await axios.post(route('push.test'));
    message.value = 'push.test_sent';
}

onMounted(async () => {
    if (!supported || !props.publicKey) return;
    const subscription = await currentSubscription();
    if (subscription) {
        subscribed.value = true;
        // Keep the server copy fresh (e.g. after signing in as another user on this phone).
        axios.post(route('push.subscribe'), subscription.toJSON()).catch(() => {});
    }
});
</script>

<template>
    <section class="card flex flex-col gap-3">
        <h2 class="section-title mb-0">{{ $t('push.title') }}</h2>
        <p v-if="!publicKey" class="text-sm text-muted">{{ $t('push.not_configured') }}</p>
        <p v-else-if="isIos && !standalone" class="text-sm">{{ $t('push.ios_install_first') }}</p>
        <p v-else-if="!supported" class="text-sm text-muted">{{ $t('push.unsupported') }}</p>
        <p v-else-if="denied" class="text-sm text-red-700">{{ $t('push.denied') }}</p>
        <template v-else-if="subscribed">
            <p class="text-sm">{{ $t('push.enabled') }}</p>
            <div class="flex flex-wrap gap-2">
                <button type="button" class="btn-secondary" @click="test">{{ $t('push.test') }}</button>
                <button type="button" class="btn-secondary" :disabled="busy" @click="disable">{{ $t('push.disable') }}</button>
            </div>
            <p v-if="message" class="text-sm text-accent" role="status">{{ $t(message) }}</p>
        </template>
        <button v-else type="button" class="btn-primary" :disabled="busy" @click="enable">{{ $t('push.enable') }}</button>
    </section>
</template>
