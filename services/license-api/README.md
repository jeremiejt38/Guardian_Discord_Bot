# Guardian License API

API HTTP minimale pour gérer les licences Guardian Premium, avec intégration Stripe.

## Lancement

```bash
cd services/license-api
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
STRIPE_SECRET_KEY=sk_live_...          # Clé secrète Stripe
STRIPE_WEBHOOK_SECRET=whsec_...       # Secret du webhook endpoint Stripe
```

## Endpoints

### Health

```bash
curl https://guardian.drac-lab.fr/health
```

### Créer une licence

```bash
curl -X POST https://guardian.drac-lab.fr/licenses \
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
curl -X POST https://guardian.drac-lab.fr/licenses/activate \
  -H "Authorization: Bearer $LICENSE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"license_key": "XXXXXX-XXXXXX-XXXXXX-XXXXXX", "guild_id": "123456789"}'
```

### Vérifier une guilde

```bash
curl https://guardian.drac-lab.fr/licenses/123456789 \
  -H "Authorization: Bearer $LICENSE_API_TOKEN"
```

### Webhook générique de paiement

```bash
curl -X POST https://guardian.drac-lab.fr/webhooks/payment \
  -H "Content-Type: application/json" \
  -d '{"secret": "un-token-tres-secret", "guild_id": "123456789", "days": 365}'
```

## Intégration Stripe

### 1. Créer un Checkout Session

Ton site web appelle ton backend, qui appelle :

```bash
curl -X POST https://guardian.drac-lab.fr/stripe/checkout \
  -H "Authorization: Bearer $LICENSE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "guild_id": "123456789",
    "price_id": "price_xxx",
    "days": 365,
    "success_url": "https://ton-site.fr/success?guild_id=123456789",
    "cancel_url": "https://ton-site.fr/cancel"
  }'
```

Réponse :

```json
{
  "session_id": "cs_xxx",
  "url": "https://checkout.stripe.com/...",
  "guild_id": "123456789"
}
```

Redirige l'utilisateur vers `url`.

### 2. Configurer le webhook Stripe

Dans Stripe Dashboard → Developers → Webhooks, ajoute un endpoint :

- **Endpoint URL** : `https://guardian.drac-lab.fr/webhooks/stripe`
- **Events** : `checkout.session.completed`
- Récupère le **Signing secret** (`whsec_...`) et mets-le dans `.env` (`STRIPE_WEBHOOK_SECRET`).

Quand le paiement est validé, l'API crée automatiquement la licence et la lie à `guild_id`.
