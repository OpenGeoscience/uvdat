import {
    getDatasetNetworks,
    getNetworkGCC,
} from "@/api/rest";
import { Dataset, Network} from "./types";
import { availableNetworks } from './store';
import { showGCC } from "./layerStyles";


// ------------------
// Exported functions
// ------------------

export async function toggleNodeActive(
    nodeId: number,
    dataset: Dataset,
) {
    const network = await getNetwork(nodeId, dataset);
    if (network) {
        if (network.deactivated === undefined) network.deactivated = {
            nodes: [],
            edges: [],
        };
        if (network.deactivated.nodes.includes(nodeId)) {
            network.deactivated.nodes = network.deactivated.nodes.filter((n) => n !== nodeId)
        } else {
            network.deactivated.nodes = [
                ...network.deactivated.nodes,
                nodeId,
            ]
        }
        if (network.deactivated.nodes.length) {
            network.gcc = await getNetworkGCC(network.id, network.deactivated.nodes);
        } else {
            network.gcc = network.nodes.map((n) => n.id)
        }
        showGCC(network);
    }
}

// ------------------
// Internal functions
// ------------------

async function getNetwork(
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
