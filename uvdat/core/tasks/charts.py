from datetime import datetime

import pandas
from webcolors import name_to_hex

from uvdat.core.models import Chart


CHART_COLORS = [
    'blue',
    'red',
    'green',
    'purple',
    'orange',
    'black',
    'lightblue',
    'pink',
    'lightgreen',
    'mediumpurple',
    'gray',
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


def add_chart_line(chart, line_name=None):
    line_index = len(chart.chart_data['datasets'])
    if line_name is None:
        line_name = f'Run {line_index + 1}'
    line_color = CHART_COLORS[line_index % len(CHART_COLORS)]
    chart.chart_data['datasets'].append(
        {
            'label': line_name,
            'backgroundColor': name_to_hex(line_color),
            'borderColor': name_to_hex(line_color),
            'data': [],
        },
    )
    chart.metadata[line_name] = []
    return line_index


def rename_chart_lines(chart, names):
    for old_name, new_name in names.items():
        chart.metadata[new_name] = chart.metadata[old_name]
        del chart.metadata[old_name]

        dataset_matches = [
            i for i, d in enumerate(chart.chart_data['datasets']) if d['label'] == old_name
        ]
        if len(dataset_matches) > 0:
            dataset_index = dataset_matches[0]
            chart.chart_data['datasets'][dataset_index]['label'] = new_name


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
            clearable=True,
            chart_data={},
            metadata=[],
            chart_options={
                'chart_title': 'Size of Greatest Connected Component over Period',
                'x_title': 'Step when Excluded Nodes Changed',
                'y_title': 'Number of Nodes',
                'y_range': [0, dataset.network_nodes.count()],
                "tooltip": {
                    "title": "(ctx) => `${ctx[0].raw.n} Nodes Excluded`",
                    "label": "(ctx) => `GCC = ${ctx.raw.y}`",
                },
            },
        )
        chart.save()
        return chart


def add_gcc_chart_datum(dataset, excluded_node_names, gcc_size, line_name=None):
    if line_name is None:
        line_name = 'Run 1'

    chart = get_gcc_chart(dataset)
    if len(chart.metadata) == 0:
        # no data exists, need to initialize data structures
        chart.metadata = {}
        chart.chart_data['labels'] = []
        chart.chart_data['datasets'] = []

    line_index_matches = [
        i for i, d in enumerate(chart.chart_data['datasets']) if d['label'] == line_name
    ]
    if len(line_index_matches) == 0:
        line_index = add_chart_line(chart, line_name=line_name)
    else:
        line_index = line_index_matches[0]

    labels = chart.chart_data['labels']
    dataset = chart.chart_data['datasets'][line_index]

    # Append to chart_data
    x = len(dataset['data']) + 1
    y = gcc_size
    n = len(excluded_node_names)

    if x not in labels:
        labels.append(x)
    dataset['data'].append({'x': x, 'y': y, 'n': n})

    chart.chart_data['labels'] = labels
    chart.chart_data['datasets'][line_index] = dataset

    new_entry = {
        'run_time': datetime.now().strftime("%d/%m/%Y %H:%M"),
        'n_excluded_nodes': len(excluded_node_names),
        'excluded_node_names': excluded_node_names,
        'gcc_size': gcc_size,
    }

    # Append to metadata
    chart.metadata[line_name].append(new_entry)
    chart.save()
