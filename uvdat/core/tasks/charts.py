import pandas
import json
import tempfile
from pathlib import Path
from datetime import datetime
from webcolors import name_to_hex
from uvdat.core.models import Chart
from django.core.files.base import ContentFile


CHART_COLORS = [
    'blue',
    'red',
    'green',
    'orange',
    'purple',
    'lightblue',
    'pink',
    'lightgreen',
    'lightorange',
    'lightpurple',
]


def convert_chart_data(chart):
    options = chart.style.get('options')
    chart_options = options.get('chart')
    label_column = chart_options.get('labels')
    dataset_columns = chart_options.get('datasets')
    palette_options = options.get('palette')

    chart_data = {
        'labels': [],
        'datasets': [],
    }

    if chart.raw_data_type == 'csv':
        raw_data = pandas.read_csv(chart.raw_data_file.open())
    else:
        raise NotImplementedError(f'Convert chart data for raw data type {chart.raw_data_type}')
    chart_data['labels'] = raw_data[label_column].fillna(-1).tolist()
    chart_data['datasets'] = [
        {
            'label': dataset_column,
            'backgroundColor': name_to_hex(palette_options.get(dataset_column, 'black')),
            'borderColor': name_to_hex(palette_options.get(dataset_column, 'black')),
            'data': raw_data[dataset_column].fillna(-1).tolist(),
        }
        for dataset_column in dataset_columns
    ]

    chart.chart_data = chart_data
    chart.save()
    print(f"Saved data for chart {chart.name}")


def get_gcc_chart(dataset):
    chart_name = f'{dataset.name} Greatest Connected Component Sizes'
    try:
        return Chart.objects.get(name=chart_name)
    except Chart.DoesNotExist:
        with tempfile.TemporaryDirectory() as temp_dir:
            raw_data = {"compute_gcc_runs": []}
            chart_data = {
                "labels": [],
                "datasets": [],
            }
            chart = Chart(
                name=chart_name,
                description="""
                    A set of previously-run calculations
                    for the network's greatest connected component (GCC),
                    showing GCC size by number of excluded nodes
                """,
                city=dataset.city,
                category="gcc",
                raw_data_type="json",
                metadata=raw_data,
                chart_data=chart_data,
                chart_options={
                    'chart_title': 'Size of Greatest Connected Component over Period',
                    'x_title': 'Step when Excluded Nodes Changed',
                    'y_title': 'Number of Nodes in GCC',
                },
            )
            raw_data_file_path = Path(temp_dir, 'gcc_chart.json')
            with open(raw_data_file_path, 'w') as raw_data_file:
                json.dump(raw_data, raw_data_file)
            with open(raw_data_file_path, 'rb') as raw_data_file:
                chart.raw_data_file.save(
                    raw_data_file_path,
                    ContentFile(raw_data_file.read()),
                )
            chart.save()
            return chart


def add_gcc_chart_datum(dataset, excluded_node_names, gcc_size):
    new_entry = {
        'run_time': datetime.now().strftime("%d/%m/%Y %H:%M"),
        'n_excluded_nodes': len(excluded_node_names),
        'excluded_node_names': excluded_node_names,
        'gcc_size': gcc_size,
    }

    chart = get_gcc_chart(dataset)
    with tempfile.TemporaryDirectory() as temp_dir:
        raw_data = json.load(chart.raw_data_file.open())

        # Append to raw_data and metadata
        raw_data["compute_gcc_runs"].append(new_entry)
        chart.metadata = raw_data

        raw_data_file_path = Path(temp_dir, 'gcc_chart.json')
        with open(raw_data_file_path, 'w') as raw_data_file:
            json.dump(raw_data, raw_data_file)
        with open(raw_data_file_path, 'rb') as raw_data_file:
            chart.raw_data_file.save(
                raw_data_file_path,
                ContentFile(raw_data_file.read()),
            )

    # Append to chart_data
    x = len(excluded_node_names)
    y = gcc_size
    labels = list(range(dataset.network_nodes.all().count()))
    runs = chart.chart_data['datasets']
    target_run = 1
    for run in runs:
        if run['data'][x]:
            # Datum already exists in this run, skip to next
            target_run += 1
    if len(runs) < target_run:
        run_color = name_to_hex(CHART_COLORS[(target_run - 1) % len(CHART_COLORS)])
        runs.append(
            {
                'label': f'Run {target_run}',
                'backgroundColor': run_color,
                'borderColor': run_color,
                'data': [None for label in labels],
            }
        )
    runs[target_run - 1]['data'][x] = y

    chart.chart_data['datasets'] = runs
    chart.chart_data['labels'] = labels
    chart.save()
