
const formidable = require("formidable");
const fs = require("fs/promises");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const OpenAI = require("openai");

const allowedOrigins = [
  "https://aliza-khan-22.github.io",
  "https://ai-resume-screening-liart.vercel.app"
];

async function handler(req, res) {
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed."
    });
  }

  let uploadedPath;

  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "The AI service is not configured."
      });
    }

    const form = formidable({
      maxFiles: 1,
      maxFileSize: 4 * 1024 * 1024,
      maxTotalFileSize: 4 * 1024 * 1024,
      multiples: false,
      keepExtensions: true
    });

    const [fields, files] = await form.parse(req);

    const jobDescription = Array.isArray(fields.jobDescription)
      ? fields.jobDescription[0]
      : fields.jobDescription;

    const uploaded = Array.isArray(files.resume)
      ? files.resume[0]
      : files.resume;

    if (
      typeof jobDescription !== "string" ||
      jobDescription.trim().length < 30
    ) {
      return res.status(400).json({
        error: "Please provide a complete job description."
      });
    }

    if (!uploaded) {
      return res.status(400).json({
        error: "Please upload one resume."
      });
    }

    uploadedPath = uploaded.filepath;

    const filename = uploaded.originalFilename || "resume";
    const extension = filename.toLowerCase().split(".").pop();

    if (!["pdf", "docx"].includes(extension)) {
      return res.status(400).json({
        error: "Only PDF and DOCX resumes are supported."
      });
    }

    const buffer = await fs.readFile(uploadedPath);

    let resumeText = "";

    if (extension === "pdf") {
      const pdfData = await pdfParse(buffer);
      resumeText = pdfData.text;
    } else {
      const docxData = await mammoth.extractRawText({
        buffer
      });
      resumeText = docxData.value;
    }

    if (!resumeText || resumeText.trim().length < 50) {
      return res.status(400).json({
        error: "Could not read enough text from this resume."
      });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: {
        type: "json_object"
      },
      messages: [
        {
          role: "system",
          content: `You are a fair and careful HR resume screening assistant.

Compare the resume only with the supplied job description.

Return valid JSON with these fields:
{
  "candidateName": "Name found in resume or Unknown",
  "matchScore": 0,
  "skillsMatch": ["matching skills"],
  "missingSkills": ["required skills not found"],
  "relevantExperience": "Short explanation",
  "education": "Relevant education found",
  "summary": "Short job-related assessment",
  "screeningStatus": "Strong Match, Moderate Match, or Low Match"
}

Give a score from 0 to 100 based on job-related skills, relevant experience, education and responsibilities.

Use evidence from the resume. Do not invent qualifications or experience.

Do not judge candidates using age, gender, religion, caste, disability, marital status, photograph, or other personal characteristics.

Missing information must not automatically mean the candidate lacks that qualification.

Use these status ranges:
70-100: Strong Match
40-69: Moderate Match
0-39: Low Match

The score is an aid for human review, not an automatic hiring decision.`
        },
        {
          role: "user",
          content:
            `JOB DESCRIPTION:\n${jobDescription.slice(0, 12000)}\n\n` +
            `RESUME:\n${resumeText.slice(0, 25000)}`
        }
      ]
    });

    const responseText =
      completion.choices[0].message.content;

    const result = JSON.parse(responseText);

    result.matchScore = Math.max(
      0,
      Math.min(100, Number(result.matchScore) || 0)
    );

    return res.status(200).json({
      success: true,
      filename,
      result
    });

  } catch (error) {
    console.error("Resume screening error:", error);

    return res.status(500).json({
      error: "Screening failed. Please check the file and try again."
    });

  } finally {
    if (uploadedPath) {
      try {
        await fs.unlink(uploadedPath);
      } catch (cleanupError) {
        console.error("Temporary file cleanup failed.");
      }
    }
  }
}

module.exports = handler;

module.exports.config = {
  api: {
    bodyParser: false
  }
};
