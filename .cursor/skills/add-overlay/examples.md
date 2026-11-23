# Overlay examples

## Single drinking water point

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [26.0910, 44.4368]
      },
      "properties": {
        "id": "places/bucharest-cismigiu-drinking-water",
        "name": "Drinking fountain — Cișmigiu",
        "category": "places",
        "kind": "drinking_water",
        "source": "survey",
        "verified_at": "2026-03-20",
        "license": "ODbL-1.0",
        "extra": { "city": "Bucharest" }
      }
    }
  ]
}
```

## Agent draft (community — needs human review)

```json
{
  "type": "Feature",
  "geometry": { "type": "Point", "coordinates": [26.1025, 44.4268] },
  "properties": {
    "id": "community/bucharest-repair-cafe-draft",
    "name": "Repair Café (draft)",
    "category": "community",
    "kind": "repair_cafe",
    "source": "agent",
    "license": "ODbL-1.0",
    "extra": { "needs_review": true }
  }
}
```
