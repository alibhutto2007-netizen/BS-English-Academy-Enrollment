import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CreateStudentBody,
  ListStudentsResponse,
  UpdateStudentBody,
} from "@workspace/api-zod";

// Helper to create a valid student record with the correct camelCase field names
function studentRecord(time: string) {
  return {
    studentName: "Ayesha",
    currentClass: "10th",
    lastAcademy: "",
    schoolCollege: "",
    contactNumber: "03001234567",
    dateOfBirth: "2010-04-02",
    dateOfAdmission: "2024-08-15",
    gender: "Female",
    homeAddress: "123 Test Street",
    courseSubject: "English",
    batch: "2024-25",
    time,
    howHeardAboutUs: "Facebook",
    id: "student-1",
    createdAt: "2024-08-15T10:00:00Z",
  };
}

// Legacy time formats from the database
const legacyTimeFormats = [
  "2:00 PM - 3:00 PM",   // Current canonical format
  "02:00 PM - 03:00 PM", // Legacy zero-padded hours
  "12:30 - 03:00 PM",    // Legacy mixed format
] as const;

// Test that ListStudentsResponse accepts all three legacy time formats
for (const time of legacyTimeFormats) {
  test(`ListStudentsResponse accepts student time format: "${time}"`, () => {
    const record = studentRecord(time);
    const result = ListStudentsResponse.safeParse([record]);
    assert.equal(result.success, true, `Failed to parse time format: ${time}`);
  });
}

// Test that ListStudentsResponse accepts a mixed list of all three formats
test("ListStudentsResponse accepts mixed legacy time formats", () => {
  const recordList = legacyTimeFormats.map((time) => studentRecord(time));
  const result = ListStudentsResponse.safeParse(recordList);
  assert.equal(result.success, true, "Failed to parse mixed legacy time formats");
});

// Test that student time must be a non-empty string (validation is not blindly removed)
test("Student time validation rejects empty string", () => {
  const emptyTime = "";
  const record = studentRecord(emptyTime);
  const result = ListStudentsResponse.safeParse([record]);
  assert.equal(result.success, false, "Empty time should be rejected");
});

// Test that CreateStudentBody keeps strict time validation
test("CreateStudentBody keeps strict time validation", () => {
  const valid = CreateStudentBody.safeParse(studentRecord("2:00 PM - 3:00 PM"));
  assert.equal(valid.success, true);

  const empty = CreateStudentBody.safeParse({ ...studentRecord(""), time: "" });
  assert.equal(empty.success, false, "Empty time should be rejected in CreateStudentBody");
});

// Test that UpdateStudentBody keeps strict time validation when time is provided
test("UpdateStudentBody keeps strict time validation when time is provided", () => {
  const valid = UpdateStudentBody.safeParse(studentRecord("02:00 PM - 03:00 PM"));
  assert.equal(valid.success, true);

  const empty = UpdateStudentBody.safeParse({ ...studentRecord("02:00 PM - 03:00 PM"), time: "" });
  assert.equal(empty.success, false, "Empty time should be rejected in UpdateStudentBody");
});

// Test that ListStudentsResponse also accepts the canonical time format
test("ListStudentsResponse accepts canonical time format", () => {
  const result = ListStudentsResponse.safeParse([studentRecord("2:00 PM - 3:00 PM")])
    ;
  assert.equal(result.success, true);
});