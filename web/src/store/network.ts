import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { getDatasetNetworks, getNetworkEdges, getNetworkGCC, getNetworkNodes, getProjectNetworks } from '@/api/rest';
import { Dataset, GCCResult, Network, NetworkEdge, NetworkNode, NetworkStyle, NetworkState } from '@/types';

import { usePanelStore, useMapStore, useStyleStore } from '.';

const GCCcache: GCCResult[] = [];
const GCCColor = "#f7e059";
const selectedColor = "#ffffff";
const deactivateColor = "#f54242";
const activateColor = "#008837";

export const useNetworkStore = defineStore('network', () => {
    const panelStore = usePanelStore();
    const mapStore = useMapStore();
    const styleStore = useStyleStore();

    const loadingNetworks = ref<boolean>(false);
    const availableNetworks = ref<Network[]>([]);
    const currentNetwork = ref<Network>();
    const networkStates = ref<Record<number, NetworkState>>({})

    // These are only used in NetworksPanel.vue, but must be here
    // so the state persists when the panel is moved around
    const currentNetworkNodes = ref<NetworkNode[]>([]);
    const currentNetworkEdges = ref<NetworkEdge[]>([]);

    watch(currentNetwork, () => {
        if (currentNetwork.value) {
            resetNetworkState(currentNetwork.value.id)
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
            networks.forEach((n) => resetNetworkState(n.id))
        })
    }

    function resetNetworkState(networkId: number) {
        networkStates.value[networkId] = {
            selected: {nodes: [], edges: []},
            deactivated: {nodes: [], edges: []},
            changes: {
                deactivate_nodes: [],
                activate_nodes: [],
            },
            gcc: null
        }
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
            let deactivated = Array.from(networkStates.value[network.id]?.deactivated?.nodes || []);
            if (!deactivated.includes(nodeId)) {
                deactivated.push(nodeId);
            } else {
                deactivated = deactivated.filter((id) => id !== nodeId);
            }
            await setNetworkDeactivatedNodes(network, deactivated);
        }
    }

    async function setNetworkDeactivatedNodes(network: Network, nodeIds: number[], animation = false) {
        if (!networkStates.value[network.id]) resetNetworkState(network.id)
        const networkState = networkStates.value[network.id]
        if (!networkState.deactivated) networkState.deactivated = { nodes: [], edges: [] };
        if (animation) {
            networkState.changes = {
                deactivate_nodes: nodeIds.filter((n) => !networkState.deactivated?.nodes.includes(n)),
                activate_nodes: networkState.deactivated.nodes.filter((n) => !nodeIds.includes(n)),
            };
        }
        networkState.deactivated.nodes = Array.from(nodeIds);
        if (nodeIds.length) {
            const cachedResult = GCCcache.find(
                (result) => JSON.stringify(result.deactivatedNodes.toSorted()) === JSON.stringify(nodeIds.toSorted())
            );
            if (cachedResult) networkState.gcc = cachedResult.gcc;
            else {
                networkState.gcc = await getNetworkGCC(network.id, networkState.deactivated.nodes);
                GCCcache.push({
                    deactivatedNodes: nodeIds,
                    gcc: networkState.gcc,
                });
            }
        } else {
            networkState.gcc = network.nodes;
        }
        networkStates.value[network.id] = networkState
        styleNetwork(network);
    }

    function styleVisibleNetworks() {
        const visibleVectorIds = new Set(mapStore.getUserMapLayers().map(
            (id) => mapStore.parseLayerString(id)
        ).filter(
            (info) => info.type === 'vector'
        ).map(
            (info) => info.typeId
        ))
        availableNetworks.value.forEach((network) => {
            if (visibleVectorIds.has(network.vector_data)) {
                styleNetwork(network)
            }
        })
    }

    function styleNetwork(network: Network) {
        const vectorId = network.vector_data;
        const map = mapStore.getMap();
        const networkState = networkStates.value[network.id]
        mapStore.getUserMapLayers().forEach((mapLayerId) => {
            if (mapLayerId.includes(".vector." + vectorId)) {
                const { layerId, layerCopyId } = mapStore.parseLayerString(mapLayerId);
                const currentStyle = styleStore.selectedLayerStyles[`${layerId}.${layerCopyId}`];
                // TODO: put this back when types are consistent
                // let defaultColor = currentStyle.color || 'black'
                let defaultColor = 'black'
                const colorStyle: NetworkStyle = {
                    deactivate: deactivateColor,
                    activate: activateColor,
                    gcc: GCCColor,
                    selected: selectedColor,
                    default: defaultColor,
                }
                const opacityStyle = {
                    inactive: 0.4,
                    default: 1,
                }
                const featureStyles: Record<string, NetworkStyle> = {
                    'circle-opacity': opacityStyle,
                    'circle-stroke-opacity': opacityStyle,
                    'line-opacity': opacityStyle,
                    'circle-color': colorStyle,
                    'circle-stroke-color': colorStyle,
                    'line-color': colorStyle,
                }
                Object.entries(featureStyles).forEach(([styleName, style]) => {
                    const featureType = styleName.split('-')[0]
                    if (mapLayerId.includes("." + featureType)) {
                        const defaultValue = style.default;
                        const selectedValue = style.selected || style.default;
                        const gccValue = style.gcc || style.default;
                        const inactiveValue = style.inactive || style.default;
                        const deactivateValue = style.deactivate || style.default;
                        const activateValue = style.activate || style.default;
                        const deactivate = networkState.changes?.deactivate_nodes || [];
                        const activate = networkState.changes?.activate_nodes || [];
                        const inactive = networkState.deactivated?.nodes.filter((n) => (
                            !deactivate?.includes(n) && !activate?.includes(n)
                        )) || [];
                        let gcc = networkState.gcc || []
                        if (
                            !inactive.length &&
                            !deactivate.length &&
                            !activate.length &&
                            gcc.length === network.nodes.length
                        ) {
                            // Network default state; don't show GCC
                            gcc = []
                        }
                        map.setPaintProperty(
                            mapLayerId,
                            styleName,
                            [
                                "case",
                                [
                                    "any",
                                    ["in", ["get", "node_id"], ["literal", networkState.selected?.nodes || []]],
                                    ["in", ["get", "edge_id"], ["literal", networkState.selected?.edges || []]],
                                ],
                                selectedValue,
                                [
                                    "any",
                                    ["in", ["get", "node_id"], ["literal", deactivate]],
                                    ["in", ["get", "from_node_id"], ["literal", deactivate]],
                                    ["in", ["get", "to_node_id"], ["literal", deactivate]],
                                ],
                                deactivateValue,
                                [
                                    "any",
                                    ["in", ["get", "node_id"], ["literal", activate]],
                                    ["in", ["get", "from_node_id"], ["literal", activate]],
                                    ["in", ["get", "to_node_id"], ["literal", activate]],
                                ],
                                activateValue,
                                [
                                    "any",
                                    ["in", ["get", "node_id"], ["literal", inactive]],
                                    ["in", ["get", "from_node_id"], ["literal", inactive]],
                                    ["in", ["get", "to_node_id"], ["literal", inactive]],
                                ],
                                inactiveValue,
                                [
                                    "any",
                                    ["in", ["get", "node_id"], ["literal", gcc]],
                                    ["in", ["get", "from_node_id"], ["literal", gcc]],
                                    ["in", ["get", "to_node_id"], ["literal", gcc]],
                                ],
                                gccValue,
                                defaultValue,
                            ],
                        )
                    }
                })
            }
        });
    }

    return {
        availableNetworks,
        currentNetwork,
        networkStates,
        loadingNetworks,
        currentNetworkNodes,
        currentNetworkEdges,
        initNetworks,
        getNetwork,
        toggleNodeActive,
        setNetworkDeactivatedNodes,
        styleVisibleNetworks,
        styleNetwork,
    };
});
