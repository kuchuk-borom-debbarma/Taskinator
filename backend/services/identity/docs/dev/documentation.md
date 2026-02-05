# API Documentation System

The Identity service uses an automated documentation system that keeps the API reference in sync with the source code using OpenAPI 3.0.

## Technologies Used

- **[@hono/zod-openapi](https://github.com/honojs/middleware/tree/main/packages/zod-openapi)**: Extends Hono to generate OpenAPI specifications from Zod schemas.
- **[@scalar/hono-api-reference](https://github.com/scalar/scalar)**: Provides a beautiful, interactive UI to browse and test the API.

## Accessing Documentation

When the service is running (locally via `bun run dev` or in production), you can access the following endpoints:

- **Interactive Reference**: `/reference` - A Scalar-powered UI for exploring and testing endpoints.
- **OpenAPI Specification**: `/doc` - The raw JSON specification following the OpenAPI 3.0.0 standard.

## How to Document New Routes

To ensure a route appears in the documentation, it must be defined using `createRoute` from `@hono/zod-openapi` instead of standard Hono methods.

### 1. Define the Route
Define the request (body, query, params) and response schemas in `src/routes/user-facing.ts`:

```typescript
const myRoute = createRoute({
  method: 'post',
  path: '/my-endpoint',
  summary: 'Short description',
  request: {
    body: {
      content: {
        'application/json': { schema: MyRequestSchema }
      }
    }
  },
  responses: {
    200: {
      content: { 'application/json': { schema: MyResponseSchema } },
      description: 'Success response'
    }
  }
});
```

### 2. Implement the Route
Use `app.openapi()` to link the definition to its implementation:

```typescript
publicRoute.openapi(myRoute, async (c) => {
  const data = c.req.valid('json'); // Fully typed
  return c.json({ success: true, message: 'Done' }, 200);
});
```

## Security & Authentication

The documentation is configured to support **Bearer Authentication**. 
- In the `/reference` UI, use the **Authorize** button to paste a JWT token.
- This will automatically add the `Authorization: Bearer <token>` header to requests made via the UI.
- Routes requiring authentication should include `security: [{ bearerAuth: [] }]` in their `createRoute` definition.

## Maintenance

The `SuccessResponseSchema` and `ErrorResponseSchema` in `src/routes/user-facing.ts` should be reused to maintain a consistent API shape. If you change a Zod schema, the documentation will update automatically on the next reload.
