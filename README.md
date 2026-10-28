# WorkPulse Payment Service Orchestrator

Enterprise hybrid payment processing microservice (Stripe & Adyen) for the Global FinTech Platform.

## Linked WorkPulse Task
- **Task Code**: `[FIN-PAY-003]`
- **Title**: Core Payment Gateway API Orchestrator (Stripe & Adyen Hybrid)
- **Project**: Global Payment Gateway & Cross-Border Billing Engine (`PROJECT #7`)
- **Author**: Marcus Chen (`EMP-ENG-002`)
- **Lead**: Elena Vance (`EMP-ENG-001`)

## Features
- **HMAC-SHA256 Webhook Verification**: Constant-time signature comparison for Stripe and Adyen webhook notifications.
- **FX Slippage Guard**: Enforces CFO-mandated 0.45% maximum foreign exchange rate deviation.
- **Exponential Retry Backoff**: Prevents payment loss during upstream banking gateway dropouts.
