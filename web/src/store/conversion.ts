import { defineStore } from 'pinia';
import { ref } from 'vue';

const url = `${import.meta.env.VITE_APP_API_ROOT}ws/conversion/`

export const useConversionStore = defineStore('conversion', () => {
    const ws = ref()

    function createWebSocket() {
        if (!ws.value) {
            ws.value = new WebSocket(url)
            ws.value.onmessage = (event: any) => {
                const data = JSON.parse(JSON.parse(event.data))
                // TODO handle response
                console.log(data)
            }
        }
    }

    return {
        createWebSocket,
    }
});
