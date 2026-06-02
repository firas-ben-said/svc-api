# tp-microservices-nest — NestJS Micro-services Lab

A mini distributed **order platform** built with NestJS that demonstrates four
inter-service communication styles side by side: **REST**, **gRPC**, **Kafka**
events, and **GraphQL**. Each protocol is used where it genuinely fits — not
sprinkled in for show.

```
         ┌──────────────────────────────────────────────────────────────┐
         │                       HTTP Client                            │
         │      (all traffic via nginx gateway on :8080)                │
         └─────────────────────────────┬────────────────────────────────┘
                                       │
                          ┌────────────▼────────────┐
                          │   nginx (API gateway)   │
                          │   :8080 (host)          │
                          │   /products  /orders    │
                          │   /graphql              │
                          └─┬───────────┬──────────┬┘
              REST          │   REST    │  GraphQL │
                            ▼           ▼          ▼
┌────────────────────┐   ┌────────────────────┐   ┌─────────────────────┐
│  catalog-service   │   │   order-service    │   │   query-service     │
│  :3001  (REST)     │   │  :3002  (REST)     │   │  :3003  (GraphQL)   │
│  Product CRUD      │   │  Creates orders    │   │  Aggregates reads   │
│  Postgres          │   │  Postgres          │   │  (REST clients ↑)   │
└────────┬───────────┘   └────────┬───────────┘   └─────────┬───────────┘
         │                        │ gRPC                    │
         │                        ▼                         │
         │               ┌────────────────────┐             │
         │               │   stock-service    │             │
         │               │  :50051 (gRPC)     │             │
         │               │  CheckAndReserve   │             │
         │               └────────────────────┘             │
         │                        │ Kafka                   │
         │            topic: order.created                  │
         │                        ▼                         │
         │               ┌────────────────────┐             │
         │               │ notification-svc   │             │
         │               │  Kafka consumer    │             │
         │               │  logs + emails     │             │
         │               └────────────────────┘             │
         │                                                  │
         └──────────────► Postgres :5432 ◄──────────────────┘
                    (catalog table + orders table,
                     each service writes only its own)
```

---

## Why four different protocols?

Each protocol shines in a different communication shape. Mixing them is the
lesson: there is no "one true API", and a real platform usually carries all
four at once.

| Protocol | Used between | Communication shape | Why it's the right tool |
|---|---|---|---|
| **REST / JSON** | client → catalog, client → order, query → {catalog, order} | Synchronous request/response, human-readable, cacheable | Browsers, curl, Postman, OpenAPI tooling — REST is the lingua-franca of public-facing CRUD. |
| **gRPC** | order → stock | Synchronous request/response, **internal only**, low latency | Strict Protobuf contract, binary framing, ~5–10x smaller payloads, codegen client stubs. Perfect for tight, type-safe service-to-service hops where you control both ends. |
| **Kafka** | order → notification (and any future subscriber) | **Asynchronous**, fan-out, persisted log, at-least-once | The producer must not block on every consumer (emails, analytics, audit log…). Kafka lets order-service emit one event and forget; consumers replay, scale, and join the topic independently without coupling. |
| **GraphQL** | client → query-service | Synchronous, **shape-on-demand** read aggregation | One round trip can fetch products + orders without N+1 calls. The schema decouples client display needs from the underlying service boundaries. |

The classic anti-pattern this lab avoids: **using REST for everything**. A
client that needs both products and orders would otherwise issue two REST
calls; an internal order/stock interaction would pay JSON parsing on the hot
path; and the notification step would force the order POST to block on email
delivery. Each protocol is chosen to eliminate one of those problems.

---

## Repository layout

```
tp-microservices-nest/
├── catalog-service/        REST CRUD over Postgres
├── order-service/          REST + gRPC client + Kafka producer (Postgres)
├── stock-service/          gRPC server (in-memory stock)
├── notification-service/   Kafka consumer
├── query-service/          GraphQL aggregator (REST clients)
├── proto/
│   └── stock.proto         Shared gRPC contract
├── nginx.conf              API gateway: /products /orders /graphql → host
├── docker-compose.yml      Postgres + Zookeeper + Kafka + nginx gateway
├── scripts/dev.sh          One-shot launcher (infra + 5 services)
├── package.json            One root deps tree; NestJS monorepo
├── nest-cli.json           Declares the 5 projects
└── tsconfig.json
```

The five services share **one `package.json` and one `node_modules`** through
NestJS' built-in monorepo support (`nest-cli.json` declares each as a separate
`application` project). This keeps install time and disk usage reasonable while
still producing five independent runnable binaries under `dist/`.

---

## Ports & runtime config

| Service | Protocol | Default port | Env override |
|---|---|---|---|
| `catalog-service` | HTTP / REST | `3001` (host) | `CATALOG_PORT` |
| `order-service` | HTTP / REST | `3002` (host) | `ORDER_PORT` |
| `stock-service` | gRPC | `50051` (host) | `STOCK_GRPC_URL` |
| `query-service` | HTTP / GraphQL | `3003` (`/graphql`) | `QUERY_PORT` |
| `notification-service` | Kafka consumer | (no inbound port) | `KAFKA_BROKERS` |
| **nginx gateway** | HTTP | `8080` (`/products`, `/orders`, `/graphql`) | — |
| Postgres (docker) | TCP | `5432` | `POSTGRES_*` |
| Kafka broker (docker) | Kafka | `9092` | — |
| Zookeeper (docker) | TCP | `2181` (internal) | — |

Cross-service URLs read from env, with sane defaults for local dev:
- `order-service` ➜ `STOCK_GRPC_URL=localhost:50051`, `KAFKA_BROKERS=localhost:9092`
- `notification-service` ➜ `KAFKA_BROKERS=localhost:9092`
- `query-service` ➜ `CATALOG_URL=http://localhost:3001`, `ORDER_URL=http://localhost:3002`
- `catalog-service` & `order-service` (Postgres) ➜
  `POSTGRES_HOST=localhost`, `POSTGRES_PORT=5432`,
  `POSTGRES_USER=postgres`, `POSTGRES_PASSWORD=postgres`,
  `POSTGRES_DB=tp_microservices`

> **Single entry point.** Anything you'd call directly on `:3001`, `:3002`, or
> `:3003` is also reachable through the gateway at `:8080` — clients only need
> to know one host:port. See `nginx.conf` for the reverse-proxy routes.

### Swagger / OpenAPI

Every HTTP-speaking service exposes Swagger UI + an OpenAPI JSON spec:

| Service | Swagger UI | OpenAPI JSON |
|---|---|---|
| `catalog-service` | <http://localhost:3001/api/docs> | `/api/docs-json` |
| `order-service` | <http://localhost:3002/api/docs> | `/api/docs-json` |
| `query-service` | <http://localhost:3003/api/docs> | `/api/docs-json` |

`stock-service` and `notification-service` are intentionally **not** mounted in
Swagger: they don't speak HTTP. Their contracts live where they belong —
`proto/stock.proto` for stock-service's gRPC surface, and the `@EventPattern`
declarations in `notification-service/src/notifications/notifications.controller.ts`
for Kafka topic subscriptions. Documenting them in Swagger would only be
possible by adding an HTTP listener purely for paperwork, which would mislead
about how those services are actually called.

The `query-service` Swagger only documents its small REST info endpoint
(`/api/info`) — the real API there is GraphQL, served at `/graphql` with
Apollo Sandbox as the schema explorer.

---

## Prerequisites

- Node.js **20+** (tested on Node 25)
- pnpm **9+**
- Docker (for Postgres, Kafka, Zookeeper, nginx)

```bash
pnpm install
```

---

## Running the lab

### One command (recommended)

```bash
pnpm dev
```

That single command runs `scripts/dev.sh`, which:

1. Brings up the infra (Postgres, Zookeeper, Kafka, nginx gateway) via
   `docker compose up -d --wait` — blocks until every container passes its
   healthcheck.
2. Launches all 5 NestJS services in parallel via `concurrently`, with a
   colored prefix per service so logs interleave readably:
   `[catalog]`, `[stock]`, `[order]`, `[notif]`, `[query]`.
3. On **Ctrl+C** (or any other exit), propagates the signal to all 5 services
   and runs `docker compose down` to clean the infra up.

Useful flags:
- `pnpm dev:no-watch` — disable Nest's `--watch` (no auto-reload, faster boot).
- `./scripts/dev.sh --keep-infra` — leave Postgres/Kafka/nginx running on exit
  (handy if you're restarting only the Nest services).
- `./scripts/dev.sh --help` — print usage.

### Per-service (manual)

If you'd rather run each service in its own terminal:

```bash
pnpm infra:up                # 0. Postgres + Kafka + nginx gateway
pnpm start:catalog           # 1. REST  — seeds 3 products on first boot
pnpm start:stock             # 2. gRPC
pnpm start:order             # 3. REST + gRPC client + Kafka producer
pnpm start:notification      # 4. Kafka consumer
pnpm start:query             # 5. GraphQL
pnpm infra:down              # tear infra down when finished
```

---

## End-to-end flow: creating an order

Below is the exact sequence of inter-service hops that happens when a client
POSTs `/orders`. Each step is annotated with **why** the chosen protocol fits.

```
┌──────────┐                  ┌──────────────┐
│  client  │                  │ order-service│
└────┬─────┘                  └──────┬───────┘
     │  ① POST /orders               │
     │  (productId, quantity, email) │
     │  REST/JSON ─────────────────► │
     │                               │
     │             ② CheckAndReserve(productId, quantity)
     │                               │ ── gRPC ──► ┌──────────────┐
     │                               │             │ stock-service│
     │                               │ ◄── gRPC ── │  (in-memory) │
     │             ③ {available,msg} │             └──────────────┘
     │                               │
     │             ④ INSERT INTO orders (SQLite)
     │                               │
     │             ⑤ emit "order.created"
     │                               │ ── Kafka ──►┌──────────────────────┐
     │  ⑥ 201 Created (order JSON)   │             │ notification-service │
     │ ◄──────────────────────────── │             │ (logs / sends email) │
     │                               │             └──────────────────────┘
```

### Step-by-step justifications

1. **Client → order-service over REST.** The entry point is HTTP because the
   request originates from a browser/CLI/Postman that lives outside the cluster.
   REST is the natural choice for an *external* boundary: cacheable, debuggable
   with curl, easy to document with OpenAPI.

2. **order-service → stock-service over gRPC.** The order can't be created
   until we know whether the stock can actually be reserved — this is a
   *synchronous, internal* call that must succeed or fail fast. gRPC gives:
   - a binding contract (`proto/stock.proto`) the compiler enforces on both ends,
   - HTTP/2 framing + Protobuf so the round-trip is far cheaper than JSON,
   - generated client stubs (`StockGrpcClient` in `order-service/src/orders/stock.client.ts`).

   REST would also work, but on the hot path of order creation, gRPC pays off.

3. **stock-service reserves and replies.** Single-shot RPC, no event, because
   the caller needs the answer right now. The reservation is part of the same
   call so we cannot oversell between "check" and "reserve" (still a single
   in-memory operation in this lab — production would do it transactionally).

4. **order-service persists the order.** Local SQLite via TypeORM. Each
   service owns its own data store (no shared DB), so service boundaries map
   cleanly to data boundaries.

5. **order-service emits `order.created` to Kafka.** This is fire-and-forget:
   the order is already confirmed; downstream concerns (email, analytics,
   billing…) must not block the HTTP response. Kafka gives:
   - **decoupling** — order-service knows nothing about its consumers,
   - **persistence + replay** — a consumer that was down catches up later,
   - **fan-out** — N future consumers join the same topic with zero changes
     to the producer.

   Using a synchronous REST call here would re-couple the services and turn
   every consumer outage into a 500 on the order endpoint.

6. **HTTP 201 returned to the client.** The response is sent as soon as the
   order row is committed and the event is *queued* — not when the consumer
   has processed it. This is the whole point of asynchronous messaging.

7. **notification-service consumes the event.** The Kafka consumer logs the
   payload and prints a fake email confirmation. Subscribed via
   `@EventPattern('order.created')` (not `@MessagePattern`) because the producer
   doesn't expect a reply — events are one-way.

### Failure path: insufficient stock

```
client ─POST /orders─► order-service ─gRPC─► stock-service
                                              │  (current=10, need=15)
                       order-service ◄────────┘  available=false
                       │
                       └─► HTTP 409 Conflict  "insufficient stock for product 1 (have 10, need 15)"
```

- No order row is persisted.
- No Kafka event is emitted.
- The client gets a precise message, not a generic 500.

---

## Service deep-dives

### `catalog-service` — REST + SQLite

**Why REST?** Pure CRUD on a single resource exposed to clients. The HTTP verb
maps 1:1 to the operation (`POST`/`GET`/`PATCH`/`DELETE`), it's cacheable, and
it's the standard contract for product catalogs.

| Method | Route | DTO / Pipe | Purpose |
|---|---|---|---|
| `POST`   | `/products`     | `CreateProductDto` (`class-validator`) | Create product |
| `GET`    | `/products`     | — | List all |
| `GET`    | `/products/:id` | `ParseIntPipe` | Read one (404 if missing) |
| `PATCH`  | `/products/:id` | `UpdateProductDto` | Partial update |
| `DELETE` | `/products/:id` | `ParseIntPipe` | Delete (204 No Content) |

**Validation middleware:** a global `ValidationPipe` is installed in
`main.ts` with `whitelist: true, forbidNonWhitelisted: true, transform: true`.
That triggers `class-validator` on every incoming DTO and rejects unknown
fields — exactly the layer where untrusted JSON must be sanitised.

**Why `ValidationPipe` and not custom middleware?**
- Pipes run *after* routing, so they see typed DTO classes (not raw `req.body`).
- They short-circuit with a structured 400 — no manual try/catch.
- They're part of NestJS' DI graph, so they integrate with `class-validator`
  decorators (`@IsNotEmpty`, `@Min`, `@IsEmail`) without extra wiring.

**Why TypeORM + Postgres?** Postgres comes up as a container (`tp-postgres`)
already provisioned with `db=tp_microservices`, so the lab has the same
storage profile as production. TypeORM's `synchronize: true` auto-creates the
`products` (catalog) and `orders` (order) tables on first boot — no migration
scripts needed for a lab. Each service owns its own table; sharing one
database keeps the setup short while still proving the "service-owns-its-data"
boundary at the table level. Connection settings come from `POSTGRES_*` env
vars (see *Ports & runtime config*).

**Seed data:** `ProductsService.onModuleInit()` inserts 3 starter products
(Laptop, Keyboard, USB-C Hub) on first boot. Lifecycle hook means seeding
runs automatically without a separate script.

---

### `stock-service` — gRPC server

**Why gRPC here specifically?**
- This service is **never** called by browsers — only by `order-service`.
- The contract is **simple, binary, and stable** (`StockRequest` → `StockResponse`).
- Order creation is on the user's critical path; saving 5–10 ms per call by
  skipping JSON parsing is meaningful at scale.
- Protobuf gives one canonical schema both sides compile against; you can't
  silently send the wrong field name.

**Contract — `proto/stock.proto`:**
```proto
service StockService {
  rpc CheckAndReserve (StockRequest) returns (StockResponse);
}
message StockRequest  { int64 productId = 1; int32 quantity = 2; }
message StockResponse { bool  available = 1; string message  = 2; }
```

**NestJS wiring:**
- The proto file is loaded via `Transport.GRPC` in `main.ts` and registered
  under `package: 'stock'`.
- The method handler is bound with `@GrpcMethod('StockService', 'CheckAndReserve')`
  in `StockController` — declarative, no manual `server.addService` boilerplate.
- Stock is held in-memory (`Map<productId, qty>`) to keep the lab focused on
  the transport, not the storage.

**Why a single proto file shared between server and client?** A single source of
truth. The server (`stock-service`) and client (`order-service`) both load
`proto/stock.proto` from the repo root via `process.cwd()`. In production, this
proto would live in a shared package or a schema registry (e.g., Buf).

---

### `order-service` — REST in, gRPC out, Kafka out

This service is where all four protocols intersect:

| Direction | Protocol | Why |
|---|---|---|
| **Inbound from client** | REST `POST /orders`, `GET /orders`, `GET /orders/:id` | External boundary, human-readable |
| **Outbound to `stock-service`** | gRPC `CheckAndReserve` | Sync, internal, low-latency, strict contract |
| **Outbound to consumers** | Kafka event `order.created` | Async, fan-out, decoupled |
| **Storage** | SQLite via TypeORM | Local, owned by this service |

**Why mix sync and async in the same handler?** Because their semantics differ:
- The **stock check** has to be sync — we cannot return 201 if we don't yet
  know there's stock.
- The **notification step** has to be async — emails, audit logs, dashboards
  must not block the API response, and adding a new consumer must not require
  a code change in `order-service`.

**ClientsModule.registerAsync** sets up *both* outbound transports in one
module. Each gets a DI token (`STOCK_GRPC`, `KAFKA`) injected into
`OrdersService`.

**`ClientGrpc.getService()`** is called in `onModuleInit` so the client stub
is constructed once, not per request — cheaper and avoids repeated proto loads.

**`kafka.connect()` on boot** pre-establishes the broker connection. Without
this, the very first publish would pay the handshake latency inside the user's
HTTP request.

**Error mapping:**
- gRPC unreachable → `409 Conflict` (`stock-service is unavailable`).
- Stock insufficient → `409 Conflict` with the explicit message from
  `stock-service`.
- DTO validation failure → `400 Bad Request` (handled by `ValidationPipe`).

---

### `notification-service` — Kafka consumer

**Why a Kafka consumer (not an HTTP endpoint)?** Because notifications are an
event-driven concern. If `notification-service` is down, orders should still be
accepted — they'll just get notified later, when the consumer comes back and
catches up from its last offset. That property is what justifies the
operational cost of running Kafka in the first place.

**`@EventPattern` vs `@MessagePattern`:**
- `@EventPattern('order.created')` ➜ subscribe-and-forget. No reply expected,
  no correlation id, perfect for fan-out events.
- `@MessagePattern` ➜ request/reply, used when the caller waits for a result.
  Wrong shape for events.

**Consumer group `notification-consumer`** is stable so:
- Offsets survive restarts (consumer resumes where it left off).
- Multiple instances can scale horizontally — Kafka assigns each partition to
  exactly one instance in the group.

The handler logs the event with a timestamp and prints:
```
confirmation sent to client@test.com for order 15
```
In production, this is where the SMTP / SES / push-notification call happens.

---

### `query-service` — GraphQL aggregator

**Why GraphQL on the read side specifically?**
- The UI typically wants products **and** their related orders in one trip.
- With REST, that means two endpoints + client-side joining. With GraphQL,
  one query, exact shape returned.
- The schema becomes the API contract — frontend and backend negotiate at the
  field level.

**Why call back into REST for the data?** Because:
1. The other services already expose REST. Adding a second protocol per
   service just for `query-service` would be unjustified ceremony.
2. The aggregator is the *only* place that should know how to assemble views.
   Keep the heavy lifting here, keep upstream services single-purpose.

**Code-first schema:** the schema is generated from TypeScript `@ObjectType`
classes and `@Resolver` methods (`autoSchemaFile`). One source of truth: the
TS types. Output ends up at `query-service/schema.gql` and is regenerated
on every boot.

**Resolvers:**

| Query | Resolver | Upstream call |
|---|---|---|
| `products: [Product!]!` | `ProductsResolver` | `GET catalog-service/products` |
| `orders: [Order!]!` | `OrdersResolver` | `GET order-service/orders` |
| `orderById(id: ID!): Order` | `OrdersResolver` | `GET order-service/orders/:id` |

`HttpModule` from `@nestjs/axios` wraps axios so resolvers receive an injected
HTTP client (testable, replaceable in unit tests).

**Apollo v5 sandbox:** `playground: false` because the legacy playground plugin
is unmaintained; Apollo v5 ships its own sandbox at `/graphql` automatically.

---

## Testing the platform

Once all five services are running, you can hit them **directly** (e.g.
`localhost:3001`) or **through the nginx gateway** at `localhost:8080`. The
examples below use the gateway since that's the supported public entry point.

### 1. List seeded products (REST → catalog)
```bash
curl -s http://localhost:8080/products | jq
```

### 2. Create a new product (REST → catalog, validated by DTO)
```bash
curl -s -X POST http://localhost:8080/products \
  -H 'content-type: application/json' \
  -d '{"name":"Webcam","price":89.5,"stock":12}' | jq
```
Invalid payload (negative price) returns a structured 400:
```bash
curl -s -X POST http://localhost:8080/products \
  -H 'content-type: application/json' \
  -d '{"name":"","price":-1,"stock":-3}'
```

### 3. Create a valid order — exercises **REST + gRPC + Kafka**
```bash
curl -s -X POST http://localhost:8080/orders \
  -H 'content-type: application/json' \
  -d '{"productId":1,"quantity":2,"customerEmail":"client@test.com"}' | jq
```
Watch the colored prefixes in the `pnpm dev` terminal:
- `[stock]`: `gRPC CheckAndReserve productId=1 qty=2` → `reserved 2x product 1; remaining=8`
- `[order]`: `order 1 created and order.created event emitted`
- `[notif]`: `confirmation sent to client@test.com for order 1`

### 4. Trigger the insufficient-stock path
```bash
curl -i -X POST http://localhost:8080/orders \
  -H 'content-type: application/json' \
  -d '{"productId":1,"quantity":9999,"customerEmail":"client@test.com"}'
```
Expect **HTTP 409 Conflict** and **no** Kafka event.

### 5. Aggregated read via GraphQL (query-service)
```bash
curl -s -X POST http://localhost:8080/graphql \
  -H 'content-type: application/json' \
  -d '{"query":"{ products { id name price stock } orders { id productId customerEmail status } }"}' | jq
```
Or open the Apollo Sandbox UI in a browser: <http://localhost:8080/graphql>.

### 6. Inspect Kafka topic from inside the container
```bash
# List topics
docker compose exec kafka kafka-topics --bootstrap-server localhost:9092 --list

# Tail messages on the order.created topic
docker compose exec kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 --topic order.created --from-beginning
```

### 7. Verify Postgres state
```bash
docker compose exec postgres psql -U postgres -d tp_microservices \
  -c 'SELECT * FROM products; SELECT * FROM orders;'
```

---

## Concept → NestJS mapping

| Concept | NestJS element | Found in |
|---|---|---|
| REST routes | `@Controller`, `@Get`, `@Post`, `@Param`, `@Body` | `catalog-service/src/products/products.controller.ts`, `order-service/src/orders/orders.controller.ts` |
| Input validation | `ValidationPipe` + `class-validator` decorators | `*-service/src/main.ts`, `*/dto/*.dto.ts` |
| Persistence | `TypeOrmModule.forRoot/forFeature`, `@Entity`, `@InjectRepository` | `*/app.module.ts`, `*/entities/*.entity.ts` |
| gRPC server | `Transport.GRPC` in `createMicroservice`, `@GrpcMethod` | `stock-service/src/main.ts`, `.../stock/stock.controller.ts` |
| gRPC client | `ClientsModule.registerAsync({ transport: Transport.GRPC })` + `ClientGrpc.getService` | `order-service/src/orders/orders.module.ts`, `.../orders.service.ts` |
| Kafka producer | `Transport.KAFKA` client + `client.emit(topic, payload)` | `order-service/src/orders/orders.module.ts`, `.../orders.service.ts` |
| Kafka consumer | `createMicroservice({ transport: Transport.KAFKA })` + `@EventPattern` | `notification-service/src/main.ts`, `.../notifications.controller.ts` |
| GraphQL schema | `GraphQLModule.forRoot({ driver: ApolloDriver, autoSchemaFile })`, `@ObjectType`, `@Resolver`, `@Query` | `query-service/src/app.module.ts`, `.../*.resolver.ts` |
| Cross-service REST | `@nestjs/axios` `HttpModule` + `HttpService` | `query-service/src/**/*.resolver.ts` |

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `ECONNREFUSED 127.0.0.1:5432` | Postgres container not up | `pnpm infra:up` (or `pnpm dev`); wait for healthcheck |
| `Failed to connect to localhost:50051` (order-service) | `stock-service` not started | Start `pnpm start:stock` first (or `pnpm dev`) |
| Kafka errors `no broker available` | Infra not up, or Kafka still booting | `pnpm dev` waits for healthchecks; otherwise allow ~20s after `infra:up` |
| `KafkaJSError: The group coordinator is not available` | Consumer started before `__consumer_offsets` elected a leader | Already fixed: the Kafka healthcheck uses `kafka-consumer-groups --list`, which only passes once the coordinator is live. If you bypass the launcher (`pnpm infra:up` instead of `pnpm dev`), wait until `docker compose ps kafka` shows `healthy` before starting consumers. |
| GraphQL request returns `"This operation has been blocked as a potential Cross-Site Request Forgery (CSRF)"` | Apollo v5's default CSRF guard rejects GETs and POSTs whose content-type is text/plain / form-urlencoded / multipart | Already turned off for the lab via `csrfPrevention: false` in `query-service/src/app.module.ts`. For a production deployment behind auth, re-enable it and send `content-type: application/json` (or the `apollo-require-preflight` header) from clients. |
| `409 Conflict — stock-service is unavailable` on `POST /orders` | gRPC channel down | Confirm `stock-service` is listening on `:50051` |
| nginx `502 Bad Gateway` at `:8080` | Host services not running | nginx only reverse-proxies — start the Nest services with `pnpm dev` |
| GraphQL `@as-integrations/express5 missing` | Dependency not installed | `pnpm add @as-integrations/express5` (already in `package.json`) |
| Notification never logs a consume | Topic auto-created after consumer subscribed | Already fixed via `subscribe.fromBeginning: true` in `notification-service/src/main.ts` |
| Port `5432`/`9092`/`8080` already in use | Another local service is bound | Stop the conflicting service or change the host-side port in `docker-compose.yml` |
