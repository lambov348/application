import { onMounted, onUnmounted, ref } from 'vue';

/** Current time that updates regularly, for running clocks. */
export function useNow(intervalMs = 30000) {
    const now = ref(Date.now());
    let timer;
    onMounted(() => (timer = setInterval(() => (now.value = Date.now()), intervalMs)));
    onUnmounted(() => clearInterval(timer));
    return now;
}
