import random

from celery import shared_task
import networkx as nx
import numpy

from uvdat.core.models import AnalysisResult, Network

from .analysis_type import AnalysisType

RECOVERY_MODES = [
    'random',
    'betweenness',
    'degree',
    'information',
    'eigenvector',
    'load',
    'closeness',
    'second order',
]


class NetworkRecovery(AnalysisType):
    def __init__(self):
        super().__init__(self)
        self.name = 'Network Recovery'
        self.description = (
            'Provide a network failure state and select a '
            'recovery mode to view network recovery priority.'
        )
        self.db_value = 'network_recovery'
        self.output_types = {'recovery': 'network_animation'}
        self.attribution = 'Jack Watson, Northeastern University'

    def get_input_options(self):
        from .__init__ import __all__ as analysis_types

        node_failure_analysis_types = [
            at().db_value
            for at in analysis_types
            if at().output_types.get('failure') == 'network_animation'
        ]
        return {
            'network_failure': AnalysisResult.objects.filter(
                analysis_type__in=node_failure_analysis_types
            ),
            'recovery_mode': RECOVERY_MODES,
        }

    def run_task(self, project, **inputs):
        result = AnalysisResult.objects.create(
            analysis_type=self.db_value,
            inputs=inputs,
            project=project,
            status='Initializing task...',
        )
        network_recovery.delay(result.id)
        return result


def get_network_graph(network):
    from uvdat.core.models import NetworkEdge, NetworkNode

    network = {
        'nodes': NetworkNode.objects.filter(network=network),
        'edges': NetworkEdge.objects.filter(network=network),
    }
    if len(network.get('nodes')) == 0 and len(network.get('edges')) == 0:
        return None

    # Construct adj list
    edge_list: dict[int, list[int]] = {}
    for e in network.get('edges'):
        if e.from_node.id not in edge_list:
            edge_list[e.from_node.id] = []
        edge_list[e.from_node.id].append(e.to_node.id)
    for edge_id in edge_list.keys():
        edge_list[edge_id].sort()
    graph_representation = nx.from_dict_of_lists(edge_list)
    return graph_representation


# Authored by Jack Watson
# Takes in a second argument, measure, which is a string specifying the centrality
# measure to calculate.
def sort_graph_centrality(g, measure):
    if measure == 'betweenness':
        cent = nx.betweenness_centrality(g)  # get betweenness centrality
    elif measure == 'degree':
        cent = nx.degree_centrality(g)
    elif measure == 'information':
        cent = nx.current_flow_closeness_centrality(g)
    elif measure == 'eigenvector':
        cent = nx.eigenvector_centrality(g, 10000)
    elif measure == 'load':
        cent = nx.load_centrality(g)
    elif measure == 'closeness':
        cent = nx.closeness_centrality(g)
    elif measure == 'second order':
        cent = nx.second_order_centrality(g)
    cent_list = list(cent.items())  # convert to np array
    cent_arr = numpy.array(cent_list)
    cent_idx = numpy.argsort(cent_arr, 0)  # sort array of tuples by betweenness

    node_list = list(g.nodes())
    nodes_sorted = [node_list[i] for i in cent_idx[:, 1]]
    edge_list = list(g.edges())

    # Currently sorted from lowest to highest betweenness; let's reverse that
    nodes_sorted.reverse()

    return nodes_sorted, edge_list


@shared_task
def network_recovery(result_id):
    result = AnalysisResult.objects.get(id=result_id)

    # Verify inputs
    failure = None
    failure_id = result.inputs.get('network_failure')
    if failure_id is None:
        result.write_error('Network failure result not provided')
    else:
        try:
            failure = AnalysisResult.objects.get(id=failure_id)
        except AnalysisResult.DoesNotExist:
            result.write_error('Network failure result not found')

    mode = result.inputs.get('recovery_mode')
    if mode is None:
        result.write_error('Recovery mode not provided')
    elif mode not in RECOVERY_MODES:
        result.write_error('Recovery mode not a valid option')

    if failure is not None:
        network_id = failure.inputs.get('network')
        if network_id is None:
            result.write_error('Network not provided')
        else:
            try:
                network = Network.objects.get(id=network_id)
            except Network.DoesNotExist:
                result.write_error('Network not found')

    # Run task
    if result.error is None:
        result.write_status('Reading network failure state...')
        node_failures = failure.outputs.get('failures')
        frames = sorted(int(key) for key in node_failures.keys())
        last_frame_failures = node_failures[str(frames[-1])]
        node_recoveries = last_frame_failures.copy()

        result.write_status('Sorting failed nodes according to recovery mode...')
        if mode == 'random':
            random.shuffle(node_recoveries)
        else:
            graph = get_network_graph(network)
            nodes_sorted, edge_list = sort_graph_centrality(graph, mode)
            node_recoveries.sort(key=lambda n: nodes_sorted.index(n))

        result.outputs = dict(recoveries=node_recoveries)

    result.complete()
