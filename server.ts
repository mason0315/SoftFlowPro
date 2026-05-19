import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

app.use(express.json());

// API: Grading endpoint for batch processing
app.post("/api/grade", async (req, res) => {
  const { fullArticle, items } = req.body;

  if (!fullArticle || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Missing required fields or invalid items" });
  }

  const systemInstruction = `你是一位资深的考研英语翻译阅卷老师。你的任务是根据考研英语一（Part C）的官方评分标准，对考生的5个画线句翻译进行判分并提供极其详尽的可视化、诊断式反馈。

### 评分逻辑：
1. **模块化判分**：每个句子（2分）拆分为 4 个核心采分点，每个点 0.5 分。
2. **可视化比对**：将考生的译文与标准答案拆解为片段，标记每个片段的性质（正确、错误、带反馈、采分点）。

### 输出要求 (JSON格式)：
你必须返回一个包含整体总结和每题详细结果的JSON数据。结构如下：
{
  "totalScore": number, // 总分 (0-10)
  "overallSummary": string, // 全文翻译表现的综合评价
  "details": [
    {
      "id": string, // 对应题号，如 (46)
      "score": number, // 该句得分 (0.0 - 2.0)
      "maxScore": 2.0,
      "originalSentence": string, // 对应的英文原句
      "yourTranslation": [ // 将用户译文拆解为片段，标记错误
        { "text": string, "type": "correct" | "error", "feedback": string } // feedback仅在type为error时提供优化建议
      ],
      "missingParts": string[], // 漏译的核心短语或意群
      "standardAnswer": [ // 将标准答案拆解，标记关键采分点
        { "text": string, "type": "neutral" | "scoring", "label": string } // label如 "采分点①"
      ],
      "scoringPoints": [ // 具体的踩点得分分析
        { "point": string, "yourVersion": string, "standard": string, "score": number, "maxScore": number, "reason": string }
      ],
      "diagnosis": {
        "semanticDifference": string, // 核心语义偏差描述
        "logicalBreakdown": string[], // 逻辑链条对比建议
        "improvements": string[], // 具体的精进建议
        "knowledgeReview": [ // 知识点复盘
          { "term": string, "meanings": string[] }
        ]
      }
    }
  ]
}

请务必严谨、专业，确保JSON中的字符串片段能够平滑拼接成完整句子。你会得到全文背景以帮助理解语境。`;

  const itemsString = items.map(item => `
--- 题目 ${item.id} ---
用户答案：${item.userAnswer}
标准答案：${item.standardAnswer}
`).join("\n");

  const prompt = `
### 全文背景：
${fullArticle}

### 待评测题目：
${itemsString}

请给出完整的评分分析报告。`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            totalScore: { type: Type.NUMBER },
            overallSummary: { type: Type.STRING },
            details: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  score: { type: Type.NUMBER },
                  maxScore: { type: Type.NUMBER },
                  originalSentence: { type: Type.STRING },
                  yourTranslation: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        text: { type: Type.STRING },
                        type: { type: Type.STRING, enum: ["correct", "error"] },
                        feedback: { type: Type.STRING }
                      },
                      required: ["text", "type"]
                    }
                  },
                  missingParts: { type: Type.ARRAY, items: { type: Type.STRING } },
                  standardAnswer: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        text: { type: Type.STRING },
                        type: { type: Type.STRING, enum: ["neutral", "scoring"] },
                        label: { type: Type.STRING }
                      },
                      required: ["text", "type"]
                    }
                  },
                  scoringPoints: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        point: { type: Type.STRING },
                        yourVersion: { type: Type.STRING },
                        standard: { type: Type.STRING },
                        score: { type: Type.NUMBER },
                        maxScore: { type: Type.NUMBER },
                        reason: { type: Type.STRING }
                      },
                      required: ["point", "yourVersion", "standard", "score", "maxScore", "reason"]
                    }
                  },
                  diagnosis: {
                    type: Type.OBJECT,
                    properties: {
                      semanticDifference: { type: Type.STRING },
                      logicalBreakdown: { type: Type.ARRAY, items: { type: Type.STRING } },
                      improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
                      knowledgeReview: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            term: { type: Type.STRING },
                            meanings: { type: Type.ARRAY, items: { type: Type.STRING } }
                          },
                          required: ["term", "meanings"]
                        }
                      }
                    },
                    required: ["semanticDifference", "logicalBreakdown", "improvements", "knowledgeReview"]
                  }
                },
                required: ["id", "score", "maxScore", "originalSentence", "yourTranslation", "missingParts", "standardAnswer", "scoringPoints", "diagnosis"]
              }
            }
          },
          required: ["totalScore", "overallSummary", "details"]
        }
      },
    });

    const result = JSON.parse(response.text || "{}");
    res.json(result);
  } catch (error: any) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: error.message || "Failed to grade translations" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
