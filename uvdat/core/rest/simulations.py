import inspect
import json
import re

from django.http import HttpResponse
from rest_framework.decorators import action
from rest_framework.serializers import ModelSerializer
from rest_framework.viewsets import GenericViewSet

from uvdat.core.models import Context
from uvdat.core.models.simulations import AVAILABLE_SIMULATIONS, SimulationResult
import uvdat.core.rest.serializers as uvdat_serializers


def get_available_simulations(context_id: int):
    sims = []
    for index, (name, details) in enumerate(AVAILABLE_SIMULATIONS.items()):
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
                    if issubclass(s, ModelSerializer)
                    and s.Meta.model == options_type
                    and 'Extended' not in s.__name__
                ]
                if not options_query or not options_type or len(option_serializer_matches) == 0:
                    options = []
                else:
                    option_serializer = option_serializer_matches[0]
                    option_objects = options_type.objects
                    if options_annotations:
                        option_objects = option_objects.annotate(**options_annotations)
                    options = list(
                        option_serializer(d).data
                        for d in option_objects.filter(
                            **options_query,
                        ).all()
                        if d.is_in_context(context_id)
                    )
            args.append(
                {
                    'name': a['name'],
                    'options': options,
                }
            )
        details['args'] = args
        del details['func']
        details['id'] = index
        details['name'] = SimulationResult.SimulationType[name].label
        sims.append(details)
    return sims


class SimulationViewSet(GenericViewSet):
    serializer_class = uvdat_serializers.SimulationResultSerializer

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
        url_path=r'(?P<simulation_index>[\d*]+)/context/(?P<context_id>[\d*]+)/results',
    )
    def list_results(self, request, simulation_index: int, context_id: int, **kwargs):
        simulation_type = list(AVAILABLE_SIMULATIONS.keys())[int(simulation_index)]
        return HttpResponse(
            json.dumps(
                list(
                    uvdat_serializers.SimulationResultSerializer(s).data
                    for s in SimulationResult.objects.filter(
                        simulation_type=simulation_type, context__id=context_id
                    ).all()
                )
            ),
            status=200,
        )

    @action(
        detail=False,
        methods=['post'],
        url_path=r'run/(?P<simulation_index>[\d*]+)/context/(?P<context_id>[\d*]+)',
    )
    def run(self, request, simulation_index: int, context_id: int, **kwargs):
        simulation_type = list(AVAILABLE_SIMULATIONS.keys())[int(simulation_index)]
        context = Context.objects.get(id=context_id)
        input_args = request.data
        sim_result = SimulationResult.objects.create(
            simulation_type=simulation_type,
            input_args=input_args,
            context=context,
        )
        sim_result.run(**input_args)
        return HttpResponse(
            json.dumps(uvdat_serializers.SimulationResultSerializer(sim_result).data),
            status=200,
        )
