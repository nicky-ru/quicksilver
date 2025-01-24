import axios from "axios";

import { APITool } from "../tool";
import { LLMService } from "../../services/llm-service";

interface NewsAPIResponse {
  status: string;
  totalResults: number;
  articles: { source: { name: string }; title: string; url: string }[]; // Include URL
}

const NUMBER_OF_HEADLINES = 10;

export class NewsAPITool extends APITool<any> {
  constructor() {
    super({
      name: "NewsAPI",
      description: "Fetches today's headlines from News API",
      output: `Array of ${NUMBER_OF_HEADLINES} top headlines with their titles and links`,
      baseUrl: "https://newsapi.org/v2/top-headlines?country=us&apiKey=",
    });

    if (!process.env.NEWSAPI_API_KEY) {
      throw new Error("Please set the NEWSAPI_API_KEY environment variable.");
    }
  }

  async execute(_: string, llmService: LLMService): Promise<string> {
    const apiKey = process.env.NEWSAPI_API_KEY!;
    try {
      const url = `https://newsapi.org/v2/top-headlines?country=us&apiKey=${apiKey}`;
      const response = await axios.get<NewsAPIResponse>(url);

      if (response.data.status === "ok") {
        // await llmService.llm.addJSONKnowledge!(response.data.articles);
        await Promise.all(
          response.data.articles.map(async (article) => {
            await llmService.llm.addJSONKnowledge!(article);
          }),
        );
        return "";
      } else {
        return `Error fetching headlines: ${response.data.status}`; // Return error as string
      }
    } catch (error) {
      console.error("NewsAPI Error", error);
      return `Error fetching headlines: ${error}`; // More robust error handling
    }
  }

  async parseInput(userInput: any): Promise<any> {
    return userInput;
  }
}
