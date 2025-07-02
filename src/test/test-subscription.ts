// scripts/test-subscription.ts
// Run this script to test your subscription system
// Usage: npx ts-node scripts/test-subscription.ts

import axios from "axios";

const API_BASE = process.env.API_URL || "http://localhost:5050";
const TEST_USER = {
  username: "testuser_" + Date.now(),
  email: `test+${Date.now()}@accountabilitybuddys.com`,
  password: "testpassword123"
};

interface TestResult {
  test: string;
  success: boolean;
  error?: string;
  data?: any;
}

class SubscriptionTester {
  private token: string = "";
  private results: TestResult[] = [];

  public async runAllTests(): Promise<void> {
    console.log("🚀 Starting Subscription System Tests...\n");

    await this.test("Create Test User", () => this.createUser());
    await this.test("Login User", () => this.loginUser());
    await this.test("Get Subscription Plans", () => this.getPlans());
    await this.test("Get User Status", () => this.getUserStatus());
    await this.test("Get User Limits", () => this.getUserLimits());
    await this.test("Start Free Trial", () => this.startFreeTrial());
    await this.test("Create Basic Checkout", () => this.createCheckout("basic"));
    await this.test("Create Pro Checkout", () => this.createCheckout("pro"));
    await this.test("Create Elite Checkout", () => this.createCheckout("elite"));

    this.printResults();
  }

  private async test(name: string, testFn: () => Promise<any>): Promise<void> {
    try {
      console.log(`🧪 Testing: ${name}...`);
      const result = await testFn();
      this.results.push({ test: name, success: true, data: result });
      console.log(`✅ ${name} - PASSED\n`);
    } catch (error: any) {
      this.results.push({
        test: name,
        success: false,
        error: error.message || "Unknown error"
      });
      console.log(`❌ ${name} - FAILED: ${error.message}\n`);
    }
  }

  private async createUser(): Promise<any> {
    const response = await axios.post(`${API_BASE}/api/auth/register`, TEST_USER);
    return response.data;
  }

  private async loginUser(): Promise<{ token: string }> {
    const response = await axios.post(`${API_BASE}/api/auth/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password
    });

    // Extract token from response (adjust based on your auth response structure)
    this.token = response.data.token || response.data.accessToken || response.data.data?.token;

    if (!this.token) {
      throw new Error("No token received from login response");
    }

    return { token: this.token.substring(0, 20) + "..." };
  }

  private async getPlans(): Promise<{ planCount: number; plans: string[] }> {
    const response = await axios.get(`${API_BASE}/api/subscription/plans`);
    const plans = response.data.data || response.data;

    if (!Array.isArray(plans) || plans.length === 0) {
      throw new Error("No plans returned");
    }

    return { planCount: plans.length, plans: plans.map((p: any) => p.name) };
  }

  private async getUserStatus(): Promise<any> {
    const response = await axios.get(`${API_BASE}/api/subscription/status`, {
      headers: { Authorization: `Bearer ${this.token}` }
    });

    return response.data.data || response.data;
  }

  private async getUserLimits(): Promise<{
    maxGoals: number;
    canCreateGoal: boolean;
    isInTrial: boolean;
    daysUntilTrialEnd: number;
  }> {
    const response = await axios.get(`${API_BASE}/api/subscription/limits`, {
      headers: { Authorization: `Bearer ${this.token}` }
    });

    const limits = response.data.data || response.data;
    return {
      maxGoals: limits.maxGoals,
      canCreateGoal: limits.canCreateGoal,
      isInTrial: limits.isInTrial,
      daysUntilTrialEnd: limits.daysUntilTrialEnd
    };
  }

  private async startFreeTrial(): Promise<any> {
    const response = await axios.post(`${API_BASE}/api/subscription/create-session`, {
      planId: "free-trial",
      billingCycle: "monthly"
    }, {
      headers: { Authorization: `Bearer ${this.token}` }
    });

    return response.data.data || response.data;
  }

  private async createCheckout(planId: string): Promise<{
    hasSessionUrl: boolean;
    sessionId: string;
    planId: string;
  }> {
    const response = await axios.post(`${API_BASE}/api/subscription/create-session`, {
      planId,
      billingCycle: "monthly",
      successUrl: "http://localhost:3000/subscription/success",
      cancelUrl: "http://localhost:3000/subscription"
    }, {
      headers: { Authorization: `Bearer ${this.token}` }
    });

    const data = response.data.data || response.data;

    if (!data.sessionUrl && !data.sessionId) {
      throw new Error("No session URL or ID returned");
    }

    return {
      hasSessionUrl: !!data.sessionUrl,
      sessionId: data.sessionId,
      planId
    };
  }

  private printResults(): void {
    console.log("\n📊 TEST RESULTS SUMMARY");
    console.log("========================");

    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`🎯 Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%\n`);

    if (failed > 0) {
      console.log("❌ FAILED TESTS:");
      this.results
        .filter(r => !r.success)
        .forEach(r => console.log(`   • ${r.test}: ${r.error}`));
      console.log("");
    }

    console.log("💡 NEXT STEPS:");
    if (passed === this.results.length) {
      console.log("   🎉 All tests passed! Your subscription system is ready.");
      console.log("   🔄 Set up Stripe products and webhook endpoint");
      console.log("   🧪 Test payment flow with Stripe test cards");
    } else {
      console.log("   🔧 Fix failing tests before proceeding");
      console.log("   📚 Check your API routes and authentication");
      console.log("   🔍 Review error messages above");
    }
  }
}

// Run tests
async function main(): Promise<void> {
  const tester = new SubscriptionTester();
  await tester.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

export default SubscriptionTester;
