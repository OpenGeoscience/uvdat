from .analysis_type import AnalysisType
from .create_road_network import CreateRoadNetwork
from .flood_network_failure import FloodNetworkFailure
from .flood_simulation import FloodSimulation
from .geoai_segmentation import GeoAISegmentation
from .network_recovery import NetworkRecovery
from .tile2net_segmentation import Tile2NetSegmentation

analysis_types: list[AnalysisType] = [
    FloodSimulation,
    FloodNetworkFailure,
    NetworkRecovery,
    Tile2NetSegmentation,
    GeoAISegmentation,
    CreateRoadNetwork,
]

__all__ = list(analysis_types)
