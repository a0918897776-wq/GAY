import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// API route first: proxy to Gemini API with safety checks
app.post("/api/gemini/match", async (req, res) => {
  try {
    const { pet, answers } = req.body;

    if (!pet || !answers) {
      return res.status(400).json({ error: "Missing pet or adopter answers" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not defined in environment variables. Falling back to mockup scoring.");
      // Fallback response for missing API keys to operate gracefully during start up/preview
      return res.json({
        aiScore: 85,
        aiFeedback: "【系統提示：請於 AI Studio Secrets 面板設定 GEMINI_API_KEY】\n這是基於您提供資訊的預設評估。該領養人環境適合中高活力的寵物，工作彈性。建議進行第一次見面互動以確認親和度。"
      });
    }

    // Lazy initialization of Gemini SDK
    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const prompt = `你是一位專業的寵物行為學家與收容所媒合顧問。請評估以下領養人與寵物的契合程度，給出 0-100 的媒合分數，並提供具體、親切且實用的專業評估回饋（繁體中文，格式清晰，可使用條列式）。

【寵物資訊】
名稱：${pet.name}
種類：${pet.type}
品種：${pet.breed}
年齡：${pet.age}
性別：${pet.gender}
個性/描述：${pet.description}
特點：${(pet.features || []).join(", ")}

【領養人生活型態】
領養人姓名：${answers.adopterName}
居住環境：${answers.housing}（例如：公寓、透天別墅、有庭院、無庭院）
工作時間：${answers.workingHours}（例如：遠端工作、朝九晚五、經常出差）
活力程度/步行頻率：${answers.activityLevel}（例如：高強度運動、每天中等散步、低活動量）
家中有無其他寵物：${answers.hasOtherPets ? "有" : "沒有"}
領養動機與備註：${answers.message || "未填寫"}

請嚴格分析：
1. 居住環境是否符合該寵物活動需求。
2. 領養人的陪伴時間是否足夠。
3. 領養人的運動頻率是否能滿足寵物的體力。
4. 家中其他寵物的相處兼容性（若有）。
5. 提供給這位領養人的初期照顧、行為指引與相處建議。`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "你是一個專業且深具同理心的寵物認養顧問。請以繁體中文 Zh-TW 撰寫回饋，結構清晰有組織、溫暖誠懇。",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            aiScore: {
              type: Type.INTEGER,
              description: "評估分數（0到100分，整數），代表領養人與該寵物的速配程度。"
            },
            aiFeedback: {
              type: Type.STRING,
              description: "細緻的繁體中文評估分析與建議。請包含：(1) 契合優點分析 (2) 潛在挑戰與調整建議 (3) 初期飼養與生活指南。可使用換行與條列符號使閱讀更舒適。"
            }
          },
          required: ["aiScore", "aiFeedback"]
        }
      }
    });

    const textResult = response.text || "{}";
    const data = JSON.parse(textResult.trim());
    return res.json(data);

  } catch (error: any) {
    console.error("Gemini Match error:", error);
    return res.status(500).json({
      error: "無法生成 AI 媒合評估",
      details: error.message || String(error)
    });
  }
});

// Vite middleware for development, static assets for production
const startServer = async () => {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite dev middleware loaded.");
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log("Serving static production build from:", distPath);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
};

startServer();
