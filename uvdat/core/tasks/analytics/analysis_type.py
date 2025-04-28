from abc import ABC, abstractmethod


class AnalysisType(ABC):
    def __init__(self, *args):
        self.name = None
        self.description = None
        self.db_value = None  # cannot be longer than 25 characters
        self.input_types = {}
        self.output_types = {}
        self.attribution = 'Kitware, Inc.'

    @abstractmethod
    def get_input_options(self):
        raise NotImplementedError

    @abstractmethod
    def run_task(self, **inputs):
        raise NotImplementedError
