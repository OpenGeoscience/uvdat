from rest_framework.filters import BaseFilterBackend


class AccessControl(BaseFilterBackend):
    def filter_queryset(self, request, queryset, view):
        project_id = request.query_params.get('project')
        user = request.user
        valid_ids = [o.id for o in queryset]
        if project_id:
            valid_ids = [o.id for o in queryset if o.is_in_project(project_id)]

        if request.method == 'GET':
            valid_ids = [o.id for o in queryset if o.readable_by(user) and o.id in valid_ids]
        elif request.method == 'PUT' or request.method == 'PATCH':
            valid_ids = [o.id for o in queryset if o.editable_by(user) and o.id in valid_ids]
        elif request.method == 'DELETE':
            valid_ids = [o.id for o in queryset if o.deletable_by(user) and o.id in valid_ids]
        elif request.method == 'POST':
            # no access control required for POST requests
            pass
        return queryset.filter(id__in=valid_ids)
