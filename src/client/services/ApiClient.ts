import { PostDto } from "../../modules/content/application/dtos/PostDto.ts";
import { MethodologyDto, ToneProfileDto } from "../../modules/playbook/application/use-cases/GetPlaybookUseCase.ts";
import { MediaDto } from "../../modules/media/application/dtos/MediaDto.ts";

export type AuthConfig = {
  telegramEnabled: boolean;
  botUsername: string | null;
  pinEnabled: boolean;
};

export type AuthMe = {
  authenticated: boolean;
  user: {
    id: number;
    username?: string;
    firstName?: string;
    photoUrl?: string;
    via?: string;
  } | null;
};

export class ApiClient {
  private static withAuth(headers: Record<string, string>): Record<string, string> {
    const geminiKey = localStorage.getItem("xm_gemini_key");
    if (geminiKey) headers["x-gemini-key"] = geminiKey;

    const geminiModel = localStorage.getItem("xm_gemini_model");
    if (geminiModel) headers["x-gemini-model"] = geminiModel;

    return headers;
  }

  private static getHeaders(): Record<string, string> {
    return this.withAuth({
      "Content-Type": "application/json"
    });
  }

  private static async request(input: string, init: RequestInit = {}): Promise<Response> {
    return fetch(input, {
      ...init,
      credentials: "include",
      headers: init.headers
    });
  }

  private static async parseError(res: Response): Promise<string> {
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      return data.error || text || "Ошибка запроса";
    } catch {
      return text || res.statusText || "Ошибка запроса";
    }
  }

  public static async getAuthConfig(): Promise<AuthConfig> {
    const res = await this.request("/api/auth/config");
    if (!res.ok) throw new Error(await this.parseError(res));
    return res.json();
  }

  public static async getMe(): Promise<AuthMe> {
    const res = await this.request("/api/auth/me");
    if (!res.ok) throw new Error(await this.parseError(res));
    return res.json();
  }

  public static async loginTelegram(payload: Record<string, unknown>): Promise<void> {
    const res = await this.request("/api/auth/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(await this.parseError(res));
  }

  public static async loginPin(pin: string): Promise<void> {
    const res = await this.request("/api/auth/pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin })
    });
    if (!res.ok) throw new Error(await this.parseError(res));
    localStorage.removeItem("xm_auth_pin");
  }

  public static async logout(): Promise<void> {
    await this.request("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("xm_auth_pin");
  }

  // --- Posts ---
  public static async getPosts(filters: { status?: string; search?: string; tag?: string } = {}): Promise<PostDto[]> {
    const params = new URLSearchParams();
    if (filters.status && filters.status !== "ALL") params.append("status", filters.status);
    if (filters.search) params.append("search", filters.search);
    if (filters.tag) params.append("tag", filters.tag);

    const res = await this.request(`/api/posts?${params.toString()}`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error(await this.parseError(res));
    return res.json();
  }

  public static async getPost(id: string): Promise<PostDto> {
    const res = await this.request(`/api/posts/${id}`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error(await this.parseError(res));
    return res.json();
  }

  public static async createPost(data: { initialHook?: string; initialBody?: string; status?: string; tags?: string[]; notes?: string }): Promise<PostDto> {
    const res = await this.request("/api/posts", {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(await this.parseError(res));
    return res.json();
  }

  public static async updatePost(
    id: string,
    data: {
      variantId?: string;
      hook?: string;
      body?: string;
      variantLabel?: string;
      tags?: string[];
      notes?: string;
      tweetUrl?: string;
      metrics?: any;
    }
  ): Promise<PostDto> {
    const res = await this.request(`/api/posts/${id}`, {
      method: "PUT",
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(await this.parseError(res));
    return res.json();
  }

  public static async changeStatus(id: string, status: string): Promise<PostDto> {
    const res = await this.request(`/api/posts/${id}/status`, {
      method: "PATCH",
      headers: this.getHeaders(),
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error(await this.parseError(res));
    return res.json();
  }

  public static async addVariant(id: string, data: { hook?: string; body?: string; label?: string }): Promise<PostDto> {
    const res = await this.request(`/api/posts/${id}/variants`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(await this.parseError(res));
    return res.json();
  }

  public static async selectVariant(id: string, variantId: string): Promise<PostDto> {
    const res = await this.request(`/api/posts/${id}/variants/${variantId}/select`, {
      method: "PUT",
      headers: this.getHeaders()
    });
    if (!res.ok) throw new Error(await this.parseError(res));
    return res.json();
  }

  public static async deleteVariant(id: string, variantId: string): Promise<PostDto> {
    const res = await this.request(`/api/posts/${id}/variants/${variantId}`, {
      method: "DELETE",
      headers: this.getHeaders()
    });
    if (!res.ok) throw new Error(await this.parseError(res));
    return res.json();
  }

  public static async deletePost(id: string): Promise<void> {
    const res = await this.request(`/api/posts/${id}`, {
      method: "DELETE",
      headers: this.getHeaders()
    });
    if (!res.ok) throw new Error(await this.parseError(res));
  }

  public static async getTags(): Promise<string[]> {
    const res = await this.request("/api/tags", { headers: this.getHeaders() });
    if (!res.ok) return [];
    return res.json();
  }

  // --- Playbook ---
  public static async getPlaybook(): Promise<{ methodologies: MethodologyDto[]; toneProfile: ToneProfileDto }> {
    const res = await this.request("/api/playbook", { headers: this.getHeaders() });
    if (!res.ok) throw new Error(await this.parseError(res));
    return res.json();
  }

  public static async saveMethodology(data: any): Promise<MethodologyDto> {
    const res = await this.request("/api/playbook/methodologies", {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(await this.parseError(res));
    return res.json();
  }

  public static async deleteMethodology(id: string): Promise<void> {
    const res = await this.request(`/api/playbook/methodologies/${id}`, {
      method: "DELETE",
      headers: this.getHeaders()
    });
    if (!res.ok) throw new Error(await this.parseError(res));
  }

  public static async saveToneProfile(data: any): Promise<ToneProfileDto> {
    const res = await this.request("/api/playbook/tone", {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(await this.parseError(res));
    return res.json();
  }

  // --- AI ---
  public static async generateHooks(text: string, count: number = 3): Promise<string[]> {
    const res = await this.request("/api/ai/hooks", {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ text, count })
    });
    if (!res.ok) throw new Error(await this.parseError(res));
    const data = await res.json();
    return data.hooks;
  }

  public static async polish(text: string, instructions: string): Promise<string> {
    const res = await this.request("/api/ai/polish", {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ text, instructions })
    });
    if (!res.ok) throw new Error(await this.parseError(res));
    const data = await res.json();
    return data.result;
  }

  public static async critique(text: string): Promise<any> {
    const res = await this.request("/api/ai/critique", {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ text })
    });
    if (!res.ok) throw new Error(await this.parseError(res));
    return res.json();
  }

  public static async expandToThread(text: string): Promise<string[]> {
    const res = await this.request("/api/ai/thread", {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ text })
    });
    if (!res.ok) throw new Error(await this.parseError(res));
    const data = await res.json();
    return data.tweets;
  }

  // --- Media ---
  private static authOnlyHeaders(): Record<string, string> {
    return this.withAuth({});
  }

  public static async listMedia(modelType: string, modelId: string): Promise<MediaDto[]> {
    const params = new URLSearchParams({ modelType, modelId });
    const res = await this.request(`/api/media?${params.toString()}`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error(await this.parseError(res));
    return res.json();
  }

  public static async uploadMedia(
    modelType: string,
    modelId: string,
    file: File,
    altText?: string
  ): Promise<MediaDto> {
    const form = new FormData();
    form.append("modelType", modelType);
    form.append("modelId", modelId);
    form.append("file", file);
    if (altText) form.append("altText", altText);

    const res = await this.request("/api/media", {
      method: "POST",
      headers: this.authOnlyHeaders(),
      body: form
    });
    if (!res.ok) throw new Error(await this.parseError(res));
    return res.json();
  }

  public static async deleteMedia(id: string): Promise<void> {
    const res = await this.request(`/api/media/${id}`, {
      method: "DELETE",
      headers: this.getHeaders()
    });
    if (!res.ok) throw new Error(await this.parseError(res));
  }

  public static async setPrimaryMedia(id: string): Promise<MediaDto> {
    const res = await this.request(`/api/media/${id}/primary`, {
      method: "PATCH",
      headers: this.getHeaders()
    });
    if (!res.ok) throw new Error(await this.parseError(res));
    return res.json();
  }

  public static async getMediaBlobUrl(id: string): Promise<string> {
    const res = await this.request(`/api/media/${id}/file`, { headers: this.authOnlyHeaders() });
    if (!res.ok) throw new Error(await this.parseError(res));
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  }
}
