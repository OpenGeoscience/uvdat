from rest_framework.filters import BaseFilterBackend

from uvdat.core.models import Project

class AccessControl(BaseFilterBackend):
    def filter_queryset(self, request, queryset, view):
        project_id = request.query_params.get('project')
        user = request.user
        if project_id:
            project = Project.objects.get(id=project_id)
            queryset = [o for o in queryset if o.is_in_project(project)]

        if request.method == 'GET':
            queryset = [o for o in queryset if o.readable_by(user)]
        elif request.method == 'PUT' or request.method == 'PATCH':
            queryset = [o for o in queryset if o.editable_by(user)]
        elif request.method == 'DELETE':
            queryset = [o for o in queryset if o.deletable_by(user)]
        elif request.method == 'POST':
            # no access control required for POST requests
            pass

        return queryset
