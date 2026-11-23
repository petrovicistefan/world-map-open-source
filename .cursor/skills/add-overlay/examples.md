# Overlay examples

## Single drinking water point (Berlin)

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [13.3777, 52.5163]
      },
      "properties": {
        "id": "places/berlin-brandenburg-gate-drinking-water",
        "name": "Drinking fountain — Brandenburg Gate",
        "category": "places",
        "kind": "drinking_water",
        "source": "survey",
        "verified_at": "2026-03-20",
        "license": "ODbL-1.0",
        "extra": { "city": "Berlin" }
      }
    }
  ]
}
```

## Agent draft (community — needs human review)

```json
{
  "type": "Feature",
  "geometry": { "type": "Point", "coordinates": [13.4058, 52.4989] },
  "properties": {
    "id": "community/berlin-kreuzberg-repair-cafe",
    "name": "Repair Café Kreuzberg (draft)",
    "category": "community",
    "kind": "repair_cafe",
    "source": "agent",
    "license": "ODbL-1.0",
    "extra": { "needs_review": true, "city": "Berlin" }
  }
}
```
