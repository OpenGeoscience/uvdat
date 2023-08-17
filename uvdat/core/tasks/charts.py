import pandas
from webcolors import name_to_hex


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
    csv_data = pandas.read_csv(chart.raw_data_file.open())
    chart_data['labels'] = csv_data[label_column].fillna(-1).tolist()
    chart_data['datasets'] = [
        {
            'label': dataset_column,
            'backgroundColor': name_to_hex(palette_options.get(dataset_column, 'black')),
            'borderColor': name_to_hex(palette_options.get(dataset_column, 'black')),
            'data': csv_data[dataset_column].fillna(-1).tolist(),
        }
        for dataset_column in dataset_columns
    ]

    chart.chart_data = chart_data
    chart.save()
    print(f"Saved data for chart {chart.name}")
