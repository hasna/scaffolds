// @ts-nocheck
import { describe, it, expect } from "vitest";
import { openApiSpec } from "./openapi";

describe("openapi", () => {
  describe("spec structure", () => {
    it("should have valid OpenAPI version", () => {
      expect(openApiSpec.openapi).toBe("3.1.0");
    });

    it("should have info section with required fields", () => {
      expect(openApiSpec.info).toBeDefined();
      expect(openApiSpec.info.title).toBe("SaaS Scaffold API");
      expect(openApiSpec.info.version).toBe("1.0.0");
      expect(openApiSpec.info.description).toBeDefined();
    });

    it("should have contact information", () => {
      expect(openApiSpec.info.contact).toBeDefined();
      expect(openApiSpec.info.contact?.name).toBe("API Support");
      expect(openApiSpec.info.contact?.email).toBeDefined();
    });

    it("should have license information", () => {
      expect(openApiSpec.info.license).toBeDefined();
      expect(openApiSpec.info.license?.name).toBe("MIT");
      expect(openApiSpec.info.license?.url).toBeDefined();
    });
  });

  describe("servers", () => {
    it("should have at least one server defined", () => {
      expect(openApiSpec.servers).toBeDefined();
      expect(Array.isArray(openApiSpec.servers)).toBe(true);
      expect(openApiSpec.servers.length).toBeGreaterThan(0);
    });

    it("should have dynamic server with variables", () => {
      const server = openApiSpec.servers[0];
      expect(server.url).toBe("{protocol}://{host}");
      expect(server.variables).toBeDefined();
      expect(server.variables?.protocol).toBeDefined();
      expect(server.variables?.host).toBeDefined();
    });

    it("should have valid protocol variable with enum", () => {
      const protocolVar = openApiSpec.servers[0].variables?.protocol;
      expect(protocolVar?.default).toBe("https");
      expect(protocolVar?.enum).toEqual(["https", "http"]);
    });
  });

  describe("tags", () => {
    it("should have tags defined", () => {
      expect(openApiSpec.tags).toBeDefined();
      expect(Array.isArray(openApiSpec.tags)).toBe(true);
    });

    it("should have expected tags", () => {
      const tagNames = openApiSpec.tags?.map((t) => t.name) ?? [];
      expect(tagNames).toContain("Authentication");
      expect(tagNames).toContain("Users");
      expect(tagNames).toContain("Teams");
      expect(tagNames).toContain("Billing");
      expect(tagNames).toContain("Webhooks");
      expect(tagNames).toContain("Assistant");
      expect(tagNames).toContain("Feature Flags");
    });

    it("should have descriptions for all tags", () => {
      openApiSpec.tags?.forEach((tag) => {
        expect(tag.description).toBeDefined();
        expect(tag.description?.length).toBeGreaterThan(0);
      });
    });
  });

  describe("paths", () => {
    it("should have paths defined", () => {
      expect(openApiSpec.paths).toBeDefined();
      expect(typeof openApiSpec.paths).toBe("object");
    });

    it("should have user endpoint", () => {
      expect(openApiSpec.paths["/api/v1/users/me"]).toBeDefined();
      expect(openApiSpec.paths["/api/v1/users/me"].get).toBeDefined();
      expect(openApiSpec.paths["/api/v1/users/me"].patch).toBeDefined();
    });

    it("should have team settings endpoint", () => {
      expect(openApiSpec.paths["/api/v1/team/settings"]).toBeDefined();
      expect(openApiSpec.paths["/api/v1/team/settings"].get).toBeDefined();
      expect(openApiSpec.paths["/api/v1/team/settings"].patch).toBeDefined();
    });

    it("should have team members endpoint", () => {
      expect(openApiSpec.paths["/api/v1/team/members"]).toBeDefined();
      expect(openApiSpec.paths["/api/v1/team/members"].get).toBeDefined();
      expect(openApiSpec.paths["/api/v1/team/members"].patch).toBeDefined();
      expect(openApiSpec.paths["/api/v1/team/members"].delete).toBeDefined();
    });

    it("should have team invitations endpoint", () => {
      expect(openApiSpec.paths["/api/v1/team/invitations"]).toBeDefined();
      expect(openApiSpec.paths["/api/v1/team/invitations"].get).toBeDefined();
      expect(openApiSpec.paths["/api/v1/team/invitations"].post).toBeDefined();
    });

    it("should have billing endpoints", () => {
      expect(openApiSpec.paths["/api/v1/billing/subscription"]).toBeDefined();
      expect(openApiSpec.paths["/api/v1/billing/invoices"]).toBeDefined();
    });

    it("should have webhooks endpoint", () => {
      expect(openApiSpec.paths["/api/v1/webhooks"]).toBeDefined();
      expect(openApiSpec.paths["/api/v1/webhooks"].get).toBeDefined();
      expect(openApiSpec.paths["/api/v1/webhooks"].post).toBeDefined();
    });

    it("should have assistant endpoints", () => {
      expect(openApiSpec.paths["/api/v1/assistant/threads"]).toBeDefined();
      expect(
        openApiSpec.paths["/api/v1/assistant/threads/{threadId}/messages"]
      ).toBeDefined();
    });

    it("should have feature flags endpoint", () => {
      expect(openApiSpec.paths["/api/v1/feature-flags"]).toBeDefined();
      expect(openApiSpec.paths["/api/v1/feature-flags"].get).toBeDefined();
    });
  });

  describe("path operations", () => {
    it("should have security defined on all operations", () => {
      Object.values(openApiSpec.paths).forEach((pathItem) => {
        const methods = ["get", "post", "put", "patch", "delete"] as const;
        methods.forEach((method) => {
          const operation = pathItem[method];
          if (operation) {
            expect(operation.security).toBeDefined();
            expect(Array.isArray(operation.security)).toBe(true);
          }
        });
      });
    });

    it("should have tags defined on all operations", () => {
      Object.values(openApiSpec.paths).forEach((pathItem) => {
        const methods = ["get", "post", "put", "patch", "delete"] as const;
        methods.forEach((method) => {
          const operation = pathItem[method];
          if (operation) {
            expect(operation.tags).toBeDefined();
            expect(Array.isArray(operation.tags)).toBe(true);
            expect(operation.tags.length).toBeGreaterThan(0);
          }
        });
      });
    });

    it("should have operationId defined on all operations", () => {
      Object.values(openApiSpec.paths).forEach((pathItem) => {
        const methods = ["get", "post", "put", "patch", "delete"] as const;
        methods.forEach((method) => {
          const operation = pathItem[method];
          if (operation) {
            expect(operation.operationId).toBeDefined();
            expect(typeof operation.operationId).toBe("string");
          }
        });
      });
    });

    it("should have responses defined on all operations", () => {
      Object.values(openApiSpec.paths).forEach((pathItem) => {
        const methods = ["get", "post", "put", "patch", "delete"] as const;
        methods.forEach((method) => {
          const operation = pathItem[method];
          if (operation) {
            expect(operation.responses).toBeDefined();
          }
        });
      });
    });
  });

  describe("components", () => {
    it("should have components section", () => {
      expect(openApiSpec.components).toBeDefined();
    });

    describe("securitySchemes", () => {
      it("should have bearerAuth defined", () => {
        expect(openApiSpec.components.securitySchemes?.bearerAuth).toBeDefined();
        expect(openApiSpec.components.securitySchemes?.bearerAuth.type).toBe(
          "http"
        );
        expect(openApiSpec.components.securitySchemes?.bearerAuth.scheme).toBe(
          "bearer"
        );
      });

      it("should have apiKey defined", () => {
        expect(openApiSpec.components.securitySchemes?.apiKey).toBeDefined();
        expect(openApiSpec.components.securitySchemes?.apiKey.type).toBe(
          "apiKey"
        );
        expect(openApiSpec.components.securitySchemes?.apiKey.in).toBe("header");
        expect(openApiSpec.components.securitySchemes?.apiKey.name).toBe(
          "X-API-Key"
        );
      });
    });

    describe("parameters", () => {
      it("should have pagination parameters", () => {
        expect(openApiSpec.components.parameters?.cursor).toBeDefined();
        expect(openApiSpec.components.parameters?.limit).toBeDefined();
      });

      it("should have valid limit parameter", () => {
        const limit = openApiSpec.components.parameters?.limit;
        expect(limit?.in).toBe("query");
        expect(limit?.schema?.minimum).toBe(1);
        expect(limit?.schema?.maximum).toBe(100);
        expect(limit?.schema?.default).toBe(20);
      });
    });

    describe("responses", () => {
      it("should have standard error responses", () => {
        expect(openApiSpec.components.responses?.BadRequest).toBeDefined();
        expect(openApiSpec.components.responses?.Unauthorized).toBeDefined();
        expect(openApiSpec.components.responses?.Forbidden).toBeDefined();
        expect(openApiSpec.components.responses?.NotFound).toBeDefined();
      });
    });

    describe("schemas", () => {
      it("should have Error schema", () => {
        expect(openApiSpec.components.schemas?.Error).toBeDefined();
        expect(openApiSpec.components.schemas?.Error.required).toContain(
          "error"
        );
      });

      it("should have PaginatedResponse schema", () => {
        expect(openApiSpec.components.schemas?.PaginatedResponse).toBeDefined();
        expect(
          openApiSpec.components.schemas?.PaginatedResponse.properties?.data
        ).toBeDefined();
        expect(
          openApiSpec.components.schemas?.PaginatedResponse.properties?.pagination
        ).toBeDefined();
      });

      it("should have User schema", () => {
        expect(openApiSpec.components.schemas?.User).toBeDefined();
        const userProps = openApiSpec.components.schemas?.User.properties;
        expect(userProps?.id).toBeDefined();
        expect(userProps?.email).toBeDefined();
        expect(userProps?.name).toBeDefined();
        expect(userProps?.role).toBeDefined();
      });

      it("should have Team schema", () => {
        expect(openApiSpec.components.schemas?.Team).toBeDefined();
        const teamProps = openApiSpec.components.schemas?.Team.properties;
        expect(teamProps?.id).toBeDefined();
        expect(teamProps?.name).toBeDefined();
        expect(teamProps?.slug).toBeDefined();
        expect(teamProps?.plan).toBeDefined();
      });

      it("should have TeamMember schema", () => {
        expect(openApiSpec.components.schemas?.TeamMember).toBeDefined();
        const props = openApiSpec.components.schemas?.TeamMember.properties;
        expect(props?.userId).toBeDefined();
        expect(props?.teamId).toBeDefined();
        expect(props?.role).toBeDefined();
      });

      it("should have Invitation schema", () => {
        expect(openApiSpec.components.schemas?.Invitation).toBeDefined();
        expect(openApiSpec.components.schemas?.InviteMemberInput).toBeDefined();
      });

      it("should have Subscription schema", () => {
        expect(openApiSpec.components.schemas?.Subscription).toBeDefined();
        const props = openApiSpec.components.schemas?.Subscription.properties;
        expect(props?.status).toBeDefined();
        expect(props?.plan).toBeDefined();
      });

      it("should have Invoice schema", () => {
        expect(openApiSpec.components.schemas?.Invoice).toBeDefined();
        const props = openApiSpec.components.schemas?.Invoice.properties;
        expect(props?.id).toBeDefined();
        expect(props?.status).toBeDefined();
        expect(props?.amount).toBeDefined();
      });

      it("should have Webhook schema", () => {
        expect(openApiSpec.components.schemas?.Webhook).toBeDefined();
        expect(openApiSpec.components.schemas?.CreateWebhookInput).toBeDefined();
      });

      it("should have Thread schema", () => {
        expect(openApiSpec.components.schemas?.Thread).toBeDefined();
        expect(openApiSpec.components.schemas?.CreateThreadInput).toBeDefined();
        expect(openApiSpec.components.schemas?.SendMessageInput).toBeDefined();
      });

      it("should have FeatureFlag schema", () => {
        expect(openApiSpec.components.schemas?.FeatureFlag).toBeDefined();
        const props = openApiSpec.components.schemas?.FeatureFlag.properties;
        expect(props?.key).toBeDefined();
        expect(props?.name).toBeDefined();
        expect(props?.enabled).toBeDefined();
      });
    });
  });

  describe("operation IDs uniqueness", () => {
    it("should have unique operationIds across all paths", () => {
      const operationIds: string[] = [];
      Object.values(openApiSpec.paths).forEach((pathItem) => {
        const methods = ["get", "post", "put", "patch", "delete"] as const;
        methods.forEach((method) => {
          const operation = pathItem[method];
          if (operation?.operationId) {
            operationIds.push(operation.operationId);
          }
        });
      });

      const uniqueIds = new Set(operationIds);
      expect(operationIds.length).toBe(uniqueIds.size);
    });
  });

  describe("schema references", () => {
    it("should have all referenced schemas defined", () => {
      const allRefs: string[] = [];
      const collectRefs = (obj: unknown) => {
        if (obj && typeof obj === "object") {
          const record = obj as Record<string, unknown>;
          if (record.$ref && typeof record.$ref === "string") {
            allRefs.push(record.$ref);
          }
          Object.values(record).forEach(collectRefs);
        }
      };
      collectRefs(openApiSpec.paths);

      const schemaRefs = allRefs
        .filter((ref) => ref.startsWith("#/components/schemas/"))
        .map((ref) => ref.replace("#/components/schemas/", ""));

      const uniqueSchemaRefs = [...new Set(schemaRefs)];
      uniqueSchemaRefs.forEach((schemaName) => {
        expect(
          openApiSpec.components.schemas?.[schemaName],
          `Schema ${schemaName} should be defined`
        ).toBeDefined();
      });
    });

    it("should have all referenced responses defined", () => {
      const allRefs: string[] = [];
      const collectRefs = (obj: unknown) => {
        if (obj && typeof obj === "object") {
          const record = obj as Record<string, unknown>;
          if (record.$ref && typeof record.$ref === "string") {
            allRefs.push(record.$ref);
          }
          Object.values(record).forEach(collectRefs);
        }
      };
      collectRefs(openApiSpec.paths);

      const responseRefs = allRefs
        .filter((ref) => ref.startsWith("#/components/responses/"))
        .map((ref) => ref.replace("#/components/responses/", ""));

      const uniqueResponseRefs = [...new Set(responseRefs)];
      uniqueResponseRefs.forEach((responseName) => {
        expect(
          openApiSpec.components.responses?.[responseName],
          `Response ${responseName} should be defined`
        ).toBeDefined();
      });
    });

    it("should have all referenced parameters defined", () => {
      const allRefs: string[] = [];
      const collectRefs = (obj: unknown) => {
        if (obj && typeof obj === "object") {
          const record = obj as Record<string, unknown>;
          if (record.$ref && typeof record.$ref === "string") {
            allRefs.push(record.$ref);
          }
          Object.values(record).forEach(collectRefs);
        }
      };
      collectRefs(openApiSpec.paths);

      const paramRefs = allRefs
        .filter((ref) => ref.startsWith("#/components/parameters/"))
        .map((ref) => ref.replace("#/components/parameters/", ""));

      const uniqueParamRefs = [...new Set(paramRefs)];
      uniqueParamRefs.forEach((paramName) => {
        expect(
          openApiSpec.components.parameters?.[paramName],
          `Parameter ${paramName} should be defined`
        ).toBeDefined();
      });
    });
  });
});
