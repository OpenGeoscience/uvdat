import {
    getDatasetNetworks,
    getNetworkGCC,
} from "@/api/rest";
import { Dataset, Network } from "./types";
import { availableNetworks, currentNetwork, panelArrangement } from './store';
import { styleNetwork } from "./layerStyles";


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

    const deactivated = new Set(network.deactivated?.nodes || undefined);
    if (deactivated.has(nodeId)) {
        deactivated.delete(nodeId);
    } else {
        deactivated.add(nodeId);
    }

    await setNetworkDeactivatedNodes(network, deactivated)
}

export async function setNetworkDeactivatedNodes(network: Network, nodeIds: Set<number> = new Set(), animation=false) {
    if (!network.deactivated) network.deactivated = {
        nodes: new Set(),
        edges: new Set()
    }
    if (animation) {
        network.changes = {
            deactivate_nodes: nodeIds.difference(network.deactivated.nodes),  // nodes about to be deactivated
            activate_nodes: network.deactivated.nodes.difference(nodeIds),    // nodes about to be reactivated
        }
    }
    network.deactivated.nodes = nodeIds;
    if (nodeIds.size) {
        const cachedResult = GCCcache.find(
            // The symmetric difference between two sets is only empty if they are equal
            (result) => nodeIds.symmetricDifference(new Set(result.deactivatedNodes)).size === 0
        )
        if (cachedResult) network.gcc = cachedResult.gcc
        else {
            network.gcc = await getNetworkGCC(network.id, Array.from(network.deactivated.nodes));
            GCCcache.push({
                deactivatedNodes: Array.from(nodeIds),
                gcc: network.gcc,
            })
        }
    } else {
        network.gcc = new Set(network.nodes);
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
        if (net.nodes.has(nodeId)) {
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
        if (net.nodes.has(nodeId)) {
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
