import { Message } from "ai";
import { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import { AppChain } from "../configurator/data";
import { Chains } from "@prisma/client";

type FetchOptions = RequestInit & {
  headers?: Record<string, string>;
};
type UserCodeType = {
  id: number;
  code: string;
  is_used: boolean;
  used_by: string;
};

// Define proper types instead of any
type ApiResponse<T> = {
  data: T;
  status: number;
  message?: string;
};

// Define response types based on your API endpoints
type UserCode = {
  id: number;
  code: string;
  is_used: boolean;
  used_by: string;
};

type AdminResponse = {
  token: string;
};

type ChatResponse = {
  text: string;
  transaction?: string;
  audio?: string;
  op?: string;
};

type BotResponse = {
  text?: string;
  transaction?: string;
};

type TranscribeResponse = {
  text: string;
};

type CheckResponse = {
  exists: boolean;
};

type RegisterResponse = {
  success: boolean;
};

// Update the ChatHistory type
type ChatHistory = {
  id: string;
  title: string; // First message or truncated content
  messages: Message[];
  createdAt: string;
  updatedAt: string;
};

// Add these types at the top with other types
type SaveAgentRequest = {
  name: string;
  chains: string[];
  llmProvider: string;
  agentType: string;
  description?: string;
};

type LLMProvider = {
  id: string;
  name: string;
  disabled: boolean;
};

type SaveAgentResponse = {
  id: string;
  name: string;
  chains: AppChain[];
  llm_providers: LLMProvider[];
  agentType: string;
  description: string;
  createdAt: string;
};

export type SaveAgentApiServiceResponse = {
  id: string;
  name: string;
  chains: AppChain[];
  llmProvider: LLMProvider[];
  agentType: string;
  description: string;
  createdAt: string;
};

// Add this with other types at the top
export type SavedAgent = {
  id: string;
  name: string;
  chains: AppChain[];
  llmProvider: string;
  agentType: string;
  createdAt: string;
};

class ApiService {
  private async fetchWithToken<T>(url: string, options: FetchOptions = {}): Promise<T> {
    const token = localStorage.getItem("token");
    options.headers = {
      ...(options.headers || {}),
    };

    if (token) {
      options.headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}, Message: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Fetch error:", error);
      throw error;
    }
  }


  async getUserCodes(): Promise<{code: UserCode[], timestamp: string}> {
    return this.fetchWithToken("/api/user/codes", { method: "GET" });
  }

  async postAdmin(wallet_address: string, signature: string): Promise<AdminResponse> {
    return this.fetchWithToken("/api/user/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet_address, signature }),
    });
  }

  async checkAdmin(token: string): Promise<{ isAdmin: boolean }> {
    return this.fetchWithToken("/api/user/admin", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async postUserCode(): Promise<UserCode> {
    return this.fetchWithToken("/api/user/code", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
  }

  async checkUsercode(code: string, walletAddress: string): Promise<CheckResponse> {
    return this.fetchWithToken("/api/user/code/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, walletAddress }),
    });
  }

  async registerUser(
    address: string,
    transactionSignature: string,
  ): Promise<RegisterResponse> {
    return this.fetchWithToken("/api/user/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, transactionSignature }),
    });
  }

  async checkUser(userId: string): Promise<{ isAllowed: boolean }> {
    return this.fetchWithToken("/api/user/check", { 
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: userId }),
    });
  }

  async deleteUserCode(id: string): Promise<{ success: boolean }> {
    return this.fetchWithToken("/api/user/code", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  async updateUserCode(id: string): Promise<UserCode> {
    return this.fetchWithToken("/api/user/code", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  async getAllUserCodes(): Promise<UserCodeType[]> {
    const data = await this.fetchWithToken<{ code: UserCodeType[] }>("/api/user/codes");
    return data.code;
  }

  // New methods
  async postChat(
    caption: string, 
    wallet: string,
    messageHistory: ChatCompletionMessageParam[] | Message[],
    chains: AppChain[],
    knowledge: string[]
  ): Promise<ChatResponse> {
    return this.fetchWithToken("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({wallet, caption, messageHistory, chains: chains.map((chain)=>chain.name), knowledge }),
    });
  }

  async postBotSolana(text: string, address: string): Promise<BotResponse> {
    return this.fetchWithToken("/api/bot/solana", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.split("op")[0], address }),
    });
  }

  async postBotEvm(text: string, id: string, chain: string = 'base'): Promise<BotResponse> {
    return this.fetchWithToken("/api/bot/evm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.split("op")[0], walletData:id, chain: chain }),
    });
  }

  async postTranscribe(formData: FormData): Promise<TranscribeResponse> {
    return this.fetchWithToken("/api/transcribe", {
      method: "POST",
      body: formData,
    });
  }

  // Chat history methods using localStorage
  getChatHistory(): ChatHistory[] {
    try {
      const allKeys = Object.keys(localStorage);
      const chatKeys = allKeys.filter(key => key.startsWith('chat_'));
      
      return chatKeys.map(key => {
        const data = JSON.parse(localStorage.getItem(key) || '[]');
        const id = key.replace('chat_', '');
        const title = data[0]?.content?.slice(0, 30) || 'New Chat';
        
        return {
          id,
          title: title + (title.length >= 30 ? '...' : ''),
          messages: data,
          createdAt: new Date(Number(id)).toISOString(),
          updatedAt: new Date().toISOString()
        };
      }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.error('Error getting chat history:', error);
      return [];
    }
  }

  saveChatHistory(chatId: string, messages: Message[]): ChatHistory {
    try {
      localStorage.setItem(`chat_${chatId}`, JSON.stringify(messages));
      const title = messages.length > 0 ? messages[0]?.content?.slice(0, 30) : 'New Chat';
      
      return {
        id: chatId,
        title: title + (title.length >= 30 ? '...' : ''),
        messages,
        createdAt: new Date(Number(chatId)).toISOString(),
        updatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error saving chat history:', error);
      throw error;
    }
  }

  deleteChatHistory(chatId: string): { success: boolean } {
    try {
      localStorage.removeItem(`chat_${chatId}`);
      return { success: true };
    } catch (error) {
      console.error('Error deleting chat history:', error);
      return { success: false };
    }
  }

  async updateToken(userId: string): Promise<{ token: string }> {
    return this.fetchWithToken("/api/user/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
  }

  async getChains(): Promise<Chains[]> {
    return this.fetchWithToken("/api/admin/chain", {
      method: "GET",
    });
  }

  async createChain(name: string): Promise<Chains> {
    return this.fetchWithToken("/api/admin/chain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
  }

  async deleteChain(chainId: string): Promise<{ message: string }> {
    return this.fetchWithToken(`/api/admin/chain?id=${chainId}`, {
      method: "DELETE",
    });
  }

  async toggleChain(chainId: string, enable: boolean): Promise<{ message: string }> {
    const action = enable ? 'enable' : 'disable';
    return this.fetchWithToken(`/api/admin/chain?id=${chainId}&action=${action}`, {
      method: "PUT",
    });
  }

  async getKnowledgeBases(): Promise<any[]> {
    return this.fetchWithToken("/api/admin/knowledge", {
      method: "GET",
    });
  }

  async createKnowledgeBase(name: string): Promise<any> {
    return this.fetchWithToken("/api/admin/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
  }

  async deleteKnowledgeBase(kbId: string): Promise<{ message: string }> {
    return this.fetchWithToken(`/api/admin/knowledge?id=${kbId}`, {
      method: "DELETE",
    });
  }

  async toggleKnowledgeBase(kbId: string, enable: boolean): Promise<{ message: string }> {
    const action = enable ? 'enable' : 'disable';
    return this.fetchWithToken(`/api/admin/knowledge?id=${kbId}&action=${action}`, {
      method: "PUT",
    });
  }

  async getLLMProviders(): Promise<any[]> {
    return this.fetchWithToken("/api/admin/llm", {
      method: "GET",
    });
  }

  async createLLMProvider(name: string): Promise<any> {
    return this.fetchWithToken("/api/admin/llm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
  }

  async deleteLLMProvider(providerId: string): Promise<{ message: string }> {
    return this.fetchWithToken(`/api/admin/llm?id=${providerId}`, {
      method: "DELETE",
    });
  }

  async toggleLLMProvider(providerId: string, enable: boolean): Promise<{ message: string }> {
    const action = enable ? 'enable' : 'disable';
    return this.fetchWithToken(`/api/admin/llm?id=${providerId}&action=${action}`, {
      method: "PUT",
    });
  }

  async saveAgent(agentData: SaveAgentRequest): Promise<SaveAgentResponse> {
    return this.fetchWithToken("/api/agent/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        llm_provider: agentData.llmProvider,
        knowledge_bases: [],
        ...agentData
      }),
    });
  }

  async getMyAgents(): Promise<SaveAgentApiServiceResponse[]> {
    const response = await this.fetchWithToken<SaveAgentResponse[]>("/api/agent/my", {
      method: "GET",
    });

    return response.map(agent => ({
      ...agent,
      llmProvider: agent.llm_providers.map(provider => ({
        id: provider.id,
        name: provider.name,
        disabled: provider.disabled,
      })),
    } as SaveAgentApiServiceResponse));
  }

  async loadAgent(agentId: string): Promise<SavedAgent> {
    return this.fetchWithToken(`/api/agent/my/${agentId}`, {
      method: "GET",
    });
  }
}

// Export a single instance of the ApiService
export const apiService = new ApiService();
