from django.http import HttpResponse
from rest_framework.decorators import action
from rest_framework.viewsets import GenericViewSet, mixins

from uvdat.core.models import Chart

from .serializers import ChartSerializer


class ChartViewSet(GenericViewSet, mixins.ListModelMixin):
    queryset = Chart.objects.all()
    serializer_class = ChartSerializer

    def get_queryset(self, **kwargs):
        request = self.request
        context_id = request.query_params.get('context')
        if context_id:
            return Chart.objects.filter(context__id=context_id)
        return Chart.objects.all()

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
