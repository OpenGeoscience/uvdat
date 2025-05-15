import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { getDatasetNetworks, getNetworkEdges, getNetworkGCC, getNetworkNodes, getProjectNetworks } from '@/api/rest';
import { Dataset, Network, NetworkEdge, NetworkNode } from '@/types';

import { usePanelStore, useStyleStore } from '.';

interface GCCResult {
    deactivatedNodes: number[];
    gcc: number[];
}
const GCCcache: GCCResult[] = [];

export const useNetworkStore = defineStore('network', () => {
    const panelStore = usePanelStore();
    const styleStore = useStyleStore();

    const loadingNetworks = ref<boolean>(false);
    const availableNetworks = ref<Network[]>([]);

    // These are only used in NetworksPanel.vue, but must be here
    // so the state persists when the panel is moved around
    const currentNetworkNodes = ref<NetworkNode[]>([]);
    const currentNetworkEdges = ref<NetworkEdge[]>([]);
    
    const currentNetwork = ref<Network>();
    watch(currentNetwork, () => {
        if (currentNetwork.value) {
            currentNetwork.value.selected = {
                nodes: [],
                edges: [],
            }
            getNetworkNodes(currentNetwork.value.id).then((results) => {
                currentNetworkNodes.value = results;
            })
            getNetworkEdges(currentNetwork.value.id).then((results) => {
                currentNetworkEdges.value = results;
            })
        } else {
            currentNetworkNodes.value = [];
            currentNetworkEdges.value = [];
        }
    });


    // Actions
    function initNetworks(projectId: number) {
        loadingNetworks.value = true;
        getProjectNetworks(projectId).then((networks) => {
            availableNetworks.value = networks;
            currentNetwork.value = undefined;

            loadingNetworks.value = false;
        })
    }

    async function getNetwork(nodeId: number, dataset: Dataset): Promise<Network | undefined> {
        let network: Network | undefined;
        availableNetworks.value.forEach((net) => {
            if (net.nodes.includes(nodeId)) {
                network = net;
            }
        });
        if (!network) {
            availableNetworks.value = [
                ...availableNetworks.value,
                ...((await getDatasetNetworks(dataset.id)).filter((net) => {
                    return !availableNetworks.value.map((n) => n.id).includes(net.id);
                })),
            ];
        }
        availableNetworks.value.forEach((net) => {
            if (net.nodes.includes(nodeId)) {
                network = net;
            }
        });
        if (availableNetworks.value.length) {
            panelStore.panelArrangement = panelStore.panelArrangement.map((panel) => {
                if (panel.id === 'networks') panel.visible = true;
                return panel;
            });
        }
        currentNetwork.value = network;
        return network;
    }

    async function toggleNodeActive(nodeId: number, dataset: Dataset) {
        const network = await getNetwork(nodeId, dataset);
        if (network) {
            let deactivated = Array.from(network?.deactivated?.nodes || []);
            if (!deactivated.includes(nodeId)) {
                deactivated.push(nodeId);
            } else {
                deactivated = deactivated.filter((id) => id !== nodeId);
            }
            await setNetworkDeactivatedNodes(network, deactivated);
        }
    }

    async function setNetworkDeactivatedNodes(network: Network, nodeIds: number[], animation = false) {
        if (!network.deactivated) network.deactivated = { nodes: [], edges: [] };
        if (animation) {
            network.changes = {
                deactivate_nodes: nodeIds.filter((n) => !network.deactivated?.nodes.includes(n)),
                activate_nodes: network.deactivated.nodes.filter((n) => !nodeIds.includes(n)),
            };
        }
        network.deactivated.nodes = Array.from(nodeIds);
        if (nodeIds.length) {
            const cachedResult = GCCcache.find(
                (result) => JSON.stringify(result.deactivatedNodes.toSorted()) === JSON.stringify(nodeIds.toSorted())
            );
            if (cachedResult) network.gcc = cachedResult.gcc;
            else {
                network.gcc = await getNetworkGCC(network.id, network.deactivated.nodes);
                GCCcache.push({
                    deactivatedNodes: nodeIds,
                    gcc: network.gcc,
                });
            }
        } else {
            network.gcc = network.nodes;
        }
        styleStore.styleNetwork(network);
        availableNetworks.value = availableNetworks.value.map((n) => (n.id === network.id ? network : n));
    }


    return {
        availableNetworks,
        currentNetwork,
        loadingNetworks,
        currentNetworkNodes,
        currentNetworkEdges,
        initNetworks,
        getNetwork,
        toggleNodeActive,
        setNetworkDeactivatedNodes,
    };
});
