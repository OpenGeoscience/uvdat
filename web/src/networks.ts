import {
    getDatasetNetworks,
    getNetworkGCC,
} from "@/api/rest";
import { Dataset, Network } from "./types";
import { availableNetworks } from './store';
import { showGCC } from "./layerStyles";


interface GCCResult {
    deactivatedNodes: number[],
    gcc: number[],
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
    if (network) {
        let deactivated = network?.deactivated?.nodes || []
        if (!deactivated.includes(nodeId)) {
            deactivated.push(nodeId)
        } else {
            deactivated = deactivated.filter((id) => id !== nodeId)
        }
        await setNetworkDeactivatedNodes(network, deactivated)
    }
}

export async function setNetworkDeactivatedNodes(network: Network, nodeIds: number[]) {
    if (!network.deactivated) network.deactivated = {
        nodes: [],
        edges: []
    }
    network.deactivated.nodes = nodeIds;
    if (nodeIds.length) {
        const cachedResult = GCCcache.find((result) => result.deactivatedNodes === nodeIds.sort())
        if (cachedResult) network.gcc = cachedResult.gcc
        else {
            network.gcc = await getNetworkGCC(network.id, network.deactivated.nodes);
            GCCcache.push({
                deactivatedNodes: nodeIds.sort(),  // sort to disregard order in comparison
                gcc: network.gcc,
            })
        }
    } else {
        network.gcc = network.nodes.map((n) => n.id)
    }
    showGCC(network)
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
        if (net.nodes.map((n) => n.id).includes(nodeId)) {
            network = net;
        }
    })
    if (!network) {
        availableNetworks.value = [
            ...availableNetworks.value,
            ...await getDatasetNetworks(dataset.id),
        ]
    }
    availableNetworks.value.forEach((net) => {
        if (net.nodes.map((n) => n.id).includes(nodeId)) {
            network = net;
        }
    })
    return network;
}
