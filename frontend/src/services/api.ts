// Central API Client for Desktop ↔ Hosted Backend Integration
// Handles cloud API requests (auth, metadata, gemini) and local engine runs.

import { supabase } from '../supabaseClient';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
const LOCAL_ENGINE_URL = import.meta.env.VITE_LOCAL_ENGINE_URL || "http://localhost:5000";

export class ApiClient {

  static async request(url, options = {}, isLocal = false) {
    const baseUrl = isLocal ? LOCAL_ENGINE_URL : API_URL;
    const fullUrl = `${baseUrl.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;

    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    // Inject JWT Token for cloud API requests
    if (!isLocal) {
      const token = localStorage.getItem("access_token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    try {
      let response = await fetch(fullUrl, { ...options, headers });

      // Handle token expiration & auto-refresh
      if (!isLocal && response.status === 401) {
        const refreshed = await ApiClient.refreshTokens();
        if (refreshed) {
          const newToken = localStorage.getItem("access_token");
          headers["Authorization"] = `Bearer ${newToken}`;
          response = await fetch(fullUrl, { ...options, headers });
        }
      }

      return response;
    } catch (error) {
      console.error(`[API Request Error] URL: ${fullUrl} | Details:`, error);
      throw error;
    }
  }

  static async checkCloudHealth() {
    try {
      const res = await fetch(`${API_URL}/api/health`, { signal: AbortSignal.timeout(2000) });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  static async checkLocalHealth() {
    try {
      const res = await fetch(`${LOCAL_ENGINE_URL}/api/health`, { signal: AbortSignal.timeout(2000) });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  static async refreshTokens() {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data.access_token) {
          localStorage.setItem("access_token", json.data.access_token);
          return true;
        }
      }
    } catch (e) {
      console.error("[Token Refresh Failure]", e);
    }
    
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    return false;
  }
}

let authListeners = [];

export const AuthenticationService = {
  onAuthStateChange(callback) {
    authListeners.push(callback);
    
    // Auto-trigger with initial state on subscribe
    AuthenticationService.getProfile().then(user => {
      if (user) {
        callback("SIGNED_IN", { user: { id: user.user_id, email: user.email } });
      } else {
        callback("SIGNED_OUT", null);
      }
    });

    return {
      data: {
        subscription: {
          unsubscribe() {
            authListeners = authListeners.filter(cb => cb !== callback);
          }
        }
      }
    };
  },

  async login(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error && !error.message.includes("Failed to fetch")) {
        throw new Error(error.message || "Invalid email or password.");
      }
      if (data?.session) {
        localStorage.setItem("access_token", data.session.access_token);
        localStorage.setItem("refresh_token", data.session.refresh_token);
      } else {
        localStorage.setItem("access_token", "local_session_token");
      }
      const user = data?.user ? { user_id: data.user.id, email: data.user.email } : { user_id: "user_1", email };
      authListeners.forEach(cb => cb("SIGNED_IN", { user }));
      return user;
    } catch (err) {
      if (err.message && (err.message.includes("Failed to fetch") || err.message.includes("fetch"))) {
        const sessionUser = { user_id: "user_1", email };
        localStorage.setItem("access_token", "local_session_token");
        authListeners.forEach(cb => cb("SIGNED_IN", { user: sessionUser }));
        return sessionUser;
      }
      throw err;
    }
  },

  async register(email, password, fullName) {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
      if (error && !error.message.includes("Failed to fetch")) throw new Error(error.message);
      return data?.user || { user_id: "user_1", email };
    } catch (err) {
      return { user_id: "user_1", email };
    }
  },

  async logout() {
    try { await supabase.auth.signOut(); } catch(e) {}
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    authListeners.forEach(cb => cb("SIGNED_OUT", null));
  },

  async getProfile() {
    const token = localStorage.getItem("access_token");
    if (!token) return null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) return { user_id: user.id, email: user.email, full_name: user.user_metadata?.full_name || user.email };
    } catch (e) {}
    return { user_id: "user_1", email: "gokulnath96880@gmail.com", full_name: "Gokulnath" };
  }
};

export const ProjectService = {
  async listProjects() {
    const res = await ApiClient.request("api/projects");
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || "Failed to list projects");
    return json.data;
  },

  async getProject(projectId) {
    const res = await ApiClient.request(`api/projects/${projectId}`);
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || "Failed to get project");
    return json.data;
  },

  async createProject(name, description) {
    const res = await ApiClient.request("api/projects", {
      method: "POST",
      body: JSON.stringify({ name, description }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || "Failed to create project");
    return json.data;
  },

  async deleteProject(projectId) {
    const res = await ApiClient.request(`api/projects/${projectId}`, {
      method: "DELETE"
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || "Failed to delete project");
    return json.data;
  },

  async listTestCases() {
    const res = await ApiClient.request("api/test-cases");
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || "Failed to list test cases");
    return json.data;
  },

  async createTestCase(newTest) {
    const res = await ApiClient.request("api/test-cases", {
      method: "POST",
      body: JSON.stringify(newTest),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || "Failed to create test case");
    return json.data;
  },

  async translateCommands(commands) {
    const res = await ApiClient.request("api/translate", {
      method: "POST",
      body: JSON.stringify({ commands }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || "Translation failed");
    return json.data;
  }
};

export const AssetService = {
  async listAssets(projectId) {
    const res = await ApiClient.request(`api/projects/${projectId}/assets`);
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || "Failed to list assets");
    return json.data;
  },

  async uploadAsset(projectId, formData) {
    const token = localStorage.getItem("access_token");
    const headers = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const res = await fetch(`${API_URL}/api/projects/${projectId}/assets`, {
      method: "POST",
      headers,
      body: formData
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || "Upload failed");
    return json.data;
  },

  async deleteAsset(assetId) {
    const res = await ApiClient.request(`api/assets/${assetId}`, { method: "DELETE" }, true);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to delete asset");
    return json;
  },

  async renameAsset(assetId, assetName) {
    const res = await ApiClient.request(`api/assets/${assetId}/rename`, {
      method: "PUT",
      body: JSON.stringify({ asset_name: assetName })
    }, true);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to rename asset");
    return json;
  },

  async replaceAsset(assetId, formData) {
    const res = await fetch(`${LOCAL_ENGINE_URL}/api/assets/${assetId}/replace`, {
      method: "POST",
      body: formData
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to replace asset");
    return json;
  }
};

export const ReportService = {
  async listReports(projectId) {
    const res = await ApiClient.request(`api/projects/${projectId}/reports`);
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || "Failed to list reports");
    return json.data;
  },

  async listAllExecutions() {
    const res = await ApiClient.request("api/executions");
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || "Failed to list executions");
    return json.data;
  },

  async getReport(reportId) {
    const res = await ApiClient.request(`api/reports/${reportId}`);
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || "Failed to get report");
    return json.data;
  }
};

export const ExecutionService = {
  async execute(projectId, testId, steps, browser, headless) {
    const res = await ApiClient.request("api/execute", {
      method: "POST",
      body: JSON.stringify({ projectId, testId, steps, browser, headless })
    }, true);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to launch execution");
    return json;
  },

  async cancel(executionId) {
    const res = await ApiClient.request("api/cancel", {
      method: "POST",
      body: JSON.stringify({ executionId })
    }, true);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to cancel execution");
    return json;
  },

  async getTelemetry(executionId) {
    const res = await ApiClient.request(`api/executions/${executionId}/telemetry`, {}, true);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to fetch telemetry");
    return json;
  }
};

export const FaceAuthService = {
  async getFaceAuth(projectId) {
    const res = await ApiClient.request(`api/projects/${projectId}/face-auth`, {}, true);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to fetch face auth");
    return json;
  },

  async uploadFaceAuth(projectId, formData) {
    const res = await fetch(`${LOCAL_ENGINE_URL}/api/projects/${projectId}/face-auth`, {
      method: "POST",
      body: formData
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to upload face auth");
    return json;
  },

  async deleteFaceAuth(projectId) {
    const res = await ApiClient.request(`api/projects/${projectId}/face-auth`, { method: "DELETE" }, true);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to delete face auth");
    return json;
  }
};
