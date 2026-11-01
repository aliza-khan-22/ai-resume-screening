
/* ==========================================
   HIRESCAN AI - ADVANCED JAVASCRIPT
   Resume Upload, Validation and Preview
========================================== */


/* ==========================================
   1. GET HTML ELEMENTS
========================================== */

const resumeInput = document.getElementById("resumeFiles");
const jobDescription = document.getElementById("jobDescription");

const fileCount = document.getElementById("fileCount");
const uploadMessage = document.getElementById("uploadMessage");
const selectedFilesContainer = document.getElementById("selectedFiles");

const screenButton = document.getElementById("screenButton");

const resultsTableBody = document.getElementById("resultsTableBody");

const previewSection = document.getElementById("resumePreviewSection");
const previewFileName = document.getElementById("previewFileName");
const previewCandidateScore = document.getElementById("previewCandidateScore");
const resumeViewer = document.getElementById("resumeViewer");
const closePreview = document.getElementById("closePreview");

const exportButton = document.getElementById("exportButton");


/* ==========================================
   2. WEBSITE SETTINGS
========================================== */

const MAX_RESUMES = 100;

const ALLOWED_EXTENSIONS = ["pdf", "docx"];

let selectedResumes = [];

let currentPreviewURL = null;


/* ==========================================
   3. CHECK FILE EXTENSION
========================================== */

function isValidResume(file) {

    const extension = file.name
        .split(".")
        .pop()
        .toLowerCase();

    return ALLOWED_EXTENSIONS.includes(extension);
}


/* ==========================================
   4. UPDATE RESUME COUNT
========================================== */

function updateFileCount() {

    fileCount.textContent =
        `${selectedResumes.length} / ${MAX_RESUMES} resumes selected`;

}


/* ==========================================
   5. SYNCHRONISE FILE INPUT
========================================== */

function syncFileInput() {

    const dataTransfer = new DataTransfer();

    selectedResumes.forEach(file => {
        dataTransfer.items.add(file);
    });

    resumeInput.files = dataTransfer.files;

}


/* ==========================================
   6. DISPLAY SELECTED RESUMES
========================================== */

function displaySelectedFiles() {

    selectedFilesContainer.replaceChildren();

    selectedResumes.forEach((file, index) => {

        const fileRow = document.createElement("div");
        fileRow.className = "selected-file";

        const fileName = document.createElement("span");
        fileName.className = "selected-file-name";

        fileName.textContent =
            `📄 ${file.name}`;

        const removeButton = document.createElement("button");

        removeButton.type = "button";
        removeButton.className = "remove-file";
        removeButton.textContent = "Remove";

        removeButton.addEventListener("click", () => {

            removeResume(index);

        });

        fileRow.append(fileName, removeButton);

        selectedFilesContainer.appendChild(fileRow);

    });

    updateFileCount();

}


/* ==========================================
   7. REMOVE INDIVIDUAL RESUME
========================================== */

function removeResume(index) {

    const removedFile = selectedResumes[index];

    selectedResumes.splice(index, 1);

    // Close preview if the removed file is being viewed.

    if (
        currentPreviewURL &&
        previewFileName.textContent === removedFile.name
    ) {
        closeResumePreview();
    }

    syncFileInput();

    displaySelectedFiles();

    uploadMessage.textContent =
        "Resume removed successfully.";

}


/* ==========================================
   8. HANDLE RESUME UPLOAD
========================================== */

resumeInput.addEventListener("change", function () {

    const incomingFiles = Array.from(this.files);

    let addedCount = 0;
    let invalidCount = 0;
    let limitReached = false;

    incomingFiles.forEach(file => {

        // Check PDF and DOCX formats.

        if (!isValidResume(file)) {

            invalidCount++;
            return;

        }

        // Avoid duplicate file selections.

        const alreadyExists = selectedResumes.some(existingFile => {

            return (
                existingFile.name === file.name &&
                existingFile.size === file.size &&
                existingFile.lastModified === file.lastModified
            );

        });

        if (alreadyExists) {
            return;
        }

        // Enforce the 100-resume limit.

        if (selectedResumes.length >= MAX_RESUMES) {

            limitReached = true;
            return;

        }

        selectedResumes.push(file);

        addedCount++;

    });


    // Update file input.

    syncFileInput();

    // Update selected resume list.

    displaySelectedFiles();


    // Show upload messages.

    let messages = [];

    if (addedCount > 0) {

        messages.push(
            `${addedCount} resume(s) added successfully.`
        );

    }

    if (invalidCount > 0) {

        messages.push(
            `${invalidCount} invalid file(s) ignored. Upload PDF or DOCX files only.`
        );

    }

    if (limitReached) {

        messages.push(
            "Maximum limit reached. You can upload only 100 resumes per session."
        );

    }

    uploadMessage.textContent =
        messages.join(" ");

    // Allow selecting the same file again after removal.

    resumeInput.value = "";

});


/* ==========================================
   9. OPEN PDF RESUME PREVIEW
========================================== */

function openResumePreview(file) {

    closePreview.disabled = false;

    // Close previous preview URL.

    if (currentPreviewURL) {

        URL.revokeObjectURL(currentPreviewURL);

        currentPreviewURL = null;

    }

    currentPreviewURL = URL.createObjectURL(file);

    previewFileName.textContent = file.name;

    previewCandidateScore.textContent =
        "AI screening score will appear after screening.";

    resumeViewer.replaceChildren();

    const extension = file.name
        .split(".")
        .pop()
        .toLowerCase();


    // PDF preview.

    if (extension === "pdf") {

        const pdfViewer = document.createElement("iframe");

        pdfViewer.src = currentPreviewURL;

        pdfViewer.title = "Candidate Resume PDF Preview";

        pdfViewer.setAttribute("type", "application/pdf");

        resumeViewer.appendChild(pdfViewer);

    }

    // DOCX preview will be connected using a document-reading library.

    else if (extension === "docx") {

        const message = document.createElement("p");

        message.textContent =
            "DOCX preview will be available after connecting the document preview library.";

        resumeViewer.appendChild(message);

    }

    previewSection.hidden = false;

    previewSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

}


/* ==========================================
   10. CLOSE RESUME PREVIEW
========================================== */

function closeResumePreview() {

    if (currentPreviewURL) {

        URL.revokeObjectURL(currentPreviewURL);

        currentPreviewURL = null;

    }

    resumeViewer.replaceChildren();

    previewSection.hidden = true;

}


closePreview.addEventListener("click", closeResumePreview);


/* ==========================================
   11. VALIDATE JOB DESCRIPTION
========================================== */

function validateJobDescription() {

    const jd = jobDescription.value.trim();

    if (!jd) {

        alert("Please enter a Job Description.");

        jobDescription.focus();

        return false;

    }

    if (jd.length < 30) {

        alert(
            "Please enter a more detailed Job Description for accurate screening."
        );

        jobDescription.focus();

        return false;

    }

    return true;

}


/* ==========================================
   12. SCREEN RESUMES BUTTON
========================================== */

screenButton.addEventListener("click", function () {

    // Validate JD.

    if (!validateJobDescription()) {
        return;
    }

    // Check uploaded resumes.

    if (selectedResumes.length === 0) {

        alert("Please upload at least one resume.");

        return;

    }

    // Check resume limit.

    if (selectedResumes.length > MAX_RESUMES) {

        alert("Maximum 100 resumes are allowed.");

        return;

    }


    // AI backend is not connected yet.

    alert(
        "Your Job Description and " +
        selectedResumes.length +
        " resumes are ready.\n\n" +
        "The AI screening engine will be connected in the next development stage."
    );

});


/* ==========================================
   13. VIEW RESUME BUTTON FUNCTION
========================================== */

function viewResume(index) {

    const file = selectedResumes[index];

    if (!file) {
        return;
    }

    openResumePreview(file);

}


/* ==========================================
   14. INITIALISE WEBSITE
========================================== */

function initialiseWebsite() {

    updateFileCount();

    displaySelectedFiles();

    previewSection.hidden = true;

    exportButton.disabled = true;

    console.log("HireScan AI website initialised successfully.");

}


initialiseWebsite();


/* ==========================================
   END OF HIRESCAN AI JAVASCRIPT
========================================== */
