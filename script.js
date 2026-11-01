
const API_URL = "https://ai-resume-screening-liart.vercel.app/api/screen";
const MAX_FILES = 100;

let selectedResumes = [];
let screeningResults = [];

const resumeInput = document.getElementById("resumeFiles");
const jobDescription = document.getElementById("jobDescription");
const fileCount = document.getElementById("fileCount");
const uploadMessage = document.getElementById("uploadMessage");
const selectedFiles = document.getElementById("selectedFiles");
const screenButton = document.getElementById("screenButton");
const resultsTableBody = document.getElementById("resultsTableBody");
const totalCandidates = document.getElementById("totalCandidates");
const strongMatches = document.getElementById("strongMatches");
const averageScore = document.getElementById("averageScore");
const exportButton = document.getElementById("exportButton");

function showMessage(message, isError = false) {
  if (!uploadMessage) return;
  uploadMessage.textContent = message;
  uploadMessage.style.color = isError ? "#ff6262" : "#39d353";
}

function updateFileList() {
  if (fileCount) {
    fileCount.textContent = `${selectedResumes.length} resume(s) selected`;
  }

  if (!selectedFiles) return;

  selectedFiles.innerHTML = "";

  selectedResumes.forEach((file, index) => {
    const item = document.createElement("div");
    item.style.cssText =
      "display:flex;justify-content:space-between;align-items:center;padding:8px;margin:5px 0;background:#151515;border-radius:6px;color:white;";

    const name = document.createElement("span");
    name.textContent = file.name;

    const remove = document.createElement("button");
    remove.textContent = "Remove";
    remove.type = "button";
    remove.style.cssText =
      "background:#252525;color:#39d353;border:1px solid #39d353;padding:5px 10px;border-radius:5px;cursor:pointer;";

    remove.addEventListener("click", () => {
      selectedResumes.splice(index, 1);
      updateFileList();
    });

    item.append(name, remove);
    selectedFiles.appendChild(item);
  });
}

if (resumeInput) {
  resumeInput.addEventListener("change", () => {
    const incoming = Array.from(resumeInput.files || []);
    const validFiles = incoming.filter(file =>
      /\.(pdf|docx)$/i.test(file.name)
    );

    const invalidCount = incoming.length - validFiles.length;
    const available = MAX_FILES - selectedResumes.length;

    selectedResumes.push(...validFiles.slice(0, available));

    if (invalidCount > 0) {
      showMessage("Only PDF and DOCX files are accepted.", true);
    } else if (validFiles.length > available) {
      showMessage("Maximum 100 resumes allowed.", true);
    } else {
      showMessage("Resumes added successfully.");
    }

    resumeInput.value = "";
    updateFileList();
  });
}

function addCell(row, value) {
  const cell = document.createElement("td");
  cell.textContent = value || "Not available";
  cell.style.cssText =
    "padding:12px;border-bottom:1px solid #333;color:#eee;vertical-align:top;";
  row.appendChild(cell);
}

function displayResults() {
  if (!resultsTableBody) return;

  resultsTableBody.innerHTML = "";

  screeningResults.sort(
    (a, b) => b.result.matchScore - a.result.matchScore
  );

  screeningResults.forEach((candidate, index) => {
    const result = candidate.result;
    const row = document.createElement("tr");

    addCell(row, String(index + 1));
    addCell(row, result.candidateName);
    addCell(row, `${result.matchScore}%`);
    addCell(row, result.screeningStatus);
    addCell(row, Array.isArray(result.skillsMatch)
      ? result.skillsMatch.join(", ")
      : "");

    addCell(row, result.relevantExperience);
    addCell(row, result.summary);

    resultsTableBody.appendChild(row);
  });

  if (totalCandidates) {
    totalCandidates.textContent = screeningResults.length;
  }

  if (strongMatches) {
    strongMatches.textContent = screeningResults.filter(
      item => item.result.matchScore >= 70
    ).length;
  }

  if (averageScore) {
    const average = screeningResults.length
      ? screeningResults.reduce(
          (sum, item) => sum + item.result.matchScore, 0
        ) / screeningResults.length
      : 0;

    averageScore.textContent = `${average.toFixed(1)}%`;
  }

  if (exportButton) {
    exportButton.disabled = screeningResults.length === 0;
  }
}

async function screenOneResume(file, jd) {
  const formData = new FormData();
  formData.append("jobDescription", jd);
  formData.append("resume", file);

  const response = await fetch(API_URL, {
    method: "POST",
    body: formData
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || "Screening failed.");
  }

  return {
    filename: data.filename,
    result: data.result
  };
}

if (screenButton) {
  screenButton.addEventListener("click", async () => {
    const jd = jobDescription?.value.trim();

    if (!jd || jd.length < 30) {
      showMessage("Please enter a complete job description.", true);
      return;
    }

    if (selectedResumes.length === 0) {
      showMessage("Please upload at least one resume.", true);
      return;
    }

    screeningResults = [];
    displayResults();

    screenButton.disabled = true;
    screenButton.textContent = "Screening in progress...";

    let completed = 0;
    const failures = [];

    try {
      for (const file of selectedResumes) {
        showMessage(
          `Analysing ${completed + 1} of ${selectedResumes.length}: ${file.name}`
        );

        try {
          const result = await screenOneResume(file, jd);
          screeningResults.push(result);
          completed++;
          displayResults();
        } catch (error) {
          failures.push(`${file.name}: ${error.message}`);
        }
      }

      displayResults();

      if (failures.length > 0) {
        showMessage(
          `${completed} resumes screened. ${failures.length} failed. Check the browser console for details.`,
          true
        );
        console.error("Failed resumes:", failures);
      } else {
        showMessage(
          `Screening complete! ${completed} resumes analysed successfully.`
        );
      }
    } finally {
      screenButton.disabled = false;
      screenButton.textContent = "Screen Resumes";
    }
  });
}

if (exportButton) {
  exportButton.addEventListener("click", () => {
    if (!screeningResults.length) {
      showMessage("No screening results to export.", true);
      return;
    }

    const columns = [
      "Rank",
      "Candidate Name",
      "Resume File",
      "Match Score",
      "Screening Status",
      "Matching Skills",
      "Missing Skills",
      "Relevant Experience",
      "Education",
      "Summary"
    ];

    const rows = screeningResults.map((item, index) => {
      const r = item.result;

      return [
        index + 1,
        r.candidateName,
        item.filename,
        r.matchScore,
        r.screeningStatus,
        (r.skillsMatch || []).join("; "),
        (r.missingSkills || []).join("; "),
        r.relevantExperience,
        r.education,
        r.summary
      ];
    });

    const csv = [columns, ...rows]
      .map(row =>
        row.map(value =>
          `"${String(value ?? "").replace(/"/g, '""')}"`
        ).join(",")
      )
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "HireScan_AI_Results.csv";
    link.click();

    URL.revokeObjectURL(url);
  });
}

const closePreview = document.getElementById("closePreview");

if (closePreview) {
  closePreview.addEventListener("click", () => {
    const section = document.getElementById("resumePreviewSection");
    const viewer = document.getElementById("resumeViewer");

    if (section) section.hidden = true;
    if (viewer) viewer.src = "about:blank";
  });
}

updateFileList();
