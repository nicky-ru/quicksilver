import { QueryOrchestrator } from "./workflow";
import { NewsAPITool } from "./tools/news/newsapi";
import { DePINTool } from "./tools/market/dify";
import {
  CurrentWeatherAPITool,
  ForecastWeatherAPITool,
} from "./tools/weather/nubila";

export class SentientAI {
  orchestrator: QueryOrchestrator;

  constructor() {
    
  }

  async initRAG() {
    this.orchestrator = new QueryOrchestrator({
      tools: [
        new NewsAPITool(),
        new DePINTool(),
        new CurrentWeatherAPITool(),
        new ForecastWeatherAPITool(),
      ],
    });
    await this.orchestrator.llmService.fastllm.initRAG!();
    await this.orchestrator.llmService.llm.initRAG!();
    await this.orchestrator.initRAG();
  }

  async execute(input: string): Promise<string> {
    return this.orchestrator.process(input);
  }
}

export default SentientAI;
