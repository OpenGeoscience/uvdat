import {
    getDatasetNetworks,
    getNetworkGCC,
} from "@/api/rest";
import { Dataset, Network } from "./types";
import { availableNetworks, currentNetwork, panelArrangement } from './store';
import { styleNetwork } from "./layerStyles";
import { getNetworkState } from "./storeFunctions";


interface GCCResult {
    deactivatedNodes: number[],
    gcc: Set<number>,
}
const GCCcache: GCCResult[] = [];

// ------------------
// Exported functions
// ------------------

export async function toggleNodeActive(
    nodeId: number,
    dataset: Dataset,
) {
    const network = await getNetwork(nodeId, dataset);
    if (!network) {
        return;
    }
    const state = getNetworkState(network);
    const deactivated = new Set(state.deactivated.nodes);
    if (deactivated.has(nodeId)) {
        deactivated.delete(nodeId);
    } else {
        deactivated.add(nodeId);
    }

    await setNetworkDeactivatedNodes(network, deactivated)
}

export async function setNetworkDeactivatedNodes(network: Network, nodeIds: Set<number> = new Set(), animation=false) {
    const state = getNetworkState(network);
    if (animation) {
        state.changes = {
            deactivate_nodes: nodeIds.difference(state.deactivated.nodes),  // nodes about to be deactivated
            activate_nodes: state.deactivated.nodes.difference(nodeIds),    // nodes about to be reactivated
        }
    }
    state.deactivated.nodes = nodeIds;
    if (nodeIds.size) {
        const cachedResult = GCCcache.find(
            // The symmetric difference between two sets is only empty if they are equal
            (result) => nodeIds.symmetricDifference(new Set(result.deactivatedNodes)).size === 0
        )
        if (cachedResult) state.gcc = cachedResult.gcc
        else {
            state.gcc = await getNetworkGCC(network.id, Array.from(state.deactivated.nodes));
            GCCcache.push({
                deactivatedNodes: Array.from(nodeIds),
                gcc: state.gcc,
            })
        }
    } else {
        state.gcc = new Set(network.nodes);
    }
    styleNetwork(network)
    availableNetworks.value = availableNetworks.value.map((n) => {
        if (n.id === network.id) return network
        return n
    })
}

export async function getNetwork(
    nodeId: number,
    dataset: Dataset,
): Promise<Network | undefined> {
    let network;
    availableNetworks.value.forEach((net) => {
        if (net.nodes.includes(nodeId)) {
            network = net;
        }
    })
    if (!network) {
        availableNetworks.value = [
            ...availableNetworks.value,
            ...(await getDatasetNetworks(dataset.id)).filter((net) => {
                return !availableNetworks.value.map((n) => n.id).includes(net.id)
            }),
        ]
    }
    availableNetworks.value.forEach((net) => {
        if (net.nodes.includes(nodeId)) {
            network = net;
        }
    })
    if (availableNetworks.value.length) {
        panelArrangement.value = panelArrangement.value.map((panel) => {
            if (panel.id === 'networks') panel.visible = true;
            return panel
        })
    }
    currentNetwork.value = network;
    return network;
}
