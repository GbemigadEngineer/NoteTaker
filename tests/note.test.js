const request = require("supertest");
const app = require("../app");
const path = require("path");
const fs = require("fs");
const { connect, closeDatabase, clearDatabase } = require("./setupTests"); // Assume this is your DB setup utility

// --- Global Setup for Testing ---
const DUMMY_FILE_PATH = path.join(__dirname, "test-image.png");

// 1. Setup/Teardown for the MongoDB Memory Server
beforeAll(async () => {
  await connect(); // Connect to in-memory DB
  fs.writeFileSync(DUMMY_FILE_PATH, "dummy image content"); // Create dummy file
});

afterEach(async () => {
  await clearDatabase(); // Clear data after each test
});

afterAll(async () => {
  await closeDatabase(); // Close DB connection
  fs.unlinkSync(DUMMY_FILE_PATH); // Cleanup dummy file
});
// ---------------------------------

describe("Note Endpoints CRUD & File Management", () => {
  let createdNoteId;
  let createdFilePath; // Path to the file uploaded by Multer

  // --- TEST 1: POST /api/v1/notetaker (Create Note) ---
  it("should create a new note with attachment and return 201", async () => {
    const response = await request(app)
      .post("/api/v1/notetaker") // Use the correct base path
      .field("title", "Initial Note")
      .field("markdownContent", "# Old Title\nOld content.")
      .attach("attachments", DUMMY_FILE_PATH)
      .expect(201);

    // Save data for subsequent tests
    createdNoteId = response.body.data.note._id;
    createdFilePath = response.body.data.note.attachments[0].filePath;

    expect(response.body.status).toBe("success");
    expect(response.body.data.note.attachments.length).toBe(1);
    expect(fs.existsSync(createdFilePath)).toBe(true); // File should be on disk
  });

  // --- TEST 2: PATCH /api/v1/notetaker/:id (Update Content & Files) ---
  it("should update note content and allow attachment removal", async () => {
    // 1. CREATE A NOTE (Self-contained)
    const createResponse = await request(app)
      .post("/api/v1/notetaker")
      .field("title", "Note for Update")
      .field("markdownContent", "Content to be changed")
      .attach("attachments", DUMMY_FILE_PATH);

    expect(createResponse.statusCode).toBe(201);
    const noteId = createResponse.body.data.note._id;
    const attachmentIdToRemove =
      createResponse.body.data.note.attachments[0]._id;

    // 2. RUN UPDATE (PATCH)
    const NEW_FILE_PATH = path.join(__dirname, "new-image.pdf");
    fs.writeFileSync(NEW_FILE_PATH, "new PDF content"); // Assuming this file setup is outside of this block

    const updateResponse = await request(app)
      .patch(`/api/v1/notetaker/${noteId}`)
      .field("title", "Updated Title")
      .field("markdownContent", "New Content")
      .field("removeAttachments", JSON.stringify([attachmentIdToRemove]))
      .attach("attachments", NEW_FILE_PATH)
      .expect(200);

    // 3. ASSERTIONS
    expect(updateResponse.body.data.note.title).toBe("Updated Title");
    expect(updateResponse.body.data.note.attachments.length).toBe(1);

    // ... Cleanup new file
  });

  // --- TEST 3: POST /api/v1/notetaker/:id/grammar-check (Functionality) ---
  it("should check grammar and return errors (if any)", async () => {
    // Create a note with a deliberate typo for testing the grammar checker
    const noteWithTypo = await request(app)
      .post("/api/v1/notetaker")
      .field("title", "Typo Test")
      .field("markdownContent", "Thiis is a test with a deliberate error.") // 'Thiis'
      .expect(201);

    const typoNoteId = noteWithTypo.body.data.note._id;

    const response = await request(app)
      .post(`/api/v1/notetaker/${typoNoteId}/grammar-check`)
      .expect(200);

    expect(response.body.status).toBe("success");
    expect(response.body.data.errorCount).toBeGreaterThan(0);
    expect(response.body.data.errors[0].context).toContain("Thiis");
  });

  // --- TEST 4: DELETE /api/v1/notetaker/:id (File Cleanup on Deletion) ---
  it("should delete a note and all its attachments", async () => {
    // Create a new note just for deletion testing
    const createResponse = await request(app)
      .post("/api/v1/notetaker")
      .field("title", "Note to Delete")
      .field("markdownContent", "Delete this")
      .attach("attachments", DUMMY_FILE_PATH);

    const noteToDeleteId = createResponse.body.data.note._id;
    const fileToDeletePath =
      createResponse.body.data.note.attachments[0].filePath;

    // 1. Execute deletion
    await request(app)
      .delete(`/api/v1/notetaker/${noteToDeleteId}`)
      .expect(204);

    // 2. Verify Database Deletion
    await request(app).get(`/api/v1/notetaker/${noteToDeleteId}`).expect(404); // Should return 404

    // 3. Verify File System Cleanup
    expect(fs.existsSync(fileToDeletePath)).toBe(false); // File should be GONE
  });
});
