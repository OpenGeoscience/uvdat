from django.http import HttpResponse
from rest_framework.decorators import action
from rest_framework.viewsets import ModelViewSet

from uvdat.core.models import Chart
from uvdat.core.rest.filter import AccessControl
from uvdat.core.rest.serializers import ChartSerializer


class ChartViewSet(ModelViewSet):
    queryset = Chart.objects.all()
    serializer_class = ChartSerializer
    filter_backends = [AccessControl]
    lookup_field = 'id'

    def validate_editable(self, chart, func, *args, **kwargs):
        if chart.editable:
            return func(*args, **kwargs)
        else:
            return HttpResponse('Not an editable chart.', status=400)

    @action(detail=True, methods=['post'])
    def new_line(self, request, **kwargs):
        chart = self.get_object()
        self.validate_editable(chart, chart.new_line)
        return HttpResponse(status=200)

    @action(detail=True, methods=['post'])
    def rename_lines(self, request, **kwargs):
        chart = self.get_object()
        self.validate_editable(chart, chart.rename_lines, new_names=request.data)
        return HttpResponse(status=200)

    @action(detail=True, methods=['post'])
    def clear(self, request, **kwargs):
        chart = self.get_object()
        self.validate_editable(chart, chart.clear)
        return HttpResponse(status=200)
