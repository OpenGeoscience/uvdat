from core.models.dataset import Dataset
from django.core.management.base import BaseCommand
from django.db import connection
from neo4j import GraphDatabase


class Command(BaseCommand):
    requires_migrations_checks = True

    def handle(self, *args, **kwargs):
        with GraphDatabase.driver(
            'neo4j://localhost:7687', auth=('neo4j', 'password')
        ) as driver:
            driver.verify_connectivity()

            datasets = Dataset.objects.filter(
                classification=Dataset.Classification.NETWORK
            )
