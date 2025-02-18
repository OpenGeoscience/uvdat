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
    const snapToleranceX = 200;
    const snapToleranceY = 300;
    const minHeight = 100;
    const minWidth = 150;

    const panel = panelArrangement.value.find(
        (p) => p.id === draggingPanel.value
    );
    if (!panel) return undefined;

    if (panel.right) offsetX += document.body.clientWidth - 390;
    const position = {
        x: event.clientX - offsetX - (panel.element?.clientWidth || 0),
        y: event.clientY - offsetY,
    };
    if (dragModes.value?.includes("position")) {
        const sidebarOpen = (
            (panel.right && openSidebars.value.includes("right")) ||
            (!panel.right && openSidebars.value.includes("left"))
        )
        if (
            sidebarOpen &&
            panel.initialPosition &&
            Math.abs(position.x - panel.initialPosition.x) < snapToleranceX &&
            Math.abs(position.y - panel.initialPosition.y) < snapToleranceY
        ) {
            // snap to sidebar
            panel.position = undefined;
        } else {
            if (!panel.initialPosition) {
                // convert to floating
                panel.width = 300;
                panel.height = 200;
                panel.initialPosition = position;
            } else if (
                panel.width && position.x + panel.width < document.body.clientWidth &&
                panel.height && position.y + panel.height < document.body.clientHeight
            ) {
                panel.position = position;
            }
        }
    }
    if (draggingFrom.value) {
        const from: { x: number; y: number } = { ...draggingFrom.value };
        if (dragModes.value?.includes("height") && draggingFrom.value) {
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
        if (
            dragModes.value?.includes("width") &&
            draggingFrom.value &&
            panel.width
        ) {
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
