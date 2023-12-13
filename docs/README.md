# UVDAT: Urban Visualization and Data Analysis Toolkit
[![License][apache-license-image]][license-link]

<p float="left">
<img style="display: inline-block;" src="kitware.svg" alt="Kitware Logo" width="100">
<img style="display: inline-block;" src="sds_lab.png" alt="NEU SDS Lab Logo" width="100">
</p>

> Developed by [Kitware Inc.][kitware-link] in collaboration with the [Sustainability and Data Sciences Lab at Northeastern University][sds-lab-link]

Urban planners need better tools to access and analyze diverse data, including weather, climate, infrastructure networks, and in-situ sensors. The **Urban Visualization and Data Analytics Toolkit (UVDAT)** presents a novel software solution, offering analysis-ready data, resilience models, and neighborhood-scale visualizations, enabling robust and socially just solutions.

![](uvdat_screenshot.png)
![](uvdat_flow.jpg)

> Sample use case (shown above) examines the effect of coastal flooding on the availability of the Boston Transit system. Sample data obtained from [MassMapper][mass-mapper-link], a public tool for open infrastructure data hosted by the state of Massachusetts.

## Problem Statement
Urban areas, particularly those with underserved populations and critical assets in vulnerable zones, are at increased risks of cascading failures due to climate change, urbanization, and aging infrastructure. There is an urgent need for urban models that can effectively address and visualize these growing threats to avoid substantial loss of life and property.

## Solution
UVDAT bolsters data-driven research and aids the development and well-being of urban areas. The toolkit provides access to a comprehensive data library incorporating data science and AI methods for analysis of natural hazards on infrastructure. It also includes neighborhood-scale, high-resolution visualizations, for detailed data and uncertainty representations.

UVDAT is designed to assist urban planners, policymakers, and logistics engineers in managing increasingly large, complex, and diverse datasets. By integrating climate data with other critical data types such as infrastructure, sensor, and demographic information using our advanced analytic and visualization tools, planners will be empowered to make data-driven decisions.

## Architecture
UVDAT is built with Kitware's Girder 4 technology stack ([cookiecutter][girder-4-cookiecutter-link]). It consists of a series of container services, managed by `docker-compose`. These services include a Django Python server, a PostgreSQL/PostGIS database, a Vue web application, a Celery task service, and more.

## Getting Started
To run UVDAT locally with `docker-compose`, follow the instructions in the [Setup Guide](setup.md).


[apache-license-image]: https://img.shields.io/badge/license-Apache%202-blue.svg
[license-link]: https://raw.githubusercontent.com/OpenGeoscience/uvdat/master/LICENSE
[kitware-link]: https://kitware.com
[sds-lab-link]: https://sdslab.io
[mass-mapper-link]: https://maps.massgis.digital.mass.gov/MassMapper/MassMapper.html
[girder-4-cookiecutter-link]: https://github.com/girder/cookiecutter-girder-4
