# Guardian License API

API HTTP minimale pour gérer les licences Guardian Premium.

## Lancement

```bash
cd services/license-api
npm install  # ou npm ci si package-lock présent
node server.js
```

Avec PM2 :

```bash
pm2 start ecosystem.config.js
```

## Configuration

Ajoute dans `guardian/.env` :

```env
LICENSE_API_PORT=7799
LICENSE_API_TOKEN=un-token-tres-secret
```

## Endpoints

### Health

```bash
curl http://localhost:7799/health
```

### Créer une licence

```bash
curl -X POST http://localhost:7799/licenses \
  -H "Authorization: Bearer $LICENSE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"days": 365}'
```

Réponse :

```json
{
  "license_key": "XXXXXX-XXXXXX-XXXXXX-XXXXXX",
  "guild_id": null,
  "expires_at": 1760419200000
}
```

### Lier une licence à une guilde

```bash
curl -X POST http://localhost:7799/licenses/activate \
  -H "Authorization: Bearer $LICENSE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"license_key": "XXXXXX-XXXXXX-XXXXXX-XXXXXX", "guild_id": "123456789"}'
```

### Vérifier une guilde

```bash
curl http://localhost:7799/licenses/123456789 \
  -H "Authorization: Bearer $LICENSE_API_TOKEN"
```

### Webhook de paiement

```bash
curl -X POST http://localhost:7799/webhooks/payment \
  -H "Content-Type: application/json" \
  -d '{"secret": "un-token-tres-secret", "guild_id": "123456789", "days": 365}'
```

## Intégration futur site web

Après un paiement Stripe/PayPal réussi, ton backend appelle :

```bash
POST /webhooks/payment
{ "secret": "...", "guild_id": "...", "days": 365 }
```

Puis affiche la clé à l'utilisateur ou l'envoie par DM Discord.
