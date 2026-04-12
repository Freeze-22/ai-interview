import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiService {
  constructor() {
    this.client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.client.getGenerativeModel({
      model: 'gemini-2.5-pro-exp-03-25',
      generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
    });
    this.fastModel = this.client.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: { maxOutputTokens: 256, temperature: 0.3 },
    });
  }

  async *streamChat(messages, options = {}) {
    const { signal, systemPrompt } = options;
    const history = messages.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    const lastMessage = messages[messages.length - 1];
    const chat = this.model.startChat({
      history,
      systemInstruction: systemPrompt || undefined,
    });
    const result = await chat.sendMessageStream(lastMessage?.content || '');
    for await (const chunk of result.stream) {
      if (signal?.aborted) break;
      const text = chunk.text();
      if (text) yield { text };
    }
  }

  async chat(messages, options = {}) {
    let fullText = '';
    for await (const chunk of this.streamChat(messages, options)) {
      fullText += chunk.text;
    }
    return fullText;
  }

  async quickDecision(prompt) {
    const result = await this.fastModel.generateContent(prompt);
    return result.response.text();
  }

  async generateEmbedding(text) {
    const embeddingModel = this.client.getGenerativeModel({
      model: 'text-embedding-004',
    });
    const result = await embeddingModel.embedContent(text);
    return result.embedding.values;
  }
}