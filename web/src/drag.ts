import { draggingFrom, draggingPanel, dragModes, openSidebars, panelArrangement } from "./store";
import { FloatingPanelConfig } from "./types";

export function startDrag(
    event: MouseEvent,
    panel: FloatingPanelConfig | undefined,
    modes: ("position" | "width" | "height")[]
) {
    if (panel) {
        draggingPanel.value = panel.id;
    }
    draggingFrom.value = {
        x: event.clientX,
        y: event.clientY,
    };
    dragModes.value = modes;
}

export function dragPanel(event: MouseEvent) {
    let offsetX = -5;
    const offsetY = 30;
    const minHeight = 100;
    const minWidth = 150;

    const panel = panelArrangement.value.find(
        (p) => p.id === draggingPanel.value
    );
    if (!panel) return undefined;
    if (draggingFrom.value) {
        const from: { x: number; y: number } = { ...draggingFrom.value };

        if (panel.dock == 'right') offsetX += document.body.clientWidth - 390;
        const position = {
            x: event.clientX - offsetX - (panel.element?.clientWidth || 0),
            y: event.clientY - offsetY,
        };
        if (dragModes.value?.includes("position")) {
            const allowDock = (
                Math.abs(from.x - event.clientX) > 10 &&
                Math.abs(from.y - event.clientY) > 10
            )
            if (
                allowDock &&
                openSidebars.value.includes("left") &&
                event.clientX < 350
            ) {
                // dock left
                panel.dock = 'left';
                panel.position = undefined;
                panel.width = undefined;
                panel.height = undefined;
                // determine order
                const currentDocked = panelArrangement.value.filter((p) => p.dock === 'left' && !p.position)
                panel.order = Math.ceil(event.clientY / (document.body.clientHeight / currentDocked.length))
            } else if (
                allowDock &&
                openSidebars.value.includes("right") &&
                event.clientX > document.body.clientWidth - 350
            ) {
                // dock right
                panel.dock = 'right';
                panel.position = undefined;
                panel.width = undefined;
                panel.height = undefined;
                // determine order
                const currentDocked = panelArrangement.value.filter((p) => p.dock === 'right' && !p.position)
                panel.order = Math.ceil(event.clientY / (document.body.clientHeight / currentDocked.length))
            } else if (!panel.position) {
                // float
                panel.width = 300;
                panel.height = 200;
                panel.position = position;
            } else {
                panel.position = position;
            }
        }
        if (dragModes.value?.includes("height")) {
            if(!panel.height) {
                panel.height = panel.element?.clientHeight
            }
            if (panel.height) {
                const heightDelta = event.clientY - draggingFrom.value.y;
                if (panel.height + heightDelta > minHeight) {
                    panel.height = panel.height + heightDelta;
                    from.y = event.clientY;
                }
            }
        }
        if (dragModes.value?.includes("width") && panel.width) {
            const widthDelta = event.clientX - draggingFrom.value.x;
            if (panel.width + widthDelta > minWidth) {
                panel.width = panel.width + widthDelta;
                from.x = event.clientX;
            }
        }
        draggingFrom.value = from;
    }
}

export function stopDrag() {
    draggingPanel.value = undefined;
    draggingFrom.value = undefined;
    dragModes.value = [];
}
