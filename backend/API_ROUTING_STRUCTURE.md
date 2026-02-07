# 🚨 KIPOLIS - API ROUTING STRUCTURE

**Date:** 2026-02-07 19:24 WIB  
**Purpose:** Clean, maintainable API organization by client type

---

## 🎯 DESIGN PRINCIPLE

**User's Requirement:** "API harus rapih, mana untuk mobile client, mobile responder, Dashboard consoles, Connect dengan 3rd party. Agar mudah maintain dan debug."

**Solution:** **Separate API routes by client type** with clear prefixes:

```
/api/v1/
  ├── /victim/*          → Mobile Victim App endpoints
  ├── /responder/*       → Mobile Responder App endpoints
  ├── /console/*         → Dashboard Console endpoints
  ├── /operator/*        → Operator Mobile App endpoints
  ├── /webhook/*         → 3rd party webhooks (incoming)
  └── /integration/*     → 3rd party integrations (outgoing)
```

---

## 📱 API STRUCTURE BY CLIENT

### **1. Victim App API** (`/api/v1/victim/*`)

**Purpose:** Endpoints for public users (victims)

**Authentication:** JWT token (phone-based OTP)

**Endpoints:**

#### **Auth:**
- `POST /api/v1/victim/auth/request-otp` - Request OTP code
- `POST /api/v1/victim/auth/verify-otp` - Verify OTP & get JWT token
- `POST /api/v1/victim/auth/refresh-token` - Refresh JWT token
- `POST /api/v1/victim/auth/logout` - Logout

#### **Profile:**
- `GET /api/v1/victim/profile` - Get user profile
- `PATCH /api/v1/victim/profile` - Update profile
- `PATCH /api/v1/victim/profile/emergency-contact` - Update emergency contact
- `POST /api/v1/victim/profile/device-token` - Register device for push notifications

#### **Incidents (Panic Button):**
- `POST /api/v1/victim/incidents` - **TRIGGER PANIC BUTTON** 🚨
  - Body: `{ latitude, longitude, breadcrumbs, trigger_type, device_info }`
  - Returns: `{ incident_id, status, eta_minutes }`
- `GET /api/v1/victim/incidents/active` - Get user's active incident
- `GET /api/v1/victim/incidents/:id` - Get incident details
- `PATCH /api/v1/victim/incidents/:id/cancel` - Cancel false alarm
- `POST /api/v1/victim/incidents/:id/location` - Update location (breadcrumbs)
- `GET /api/v1/victim/incidents/history` - Get incident history

#### **Evidence Upload:**
- `POST /api/v1/victim/incidents/:id/audio` - Upload audio recording
- `POST /api/v1/victim/incidents/:id/photos` - Upload photos
- `GET /api/v1/victim/incidents/:id/upload-status` - Check upload status

#### **Responder Tracking:**
- `GET /api/v1/victim/incidents/:id/responder` - Get assigned responder info
- `GET /api/v1/victim/incidents/:id/responder/location` - Get responder's current location
- `GET /api/v1/victim/incidents/:id/eta` - Get estimated time of arrival

---

### **2. Responder App API** (`/api/v1/responder/*`)

**Purpose:** Endpoints for first responders (police, paramedics, security)

**Authentication:** JWT token (badge-based or phone OTP)

**Endpoints:**

#### **Auth:**
- `POST /api/v1/responder/auth/login` - Login with badge/phone + password
- `POST /api/v1/responder/auth/request-otp` - Request OTP (if phone-based)
- `POST /api/v1/responder/auth/verify-otp` - Verify OTP & get JWT token
- `POST /api/v1/responder/auth/refresh-token` - Refresh JWT token
- `POST /api/v1/responder/auth/logout` - Logout

#### **Profile:**
- `GET /api/v1/responder/profile` - Get responder profile
- `PATCH /api/v1/responder/profile` - Update profile
- `POST /api/v1/responder/profile/device-token` - Register device for push notifications
- `PATCH /api/v1/responder/profile/status` - Update status (available, off_duty)

#### **Incidents (Receive & Respond):**
- `GET /api/v1/responder/incidents/nearby` - **Get nearby active incidents** 🚨
  - Query: `?latitude=xxx&longitude=xxx&radius=5000&type=all`
  - Returns: List of incidents within radius, sorted by distance
- `GET /api/v1/responder/incidents/assigned` - Get my assigned incidents
- `GET /api/v1/responder/incidents/:id` - Get incident details (full access)
  - Includes: victim info, breadcrumbs, audio, photos, operator notes
- `POST /api/v1/responder/incidents/:id/accept` - **Accept incident** ✅
  - Changes status to "on_the_way"
  - Starts GPS tracking
- `POST /api/v1/responder/incidents/:id/decline` - Decline incident
- `PATCH /api/v1/responder/incidents/:id/status` - Update incident status
  - Status: `on_the_way`, `arrived`, `resolved`
- `POST /api/v1/responder/incidents/:id/resolve` - Mark incident as resolved
  - Body: `{ resolution_notes, outcome }`

#### **Location Tracking:**
- `POST /api/v1/responder/location` - Update current location (every 30s)
  - Body: `{ latitude, longitude, speed, accuracy }`
  - Updates responder's current location
  - If incident assigned, updates responder_trail
- `GET /api/v1/responder/location/history` - Get my location history

#### **Communication:**
- `GET /api/v1/responder/incidents/:id/messages` - Get incident chat messages
- `POST /api/v1/responder/incidents/:id/messages` - Send message to operator
- `POST /api/v1/responder/incidents/:id/photos` - Upload photos from scene

#### **Performance:**
- `GET /api/v1/responder/stats` - Get my performance stats
  - Returns: total_incidents, avg_response_time, rating
- `GET /api/v1/responder/incidents/history` - Get incident history

---

### **3. Console Dashboard API** (`/api/v1/console/*`)

**Purpose:** Endpoints for Command Center web dashboard

**Authentication:** Session-based (operator login)

**Endpoints:**

#### **Auth:**
- `POST /api/v1/console/auth/login` - Operator login (username + password)
- `POST /api/v1/console/auth/logout` - Logout
- `GET /api/v1/console/auth/session` - Check session status

#### **Incidents (Monitor & Dispatch):**
- `GET /api/v1/console/incidents` - **Get all incidents** (with filters)
  - Query: `?status=active&severity=high&page=1&limit=50`
  - Returns: Paginated list of incidents
- `GET /api/v1/console/incidents/:id` - Get incident details (full access)
- `PATCH /api/v1/console/incidents/:id` - Update incident (operator notes, severity)
- `POST /api/v1/console/incidents/:id/assign` - Assign responder to incident
  - Body: `{ responder_id }`
- `POST /api/v1/console/incidents/:id/dispatch` - Dispatch responder
- `PATCH /api/v1/console/incidents/:id/acknowledge` - Acknowledge incident
- `POST /api/v1/console/incidents/:id/escalate` - Escalate incident

#### **Real-time Monitoring:**
- `GET /api/v1/console/incidents/active/map` - Get all active incidents for map view
  - Returns: Incidents with locations, responder locations, ETAs
- `GET /api/v1/console/responders/active` - Get all active responders
  - Returns: Responder locations, status, assigned incidents
- `GET /api/v1/console/incidents/:id/live` - Get live incident data
  - Returns: Victim location, responder location, breadcrumbs, ETA

#### **Users Management:**
- `GET /api/v1/console/users` - List all users (victims)
- `GET /api/v1/console/users/:id` - Get user details
- `PATCH /api/v1/console/users/:id` - Update user (suspend, activate)

#### **Responders Management:**
- `GET /api/v1/console/responders` - List all responders
- `POST /api/v1/console/responders` - Create new responder
- `GET /api/v1/console/responders/:id` - Get responder details
- `PATCH /api/v1/console/responders/:id` - Update responder
- `DELETE /api/v1/console/responders/:id` - Deactivate responder
- `GET /api/v1/console/responders/:id/performance` - Get responder performance

#### **Analytics:**
- `GET /api/v1/console/analytics/overview` - Dashboard overview stats
- `GET /api/v1/console/analytics/response-times` - Response time analytics
- `GET /api/v1/console/analytics/incidents-by-type` - Incident breakdown
- `GET /api/v1/console/analytics/responder-performance` - Responder rankings

#### **Communication:**
- `GET /api/v1/console/incidents/:id/messages` - Get incident chat
- `POST /api/v1/console/incidents/:id/messages` - Send message
- `POST /api/v1/console/incidents/:id/broadcast` - Broadcast to all responders

---

### **4. Operator Mobile App API** (`/api/v1/operator/*`)

**Purpose:** Mobile version of console for operators on the go

**Authentication:** JWT token (operator credentials)

**Endpoints:**
- Similar to `/console/*` but optimized for mobile
- `POST /api/v1/operator/auth/login`
- `GET /api/v1/operator/incidents`
- `GET /api/v1/operator/incidents/:id`
- `POST /api/v1/operator/incidents/:id/assign`
- `GET /api/v1/operator/responders/nearby`

---

### **5. Webhooks API** (`/api/v1/webhook/*`)

**Purpose:** Receive callbacks from 3rd party services

**Authentication:** Webhook signature verification

**Endpoints:**

#### **SMS Gateway:**
- `POST /api/v1/webhook/sms/incoming` - Receive incoming SMS
  - For SMS fallback when victim has no internet
  - Body: `{ from, to, message, timestamp }`

#### **Payment Gateway:**
- `POST /api/v1/webhook/payment/success` - Payment success callback
- `POST /api/v1/webhook/payment/failed` - Payment failed callback

#### **Push Notification:**
- `POST /api/v1/webhook/fcm/delivery-status` - FCM delivery status
- `POST /api/v1/webhook/apns/feedback` - APNS feedback

#### **Maps/Navigation:**
- `POST /api/v1/webhook/maps/eta-update` - ETA update from maps API

---

### **6. Integration API** (`/api/v1/integration/*`)

**Purpose:** Connect with 3rd party services (outgoing)

**Authentication:** API Key or OAuth

**Endpoints:**

#### **Emergency Services:**
- `POST /api/v1/integration/emergency/notify` - Notify official emergency services (911, 112)
  - Body: `{ incident_id, type, location, severity }`

#### **Hospital/Ambulance:**
- `POST /api/v1/integration/hospital/dispatch` - Request ambulance
- `GET /api/v1/integration/hospital/availability` - Check hospital bed availability

#### **Police:**
- `POST /api/v1/integration/police/dispatch` - Dispatch police unit
- `GET /api/v1/integration/police/units/nearby` - Get nearby police units

#### **SMS Gateway:**
- `POST /api/v1/integration/sms/send` - Send SMS (for fallback)
  - Body: `{ to, message, priority }`

#### **Push Notifications:**
- `POST /api/v1/integration/push/send` - Send push notification
  - Body: `{ user_id, title, message, data }`

#### **Maps/Geocoding:**
- `GET /api/v1/integration/maps/geocode` - Reverse geocode coordinates
- `GET /api/v1/integration/maps/route` - Get route between two points
- `GET /api/v1/integration/maps/eta` - Calculate ETA

---

## 🗂️ FILE STRUCTURE

```
backend/src/
├── api/
│   └── v1/
│       ├── victim/              ← Victim App routes
│       │   ├── auth.routes.ts
│       │   ├── profile.routes.ts
│       │   ├── incidents.routes.ts
│       │   └── index.ts
│       │
│       ├── responder/           ← Responder App routes
│       │   ├── auth.routes.ts
│       │   ├── profile.routes.ts
│       │   ├── incidents.routes.ts
│       │   ├── location.routes.ts
│       │   └── index.ts
│       │
│       ├── console/             ← Console Dashboard routes
│       │   ├── auth.routes.ts
│       │   ├── incidents.routes.ts
│       │   ├── users.routes.ts
│       │   ├── responders.routes.ts
│       │   ├── analytics.routes.ts
│       │   └── index.ts
│       │
│       ├── operator/            ← Operator Mobile routes
│       │   ├── auth.routes.ts
│       │   ├── incidents.routes.ts
│       │   └── index.ts
│       │
│       ├── webhook/             ← Webhook routes
│       │   ├── sms.routes.ts
│       │   ├── payment.routes.ts
│       │   └── index.ts
│       │
│       ├── integration/         ← Integration routes
│       │   ├── emergency.routes.ts
│       │   ├── sms.routes.ts
│       │   ├── push.routes.ts
│       │   └── index.ts
│       │
│       └── index.ts             ← Main API router
│
├── controllers/                 ← Business logic
│   ├── victim/
│   ├── responder/
│   ├── console/
│   └── ...
│
├── services/                    ← Core services
│   ├── incident.service.ts
│   ├── responder.service.ts
│   ├── notification.service.ts
│   ├── location.service.ts
│   └── ...
│
├── middleware/                  ← Middleware
│   ├── auth.middleware.ts
│   ├── validation.middleware.ts
│   ├── rate-limit.middleware.ts
│   └── ...
│
└── utils/                       ← Utilities
    ├── jwt.util.ts
    ├── otp.util.ts
    └── ...
```

---

## 🔐 AUTHENTICATION STRATEGY

### **1. Victim App** - JWT (Phone OTP)
```typescript
// Request OTP
POST /api/v1/victim/auth/request-otp
Body: { phone: "+6281234567890" }
Response: { message: "OTP sent", expires_in: 300 }

// Verify OTP
POST /api/v1/victim/auth/verify-otp
Body: { phone: "+6281234567890", otp: "123456" }
Response: { token: "jwt_token", user: {...} }

// Use token in headers
Authorization: Bearer jwt_token
```

### **2. Responder App** - JWT (Badge/Phone + Password)
```typescript
// Login
POST /api/v1/responder/auth/login
Body: { badge_number: "POL12345", password: "xxx" }
Response: { token: "jwt_token", responder: {...} }

// Use token in headers
Authorization: Bearer jwt_token
```

### **3. Console Dashboard** - Session-based
```typescript
// Login
POST /api/v1/console/auth/login
Body: { username: "operator1", password: "xxx" }
Response: { session_id: "xxx", operator: {...} }

// Session cookie automatically sent
Cookie: session_id=xxx
```

### **4. Webhooks** - Signature verification
```typescript
// Verify signature
X-Webhook-Signature: sha256_hash
```

### **5. Integration** - API Key
```typescript
// API Key in headers
X-API-Key: your_api_key_here
```

---

## 🛡️ MIDDLEWARE STACK

### **Per Client Type:**

```typescript
// Victim App
victim.use(rateLimitMiddleware({ max: 100, window: '15m' }));
victim.use(jwtAuthMiddleware);
victim.use(validationMiddleware);

// Responder App
responder.use(rateLimitMiddleware({ max: 200, window: '15m' }));
responder.use(jwtAuthMiddleware);
responder.use(validationMiddleware);

// Console Dashboard
console.use(sessionAuthMiddleware);
console.use(rbacMiddleware(['operator', 'admin']));
console.use(validationMiddleware);

// Webhooks
webhook.use(webhookSignatureMiddleware);
webhook.use(validationMiddleware);

// Integration
integration.use(apiKeyMiddleware);
integration.use(rateLimitMiddleware({ max: 1000, window: '1h' }));
```

---

## 📊 BENEFITS OF THIS STRUCTURE

### **1. Easy to Maintain** ✅
- Clear separation by client type
- Each client has its own folder
- Easy to find endpoints: "Victim incident? → `/victim/incidents.routes.ts`"

### **2. Easy to Debug** ✅
- Logs show client type: `[VICTIM] POST /api/v1/victim/incidents`
- Can enable/disable routes per client
- Can monitor traffic per client type

### **3. Easy to Scale** ✅
- Add new endpoints without touching other clients
- Can deploy clients separately (microservices later)
- Can apply different rate limits per client

### **4. Easy to Secure** ✅
- Different auth strategies per client
- Different permissions per client
- Can isolate security issues

### **5. Easy to Document** ✅
- Swagger/OpenAPI per client
- Clear API contracts
- Easy for frontend developers

---

## 🎯 EXAMPLE: Panic Button Flow

```typescript
// 1. VICTIM triggers panic button
POST /api/v1/victim/incidents
Headers: { Authorization: "Bearer victim_jwt_token" }
Body: {
  latitude: -6.2088,
  longitude: 106.8456,
  breadcrumbs: [...],
  trigger_type: "dead_mans_switch",
  device_info: {...}
}
Response: {
  incident_id: "uuid",
  status: "active",
  message: "Help is on the way"
}

// 2. BACKEND finds nearest responder (internal service)
// 3. BACKEND sends push notification to responder

// 4. RESPONDER receives notification, opens app
GET /api/v1/responder/incidents/nearby?latitude=-6.2088&longitude=106.8456&radius=5000
Headers: { Authorization: "Bearer responder_jwt_token" }
Response: [
  {
    incident_id: "uuid",
    distance_km: 2.3,
    severity: "high",
    victim: {...},
    location: {...}
  }
]

// 5. RESPONDER accepts incident
POST /api/v1/responder/incidents/{incident_id}/accept
Headers: { Authorization: "Bearer responder_jwt_token" }
Response: {
  status: "on_the_way",
  victim_location: {...},
  navigation_url: "..."
}

// 6. RESPONDER updates location every 30s
POST /api/v1/responder/location
Headers: { Authorization: "Bearer responder_jwt_token" }
Body: { latitude: -6.2100, longitude: 106.8460, speed: 45 }
Response: { eta_minutes: 4 }

// 7. VICTIM checks responder status
GET /api/v1/victim/incidents/{incident_id}/responder
Headers: { Authorization: "Bearer victim_jwt_token" }
Response: {
  responder: { name: "Officer John", badge: "POL123" },
  status: "on_the_way",
  eta_minutes: 4,
  distance_km: 1.8
}

// 8. CONSOLE monitors everything
GET /api/v1/console/incidents/{incident_id}/live
Headers: { Cookie: "session_id=xxx" }
Response: {
  victim_location: {...},
  responder_location: {...},
  eta_minutes: 4,
  status: "on_the_way"
}
```

---

## ✅ IMPLEMENTATION PRIORITY

### **Phase 1: Core APIs** (This Week)
1. ✅ API structure designed
2. ⏳ Implement `/victim/auth` routes
3. ⏳ Implement `/victim/incidents` routes (panic button)
4. ⏳ Implement `/responder/auth` routes
5. ⏳ Implement `/responder/incidents` routes (accept, status)
6. ⏳ Implement `/responder/location` routes (tracking)

### **Phase 2: Console & Integration** (Next Week)
7. ⏳ Implement `/console/incidents` routes (monitoring)
8. ⏳ Implement `/console/responders` routes (management)
9. ⏳ Implement `/integration/push` (notifications)
10. ⏳ Implement `/webhook/sms` (fallback)

---

**This is a CLEAN, MAINTAINABLE API structure!** 🎯

---

**END OF API ROUTING STRUCTURE**  
*Generated by Antigravity AI - 2026-02-07 19:24 WIB*
