import inspect
import json
import re

from django.http import HttpResponse
from rest_framework.decorators import action
from rest_framework.serializers import ModelSerializer
from rest_framework.viewsets import GenericViewSet

from uvdat.core.models.simulations import AVAILABLE_SIMULATIONS, SimulationResult
import uvdat.core.rest.serializers as uvdat_serializers


def get_available_simulations(context_id: int):
    sims = []
    for name, details in AVAILABLE_SIMULATIONS.items():
        details = details.copy()
        details['description'] = re.sub(r'\n\s+', ' ', details['description'])
        args = []
        for a in details['args']:
            options = a.get('options')
            if not options:
                options_annotations = a.get('options_annotations')
                options_query = a.get('options_query')
                options_type = a.get('type')
                option_serializer_matches = [
                    s
                    for name, s in inspect.getmembers(uvdat_serializers, inspect.isclass)
                    if issubclass(s, ModelSerializer) and s.Meta.model == options_type
                ]
                if not options_query or not options_type or len(option_serializer_matches) == 0:
                    options = []
                else:
                    option_serializer = option_serializer_matches[0]
                    if hasattr(options_type, 'context'):
                        options_query['context__id'] = context_id
                    option_objects = options_type.objects
                    if options_annotations:
                        option_objects = option_objects.annotate(**options_annotations)
                    options = list(
                        option_serializer(d).data
                        for d in option_objects.filter(
                            **options_query,
                        ).all()
                    )
            args.append(
                {
                    'name': a['name'],
                    'options': options,
                }
            )
        details['args'] = args
        del details['func']
        details['name'] = SimulationResult.SimulationType[name].label
        sims.append(details)
    return sims


class SimulationViewSet(GenericViewSet):
    @action(
        detail=False,
        methods=['get'],
        url_path=r'available/context/(?P<context_id>[\d*]+)',
    )
    def list_available(self, request, context_id: int, **kwargs):
        sims = get_available_simulations(context_id)
        return HttpResponse(
            json.dumps(sims),
            status=200,
        )

    @action(
        detail=False,
        methods=['get'],
        url_path=r'(?P<simulation_id>[\d*]+)/context/(?P<context_id>[\d*]+)/results',
    )
    def list_results(self, request, simulation_id: int, context_id: int, **kwargs):
        return HttpResponse(
            json.dumps(
                list(
                    uvdat_serializers.SimulationResultSerializer(s).data
                    for s in SimulationResult.objects.filter(
                        simulation_id=int(simulation_id), context__id=context_id
                    ).all()
                )
            ),
            status=200,
        )

    @action(
        detail=False,
        methods=['post'],
        url_path=r'run/(?P<simulation_id>[\d*]+)/context/(?P<context_id>[\d*]+)',
    )
    def run(self, request, simulation_id: int, context_id: int, **kwargs):
        sim_result = SimulationResult.objects.create(
            simulation_id=simulation_id,
            input_args=kwargs,
            context__id=context_id,
        )
        sim_result.run(**request.data)
        return HttpResponse(
            uvdat_serializers.SimulationResultSerializer(sim_result).data,
            status=200,
        )
