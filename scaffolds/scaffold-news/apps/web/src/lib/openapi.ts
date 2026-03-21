export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "SaaS Scaffold API",
    version: "1.0.0",
    description: "Production-ready SaaS scaffold with authentication, billing, multi-tenancy, and more.",
    contact: {
      name: "API Support",
      email: "support@example.com",
    },
    license: {
      name: "MIT",
      url: "https://opensource.org/licenses/MIT",
    },
  },
  servers: [
    {
      url: "{protocol}://{host}",
      description: "Dynamic server",
      variables: {
        protocol: {
          default: "https",
          enum: ["https", "http"],
        },
        host: {
          default: "api.example.com",
        },
      },
    },
  ],
  tags: [
    { name: "Authentication", description: "Authentication endpoints" },
    { name: "Users", description: "User management" },
    { name: "Teams", description: "Team management" },
    { name: "Billing", description: "Billing and subscriptions" },
    { name: "Webhooks", description: "Webhook management" },
    { name: "Assistant", description: "AI Assistant" },
    { name: "Feature Flags", description: "Feature flag management" },
  ],
  paths: {
    "/api/v1/users/me": {
      get: {
        tags: ["Users"],
        summary: "Get current user",
        description: "Returns the currently authenticated user's profile information.",
        operationId: "getCurrentUser",
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        responses: {
          "200": {
            description: "Successful response",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/User",
                },
              },
            },
          },
          "401": {
            $ref: "#/components/responses/Unauthorized",
          },
        },
      },
      patch: {
        tags: ["Users"],
        summary: "Update current user",
        description: "Updates the currently authenticated user's profile.",
        operationId: "updateCurrentUser",
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UpdateUserInput",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "User updated successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/User",
                },
              },
            },
          },
          "400": {
            $ref: "#/components/responses/BadRequest",
          },
          "401": {
            $ref: "#/components/responses/Unauthorized",
          },
        },
      },
    },
    "/api/v1/team/settings": {
      get: {
        tags: ["Teams"],
        summary: "Get team settings",
        description: "Returns the current team's settings.",
        operationId: "getTeamSettings",
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        responses: {
          "200": {
            description: "Successful response",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Team" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
      patch: {
        tags: ["Teams"],
        summary: "Update team settings",
        description: "Updates the current team's settings.",
        operationId: "updateTeamSettings",
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Team updated successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Team" },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/v1/team/members": {
      get: {
        tags: ["Teams"],
        summary: "List team members",
        description: "Returns a list of members in the current team.",
        operationId: "listTeamMembers",
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        responses: {
          "200": {
            description: "Successful response",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    members: {
                      type: "array",
                      items: { $ref: "#/components/schemas/TeamMember" },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
      patch: {
        tags: ["Teams"],
        summary: "Update team member role",
        description: "Updates a team member's role.",
        operationId: "updateTeamMember",
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["memberId", "role"],
                properties: {
                  memberId: { type: "string" },
                  role: { type: "string", enum: ["member", "manager", "owner"] },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Member updated successfully" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
      delete: {
        tags: ["Teams"],
        summary: "Remove team member",
        description: "Removes a member from the team.",
        operationId: "removeTeamMember",
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        parameters: [
          {
            name: "memberId",
            in: "query",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": { description: "Member removed successfully" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/v1/team/invitations": {
      get: {
        tags: ["Teams"],
        summary: "List team invitations",
        description: "Returns pending invitations for the current team.",
        operationId: "listTeamInvitations",
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        responses: {
          "200": {
            description: "Successful response",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    invitations: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Invitation" },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
      post: {
        tags: ["Teams"],
        summary: "Invite team member",
        description: "Sends an invitation to join the team.",
        operationId: "inviteTeamMember",
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/InviteMemberInput" },
            },
          },
        },
        responses: {
          "201": {
            description: "Invitation sent successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Invitation" },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/api/v1/billing/subscription": {
      get: {
        tags: ["Billing"],
        summary: "Get subscription",
        description: "Returns the current tenant's subscription details.",
        operationId: "getSubscription",
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        responses: {
          "200": {
            description: "Successful response",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Subscription" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/v1/billing/invoices": {
      get: {
        tags: ["Billing"],
        summary: "List invoices",
        description: "Returns a list of invoices for the current tenant.",
        operationId: "listInvoices",
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        parameters: [
          { $ref: "#/components/parameters/cursor" },
          { $ref: "#/components/parameters/limit" },
        ],
        responses: {
          "200": {
            description: "Successful response",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/PaginatedResponse" },
                    {
                      type: "object",
                      properties: {
                        data: {
                          type: "array",
                          items: { $ref: "#/components/schemas/Invoice" },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/v1/webhooks": {
      get: {
        tags: ["Webhooks"],
        summary: "List webhooks",
        description: "Returns a list of configured webhooks.",
        operationId: "listWebhooks",
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        responses: {
          "200": {
            description: "Successful response",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Webhook" },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
      post: {
        tags: ["Webhooks"],
        summary: "Create webhook",
        description: "Creates a new webhook endpoint.",
        operationId: "createWebhook",
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateWebhookInput" },
            },
          },
        },
        responses: {
          "201": {
            description: "Webhook created successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Webhook" },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/v1/assistant/threads": {
      get: {
        tags: ["Assistant"],
        summary: "List threads",
        description: "Returns a list of assistant threads.",
        operationId: "listThreads",
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        responses: {
          "200": {
            description: "Successful response",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Thread" },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
      post: {
        tags: ["Assistant"],
        summary: "Create thread",
        description: "Creates a new assistant thread.",
        operationId: "createThread",
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateThreadInput" },
            },
          },
        },
        responses: {
          "201": {
            description: "Thread created successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Thread" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/v1/assistant/threads/{threadId}/messages": {
      post: {
        tags: ["Assistant"],
        summary: "Send message",
        description: "Sends a message to the assistant and receives a response.",
        operationId: "sendMessage",
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        parameters: [
          {
            name: "threadId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SendMessageInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Message sent successfully (SSE stream)",
            content: {
              "text/event-stream": {
                schema: { type: "string" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/v1/feature-flags": {
      get: {
        tags: ["Feature Flags"],
        summary: "List feature flags",
        description: "Returns all feature flags for the current tenant.",
        operationId: "listFeatureFlags",
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        responses: {
          "200": {
            description: "Successful response",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/FeatureFlag" },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
      apiKey: {
        type: "apiKey",
        in: "header",
        name: "X-API-Key",
      },
    },
    parameters: {
      cursor: {
        name: "cursor",
        in: "query",
        description: "Pagination cursor",
        schema: { type: "string" },
      },
      limit: {
        name: "limit",
        in: "query",
        description: "Number of items to return",
        schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
      },
    },
    responses: {
      BadRequest: {
        description: "Bad request",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
      Unauthorized: {
        description: "Unauthorized",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
      Forbidden: {
        description: "Forbidden",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
      NotFound: {
        description: "Not found",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
    },
    schemas: {
      Error: {
        type: "object",
        required: ["error"],
        properties: {
          error: {
            type: "object",
            required: ["code", "message"],
            properties: {
              code: { type: "string" },
              message: { type: "string" },
              details: { type: "object" },
            },
          },
        },
      },
      PaginatedResponse: {
        type: "object",
        properties: {
          data: { type: "array", items: {} },
          pagination: {
            type: "object",
            properties: {
              cursor: { type: "string", nullable: true },
              hasMore: { type: "boolean" },
            },
          },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string" },
          email: { type: "string", format: "email" },
          name: { type: "string" },
          image: { type: "string", nullable: true },
          role: { type: "string", enum: ["user", "admin", "super_admin"] },
          emailVerified: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      UpdateUserInput: {
        type: "object",
        properties: {
          name: { type: "string" },
          image: { type: "string" },
        },
      },
      Team: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          slug: { type: "string" },
          plan: { type: "string", enum: ["free", "starter", "pro", "enterprise"] },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      TeamMember: {
        type: "object",
        properties: {
          id: { type: "string" },
          userId: { type: "string" },
          teamId: { type: "string" },
          role: { type: "string", enum: ["owner", "admin", "member"] },
          user: { $ref: "#/components/schemas/User" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      InviteMemberInput: {
        type: "object",
        required: ["email", "role"],
        properties: {
          email: { type: "string", format: "email" },
          role: { type: "string", enum: ["admin", "member"] },
        },
      },
      Invitation: {
        type: "object",
        properties: {
          id: { type: "string" },
          email: { type: "string" },
          role: { type: "string" },
          expiresAt: { type: "string", format: "date-time" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Subscription: {
        type: "object",
        properties: {
          id: { type: "string" },
          status: {
            type: "string",
            enum: ["active", "canceled", "past_due", "trialing"],
          },
          plan: { type: "string" },
          currentPeriodStart: { type: "string", format: "date-time" },
          currentPeriodEnd: { type: "string", format: "date-time" },
          cancelAtPeriodEnd: { type: "boolean" },
        },
      },
      Invoice: {
        type: "object",
        properties: {
          id: { type: "string" },
          number: { type: "string" },
          status: { type: "string", enum: ["draft", "open", "paid", "void"] },
          amount: { type: "integer" },
          currency: { type: "string" },
          pdfUrl: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Webhook: {
        type: "object",
        properties: {
          id: { type: "string" },
          url: { type: "string", format: "uri" },
          events: { type: "array", items: { type: "string" } },
          status: { type: "string", enum: ["active", "inactive"] },
          secret: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      CreateWebhookInput: {
        type: "object",
        required: ["url", "events"],
        properties: {
          url: { type: "string", format: "uri" },
          events: { type: "array", items: { type: "string" } },
        },
      },
      Thread: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string", nullable: true },
          messageCount: { type: "integer" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CreateThreadInput: {
        type: "object",
        properties: {
          title: { type: "string" },
        },
      },
      SendMessageInput: {
        type: "object",
        required: ["content"],
        properties: {
          content: { type: "string" },
        },
      },
      FeatureFlag: {
        type: "object",
        properties: {
          key: { type: "string" },
          name: { type: "string" },
          enabled: { type: "boolean" },
        },
      },
    },
  },
};
