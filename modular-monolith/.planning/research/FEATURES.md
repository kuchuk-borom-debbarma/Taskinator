# Feature Landscape: Project Throttling

**Domain:** SaaS Resource Management
**Researched:** 2025-05-22

## Table Stakes

Features users expect in a multi-tenant SaaS.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Per-Project Request Limits** | Prevent API abuse. | Low | Fixed window or sliding window. |
| **Outbox Fair-Share** | Ensure background jobs (emails, syncs) aren't blocked by one project. | Medium | Requires SQL partitioning. |
| **Usage Metering** | Visibility into which project is consuming resources. | Low | Essential for debugging/billing. |

## Differentiators

Features that provide superior UX or isolation.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Cost-Based Quotas** | Fairer than request counts; heavy graph updates cost more than simple reads. | High | Requires weighting operations. |
| **Soft Limit Warnings** | Notify users before they hit a hard wall. | Medium | Needs integration with Notification system. |
| **Burst Capacity** | Allow temporary spikes if system load is low. | High | Token bucket with "overflow". |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Per-User Throttling (Global)** | In a project management app, a user might belong to many projects. Throttling the user globally might break their work in a "good" project because of a "bad" one. | Throttled at the **Project** or **Project-Member** level. |
| **Real-time UI Updates on Throttling** | Sending a websocket event for every "point" consumed. | Buffer usage stats and send every 30s or on limit breach. |

## Feature Dependencies

```
Metering → Soft Limits → Hard Limits
fk_project_id in Outbox → Fair-Share Relay
```

## MVP Recommendation

Prioritize:
1. **Database Evolution:** Add `fk_project_id` to outbox and implement the fair-share fetch. This solves the "blocking" issue immediately.
2. **Cost-Based Metering:** Implement in the service layer to start gathering data.
3. **Hard Limits:** Simple per-project API limits.

Defer: **Burst Capacity** and **Real-time Usage Dashboards**.

## Sources
- [Stripe's Guide to Rate Limiting](https://stripe.com/blog/rate-limiters)
- [AWS Throttling Patterns](https://docs.aws.amazon.com/whitepapers/latest/architecting-hipaa-aligned-workloads-on-aws/throttling.html)
