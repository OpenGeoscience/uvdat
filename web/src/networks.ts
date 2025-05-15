import {
    getDatasetNetworks,
    getNetworkGCC,
} from "@/api/rest";
import { Dataset, Network } from "./types";
import { availableNetworks, currentNetwork, panelArrangement } from './store';
import { styleNetwork } from "./layerStyles";


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
        let deactivated = Array.from(network?.deactivated?.nodes || []);
        if (!deactivated.includes(nodeId)) {
            deactivated.push(nodeId)
        } else {
            deactivated = deactivated.filter((id) => id !== nodeId)
        }
        await setNetworkDeactivatedNodes(network, deactivated)
    }
}

export async function setNetworkDeactivatedNodes(network: Network, nodeIds: number[], animation=false) {
    if (!network.deactivated) network.deactivated = {
        nodes: [],
        edges: []
    }
    if (animation) {
        network.changes = {
            deactivate_nodes: nodeIds.filter((n) => !network.deactivated?.nodes.includes(n)),
            activate_nodes: network.deactivated.nodes.filter((n) => !nodeIds.includes(n))
        }
    }
    network.deactivated.nodes = Array.from(nodeIds);
    if (nodeIds.length) {
        const cachedResult = GCCcache.find(
            // sort and stringify to disregard order in comparison
            (result) => JSON.stringify(result.deactivatedNodes.toSorted()) == JSON.stringify(nodeIds.toSorted())
        )
        if (cachedResult) network.gcc = cachedResult.gcc
        else {
            network.gcc = await getNetworkGCC(network.id, network.deactivated.nodes);
            GCCcache.push({
                deactivatedNodes: nodeIds,
                gcc: network.gcc,
            })
        }
    } else {
        network.gcc = network.nodes
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
