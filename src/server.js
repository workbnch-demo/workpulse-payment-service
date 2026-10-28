const express = require('express');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

// Configuration
const CONFIG = {
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_demo_stripe_secret_key_9918',
  ADYEN_HMAC_KEY: process.env.ADYEN_HMAC_KEY || '4A3B2C1D0E9F8A7B6C5D4E3F2A1B0C9D',
  MAX_FX_SLIPPAGE_RATE: 0.0045, // 0.45% CFO slippage cap guard
};

// Healthcheck
app.get('/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'workpulse-payment-service',
    task_code: 'FIN-PAY-003',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

/**
 * Verify Stripe webhook signature (HMAC-SHA256)
 */
function verifyStripeSignature(payload, sigHeader, secret) {
  if (!sigHeader) return false;
  const parts = sigHeader.split(',');
  const tPart = parts.find((p) => p.startsWith('t='));
  const v1Part = parts.find((p) => p.startsWith('v1='));
  if (!tPart || !v1Part) return false;

  const timestamp = tPart.split('=')[1];
  const signature = v1Part.split('=')[1];
  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex');

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

// Stripe Webhook Endpoint
app.post('/webhooks/stripe', (req, res) => {
  const sigHeader = req.headers['stripe-signature'];
  const rawBody = JSON.stringify(req.body);

  if (sigHeader && !verifyStripeSignature(rawBody, sigHeader, CONFIG.STRIPE_WEBHOOK_SECRET)) {
    return res.status(400).json({ error: 'INVALID_WEBHOOK_SIGNATURE' });
  }

  const event = req.body;
  console.log(`[Stripe Webhook] Received event: ${event.type || 'payment_intent.succeeded'}`);
  res.status(200).json({ received: true, task_code: 'FIN-PAY-003' });
});

// Adyen Webhook Endpoint
app.post('/webhooks/adyen', (req, res) => {
  const notification = req.body;
  console.log('[Adyen Webhook] Notification processed successfully');
  res.status(200).json({ notificationResponse: '[accepted]' });
});

/**
 * Multi-Currency Conversion with 0.45% FX Slippage Cap
 * Enforces CFO Policy approved under [FIN-PAY-003]
 */
app.post('/payments/convert', (req, res) => {
  const { amount, from_currency, to_currency, market_rate, quoted_rate } = req.body;

  if (!amount || !market_rate || !quoted_rate) {
    return res.status(400).json({ error: 'MISSING_PARAMETERS' });
  }

  const slippage = Math.abs(quoted_rate - market_rate) / market_rate;
  if (slippage > CONFIG.MAX_FX_SLIPPAGE_RATE) {
    return res.status(422).json({
      error: 'FX_SLIPPAGE_CAP_EXCEEDED',
      allowed_max: CONFIG.MAX_FX_SLIPPAGE_RATE,
      actual_slippage: slippage,
      task_code: 'FIN-PAY-003',
      requires_override: 'CFO_AUTHORIZATION',
    });
  }

  const convertedAmount = amount * quoted_rate;
  res.json({
    status: 'SUCCESS',
    from_currency,
    to_currency,
    original_amount: amount,
    converted_amount: convertedAmount,
    applied_rate: quoted_rate,
    slippage,
    task_code: 'FIN-PAY-003',
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Payment Orchestrator microservice running on port ${PORT}`);
  });
}

module.exports = app;
