import {
  RAGApplication,
  RAGApplicationBuilder,
  JsonLoader,
} from "@llm-tools/embedjs";
import { LibSqlDb, LibSqlStore } from "@llm-tools/embedjs-libsql";
import { OpenAi } from "@llm-tools/embedjs-openai";
import { OpenAiEmbeddings } from "@llm-tools/embedjs-openai";
// import { OpenAI } from "openai";
import { Together } from "together-ai";

export interface LLM {
  generate(prompt: string): Promise<string>;
  addJSONKnowledge?(content: any): Promise<void>;
  initRAG?(): Promise<void>;
  search?(query: string): Promise<any>;
}

export class DummyLLM implements LLM {
  async generate(prompt: string): Promise<string> {
    const response = `Dummy LLM Response to the user's request.`; // A fixed response
    return JSON.stringify({
      tool: null,
      tool_input: response,
    });
  }
}

export class OpenAILLM implements LLM {
  model: string = "gpt-3.5-turbo";
  rag: RAGApplication | null = null;

  constructor(args: Partial<OpenAILLM> = {}) {
    Object.assign(this, args);
  }

  async initRAG() {
    this.rag = await new RAGApplicationBuilder()
      .setModel(
        new OpenAi({
          model: this.model,
        }),
      )
      .setEmbeddingModel(
        new OpenAiEmbeddings({
          model: "text-embedding-3-large",
        }),
      )
      .setVectorDatabase(new LibSqlDb({ path: "./data.db" }))
      .setStore(new LibSqlStore({ path: "./data.db" }))
      .build();
  }

  async generate(prompt: string): Promise<string> {
    try {
      const result = await this.rag?.query(prompt, {
        conversationId: Math.random().toString(36).substring(7),
      });
      result?.sources.forEach((source) => {
        console.log("source:", source.source);
      });
      console.log("tokens:", result?.tokenUse);
      return result?.content.trim() || "No content in response";
    } catch (error: any) {
      console.error(" API Error:", error.message);
      return ` API Error: ${error.message}`;
    }
  }

  async addJSONKnowledge(content: any): Promise<void> {
    console.log(
      "adding json knowledge with model: ",
      this.model,
      JSON.stringify(content),
    );
    await this.rag?.addLoader(new JsonLoader({ object: content }));
    console.log("added json knowledge");
  }

  async search(query: string): Promise<any> {
    return await this.rag?.search(query);
  }
}

// export class OpenAIWithoutRAG implements LLM {
//   model: string = "gpt-3.5-turbo";
//   private openai: OpenAI;

//   constructor(args: Partial<OpenAILLM> = {}) {
//     Object.assign(this, args);
//     const apiKey = process.env.OPENAI_API_KEY;
//     if (!apiKey) {
//       throw new Error("OpenAI API key is required");
//     }
//     this.openai = new OpenAI({ apiKey });
//   }

//   async generate(prompt: string): Promise<string> {
//     try {
//       const response = await this.openai.chat.completions.create({
//         messages: [{ role: "user", content: prompt }],
//         model: this.model,
//         temperature: 0.7,
//       });

//       return response.choices[0]?.message?.content?.trim() || "No content in response";
//     } catch (error: any) {
//       console.error("OpenAI API Error:", error.message);
//       return `OpenAI API Error: ${error.message}`;
//     }
//   }
// }

export class TogetherLLM implements LLM {
  private together: Together;
  model = "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo-128K";

  constructor(args: Partial<TogetherLLM> = {}) {
    Object.assign(this, args);
    const apiKey = process.env.TOGETHER_API_KEY;
    if (!apiKey) {
      throw new Error("Together API key is required");
    }
    this.together = new Together({ apiKey });
  }

  async generate(prompt: string): Promise<string> {
    try {
      const response = await this.together.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: this.model,
        max_tokens: 2000,
        temperature: 0.7,
        top_p: 0.7,
        top_k: 50,
        repetition_penalty: 1,
        stop: ["<|eot_id|>", "<|eom_id|>"],
        stream: true,
      });

      let result = "";
      for await (const token of response) {
        const content = token.choices[0]?.delta?.content;
        if (content) {
          result += content;
        }
      }
      return result.trim() || "No content in response";
    } catch (error: any) {
      console.error("Together API Error:", error.message);
      return `Together API Error: ${error.message}`;
    }
  }
}
