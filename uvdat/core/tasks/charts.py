from datetime import datetime
import pandas
from webcolors import name_to_hex

from uvdat.core.models import Chart


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
        chart = Chart(
            name=chart_name,
            description="""
                A set of previously-run calculations
                for the network's greatest connected component (GCC),
                showing GCC size by number of excluded nodes
            """,
            city=dataset.city,
            category="gcc",
            chart_data={},
            metadata=[],
            chart_options={
                'chart_title': 'Size of Greatest Connected Component over Period',
                'x_title': 'Step when Excluded Nodes Changed',
                'y_title': 'Number of Nodes in GCC',
            },
        )
        chart.save()
        return chart


def add_gcc_chart_datum(dataset, excluded_node_names, gcc_size):
    chart = get_gcc_chart(dataset)

    now = datetime.now()
    delta_seconds = -1
    if len(chart.metadata) > 0:
        # Compare time of previous run
        previous_entry = chart.metadata[-1]
        previous_time = datetime.strptime(previous_entry['run_time'], "%d/%m/%Y %H:%M")
        delta_seconds = (now - previous_time).total_seconds()

    # Five minutes from last entry will start a new chart, clear all chart data
    # Or a negative time means the data structures need to be initialized
    if delta_seconds > 300 or delta_seconds < 0:
        chart.metadata = []
        chart.chart_data['labels'] = []
        chart.chart_data['datasets'] = [
            {
                'label': 'GCC Size',
                'backgroundColor': name_to_hex('blue'),
                'borderColor': name_to_hex('blue'),
                'data': [],
            },
            {
                'label': 'N Nodes Excluded',
                'backgroundColor': name_to_hex('red'),
                'borderColor': name_to_hex('red'),
                'data': [],
            },
        ]

    # Append to chart_data
    labels = chart.chart_data['labels']
    datasets = chart.chart_data['datasets']

    labels.append(len(labels) + 1)  # Add x-axis entry
    datasets[0]['data'].append(gcc_size)  # Add gcc size point
    datasets[1]['data'].append(len(excluded_node_names))  # Add n excluded point

    chart.chart_data['labels'] = labels
    chart.chart_data['datasets'] = datasets

    new_entry = {
        'run_time': now.strftime("%d/%m/%Y %H:%M"),
        'n_excluded_nodes': len(excluded_node_names),
        'excluded_node_names': excluded_node_names,
        'gcc_size': gcc_size,
    }

    # Append to metadata
    chart.metadata.append(new_entry)
    chart.save()
