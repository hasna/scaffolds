// Test data fixtures for E2E tests

export const testUser = {
  email: "test@example.com",
  password: "TestPassword123!",
  name: "Test User",
};

export const adminUser = {
  email: "admin@example.com",
  password: "AdminPassword123!",
  name: "Admin User",
  role: "admin",
};

export const testTenant = {
  name: "Test Organization",
  slug: "test-org",
};

export const testPlan = {
  name: "Pro",
  priceMonthly: 29,
  priceYearly: 290,
};

export const testWebhook = {
  name: "Test Webhook",
  url: "https://webhook.site/test",
  events: ["user.created", "user.updated"],
};

export const testApiKey = {
  name: "Test API Key",
  expiresIn: 30, // days
};

export const testThread = {
  title: "Test Chat Thread",
};

export const testMessage = {
  content: "Hello, this is a test message!",
};
