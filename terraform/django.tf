resource "aws_route53_zone" "this" {
  name = "geoinsight.kitware.com"
}

data "heroku_team" "this" {
  name = "kitware"
}

module "django" {
  source  = "kitware-resonant/resonant/heroku"
  version = "1.1.3"

  project_slug           = "geoinsight"
  route53_zone_id        = aws_route53_zone.this.zone_id
  heroku_team_name       = data.heroku_team.this.name
  subdomain_name         = "api"
  heroku_postgresql_plan = "essential-0"

  additional_django_vars = {
    DJANGO_HOMEPAGE_REDIRECT_URL = "https://www.geoinsight.kitware.com/"
    OGR_GEOJSON_MAX_OBJ_SIZE     = "500MB"
  }
  django_cors_origin_whitelist = [
    "https://www.geoinsight.kitware.com"
  ]
}

resource "heroku_addon" "redis" {
  app_id = module.django.heroku_app_id
  plan   = "heroku-redis:mini"
}

output "dns_nameservers" {
  value = aws_route53_zone.this.name_servers
}
