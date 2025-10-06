const request = require("supertest");
const app = require("../app"); // Your main Express app
const path = require("path");
const fs = require("fs");

describe("POST /api/v1/notes", () => {
  // A sample file to upload during the test
  const filePath = path.join(__dirname, "test-image.png");

  // Create a dummy file for testing purposes (you'd need one in your __tests__ folder)
  beforeAll(() => {
    fs.writeFileSync(filePath, "dummy image content");
  });

  // Cleanup the dummy file
  afterAll(() => {
    fs.unlinkSync(filePath);
  });

  it("should create a new note with attachments and return 201", async () => {
    const response = await request(app)
      .post("/api/v1/notes")
      .field("title", "Test Note with Attachment") // Field for req.body
      .field("markdownContent", "# Hello World\nThis is a test.") // Field for req.body
      .attach("attachments", filePath) // Field for req.files, must match 'attachments'
      .expect(201); // Expect a successful creation status

    // Assertions (Checks to ensure the data is correct)
    expect(response.body.status).toBe("success");
    expect(response.body.data.note.title).toBe("Test Note with Attachment");
    expect(response.body.data.note.htmlContent).toContain("<h1"); // HTML rendered
    expect(response.body.data.note.attachments.length).toBe(1); // File metadata saved

    // Cleanup the file uploaded by the middleware (Crucial for local disk testing)
    // Note: In a real test, you'd delete the actual file from your 'uploads' folder or Cloudinary.
  });

  it("should return 400 if required fields are missing", async () => {
    await request(app)
      .post("/api/v1/notes")
      .field("title", "Missing Content")
      .expect(400); // Expect a bad request status
  });
});
